import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginSwapIdl } from "./idl"

export class MarginSwapClient {
  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider, cluster: keyof typeof MARGIN_CONFIG = "mainnet-beta"): Promise<Program<JetMarginSwapIdl>> {
    const config = MARGIN_CONFIG[cluster]
    if(!config) {
      throw new Error(`Unhandled cluster: ${cluster}`)
    }
    return await connect(new PublicKey(config.marginSwapProgramId), provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<JetMarginSwapIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginSwapClient.connect(provider), [provider])
  }
}
