import { test, expect, assert } from "vitest"

import { generatePreviewsFromUrl } from "../src/previews/pixiv.js"

test("Generate link preview for multi-page illust with caption", async () => {
  const url = new URL("https://www.pixiv.net/en/artworks/102809237")
  const preview = await generatePreviewsFromUrl(url)

  expect(
    preview?.embed.toJSON().title,
    "Title is correct"
  ).toBe("ビーズログCHEEK11月コミックス発売情報")

  assert(preview?.embed.toJSON().description, "Description exists")
  expect(preview?.attachments.length, "Has 2 attachments").toBe(2)
})

test("Generate link preview for single-page illust without caption", async (t) => {
  const url = new URL("https://www.pixiv.net/en/artworks/101651352")
  const preview = await generatePreviewsFromUrl(url)

  expect(preview?.embed.toJSON().title, "Title is correct").toBe("Cats are Liquid")
  expect(preview?.embed.toJSON().description, "Description does not exist").toBeFalsy()
  expect(preview?.attachments.length, "Has 2 attachments").toBe(2)
})

test("Does not generate preview for non-illust pages", async (t) => {
  const url = new URL("https://www.pixiv.net/en/tags/猫は液体")
  const preview = await generatePreviewsFromUrl(url)

  expect(preview?.embed, "Does not return embed").toBeFalsy()
  expect(preview?.attachments, "Does not return attachments").toBeFalsy()
})
