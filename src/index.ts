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

import { PublicKey } from "@solana/web3.js"
import * as anchor from "@project-serum/anchor"
import { u64 } from "@solana/spl-token"

export * from "./client"
export * from "./market"
export * from "./reserve"
export * from "./user"
export * from "./idl/jet"
export * from "./types"

export const PLACEHOLDER_ACCOUNT = PublicKey.default

// FIXME: this is probably different on devnet
export const DEX_ID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
export const DEX_ID_DEVNET = new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")

// FIXME: ???
export const JET_ID = new PublicKey("JPv1rCqrhagNNmJVM5J1he7msQ5ybtvE1nNuHpDHMNU")
export const JET_MARKET_ADDRESS = new PublicKey("9oiXzad28vLhT2TkFoVRRRcwYKrSF7E3XPUJpwcarCAo")
export const JET_MARKET_ADDRESS_DEVNET = new PublicKey(
  "2mt2XQS6kKgkE2MPR9fFoWDv5ZYYNXkVGxgg9c9jMPRU"
)

type AmountUnitsTokens = { tokens: Record<string, never> }
type AmountUnitsDepositNotes = { depositNotes: Record<string, never> }
type AmountUnitsLoanNotes = { loanNotes: Record<string, never> }

export type AmountUnits = AmountUnitsTokens | AmountUnitsDepositNotes | AmountUnitsLoanNotes

/**
 * TODO:
 * @export
 * @class Amount
 */
export class Amount {
  /**
   * Creates an instance of Amount.
   * @param {AmountUnits} units
   * @param {anchor.BN} value
   * @memberof Amount
   */
  constructor(public units: AmountUnits, public value: anchor.BN) {}

  /**
   * TODO:
   * @static
   * @param {(number | u64)} amount
   * @returns {Amount}
   * @memberof Amount
   */
  static tokens(amount: number | u64): Amount {
    return new Amount({ tokens: {} }, new anchor.BN(amount))
  }

  /**
   * TODO:
   * @static
   * @param {(number | u64)} amount
   * @returns {Amount}
   * @memberof Amount
   */
  static depositNotes(amount: number | u64): Amount {
    return new Amount({ depositNotes: {} }, new anchor.BN(amount))
  }

  /**
   * TODO:
   * @static
   * @param {(number | u64)} amount
   * @returns {Amount}
   * @memberof Amount
   */
  static loanNotes(amount: number | u64): Amount {
    return new Amount({ loanNotes: {} }, new anchor.BN(amount))
  }

  toRpcArg(): { units: never; value: anchor.BN } {
    return {
      units: this.units as never,
      value: this.value
    }
  }
}
