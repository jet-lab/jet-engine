import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginSerumIdl } from "./idl"

export class MarginSerumClient {
  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider, cluster: keyof typeof MARGIN_CONFIG = "mainnet-beta"): Promise<Program<JetMarginSerumIdl>> {
    const config = MARGIN_CONFIG[cluster]
    if(!config) {
      throw new Error(`Unhandled cluster: ${cluster}`)
    }
    return await connect(new PublicKey(config.marginSerumProgramId), provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<JetMarginSerumIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginSerumClient.connect(provider), [provider])
  }
}
