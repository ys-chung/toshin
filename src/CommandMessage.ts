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
    /* =====
    COMMAND MESSGAGE
    =====*/

    private incomingCommand: CommandMessageOptions;
    private replyMessage?: Discord.Message;

    replied = false;

    attachments?: Discord.Collection<Discord.Snowflake, Discord.MessageAttachment>;
    readonly channel: Discord.TextBasedChannels;
    channelId: Discord.Snowflake;
    command?: string;
    content?: string;
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
        /* =====
        CONSTRUCTOR
        =====*/

        this.incomingCommand = incomingCommand;
        this.type = incomingCommand.type;

        if (incomingCommand.type === "message") {

            // If the command is from a message
            const message = incomingCommand.message;

            this.attachments = message.attachments;
            this.channel = message.channel;
            this.channelId = message.channelId;
            this.command = message.content.split(" ")[0].replace(/^!/, "")
            this.content = message.content;
            this.guild = message.guild;
            this.guildId = message.guildId;
            this.member = message.member;
            this.paramString = message.cleanContent.match(/^!\w*\s/) ? message.cleanContent.replace(/^!\w*\s/, "") : "";
            this.params = this.paramString.split(" ")
            this.user = message.author;
            this.userNickOrUsername = message.member?.nickname ?? message.author.username;
        } else {

            // If the command is from an interaction
            const interaction = incomingCommand.interaction;

            if (interaction.channel === null) { throw new Error("This interaction does not have a channel!") }

            this.channel = interaction.channel;
            this.channelId = interaction.channelId;
            this.command = interaction.commandName;
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

    // Convert our reply options object to discord format
    private convertReplyOptionsToDiscord(options: CommandMessageReplyOptions): Discord.ReplyMessageOptions | Discord.InteractionReplyOptions {
        const { tts, nonce, embeds, components, files, reply, stickers } = options
        let { content, allowedMentions } = options

        // Initlialise allowedMentions
        if (!allowedMentions) { allowedMentions = {} }

        // Do not mention the original user by default
        if (options.mentionOriginalAuthor) {
            allowedMentions.repliedUser = true;
        } else {
            allowedMentions.repliedUser = false;
        }

        // Set this CommandMessage's isError when the reply is isError
        if (options.isError) {
            this.isError = true;
        }

        // Escape the reply text
        if (options.escape !== false) {
            content = content ? escapeTextFormat(content) : undefined;
        }

        // Apply the set wrapperString to the content
        if (options.wrapperString) {
            content = options.wrapperString.replace("%", `${content}`);
        }

        // Return the Discord format message options
        if (this.type === "message") {
            return ({
                tts, nonce, embeds, components, allowedMentions, files, reply, stickers,
                content: options.isError ? `Error: ${content}` : content
            } as Discord.ReplyMessageOptions)
        } else {
            return ({
                tts, nonce, embeds, components, allowedMentions, files, reply, stickers,
                ephemeral: options.isError ? true : false,
                content: `> ${this.userNickOrUsername}: ${this.command} ${this.paramString}\n\n${content}`
            } as Discord.InteractionReplyOptions)
        }
    }

    // Reply
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

    // Edit reply
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

    // Delete reply
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

    // Defer reply response
    async deferReply(): Promise<void> {
        if (!this.replied) {
            if (this.incomingCommand.type === "interaction") {
                await this.incomingCommand.interaction.deferReply()
                this.replied = true;
            }
        }
    }

    // Reply if message has not been, and edit if it has been
    async forceReply(options: CommandMessageReplyOptions): Promise<void> {
        if (!this.replied) {
            this.reply(options)
        } else {
            this.editReply(options)
        }
    }

}