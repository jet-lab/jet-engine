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
  static async connect(provider: Provider): Promise<Program<JetMarginSwapIdl>> {
    return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginSwapProgramId), provider)
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
