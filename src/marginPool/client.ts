import { Program, Provider, Idl } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginPoolIdl } from "./idl"

export class MarginPoolClient {
  static readonly MARGIN_POOL_PROGRAM_ID = new PublicKey("JPMPcFm69yrCHFvzBJ5aVSxhq5mBHwH1N3axcEQW27G")

  /**
   *
   * @param {Program<JetMarginPool>} program
   * @memberof JetMarginClient
   */
  constructor(public program: Program<JetMarginPoolIdl>) {}

  /**
   * Create a new client for interacting with the Jet Margin-Pool Program
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions
   * @returns
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(this.MARGIN_POOL_PROGRAM_ID, provider)
  }

  /**
   *
   * @param provider
   * @returns
   */
  static use(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => provider && MarginPoolClient.connect(provider), [provider])
  }
}
