import test from "ava"

import { generatePreviewsFromUrl } from "../src/previews/pixiv.js"

test("Generate link preview for multi-page illust with caption", async (t) => {
  const url = new URL("https://www.pixiv.net/en/artworks/102809237")
  const preview = await generatePreviewsFromUrl(url)

  t.is(
    preview?.embed.toJSON().title,
    "ビーズログCHEEK11月コミックス発売情報",
    "Title is correct"
  )
  t.assert(preview?.embed.toJSON().description, "Description exists")
  t.is(preview?.attachments.length, 2, "Has 2 attachments")
  t.assert(preview?.button, "Has a button")
})

test("Generate link preview for single-page illust without caption", async (t) => {
  const url = new URL("https://www.pixiv.net/en/artworks/101651352")
  const preview = await generatePreviewsFromUrl(url)

  t.is(preview?.embed.toJSON().title, "Cats are Liquid", "Title is correct")
  t.falsy(preview?.embed.toJSON().description, "Description does not exist")
  t.is(preview?.attachments.length, 2, "Has 2 attachments")
  t.falsy(preview?.button, "Has no buttons")
})

test("Does not generate preview for non-illust pages", async (t) => {
  const url = new URL("https://www.pixiv.net/en/tags/猫は液体")
  const preview = await generatePreviewsFromUrl(url)

  t.falsy(preview?.embed, "Does not return embed")
  t.falsy(preview?.attachments, "Does not return attachments")
  t.falsy(preview?.button, "Does not return buttons")
})
