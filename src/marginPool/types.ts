import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"

export interface MarginPoolConfig {
  /** Space for binary settings */
  flags: number //low case
  /** The utilization rate at which first regime transitions to second */
  utilizationRate1: number
  /** The utilization rate at which second regime transitions to third */
  utilizationRate2: number
  /** The lowest borrow rate */
  borrowRate0: number
  /** The borrow rate at the transition point from first to second regime */
  borrowRate1: number
  /** The borrow rate at the transition point from second to third regime */
  borrowRate2: number
  /** The highest possible borrow rate */
  borrowRate3: number
  /** The fee rate applied to interest payments collected */
  managementFeeRate: number
  /** The threshold for fee collection */
  managementFeeCollectThreshold: BN
}

type UnixTimeStamp = number

export interface MarginPoolAccount {
  version: number
  /** The bump seed used to create the pool address */
  poolBump: number
  /** The address of the vault account, which has custody of the pool's tokens */
  vault: PublicKey
  /** The address of the account to deposit collected fees, represented as deposit notes */
  feeDestination: PublicKey
  /** The address of the mint for deposit notes */
  depositNoteMint: PublicKey
  /** The address of the oracle for deposit notes */
  depositNoteOracle: PublicKey
  /** The address of the mint for the loan notes */
  loanNoteMint: PublicKey
  /** The address of the oracle for loan notes */
  loadNoteOracle: PublicKey
  /** The token the pool allows lending and borrowing on */
  tokenMint: PublicKey
  /** The address of the pyth oracle with price information for the token */
  tokenPriceOracle: PublicKey
  /** The address of this pool */
  address: PublicKey
  /** The configuration of the pool */
  config: MarginPoolConfig
  /** The total amount of tokens borrowed, that need to be repaid to the pool */
  borrowedTokens: number[]
  /** The total amount of tokens in the pool that's reserved for collection as fees */
  uncollectedFees: number[]
  /** The total amount of tokens available in the pool's vault */
  depositTokens: BN
  /** The total amount of notes issued to depositors of tokens */
  depositNotes: BN
  /** The total amount of notes issued to borrowers of tokens */
  loanNotes: BN
  /** The time the interest was last accrued up to in seconds */
  accruedUntil: UnixTimeStamp
}

export interface MarginPoolOracle {
  /** The mint for the token being priced */
  tokenMint: PublicKey
  /** The current price/value of the token */
  price: number[]
  /** The lower bound of the price based on the confidence */
  priceLower: number[]
  /** The upper bound of the price based on the confidence */
  priceUpper: number[]
}

export interface CreatePoolParams {
  /** The bump seed for the pool address */
  poolBump: number
  /** The bump seed for the vault account */
  vaultBump: number
  /** The bump seed for the deposit note mint */
  depositNoteMintBump: number
  /** The bump seed for the deposit note oracle */
  depositNoteOracleBump: number
  /** The bump seed for the loan note mint */
  loanNoteMintBump: number
  /** The bump seed for the loan note oracle */
  loadNoteOracleBump: number
  /** The destination account for any collected fees */
  feeDestination: PublicKey
  /** The configuration for the pool */
  config: MarginPoolConfig
}
