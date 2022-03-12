import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginIdl } from "./idl"

export class MarginClient {
  //static readonly MARGIN_PROGRAM_ID = new PublicKey("JPMRGNgRk3w2pzBM1RLNBnpGxQYsFQ3yXKpuk4tTXVZ")

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
  static async connect(provider: Provider): Promise<Program<JetMarginIdl>> {
    return await connect(new PublicKey(MARGIN_CONFIG.mainnet.marginProgramId), provider)
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
