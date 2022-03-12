import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect, Hooks } from "../common"
import MARGIN_CONFIG from "../margin/config.json"
import { JetMarginMetaDataIdl } from "./idl"

export class MarginMetadataClient {
  //static readonly MARGIN_METADATA_PROGRAM_ID = new PublicKey("JPMMTBqXjR3xQM9vyoJC8pBKQ6Bw9aXysmhtE9bWCR6")

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static async connect(provider: Provider): Promise<Program<JetMarginMetaDataIdl>> {
    return await connect(new PublicKey(MARGIN_CONFIG.mainnet.metadataProgramId), provider)
  }

  /**
   *
   * @param {Provider} provider
   * @returns
   */
  static use(provider: Provider): Program<JetMarginMetaDataIdl> | undefined {
    return Hooks.usePromise(async () => provider && MarginMetadataClient.connect(provider), [provider])
  }
}
