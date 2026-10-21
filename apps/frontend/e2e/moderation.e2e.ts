import { expect, test, type Page } from "@playwright/test"

import { API, signedInPage, users } from "./auth"

// The author writes the quack the test deletes, so the seed stays intact.
async function postQuack(author: Page, text: string): Promise<string> {
  const response = await author.request.post(`${API}/quacks`, { data: { text } })
  expect(response.status()).toBe(201)
  const { id } = (await response.json()) as { id: string }
  return id
}

async function feedHas(page: Page, quackId: string): Promise<boolean> {
  const response = await page.request.get(`${API}/quacks`)
  const quacks = (await response.json()) as { id: string }[]
  return quacks.some((quack) => quack.id === quackId)
}

test("admin can delete someone else's quack", async ({ browser }) => {
  const text = `Spam ${Date.now()}`
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, text)

  const admin = await signedInPage(browser, users.admin)
  const quack = admin.locator("article").filter({ hasText: text })
  await quack.getByRole("button", { name: "Delete quack" }).click()
  await expect(
    admin.getByRole("alertdialog", { name: "Delete @CaffeinatedDuck's quack?" }),
  ).toBeVisible()
  await admin.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(quack).toHaveCount(0)

  // Gone on the server too, not just from the admin's cache.
  await admin.reload()
  await expect(admin.getByText(text)).toHaveCount(0)
  expect(await feedHas(author, quackId)).toBe(false)

  await author.context().close()
  await admin.context().close()
})

test("nobody can delete someone else's quack", async ({ browser }) => {
  const text = `Spam ${Date.now()}`
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, text)

  try {
    const other = await signedInPage(browser, users.deepDuckThoughts)
    const quack = other.locator("article").filter({ hasText: text })
    await expect(quack).toBeVisible()
    await expect(quack.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

    // Hiding the button is convenience — the server must refuse on its own.
    const response = await other.request.delete(`${API}/quacks/${quackId}`)
    expect(response.status()).toBe(403)
    expect(await feedHas(author, quackId)).toBe(true)

    await other.context().close()
  } finally {
    await author.request.delete(`${API}/quacks/${quackId}`)
    await author.context().close()
  }
})

test("signed out gets 401", async ({ request }) => {
  const response = await request.delete(`${API}/quacks/any-quack`)
  expect(response.status()).toBe(401)
})
