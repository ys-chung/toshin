import { Snowflake } from "discord.js"
import _ from "lodash"

type ModuleConfig = Record<string, string>

export interface ConfigInterface {
    readonly discordToken: string
    readonly discordGuildId: Snowflake
    readonly moduleConfig: Record<string, ModuleConfig>
}

export function isConfigInterface(
    candidate: unknown
): candidate is ConfigInterface {
    const predicate = candidate as ConfigInterface
    return (
        _.isString(predicate.discordToken) &&
        _.isString(predicate.discordGuildId)
    )
}
