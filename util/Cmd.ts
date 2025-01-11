import type { User, BaseMessageOptions } from "discord.js"

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
  user: User
  reply: (msg: BaseMessageOptions) => Promise<unknown>
}

interface ParamsCmdInteraction extends BaseCmdInteraction {
  params: CmdParam[]
}

type NoParamsCmdInteraction = BaseCmdInteraction

interface FlatParamsCmdInteraction extends BaseCmdInteraction {
  paramString: string
}

interface BaseDefineCmdOptions {
  name: string
  description: string
  aliases?: string[]
}

interface FlatDefineCmdOptions extends BaseDefineCmdOptions {
  flatParams: true
  splitChar: string
  params: DefineCmdParam[]
  run: (interaction: FlatParamsCmdInteraction) => unknown | Promise<unknown>
}

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
    const foundOptionalParamIndex = cmdOptions.params.findIndex(
      (p) => !p.required
    )
    const foundLastRequiredParamIndex = cmdOptions.params.findLastIndex(
      (p) => p.required
    )

    if (foundLastRequiredParamIndex > foundOptionalParamIndex)
      throw new Error(
        `Cmd ${cmdOptions} cannot have required params after optional ones!`
      )
  }

  cmdArr.push(cmdOptions)
}
