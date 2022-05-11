import { JetMarginIdl } from ".."
import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"

export type MarginAccountData = TypeDef<AllAccountsMap<JetMarginIdl>["marginAccount"], IdlTypes<JetMarginIdl>>

/** A fixed-point decimal number 128 bits wide */
type Number128 = BN

export interface PriceInfo {
  /** The address of the oracle account this price data comes from */
  oracle: PublicKey
  /** The current price of the token */
  price: Number128
  /** A confidence value describing the expected accuracy of the price */
  confidence: Number128
}

enum PositionKind {
  /**The position is not worth anything */
  NoValue,
  /** The position contains a balance of available collateral */
  Deposit,
  /** The position contains a balance of tokens that are owed as a part of some debt. */
  Claim
}

export interface AccountPosition {
  /** The address of the token/mint of the asset */
  token: PublicKey
  /** The address of the account holding the tokens */
  address: PublicKey
  /** The address of the oracle which tracks the price/value of the asset */
  oracle: PublicKey
  /** The amount the tokens in the account */
  balance: BN
  /** The kind of balance this position contains */
  kind: PositionKind
  /** The exponent for the token value */
  exponent: number
  /** A weight on the value of this asset when counting collateral */
  collateralWeight: number
}

export interface AccountPositionList {
  positions: AccountPosition[]
}
