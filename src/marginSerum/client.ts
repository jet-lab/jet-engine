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
  static async connect(provider: Provider, cluster = "mainnet-beta"): Promise<Program<JetMarginSerumIdl>> {
    switch (cluster) {
      case "devnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.devnet.marginSerumProgramId), provider)
      }
      case "localnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.localnet.marginSerumProgramId), provider)
      }
      case "mainnet":
      case "mainnet-beta": {
        return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginSerumProgramId), provider)
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
  static use(provider: Provider): Program<JetMarginSerumIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginSerumClient.connect(provider), [provider])
  }
}
