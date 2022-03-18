import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import * as BL from "@solana/buffer-layout"
import * as BLU from "@solana/buffer-layout-utils"
import { TokenAccountInfo, Mint, RawTokenAccountInfo, RawMint } from "./types"

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
 * TODO: fix <any> type
 * @export
 * @class PubkeyField
 * @extends {BL.Layout}
 */
export class PubkeyField extends BL.Layout<any> {
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
 * TODO: fix <any> type
 * @export
 * @class NumberField
 * @extends {BL.Layout}
 */
export class NumberField extends BL.Layout<any> {
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
 * TODO: fix <any> type
 * @export
 * @class SignedNumberField
 * @extends {BL.Layout}
 */
export class SignedNumberField extends BL.Layout<any> {
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

const RawTokenAccountLayout = BL.struct<RawTokenAccountInfo>([
  BLU.publicKey("mint"),
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

/** Buffer layout for de/serializing a mint */
export const RawMintLayout = BL.struct<RawMint>([
  BL.u32("mintAuthorityOption"),
  BLU.publicKey("mintAuthority"),
  u64Field("supply"),
  BL.u8("decimals"),
  BLU.bool("isInitialized"),
  BL.u32("freezeAuthorityOption"),
  BLU.publicKey("freezeAuthority")
])

/**
 * Decode a token account
 * @param {Buffer} account
 * @param {PublicKey} accountPubkey
 * @returns
 */
export const parseTokenAccount = (account: Buffer, accountAddress: PublicKey): TokenAccountInfo => {
  const data = RawTokenAccountLayout.decode(account)

  // PublicKeys and BNs are currently Uint8 arrays and
  // booleans are really Uint8s. Convert them
  const decoded: TokenAccountInfo = {
    address: accountAddress,
    mint: new PublicKey(data.mint),
    owner: new PublicKey(data.owner),
    amount: new BN(data.amount, undefined, "le"),
    delegate: new PublicKey(data.delegate),
    delegatedAmount: new BN(data.delegatedAmount, undefined, "le"),
    isInitialized: (data as any).state != 0,
    isFrozen: (data as any).state == 2,
    isNative: !!(data as any).isNativeOption,
    rentExemptReserve: new BN(0, undefined, "le"), //  Todo: calculate. I believe this is lamports minus rent for wrapped sol
    closeAuthority: new PublicKey(data.closeAuthority)
  }
  return decoded
}

/**
 * Decode a mint account
 * @param {Buffer} mint
 * @param {PublicKey} mintAddress
 * @returns {Mint}
 */
export const parseMintAccount = (mint: Buffer, mintAddress: PublicKey): Mint => {
  const data = RawMintLayout.decode(mint)

  const decoded: Mint = {
    address: mintAddress,
    mintAuthority: new PublicKey(data.mintAuthority),
    supply: new BN(data.supply),
    decimals: data.decimals,
    isInitialized: data.isInitialized,
    freezeAuthority: data.freezeAuthority
  }

  return decoded
}

/**
 * Convert BN to precise number
 * @param {BN} [bn]
 * @returns {number}
 */
export const bnToNumber = (bn: BN | null | undefined): number => {
  return bn ? parseFloat(bn.toString()) : 0
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8")

export const utf8ToString = (bytes: number[], length: number) => {
  return textDecoder.decode(new Uint8Array(bytes.slice(0, length)))
}
export const stringToUtf8 = (string: string) => {
  return Array.from(textEncoder.encode(string))
}
