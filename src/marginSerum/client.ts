import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginSerumIdl } from "./idl"

export class MarginSerumClient {
  //static readonly MARGIN_SERUM_PROGRAM_ID = new PublicKey("3wsXmuTcx2hnvznnmufTEbiRHUxQewmukoMkkoG3A1K4")

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program<JetMarginSerumIdl>> {
    return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginSerumProgramId), provider)
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
