import { expect, test, type Page } from "@playwright/test"

import { API, signedInPage, users } from "./auth"

// Every test writes its own quacks and replies, so the seed stays intact.
async function post(page: Page, path: string, text: string): Promise<string> {
  const response = await page.request.post(`${API}/${path}`, { data: { text } })
  expect(response.status()).toBe(201)
  const { id } = (await response.json()) as { id: string }
  return id
}

const postQuack = (author: Page, text: string) => post(author, "quacks", text)
const postReply = (author: Page, quackId: string, text: string) =>
  post(author, `quacks/${quackId}/replies`, text)

type ApiQuack = { id: string; text: string | null; deletedAt: string | null; replyCount: number }

async function thread(page: Page, quackId: string): Promise<ApiQuack[]> {
  const response = await page.request.get(`${API}/quacks/${quackId}/thread`)
  expect(response.status()).toBe(200)
  return (await response.json()) as ApiQuack[]
}

test("reply appears under the quack", async ({ browser }) => {
  const stamp = Date.now()
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, `Coffee ${stamp}`)
  const replier = await signedInPage(browser, users.deepDuckThoughts)

  try {
    await replier.goto(`/quacks/${quackId}`)
    await replier.getByRole("button", { name: "Reply" }).click()
    await replier.getByLabel("Reply to @CaffeinatedDuck").fill(`Reply ${stamp}`)
    await replier.getByRole("button", { name: "Reply", exact: true }).last().click()

    await expect(replier.getByText(`Reply ${stamp}`)).toBeVisible()

    // The feed shows the count, not the reply itself.
    await replier.goto("/quacks")
    const quack = replier.locator("article").filter({ hasText: `Coffee ${stamp}` })
    await expect(quack.getByRole("link", { name: "1 reply — open thread" })).toBeVisible()
    await expect(replier.getByText(`Reply ${stamp}`)).toHaveCount(0)
  } finally {
    const [, reply] = await thread(author, quackId)
    if (reply) await replier.request.delete(`${API}/quacks/${reply.id}`)
    await author.request.delete(`${API}/quacks/${quackId}`)
    await author.context().close()
    await replier.context().close()
  }
})

test("replies survive when the parent is deleted", async ({ browser }) => {
  const stamp = Date.now()
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, `Coffee ${stamp}`)
  const replier = await signedInPage(browser, users.deepDuckThoughts)
  const replyId = await postReply(replier, quackId, `Reply ${stamp}`)

  try {
    await author.goto(`/quacks/${quackId}`)
    const parent = author.locator("article").filter({ hasText: `Coffee ${stamp}` })
    await parent.getByRole("button", { name: "Delete quack" }).click()
    await author.getByRole("button", { name: "Delete", exact: true }).click()

    // Server state, not just the author's cache.
    await author.reload()
    await expect(author.getByText("This quack was deleted")).toBeVisible()
    await expect(author.getByText(`Coffee ${stamp}`)).toHaveCount(0)
    await expect(author.getByText(`Reply ${stamp}`)).toBeVisible()

    const [deleted, reply] = await thread(replier, quackId)
    expect(deleted).toMatchObject({ id: quackId, text: null })
    expect(deleted?.deletedAt).not.toBeNull()
    expect(reply).toMatchObject({ id: replyId, text: `Reply ${stamp}` })
  } finally {
    // The last reply going takes the deleted quack with it.
    await replier.request.delete(`${API}/quacks/${replyId}`)
    await author.request.delete(`${API}/quacks/${quackId}`)
    await author.context().close()
    await replier.context().close()
  }
})

test("cannot reply to a deleted quack", async ({ browser }) => {
  const stamp = Date.now()
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, `Coffee ${stamp}`)
  const replier = await signedInPage(browser, users.deepDuckThoughts)
  const replyId = await postReply(replier, quackId, `Reply ${stamp}`)

  try {
    expect((await author.request.delete(`${API}/quacks/${quackId}`)).status()).toBe(204)

    const response = await replier.request.post(`${API}/quacks/${quackId}/replies`, {
      data: { text: `Too late ${stamp}` },
    })
    expect(response.status()).toBe(404)
    expect(await thread(replier, quackId)).toHaveLength(2)
  } finally {
    await replier.request.delete(`${API}/quacks/${replyId}`)
    await author.context().close()
    await replier.context().close()
  }
})

test("nobody can delete someone else's reply", async ({ browser }) => {
  const stamp = Date.now()
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, `Coffee ${stamp}`)
  const replier = await signedInPage(browser, users.deepDuckThoughts)
  const replyId = await postReply(replier, quackId, `Reply ${stamp}`)

  try {
    // Writing the quack replied to doesn't make the reply yours.
    const response = await author.request.delete(`${API}/quacks/${replyId}`)
    expect(response.status()).toBe(403)
    expect((await thread(author, quackId)).map((quack) => quack.id)).toContain(replyId)
  } finally {
    await replier.request.delete(`${API}/quacks/${replyId}`)
    await author.request.delete(`${API}/quacks/${quackId}`)
    await author.context().close()
    await replier.context().close()
  }
})

test("a reply can't carry a poll", async ({ browser }) => {
  const author = await signedInPage(browser, users.caffeinatedDuck)
  const quackId = await postQuack(author, `Lunch ${Date.now()}`)

  try {
    const response = await author.request.post(`${API}/quacks/${quackId}/replies`, {
      data: { text: "Where?", pollOptions: ["Pizza", "Sushi"] },
    })
    expect(response.status()).toBe(400)
  } finally {
    await author.request.delete(`${API}/quacks/${quackId}`)
    await author.context().close()
  }
})
