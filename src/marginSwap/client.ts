import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginSwapIdl } from "./idl"

export class MarginSwapClient {
  static readonly MARGIN_SWAP_PROGRAM_ID = new PublicKey("JPMAa5dnWLFRvUsumawFcGhnwikqZziLLfqn9SLNXPN")

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program<JetMarginSwapIdl>> {
    return await connect(this.MARGIN_SWAP_PROGRAM_ID, provider)
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
