import { expect, test, type Locator, type Page } from "@playwright/test"

import { API, signedInPage, users } from "./auth"

// cases.md, C: E1–E4. Every test writes its own quack, so the seed stays intact.

async function postQuack(author: Page, text: string): Promise<string> {
  const response = await author.request.post(`${API}/quacks`, { data: { text } })
  expect(response.status()).toBe(201)
  const { id } = (await response.json()) as { id: string }
  return id
}

// The quack in the feed, found by its unique text.
const inFeed = (page: Page, text: string): Locator =>
  page.locator("article").filter({ hasText: text })

// exact: Playwright matches names as substrings, and "Unlike" contains "like".
const likeButton = (quack: Locator): Locator =>
  quack.getByRole("button", { name: "Like", exact: true })
const unlikeButton = (quack: Locator): Locator =>
  quack.getByRole("button", { name: "Unlike", exact: true })

test("E1: like and unlike, and the like survives a reload", async ({ browser }) => {
  const text = `Like me ${Date.now()}`
  const duck = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(duck, text)

  try {
    await duck.goto("/quacks")
    const quack = inFeed(duck, text)
    await expect(likeButton(quack)).toHaveText("0")

    await likeButton(quack).click()
    await expect(unlikeButton(quack)).toHaveAttribute("aria-pressed", "true")
    await expect(unlikeButton(quack)).toHaveText("1")

    await duck.reload()
    await expect(unlikeButton(quack)).toHaveAttribute("aria-pressed", "true")
    await expect(unlikeButton(quack)).toHaveText("1")

    await unlikeButton(quack).click()
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")
    await expect(likeButton(quack)).toHaveText("0")
  } finally {
    await duck.request.delete(`${API}/quacks/${quackId}`)
    await duck.context().close()
  }
})

test("E2: two people, each sees their own like", async ({ browser }) => {
  const text = `Like me ${Date.now()}`
  const duck = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(duck, text)
  const critic = await signedInPage(browser, users.breadCritic)

  try {
    await duck.goto("/quacks")
    await likeButton(inFeed(duck, text)).click()
    await expect(unlikeButton(inFeed(duck, text))).toHaveText("1")

    await critic.goto("/quacks")
    const quack = inFeed(critic, text)
    await expect(likeButton(quack)).toHaveText("1")
    await expect(unlikeButton(quack)).toHaveCount(0)

    await likeButton(quack).click()
    await expect(unlikeButton(quack)).toHaveText("2")
  } finally {
    await duck.request.delete(`${API}/quacks/${quackId}`)
    await duck.context().close()
    await critic.context().close()
  }
})

// Fails when the server stops keeping it to one like per person.
test("E3: only once, even straight through the API", async ({ browser }) => {
  const text = `Like me ${Date.now()}`
  const duck = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(duck, text)
  const critic = await signedInPage(browser, users.breadCritic)

  try {
    await critic.goto("/quacks")
    const quack = inFeed(critic, text)
    await likeButton(quack).click()
    await expect(unlikeButton(quack)).toHaveText("1")

    const response = await critic.request.put(`${API}/quacks/${quackId}/like`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ likeCount: 1, likedByMe: true })

    await critic.reload()
    await expect(unlikeButton(quack)).toHaveText("1")
  } finally {
    await duck.request.delete(`${API}/quacks/${quackId}`)
    await duck.context().close()
    await critic.context().close()
  }
})

// Fails when an unlike takes back likes regardless of whose they are.
test("E4: an admin can't take back someone else's like", async ({ browser }) => {
  const text = `Like me ${Date.now()}`
  const duck = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(duck, text)
  const critic = await signedInPage(browser, users.breadCritic)
  const admin = await signedInPage(browser, users.admin)

  try {
    await critic.goto("/quacks")
    const quack = inFeed(critic, text)
    await likeButton(quack).click()
    await expect(unlikeButton(quack)).toHaveText("1")

    const response = await admin.request.delete(`${API}/quacks/${quackId}/like`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ likeCount: 1, likedByMe: false })

    await critic.reload()
    await expect(unlikeButton(quack)).toHaveAttribute("aria-pressed", "true")
    await expect(unlikeButton(quack)).toHaveText("1")
  } finally {
    await duck.request.delete(`${API}/quacks/${quackId}`)
    await duck.context().close()
    await critic.context().close()
    await admin.context().close()
  }
})
