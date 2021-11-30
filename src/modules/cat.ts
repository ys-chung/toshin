import path from "path";
import Discord from "discord.js";
import { fetch } from "fetch-h2"
import sharp from "sharp";
import _ from "lodash"

import tf from "@tensorflow/tfjs-node";
import cocoSsd from "@tensorflow-models/coco-ssd"

import { CommandDescription } from "../types/CommandDescription.js";
import { ConfigInterface } from "../types/ConfigInterface.js";

async function detectImageContent(model: cocoSsd.ObjectDetection, url: string): Promise<{ objects: cocoSsd.DetectedObject[]; resBuffer: ArrayBuffer; }> {
    const response = await fetch(url);

    if (response.ok) {

        const resBuffer = await response.arrayBuffer(false)

        const image = tf.node.decodeImage(new Uint8Array(resBuffer))

        return { objects: await model.detect(image), resBuffer }

    } else {
        throw new Error(`Fetch image url ${url} failed`);
    }
}

async function isCatInImage(model: cocoSsd.ObjectDetection, url: string): Promise<false | ArrayBuffer> {

    let content;
    try {
        content = await detectImageContent(model, url);
    } catch (error) {
        console.error(error)
        return false
    }

    const catObjects = content.objects.find(object => (object.class === "cat" && object.score > 0.75))

    return catObjects ? content.resBuffer : false
}

async function predictCat(model: tf.LayersModel, buffer: ArrayBuffer): Promise<Uint8Array | Int32Array | Float32Array> {
    const sharpBuffer = await sharp(new Uint8Array(buffer))
        .resize(224, 224)
        .toFormat("png")
        .removeAlpha()
        .linear((1 / 127), -1)
        .toBuffer()

    let tfImage = tf.node.decodeImage(sharpBuffer)
    tfImage = tfImage.expandDims(0)

    const predictions = model.predict(tfImage);

    if (!_.isArray(predictions)) {
        const values = await predictions.data();

        return values
    } else {
        throw new Error("Prediction result tensor is an array!")
    }
}

async function maxCatIndex(model: tf.LayersModel, buffer: ArrayBuffer): Promise<false | number> {
    const predictions = await predictCat(model, buffer);

    const maxValue = _.max(predictions)

    if (maxValue && maxValue > 0.92) {
        return _.indexOf(predictions, maxValue)
    } else {
        return false
    }
}

export async function catActive(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    const detectionModel = await cocoSsd.load({ base: "mobilenet_v2" });
    const catClassifyModel = await tf.loadLayersModel(`file://${path.resolve("./data/model/model.json")}`);

    const emojiIds = config.moduleConfig.cat?.emojiIds.split(":")
    console.log(emojiIds)

    discordClient.on("messageCreate", async message => {
        if (message.attachments.size > 0) {
            const firstAttachment = message.attachments.at(0)

            if (firstAttachment &&
                (firstAttachment.contentType === "image/jpeg" || firstAttachment.contentType === "image/png")
            ) {

                let catImageBuffer;
                try {
                    catImageBuffer = await isCatInImage(detectionModel, firstAttachment.proxyURL);
                } catch (error) {
                    console.error(error)
                    return
                }

                if (catImageBuffer) {
                    let cat;
                    try {
                        cat = await maxCatIndex(catClassifyModel, catImageBuffer);
                    } catch (error) {
                        console.error(error)
                    }

                    if (_.isNumber(cat)) {
                        const catEmojiId = emojiIds[(cat + 1) * 2 - 1]
                        void message.react(catEmojiId)
                    } else {
                        void message.react(config.moduleConfig.cat?.defaultEmoji)
                    }
                }
            }
        }
    })

    discordClient.on("interactionCreate", async interaction => {
        if (interaction.isContextMenu() && interaction.commandName === "Debug: Detect") {
            if (interaction.user.id === config.moduleConfig.cat?.authorisedUser) {
                const targetMessage = await interaction.channel?.messages.fetch(interaction.targetId);

                if (targetMessage) {
                    const firstAttachment = targetMessage.attachments.at(0)

                    if (firstAttachment &&
                        (firstAttachment.contentType === "image/jpeg" || firstAttachment.contentType === "image/png")
                    ) {
                        try {
                            const { resBuffer, objects } = await detectImageContent(detectionModel, firstAttachment.proxyURL)
                            const predictionArr = await predictCat(catClassifyModel, resBuffer)
                            void interaction.reply({
                                content: `${(objects.map(obj => `${obj.class} ${obj.score}`).join("\n"))}\n\n${predictionArr.join("\n")}`,
                                ephemeral: true
                            })
                        } catch (error) {
                            console.error(error)
                        }

                        return;
                    }
                }

                void interaction.reply({
                    content: "Message or message attachment not found.",
                    ephemeral: true
                });
            } else {
                void interaction.reply({
                    content: "sorry, you are not authorised to perform this action.",
                    ephemeral: true
                });
            }
        }
    })

}

export const catDescription: CommandDescription = {
    name: "cat",
    commands: [
        {
            name: "Debug: Detect",
            type: "MESSAGE"
        }
    ]
}