import { Program, Provider } from "@project-serum/anchor"
import { fetchMultipleIdls } from "../common"
import { JetMarginIdl, JetMarginPoolIdl, JetMarginSerumIdl, JetMarginSwapIdl, JetMetadataIdl } from ".."
import MARGIN_CONFIG from "../margin/config.json"

export interface MarginPrograms {
  margin: Program<JetMarginIdl>
  metadata: Program<JetMetadataIdl>
  marginPool: Program<JetMarginPoolIdl>
  marginSerum: Program<JetMarginSerumIdl>
  marginSwap: Program<JetMarginSwapIdl>
}

export type MarginCluster = keyof typeof MARGIN_CONFIG | MarginConfig

export type MarginConfig = typeof MARGIN_CONFIG.devnet

export class MarginClient {
  static async connect(provider: Provider, cluster: MarginCluster): Promise<MarginPrograms> {
    const config = MarginClient.getConfig(cluster)

    const [marginIdl, metadataIdl, marginPoolIdl, marginSerumIdl, marginSwapIdl] = await fetchMultipleIdls<
      [JetMarginIdl, JetMetadataIdl, JetMarginPoolIdl, JetMarginSerumIdl, JetMarginSwapIdl]
    >(provider, [
      config.marginProgramId,
      config.metadataProgramId,
      config.marginPoolProgramId,
      config.marginSerumProgramId,
      config.marginSwapProgramId
    ])

    const programs: MarginPrograms = {
      margin: new Program(marginIdl, config.marginProgramId, provider),
      metadata: new Program(metadataIdl, config.metadataProgramId, provider),
      marginPool: new Program(marginPoolIdl, config.marginPoolProgramId, provider),
      marginSerum: new Program(marginSerumIdl, config.marginSerumProgramId, provider),
      marginSwap: new Program(marginSwapIdl, config.marginSwapProgramId, provider)
    }

    return programs
  }

  static getConfig(cluster: MarginCluster): MarginConfig {
    if (typeof cluster === "string") {
      // FIXME: Suble differences between configs as faucet and faucetLimit are sometimes undefined.
      // Remove `as MarginConfig` when there is an interface for the configs
      return MARGIN_CONFIG[cluster] as MarginConfig
    } else {
      return cluster
    }
  }
}
