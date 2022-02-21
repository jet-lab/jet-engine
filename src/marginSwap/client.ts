import { Program, Provider, Idl } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import { JetMarginSwapIdl } from "./idl"

export class MarginSwapClient {
  static readonly MARGIN_SWAP_PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")

  /**
   *
   * @param {Program<JetMarginMetaDataIdl>} program
   */
  constructor(public program: Program<JetMarginSwapIdl>) {}

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(this.MARGIN_SWAP_PROGRAM_ID, provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => provider && MarginSwapClient.connect(provider), [provider])
  }
}
