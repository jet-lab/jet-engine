/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { ReserveConfig } from "./reserve"
import { TokenAmount } from ".."

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

export interface Asset {
  tokenMintPubkey: PublicKey,
  walletTokenPubkey: PublicKey,
  walletTokenExists: boolean,
  walletTokenBalance: TokenAmount,
  depositNotePubkey: PublicKey,
  depositNoteBump: number,
  depositNoteExists: boolean,
  depositNoteBalance: TokenAmount,
  depositBalance: TokenAmount,
  depositNoteDestPubkey: PublicKey,
  depositNoteDestBump: number,
  depositNoteDestExists: boolean,
  depositNoteDestBalance: TokenAmount,
  loanNotePubkey: PublicKey,
  loanNoteBump: number,
  loanNoteExists: boolean,
  loanNoteBalance: TokenAmount,
  loanBalance: TokenAmount,
  collateralNotePubkey: PublicKey,
  collateralNoteBump: number,
  collateralNoteExists: boolean,
  collateralNoteBalance: TokenAmount,
  collateralBalance: TokenAmount,
  maxDepositAmount: number,
  maxWithdrawAmount: number,
  maxBorrowAmount: number,
  maxRepayAmount: number,
};
