import { Address } from "@project-serum/anchor"
import JET_CONFIG from "./config.json"

export type JetTokens = "BTC" | "ETH" | "SOL" | "USDC"

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
  tokens: JetTokenConfig[]
  oracles: JetOracleConfig[]
  markets: JetMarketConfig[]
}

export interface JetTokenConfig {
  symbol: string
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
