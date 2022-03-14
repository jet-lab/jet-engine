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
  static async connect(provider: Provider, cluster = "mainnet-beta"): Promise<Program<JetMarginIdl>> {
    switch (cluster) {
      case "devnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.devnet.marginProgramId), provider)
      }
      case "localnet": {
        return await connect(new PublicKey(MARGIN_CONFIG.localnet.marginProgramId), provider)
      }
      case "mainnet":
      case "mainnet-beta": {
        return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginProgramId), provider)
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
  static use(provider: Provider): Program<JetMarginIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginClient.connect(provider), [provider])
  }
}
