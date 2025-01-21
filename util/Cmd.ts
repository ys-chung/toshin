import type {
  GuildMember,
  User,
  BaseMessageOptions,
  TextBasedChannel
} from "discord.js"

interface BaseCmdParam {
  name: string
  description: string
}

interface DefineCmdParam extends BaseCmdParam {
  required?: boolean
}

interface CmdParam extends BaseCmdParam {
  value: string
}

interface BaseCmdInteraction {
  name: string
  user: GuildMember | User
  channel: TextBasedChannel
  reply: (msg: BaseMessageOptions) => Promise<unknown>
}

export interface ParamsCmdInteraction extends BaseCmdInteraction {
  params: CmdParam[]
}

export type NoParamsCmdInteraction = BaseCmdInteraction

export interface FlatParamsCmdInteraction extends BaseCmdInteraction {
  paramString: string
}

interface BaseDefineCmdOptions {
  name: string
  description: string
  aliases?: string[]
}

interface FlatDefineCmdOptionsOneParam extends BaseDefineCmdOptions {
  flatParams: true
  splitChar?: string
  params: [DefineCmdParam]
  run: (interaction: FlatParamsCmdInteraction) => unknown | Promise<unknown>
}

interface FlatDefineCmdOptionsMultiParam extends BaseDefineCmdOptions {
  flatParams: true
  splitChar: string
  params: DefineCmdParam[]
  run: (interaction: FlatParamsCmdInteraction) => unknown | Promise<unknown>
}

type FlatDefineCmdOptions =
  | FlatDefineCmdOptionsOneParam
  | FlatDefineCmdOptionsMultiParam

interface ParamsDefineCmdOptions extends BaseDefineCmdOptions {
  flatParams?: false
  params: DefineCmdParam[]
  run: (interaction: ParamsCmdInteraction) => unknown | Promise<unknown>
}

interface NoParamsDefineCmdOptions extends BaseDefineCmdOptions {
  flatParams?: false
  params?: never
  run: (interaction: NoParamsCmdInteraction) => unknown | Promise<unknown>
}

type DefineCmdOptions =
  | FlatDefineCmdOptions
  | ParamsDefineCmdOptions
  | NoParamsDefineCmdOptions

export const cmdArr: DefineCmdOptions[] = []

export function defineCmd(cmdOptions: DefineCmdOptions) {
  if (cmdOptions.params) {
    // When using flatParams, more than 1 param, then splitChar is required
    if (
      "flatParams" in cmdOptions &&
      cmdOptions.flatParams &&
      cmdOptions.params.length > 1 &&
      !cmdOptions.splitChar
    ) {
      throw new Error(
        `Cmd ${cmdOptions.name} requires splitChar when using multiple flat params!`
      )
    }

    // Check if any optional params are after required ones
    const foundOptionalParamIndex = cmdOptions.params.findIndex(
      (p) => !p.required
    )
    const foundLastRequiredParamIndex = cmdOptions.params.findLastIndex(
      (p) => p.required
    )

    if (
      foundLastRequiredParamIndex > foundOptionalParamIndex &&
      foundOptionalParamIndex !== -1
    )
      throw new Error(
        `Cmd ${cmdOptions.name} cannot have required params (last: ${foundLastRequiredParamIndex}) after optional ones (${foundOptionalParamIndex})!`
      )

    // Check if any params have duplicate names
    if (
      new Set(cmdOptions.params.map((p) => p.name)).size !==
      cmdOptions.params.length
    )
      throw new Error(`Cmd ${cmdOptions.name} has duplicate param names`)
  }

  // Check if existing command with same name exists
  if (cmdArr.find((c) => c.name === cmdOptions.name))
    throw new Error(`Command with name ${cmdOptions.name} already exists`)

  cmdArr.push(cmdOptions)
}
