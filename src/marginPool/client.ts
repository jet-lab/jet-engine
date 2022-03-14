import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginPoolIdl } from "./idl"

export class MarginPoolClient {
  /**
   * Create a new client for interacting with the Jet Margin-Pool Program
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions
   * @returns
   */
  static async connect(provider: Provider, cluster: keyof typeof MARGIN_CONFIG = "mainnet-beta"): Promise<Program<JetMarginPoolIdl>> {
    const config = MARGIN_CONFIG[cluster]
    if(!config) {
      throw new Error(`Unhandled cluster: ${cluster}`)
    }
    return await connect(new PublicKey(config.marginPoolProgramId), provider)
  }

  /**
   * Revolve promises and return Margin Pool Program
   * @param {Provider} provider
   * @returns {Program} Margin Pool Program | undefined
   */
  static use(provider: Provider): Program<JetMarginPoolIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginPoolClient.connect(provider), [provider])
  }
}
