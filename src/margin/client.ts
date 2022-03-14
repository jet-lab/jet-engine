import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginIdl } from "./idl"

export class MarginClient {
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
  static async connect(provider: Provider, cluster: keyof typeof MARGIN_CONFIG = "mainnet-beta"): Promise<Program<JetMarginIdl>> {
    const config = MARGIN_CONFIG[cluster]
    if(!config) {
      throw new Error(`Unhandled cluster: ${cluster}`)
    }
    return await connect(new PublicKey(config.marginProgramId), provider)
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
