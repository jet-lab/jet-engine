import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import * as BL from "@solana/buffer-layout"
import { AccountInfo as TokenAccountInfo, MintInfo, MintLayout } from "@solana/spl-token"

/**
 * TODO:
 * @export
 * @param {string} [property]
 * @returns {PubkeyField}
 */
export function pubkeyField(property?: string): PubkeyField {
  return new PubkeyField(property)
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

export const parseTokenAccount = (account: Buffer, accountPubkey: PublicKey) => {
  const data = TokenAccountLayout.decode(account)

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

export const parseMintAccount = (mint: Buffer): MintInfo => {
  //convert? isInitialized 0/1 and freeAuthority - null | PublicKey.default
  return MintLayout.decode(mint) as MintInfo
}

export const bnToNumber = (bn: BN | undefined) => {
  return bn ? parseFloat(bn.toString()) : 0
}
