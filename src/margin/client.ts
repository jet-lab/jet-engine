import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginIdl } from "./idl"

export class MarginClient {
  static readonly MARGIN_PROGRAM_ID = new PublicKey("JPMvgcajw1LfsHphj4XKKR953DDBgRcbKi1ZWPcEPbk")

  /**
   *
   * @param {Program<JetMarginClient>} program
   */
  constructor(public program: Program<JetMarginIdl>) {}

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program<JetMarginIdl>> {
    return await connect(this.MARGIN_PROGRAM_ID, provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<JetMarginIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginClient.connect(provider), [provider])
  }
}
