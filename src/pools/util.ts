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

import * as BL from "@solana/buffer-layout"
import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import type { ObligationPositionStruct } from "./types"

export enum StaticSeeds {
  Collateral = "collateral",
  Deposits = "deposits",
  DexOpenOrders = "dex-open-orders",
  DexSwapTokens = "dex-swap-tokens",
  FeeVault = "fee-vault",
  Loans = "loans",
  Obligation = "obligation",
  Vault = "vault"
}

export const parsePosition = (position: any): ObligationPositionStruct => ({
  account: new PublicKey(position.account),
  amount: new BN(position.amount),
  side: position.side,
  reserveIndex: position.reserveIndex,
  _reserved: []
})

/**
 * TODO:
 * @export
 * @class SignedNumberField
 * @extends {BL.Layout}
 */
export class SignedNumberField extends BL.Layout<BN> {
  /**
   * Creates an instance of SignedNumberField.
   * @param {number} span
   * @param {string} [property]
   * @memberof SignedNumberField
   */
  constructor(span: number, property?: string) {
    super(span, property)
  }

  /**
   * TODO:
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {BN}
   * @memberof SignedNumberField
   */
  decode(b: Uint8Array, offset?: number): BN {
    const start = offset == undefined ? 0 : offset
    const data = b.slice(start, start + this.span)
    return new BN(data, undefined, "le").fromTwos(this.span * 8)
  }

  /**
   * TODO:
   * @param {BN} src
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {number}
   * @memberof SignedNumberField
   */
  encode(src: BN, b: Uint8Array, offset?: number): number {
    const start = offset == undefined ? 0 : offset
    b.set(src.toTwos(this.span * 8).toArray("le"), start)

    return this.span
  }
}

/**
 * Returns a signed number field that is 8 bytes wide
 * @export
 * @param {string} [property]
 * @returns {SignedNumberField}
 */
export function i64Field(property?: string): SignedNumberField {
  return new SignedNumberField(8, property)
}
