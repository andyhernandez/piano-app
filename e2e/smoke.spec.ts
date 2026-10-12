import { test, expect, type Page } from "@playwright/test";

/*
 * End-to-end smoke: first launch → setting up → Today → a full seven-stop session in timer mode → the record.
 * Runs against the production build (see playwright.config.ts) at the iPad landscape size and a smaller tablet.
 */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function completeOnboarding(page: Page, name = "Ada") {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  // A1 Who's playing: a name, how long they have played, then continue.
  await page.getByPlaceholder("Name").fill(name);
  await page.getByRole("button", { name: "Adult" }).click();
  await page.getByRole("button", { name: /1–3 years/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  // A2 Your keyboard: no keyboard in CI, so the timer is the way through.
  await page.getByRole("button", { name: /use the timer/i }).click({ timeout: 15_000 });
  // A3 Guided or own plan.
  await page.getByRole("button", { name: /use guided/i }).click();
  // A4 How often: keep the defaults and skip the skill check.
  await expect(page.getByText(/how often, and for how long/i)).toBeVisible();
  await page.getByRole("button", { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("first launch sets up a profile and lands on Today", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: /hi ada — seven stops/i })).toBeVisible();
  await expect(page.getByText("Today's path")).toBeVisible();
  await expect(page.getByRole("button", { name: /start playing/i })).toBeVisible();
  await expect(page.getByText(/timer only/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a timer-only session walks all seven stops into the record", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  await page.getByRole("button", { name: /not now/i }).click();
  await page.getByRole("button", { name: /start playing/i }).click();
  await expect(page).toHaveURL(/\/session/);

  // Technique → Timing → Ear (needs a keyboard, so it waits) → Sight reading → Harmony → Pieces → Your own.
  await expect(page.getByText("Technique", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /next stop/i }).click();
  await expect(page.getByText("Timing", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /next stop/i }).click();
  await expect(page.getByText("Ear", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/plug the keyboard in, or use the microphone/i)).toBeVisible();
  await page.getByRole("button", { name: /next — sight reading/i }).click();
  await expect(page.getByText("Sight reading", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /i played it through/i }).click();
  await page.getByRole("button", { name: /next stop/i }).click();
  await expect(page.getByText("Harmony", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /next — pieces/i }).click();
  await expect(page.getByText("Pieces", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /next stop/i }).click();
  await expect(page.getByText("Your own", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /done for today/i }).click();

  // D8 Session done.
  await expect(page.getByRole("heading", { name: /all seven stops/i })).toBeVisible();
  await expect(page.getByText(/seven of seven stops/i).first()).toBeVisible();
  await page.getByRole("button", { name: /save and finish/i }).click();
  await expect(page).toHaveURL(/\/$/);

  // The record shows the session.
  await page.goto("/progress");
  await expect(page.getByText(/scrapbook, not a score/i)).toBeVisible();
  await expect(page.getByText(/first session/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("every screen renders without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await completeOnboarding(page);
  const screens: [string, RegExp][] = [
    ["/progress", /scrapbook, not a score/i],
    ["/library", /nothing is locked/i],
    ["/piece?id=twinkle", /lead sheet/i],
    ["/settings", /what the app listens to/i],
    ["/household", /behind the code/i],
    ["/household/teacher", /teacher/i],
    ["/teacher", /teacher/i],
    ["/skill-check", /ear/i],
  ];
  for (const [path, marker] of screens) {
    await page.goto(path);
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });
  }
  expect(errors).toEqual([]);
});

test("own plan shows the editable queue", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: /not now/i }).click();
  await page.getByRole("button", { name: /change the plan/i }).click();
  await expect(page.getByRole("heading", { name: /twenty minutes in c major/i })).toBeVisible();
  await expect(page.getByText("Technique", { exact: true })).toBeVisible();
  await expect(page.getByText("Ear", { exact: true })).toBeVisible();
  await expect(page.getByText("Your own", { exact: true })).toBeVisible();
  await expect(page.getByText(/of 20 planned/i)).toBeVisible();
});

test("the ear check plays each phrase itself and locks replay mid-answer", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Name").fill("Ada");
  await page.getByRole("button", { name: "Adult" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /use the timer/i }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: /use guided/i }).click();
  await page.getByRole("button", { name: /take the skill check/i }).click();
  await expect(page).toHaveURL(/\/skill-check/);

  // The first phrase plays on arrival; nobody has to find a play button.
  await expect(page.getByText(/first hearing/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/now play it back/i)).toBeVisible({ timeout: 20_000 });
  const replay = page.getByRole("button", { name: /hear it again/i });
  await expect(replay).toBeEnabled();

  // One note down: the answer is in progress, so the phrase cannot be replayed until it is finished.
  await page.locator('[data-midi="60"]').click();
  await expect(page.getByText(/to finish this try/i)).toBeVisible();
  await expect(replay).toBeDisabled();
  await expect(page.getByRole("button", { name: /skip this one/i })).toBeVisible();

  // The second note completes the try; hearing it again is allowed between tries.
  await page.locator('[data-midi="62"]').click();
  await expect(page.getByText(/that's it|not quite the tune|it was/i)).toBeVisible();
  await expect(replay).toBeEnabled();
});
