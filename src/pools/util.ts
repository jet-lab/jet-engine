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
import { AccountInfo, PublicKey } from "@solana/web3.js"
import type { ObligationPositionStruct } from "./types"
import { AccountInfo as TokenAccountInfo } from "@solana/spl-token"

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
 * @class NumberField
 * @extends {BL.Layout}
 */
export class NumberField extends BL.Layout {
  /**
   * Creates an instance of NumberField which decodes to a BN.
   * @param span The number of bytes in the number
   * @param property Field name within in a struct
   */
  constructor(span: number, property?: string) {
    super(span, property)
  }

  /**
   * TODO:
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {BN}
   * @memberof NumberField
   */
  decode(b: Uint8Array, offset?: number): BN {
    const start = offset ?? 0
    const data = b.slice(start, start + this.span)
    return new BN(data, undefined, "le")
  }

  /**
   * TODO:
   * @param {BN} src
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {number}
   * @memberof NumberField
   */
  encode(src: BN, b: Uint8Array, offset?: number): number {
    const start = offset ?? 0
    b.set(src.toArray("le"), start)
    return this.span
  }
}

/**
 * TODO:
 * @export
 * @class SignedNumberField
 * @extends {BL.Layout}
 */
export class SignedNumberField extends BL.Layout {
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
 * TODO:
 * @export
 * @class PubkeyField
 * @extends {BL.Layout}
 */
export class PubkeyField extends BL.Layout {
  /**
   * Creates an instance of PubkeyField.
   * @param {string} [property]
   * @memberof PubkeyField
   */
  constructor(property?: string) {
    super(32, property)
  }

  /**
   * TODO:
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {PublicKey}
   * @memberof PubkeyField
   */
  decode(b: Uint8Array, offset?: number): PublicKey {
    const start = offset ?? 0
    const data = b.slice(start, start + this.span)
    return new PublicKey(data)
  }

  /**
   * TODO:
   * @param {PublicKey} src
   * @param {Uint8Array} b
   * @param {number} [offset]
   * @returns {number}
   * @memberof PubkeyField
   */
  encode(src: PublicKey, b: Uint8Array, offset?: number): number {
    const start = offset ?? 0
    b.set(src.toBytes(), start)
    return this.span
  }
}

/**
 * Returns an unsigned number field that is 24 bytes wide
 * @export
 * @param {string} [property]
 * @returns {NumberField}
 */
export function numberField(property?: string): NumberField {
  return new NumberField(24, property)
}

/**
 * Returns an unsigned number field that is 8 bytes wide
 * @param property
 * @returns
 */
export function u64Field(property?: string): NumberField {
  return new NumberField(8, property)
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

/**
 * TODO:
 * @export
 * @param {string} [property]
 * @returns {PubkeyField}
 */
export function pubkeyField(property?: string): PubkeyField {
  return new PubkeyField(property)
}

const TokenAccountLayout = BL.struct([
  pubkeyField("mint"),
  pubkeyField("owner"),
  u64Field("amount"),
  BL.u32("delegateOption"),
  pubkeyField("delegate"),
  BL.u8("state"),
  BL.u32("isNativeOption"),
  u64Field("isNative"),
  u64Field("delegatedAmount"),
  BL.u32("closeAuthorityOption"),
  pubkeyField("closeAuthority")
])

export const parseTokenAccount = (account: AccountInfo<Buffer>, accountPubkey: PublicKey) => {
  const data = TokenAccountLayout.decode(account.data)

  // PublicKeys and BNs are currently Uint8 arrays and
  // booleans are really Uint8s. Convert them
  const decoded: TokenAccountInfo = {
    address: accountPubkey,
    mint: new PublicKey(data.mint),
    owner: new PublicKey(data.owner),
    amount: new BN(data.amount, undefined, "le"),
    delegate: (data as any).delegateOption ? new PublicKey(data.delegate) : null,
    delegatedAmount: new BN(data.delegatedAmount, undefined, "le"),
    isInitialized: (data as any).state != 0,
    isFrozen: (data as any).state == 2,
    isNative: !!(data as any).isNativeOption,
    rentExemptReserve: new BN(0, undefined, "le"), //  Todo: calculate. I believe this is lamports minus rent for wrapped sol
    closeAuthority: (data as any).closeAuthorityOption ? new PublicKey(data.closeAuthority) : null
  }
  return decoded
}

export const bnToNumber = (bn: BN) => {
  return parseFloat(bn.toString())
}
