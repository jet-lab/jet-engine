import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { ReserveConfig } from "./reserve"

export type Market = {
  version: number
  quoteExponent: number
  quoteCurrency: number[]
  authorityBumpSeed: number[]
  authoritySeed: PublicKey
  marketAuthority: PublicKey
  owner: PublicKey
  quoteTokenMint: PublicKey
  flags: BN
  reserved: number[]
  reserves: number[]
}

export type Obligation = {
  version: number
  reserved0: number
  reserved1: number[]
  market: PublicKey
  owner: PublicKey
  cached: number[]
  collateral: number[]
  loans: number[]
}

export type Reserve = {
  version: number
  index: number
  exponent: number
  market: PublicKey
  pythOraclePrice: PublicKey
  pythOracleProduct: PublicKey
  tokenMint: PublicKey
  depositNoteMint: PublicKey
  loanNoteMint: PublicKey
  vault: PublicKey
  feeNoteVault: PublicKey
  dexSwapTokens: PublicKey
  dexOpenOrders: PublicKey
  dexMarket: PublicKey
  reserved0: number[]
  reserved1: number[]
  config: ReserveConfig
  state: number[]
}
