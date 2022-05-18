import { JetMarginIdl } from ".."
import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"
import * as BL from "@solana/buffer-layout"
import { number128Field, pubkeyField, u64Field } from "../common/accountParser"
import { i64Field } from "../pools/util"

export type MarginAccountData = TypeDef<AllAccountsMap<JetMarginIdl>["marginAccount"], IdlTypes<JetMarginIdl>>

export interface PriceInfo {
  /** The current price. i64 */
  value: BN

  /** The timestamp the price was valid at. u64 */
  timestamp: BN

  /** The exponent for the price value */
  exponent: number

  /** Flag indicating if the price is valid for the position  */
  isValid: number

  _reserved: Uint8Array
}

const PriceInfoLayout = BL.struct<PriceInfo>([
  i64Field("value"),
  u64Field("timestamp"),
  BL.s32("exponent"),
  BL.u8("isValid"),
  BL.blob(3, "_reserved")
])
console.assert(PriceInfoLayout.span === 24, "Unexpected PriceInfoLayout span", PriceInfoLayout.span, "expected", 24)

export interface AccountPosition {
  /// The address of the token/mint of the asset */
  token: PublicKey

  /// The address of the account holding the tokens. */
  address: PublicKey

  /// The address of the adapter managing the asset */
  adapter: PublicKey

  /// The current value of this position */
  value: BN

  /// The amount of tokens in the account */
  balance: BN

  /// The timestamp of the last balance update */
  balanceTimestamp: BN

  /// The current price/value of each token */
  price: PriceInfo

  /// The kind of balance this position contains */
  kind: number

  /// The exponent for the token value */
  exponent: number

  /// A weight on the value of this asset when counting collateral */
  collateralWeight: number

  /// The max staleness for the account balance (seconds) */
  collateralMaxStaleness: BN

  _reserved: Uint8Array
}

const AccountPositionLayout = BL.struct<AccountPosition>([
  pubkeyField("token"),
  pubkeyField("address"),
  pubkeyField("adapter"),
  number128Field("value"),
  u64Field("balance"),
  u64Field("balanceTimestamp"),
  PriceInfoLayout.replicate("price"),
  BL.u32("kind"),
  BL.s16("exponent"),
  BL.u16("collateralWeight"),
  u64Field("collateralMaxStaleness"),
  BL.blob(24, "_reserved")
])
console.assert(
  AccountPositionLayout.span === 192,
  "Unexpected AccountPositionLayout span",
  AccountPositionLayout.span,
  "expected",
  192
)

export interface AccountPositionKey {
  /* The address of the mint for the position token */
  mint: PublicKey

  /* The array index where the data for this position is located */
  index: BN
}

const AccountPositionKeyLayout = BL.struct<AccountPositionKey>([pubkeyField("mint"), u64Field("index")])
console.assert(
  AccountPositionKeyLayout.span === 40,
  "Unexpected AccountPositionKeyLayout span",
  AccountPositionKeyLayout.span,
  "expected",
  40
)

export interface AccountPositionList {
  length: BN
  map: AccountPositionKey[]
  positions: AccountPosition[]
}

export const AccountPositionListLayout = BL.struct<AccountPositionList>([
  u64Field("length"),
  BL.seq(AccountPositionKeyLayout, 32, "map"),
  BL.seq(AccountPositionLayout, 32, "positions")
])
console.assert(
  AccountPositionListLayout.span === 7432,
  "Unexpected AccountPositionListLayout span",
  AccountPositionListLayout.span,
  "expected",
  7432
)
