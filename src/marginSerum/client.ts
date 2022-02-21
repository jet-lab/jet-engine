import { Program, Provider, Idl } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginSerumIdl } from "./idl"

export class MarginSerumClient {
  static readonly MARGIN_SERUM_PROGRAM_ID = new PublicKey("3wsXmuTcx2hnvznnmufTEbiRHUxQewmukoMkkoG3A1K4")

  /**
   *
   * @param {Program<JetMarginMetaDataIdl>} program
   */
  constructor(public program: Program<JetMarginSerumIdl>) {}

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(this.MARGIN_SERUM_PROGRAM_ID, provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => provider && MarginSerumClient.connect(provider), [provider])
  }
}
