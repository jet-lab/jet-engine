import { Program, Provider } from "@project-serum/anchor"
import { fetchMultipleIdls } from "../common"
import {
  JetCluster,
  JetConfig,
  JetMarginIdl,
  JetMarginPoolIdl,
  JetMarginSerumIdl,
  JetMarginSwapIdl,
  JetMetadataIdl
} from ".."
import JET_CONFIG from "../margin/config.json"

export interface JetPrograms {
  config: JetConfig
  margin: Program<JetMarginIdl>
  metadata: Program<JetMetadataIdl>
  marginPool: Program<JetMarginPoolIdl>
  marginSerum: Program<JetMarginSerumIdl>
  marginSwap: Program<JetMarginSwapIdl>
}

export class JetClient {
  static async connect(provider: Provider, cluster: JetCluster): Promise<JetPrograms> {
    const config = JetClient.getConfig(cluster)

    const [marginIdl, metadataIdl, marginPoolIdl, marginSerumIdl, marginSwapIdl] = await fetchMultipleIdls<
      [JetMarginIdl, JetMetadataIdl, JetMarginPoolIdl, JetMarginSerumIdl, JetMarginSwapIdl]
    >(provider, [
      config.marginProgramId,
      config.metadataProgramId,
      config.marginPoolProgramId,
      config.marginSerumProgramId,
      config.marginSwapProgramId
    ])

    const programs: JetPrograms = {
      config,
      margin: new Program(marginIdl, config.marginProgramId, provider),
      metadata: new Program(metadataIdl, config.metadataProgramId, provider),
      marginPool: new Program(marginPoolIdl, config.marginPoolProgramId, provider),
      marginSerum: new Program(marginSerumIdl, config.marginSerumProgramId, provider),
      marginSwap: new Program(marginSwapIdl, config.marginSwapProgramId, provider)
    }

    return programs
  }

  static getConfig(cluster: JetCluster): JetConfig {
    if (typeof cluster === "string") {
      // FIXME: Suble differences between configs as faucet and faucetLimit are sometimes undefined.
      // Remove `as MarginConfig` when there is an interface for the configs
      return JET_CONFIG[cluster] as JetConfig
    } else {
      return cluster
    }
  }
}
