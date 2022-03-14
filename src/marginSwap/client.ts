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
  static async connect(provider: Provider, cluster = "mainnet-beta"): Promise<Program<JetMarginSwapIdl>> {
    switch (cluster) {
      case "devnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.devnet.marginSwapProgramId), provider)
      }
      case "localnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.localnet.marginSwapProgramId), provider)
      }
      case "mainnet":
      case "mainnet-beta": {
        return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginSwapProgramId), provider)
      }
      default: {
        throw new Error(`Unhandled cluster: ${cluster}`)
      }
    }
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
