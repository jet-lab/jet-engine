import * as BL from '@solana/buffer-layout'
import { BN } from '@project-serum/anchor'
import { PublicKey } from '@solana/web3.js'

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
    const start = offset == undefined ? 0 : offset
    const data = b.slice(start, start + this.span)

    return new BN(data)
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
    const start = offset == undefined ? 0 : offset
    b.set(src.toArray(), start)

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
    const start = offset == undefined ? 0 : offset
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
    const start = offset == undefined ? 0 : offset
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
 * TODO:
 * @export
 * @param {string} [property]
 * @returns {PubkeyField}
 */
export function pubkeyField(property?: string): PubkeyField {
  return new PubkeyField(property)
}
