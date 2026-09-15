import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end smoke: first launch → onboarding → Today → a full six-block session in timer mode → the record.
 * Each test gets a fresh browser context, so IndexedDB starts empty. No MIDI or microphone in CI.
 */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function completeOnboarding(page: Page, name = "Ada") {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  // A1 Who is playing.
  await page.getByPlaceholder("Name").fill(name);
  await page.getByRole("button", { name: "Adult" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  // A2 Instrument and input: no keyboard in CI, so the timer is the way through.
  await page.getByRole("button", { name: /use the timer/i }).click({ timeout: 15_000 });
  // A3 Guided or own plan.
  await page.getByRole("button", { name: /use guided/i }).click();
  // A4 Weekly target: keep the defaults and skip the skill check.
  await expect(page.getByText(/how often, and for how long/i)).toBeVisible();
  await page.getByRole("button", { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("first launch sets up a profile and lands on Today", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: /start with the c major scale/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /begin practice/i })).toBeVisible();
  await expect(page.getByText(/timer only/i)).toBeVisible();
  expect(errors).toEqual([]);
});

test("a timer-only session walks all six blocks into the record", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  await page.getByRole("button", { name: /begin practice/i }).click();
  await expect(page).toHaveURL(/\/session/);

  // 01 Technique → 02 Timing → 03 Sight reading (E2 timer-only page) → 04 Harmony → 05 Pieces → 06 Your own.
  await expect(page.getByText("Technique", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /next — timing/i }).click();
  await expect(page.getByText("Timing", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /next — sight reading/i }).click();
  await expect(page.getByText("Sight reading", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /i played it through/i }).click();
  await page.getByRole("button", { name: /next — harmony/i }).click();
  await expect(page.getByText("Harmony", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /next — pieces/i }).click();
  await expect(page.getByText("Pieces", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /next — your own/i }).click();
  await expect(page.getByText("Your own", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^finish$/i }).click();

  // C3 Session done.
  await expect(page.getByText(/session done/i)).toBeVisible();
  await expect(page.getByText(/six of six blocks/i).first()).toBeVisible();
  await expect(page.getByText("BLOCK BY BLOCK")).toBeVisible();
  await page.getByRole("button", { name: /^done$/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /done for today/i })).toBeVisible();

  // The record shows the session.
  await page.goto("/progress");
  await expect(page.getByText(/recent sessions/i)).toBeVisible();
  await expect(page.getByText("6/6")).toBeVisible();
  expect(errors).toEqual([]);
});

test("every screen renders without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  const screens: [string, RegExp][] = [
    ["/progress", /a record of what happened/i],
    ["/library", /nothing is locked/i],
    ["/piece?id=twinkle", /lead sheet/i],
    ["/settings", /every setting here can be changed back/i],
    ["/household", /behind the code/i],
    ["/household/teacher", /teacher/i],
    ["/teacher", /teacher/i],
    ["/skill-check", /skill check/i],
  ];
  for (const [path, marker] of screens) {
    await page.goto(path);
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });
  }
  expect(errors).toEqual([]);
});

test("own plan shows the editable queue", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: /switch to own plan/i }).click();
  await expect(page.getByText(/add to today/i)).toBeVisible();
  await expect(page.getByText(/warm-up — c major/i)).toBeVisible();
  await expect(page.getByText(/play something of your own/i)).toBeVisible();
});
