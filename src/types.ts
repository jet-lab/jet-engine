import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { ReserveConfig } from "./reserve"

export type MarketAccount = {
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

export type ObligationAccount = {
  version: number
  _reserved0: number
  market: PublicKey
  owner: PublicKey
  _reserved1: number[]
  cached: number[]
  collateral: ObligationPositionStruct[]
  loans: ObligationPositionStruct[]
}

export type ObligationPositionStruct = {
  account: PublicKey
  amount: BN
  side: number
  reserveIndex: number
  _reserved: number[]
}

export type ReserveAccount = {
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
  reserved0: number | number[]
  reserved1: number | number[]
  config: ReserveConfig
  state: number[]
}
