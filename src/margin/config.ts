import { Address } from "@project-serum/anchor"
import JET_CONFIG from "./config.json"

export type JetTokens = "BTC" | "ETH" | "SOL" | "USDC"
export type JetOracles = "BTC_USD" | "ETH_USD" | "SOL_USD"
export type JetMarkets = "BTC_USDC" | "ETH_USDC" | "SOL_USDC"

export type JetCluster = keyof typeof JET_CONFIG | JetConfig

export interface JetConfig {
  controlProgramId: Address
  marginProgramId: Address
  marginPoolProgramId: Address
  marginSerumProgramId: Address
  marginSwapProgramId: Address
  metadataProgramId: Address
  pythProgramId: Address
  serumProgramId: Address
  serumReferralAuthority: Address
  url: string
  tokens: Record<JetTokens, JetTokenConfig>
  oracles: Record<JetOracles, JetOracleConfig>
  markets: Record<JetMarkets, JetMarketConfig>
}

export interface JetTokenConfig {
  symbol: JetTokens
  decimals: number
  faucet?: Address
  faucetLimit?: number
  mint: Address
}

export interface JetOracleConfig {
  symbol: string
  address: Address
}

export interface JetMarketConfig {
  symbol: string
  market: Address
  baseMint: Address
  baseSymbol: string
  baseDecimals: number
  baseLotSize: number
  quoteMint: Address
  quoteSymbol: string
  quoteDecimals: number
  quoteLotSize: number
  requestQueue: Address
  eventQueue: Address
  bids: Address
  asks: Address
}
