import { Program, Provider, Idl } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from ".././common"
import { JetMarginMetaDataIdl } from "./idl"

export class MarginMetadataClient {
  static readonly MARGIN_METADATA_PROGRAM_ID = new PublicKey("JPMMTBqXjR3xQM9vyoJC8pBKQ6Bw9aXysmhtE9bWCR6")

  /**
   *
   * @param {Program<JetMarginMetaDataIdl>} program
   */
  constructor(public program: Program<JetMarginMetaDataIdl>) {}

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(this.MARGIN_METADATA_PROGRAM_ID, provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => provider && MarginMetadataClient.connect(provider), [provider])
  }
}
