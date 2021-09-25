import Discord from "discord.js"
import { escapeTextFormat } from "./utils/escapeTextFormat.js"

interface BaseCommandMessageOptions {
    type: string;
}

interface MessageCommandMessageOptions extends BaseCommandMessageOptions {
    type: "message"
    message: Discord.Message
}

interface InteractionCommandMessageOptions extends BaseCommandMessageOptions {
    type: "interaction"
    interaction: Discord.CommandInteraction
}

export type CommandMessageOptions = MessageCommandMessageOptions | InteractionCommandMessageOptions;

export interface CommandMessageReplyOptions extends Discord.MessageOptions {
    escape?: boolean;
    isError?: boolean;
    mentionOriginalAuthor?: boolean;
    wrapperString?: string;
}

export class CommandMessage {
    private incomingCommand: CommandMessageOptions;
    private replyMessage?: Discord.Message;

    replied = false;

    attachments?: Discord.Collection<Discord.Snowflake, Discord.MessageAttachment>;
    readonly channel: Discord.TextBasedChannels;
    channelId: Discord.Snowflake;
    command?: string;
    content?: string;
    readonly createdAt: Date;
    readonly createdTimestamp: number;
    readonly guild: Discord.Guild | null;
    guildId: Discord.Snowflake | null;
    isError?: boolean;
    type: "message" | "interaction";
    params: string[];
    paramString: string;
    member: Discord.GuildMember | null;
    user: Discord.User;
    userNickOrUsername: string;

    constructor(incomingCommand: CommandMessageOptions) {
        this.incomingCommand = incomingCommand;
        this.type = incomingCommand.type;

        if (incomingCommand.type === "message") {
            const message = incomingCommand.message;

            this.attachments = message.attachments;
            this.channel = message.channel;
            this.channelId = message.channelId;
            this.command = message.content.split(" ")[0].replace(/^!/, "")
            this.content = message.content;
            this.createdAt = message.createdAt;
            this.createdTimestamp = message.createdTimestamp;
            this.guild = message.guild;
            this.guildId = message.guildId;
            this.member = message.member;
            this.paramString = message.cleanContent.replace(/^!\w*\s/, "")
            this.params = this.paramString.split(" ")
            this.user = message.author;
            this.userNickOrUsername = message.member?.nickname ?? message.author.username;
        } else {

            const interaction = incomingCommand.interaction;

            if (interaction.channel === null) { throw new Error("This interaction does not have a channel!") }

            this.channel = interaction.channel;
            this.channelId = interaction.channelId;
            this.command = interaction.commandName;
            this.createdAt = interaction.createdAt;
            this.createdTimestamp = interaction.createdTimestamp;
            this.guild = interaction.guild;
            this.guildId = interaction.guildId;
            this.member = interaction.guild?.members.resolve(interaction.user.id) || null;

            const joinChar = !(this.command === "choose" || this.command === "choice") ? " " : ";";
            this.paramString = Discord.Util.cleanContent(interaction.options.data.map(option => option.value).join(joinChar), this.channel)
            this.params = this.paramString.split(joinChar)

            this.user = interaction.user;
            this.userNickOrUsername = this.member?.nickname ? this.member.nickname : this.user.username;
        }
    }

    private convertReplyOptionsToDiscord(options: CommandMessageReplyOptions): Discord.ReplyMessageOptions | Discord.InteractionReplyOptions {
        const { tts, nonce, embeds, components, files, reply, stickers } = options
        let { content, allowedMentions } = options

        if (!allowedMentions) { allowedMentions = {} }

        if (options.mentionOriginalAuthor) {
            allowedMentions.repliedUser = true;
        } else {
            allowedMentions.repliedUser = false;
        }

        if (options.isError) {
            this.isError = true;
        }

        if (options.escape !== false) {
            content = content ? escapeTextFormat(content) : undefined;
        }

        if (options.wrapperString) {
            content = options.wrapperString.replace("%", `${content}`);
        }

        if (this.type === "message") {
            return ({
                tts, nonce, embeds, components, allowedMentions, files, reply, stickers,
                content: options.isError ? `Error: ${content}` : content
            } as Discord.ReplyMessageOptions)
        } else {
            return ({
                tts, nonce, embeds, components, allowedMentions, files, reply, stickers, content,
                ephemeral: options.isError ? true : false
            } as Discord.InteractionReplyOptions)
        }
    }

    async reply(options: CommandMessageReplyOptions): Promise<void> {
        const convertedReply = this.convertReplyOptionsToDiscord(options)

        if (!this.replied) {
            if (this.incomingCommand.type === "message") {
                this.replyMessage = await this.incomingCommand.message.reply(convertedReply);
            } else {
                this.incomingCommand.interaction.reply(convertedReply);
            }

            this.replied = true;
        } else {
            throw new Error("This command has already been replied!");
        }
    }

    async editReply(options: CommandMessageReplyOptions): Promise<void> {
        const convertedReply = this.convertReplyOptionsToDiscord(options)

        if (this.replied) {
            if (this.incomingCommand.type === "message") {
                this.replyMessage = await this.replyMessage?.edit(convertedReply);
            } else {
                this.incomingCommand.interaction.editReply(convertedReply);
            }
        } else {
            throw new Error("This command has not been replied, thus the reply cannot be edited!");
        }
    }

    async deleteReply(): Promise<void> {
        if (this.replied && this.replyMessage?.deletable) {
            if (this.incomingCommand.type === "message") {
                this.replyMessage = await this.replyMessage?.delete()
            } else {
                this.incomingCommand.interaction.deleteReply();
            }
        } else {
            throw new Error("This command has not been replied or the reply is not deletable!");
        }
    }

}