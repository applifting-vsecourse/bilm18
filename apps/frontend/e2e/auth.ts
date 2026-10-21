import type { Browser, Page } from "@playwright/test"

export const API = "http://localhost:4050/api"

// Seed accounts (apps/backend/src/scripts/seed/seed/seed-database.ts).
export const users = {
  admin: { email: "admin@example.com", password: "adminpassword" },
  caffeinatedDuck: { email: "caffeinatedduck@example.com", password: "password1" },
  deepDuckThoughts: { email: "deepduckthoughts@example.com", password: "password2" },
}

// A fresh page with its own cookies: /login sends a signed-in user straight
// to the feed, so every user in a test needs a page of their own.
export async function signedInPage(
  browser: Browser,
  user: { email: string; password: string },
): Promise<Page> {
  const page = await browser.newPage()
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/quacks")
  return page
}
