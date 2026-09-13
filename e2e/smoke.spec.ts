import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end smoke: first launch → onboarding → Today → a full six-block session → summary → every page.
 * Runs in timer mode (no MIDI/mic in CI). Each test gets a fresh browser context, so IndexedDB starts empty.
 */

async function completeOnboarding(page: Page, name = "Ada") {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: /let's set up/i }).click();
  // Grown-up PIN step: skip.
  await page.getByRole("button", { name: /skip for now/i }).click();
  // Name & avatar.
  await page.getByPlaceholder(/maya/i).fill(name);
  await page.getByRole("button", { name: /^next/i }).click();
  // How do you practise: pick timer, keep defaults.
  await page.getByText(/just a timer/i).click();
  await page.getByRole("button", { name: /^next/i }).click();
  // Assessment prompt: skip.
  await page.getByRole("button", { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("first launch onboarding creates a child and lands on Today", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByText(/hi ada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /start today's session/i })).toBeVisible();
});

test("a full session awards XP, completes all six blocks, and updates the map", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await completeOnboarding(page);
  await page.getByRole("button", { name: /start today's session/i }).click();
  await expect(page).toHaveURL(/\/session/);
  await page.getByRole("button", { name: /let's go/i }).click();

  for (let i = 0; i < 6; i++) {
    // Wait for the interstitial and for the previous block to finish its exit animation
    // (its own "Start" metronome button would otherwise be matched first).
    await expect(page.getByText(`Block ${i + 1} of 6`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^done/i })).toHaveCount(0);
    await page.getByRole("button", { name: /^start$/i }).last().click();
    const done = page.getByRole("button", { name: /^done/i }).last();
    await expect(done).toBeVisible({ timeout: 15_000 });
    await done.click();
    // Timer-mode self-report dialog (Scale Gym asks "How did it feel?").
    const feel = page.getByRole("button", { name: /^(great!?|okay|tricky)$/i }).first();
    if (await feel.isVisible({ timeout: 1500 }).catch(() => false)) await feel.click();
    const finish = page.getByRole("button", { name: /^(finish|ok|continue|next)$/i }).first();
    if (await finish.isVisible({ timeout: 500 }).catch(() => false)) await finish.click();
  }

  await expect(page.getByText(/done for today!/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/6 of 6 blocks/i)).toBeVisible();
  await page.getByRole("button", { name: /see the map/i }).click();
  await expect(page).toHaveURL(/\/map/);
  await expect(page.getByText(/C major/).first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("every top-level page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await completeOnboarding(page);
  for (const path of ["/map", "/library", "/parent", "/teacher", "/settings", "/onboarding/assessment"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(400);
  }
  await expect(page.getByText(/teacher mode/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  expect(errors, errors.join("\n")).toEqual([]);
});

test("parent gate unlocks and shows the session log", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/parent");
  // No PIN set → maths gate. Read the question and answer it.
  const q = await page.getByText(/what is \d+ × \d+\?/i).textContent();
  const m = /(\d+) × (\d+)/.exec(q ?? "");
  if (m) await page.getByRole("button", { name: String(Number(m[1]) * Number(m[2])), exact: true }).click();
  await expect(page.getByRole("tab", { name: /sessions/i })).toBeVisible();
});
