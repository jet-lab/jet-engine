import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginPoolIdl } from "./idl"

export class MarginPoolClient {
  static readonly MARGIN_POOL_PROGRAM_ID = new PublicKey("JPPooLEqRo3NCSx82EdE2VZY5vUaSsgskpZPBHNGVLZ")

  /**
   * Create a new client for interacting with the Jet Margin-Pool Program
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions
   * @returns
   */
  static async connect(provider: Provider): Promise<Program<JetMarginPoolIdl>> {
    return await connect(this.MARGIN_POOL_PROGRAM_ID, provider)
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
