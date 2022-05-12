import { BN } from "@project-serum/anchor"
import { AccountInfo, PublicKey } from "@solana/web3.js"
import * as BL from "@solana/buffer-layout"
import {
  Account,
  AccountLayout,
  AccountState,
  ACCOUNT_SIZE,
  Mint,
  MintLayout,
  MINT_SIZE,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidAccountSizeError,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token"

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
export class PubkeyField extends BL.Layout<PublicKey> {
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
export class NumberField extends BL.Layout<BN> {
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
 * Returns an unsigned number field that is 192 bits wide
 * @export
 * @param {string} [property]
 * @returns {NumberField}
 */
export function number192Field(property?: string): NumberField {
  return new NumberField(24, property)
}

/**
 * Returns an unsigned number field that is 128 bts wide
 * @export
 * @param {string} [property]
 * @returns {NumberField}
 */
export function number128Field(property?: string): NumberField {
  return new NumberField(16, property)
}

/**
 * Returns an unsigned number field that is 64 bits wide
 * @param property
 * @returns
 */
export function u64Field(property?: string): NumberField {
  return new NumberField(8, property)
}

/**
 * Decode a token account. From @solana/spl-token
 * @param {AccountInfo<Buffer>} inifo
 * @param {PublicKey} address
 * @returns
 */
export const parseTokenAccount = (info: AccountInfo<Buffer>, address: PublicKey): Account => {
  if (!info) throw new TokenAccountNotFoundError()
  if (!info.owner.equals(TOKEN_PROGRAM_ID)) throw new TokenInvalidAccountOwnerError()
  if (info.data.length != ACCOUNT_SIZE) throw new TokenInvalidAccountSizeError()

  const rawAccount = AccountLayout.decode(info.data)

  return {
    address,
    mint: rawAccount.mint,
    owner: rawAccount.owner,
    amount: rawAccount.amount,
    delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
    delegatedAmount: rawAccount.delegatedAmount,
    isInitialized: rawAccount.state !== AccountState.Uninitialized,
    isFrozen: rawAccount.state === AccountState.Frozen,
    isNative: !!rawAccount.isNativeOption,
    rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
    closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null
  }
}

/**
 * Decode a mint account
 * @param {AccountInfo<Buffer>} info
 * @param {PublicKey} address
 * @returns {Mint}
 */
export const parseMintAccount = (info: AccountInfo<Buffer>, address: PublicKey): Mint => {
  if (!info) throw new TokenAccountNotFoundError()
  if (!info.owner.equals(TOKEN_PROGRAM_ID)) throw new TokenInvalidAccountOwnerError()
  if (info.data.length != MINT_SIZE) throw new TokenInvalidAccountSizeError()

  const rawMint = MintLayout.decode(info.data)

  return {
    address,
    mintAuthority: rawMint.mintAuthorityOption ? rawMint.mintAuthority : null,
    supply: rawMint.supply,
    decimals: rawMint.decimals,
    isInitialized: rawMint.isInitialized,
    freezeAuthority: rawMint.freezeAuthorityOption ? rawMint.freezeAuthority : null
  }
}

/**
 * Convert BN to precise number
 * @param {BN} [bn]
 * @returns {number}
 */
export const bnToNumber = (bn: BN | null | undefined): number => {
  return bn ? parseFloat(bn.toString()) : 0
}

/**
 * Convert BigInt (spl) to BN (Anchor)
 * @param {bigint} [bigInt]
 * @returns {BN}
 */
export const bigIntToBn = (bigInt: bigint | null | undefined): BN => {
  return bigInt ? new BN(bigInt.toString()) : new BN(0)
}

export const bigIntToNumber = (bigint: bigint | null | undefined): number => {
  return bigint ? Number(bigint.toString()) : 0
}

/**
 * Convert BN (Anchor) to BigInt (spl)
 * @param {bn} [bn]
 * @returns {bigint}
 */
export const bnToBigInt = (bn: BN | number | null | undefined): bigint => {
  let result: bigint
  if (typeof bn === "number") {
    result = BigInt(bn)
  } else {
    result = bn ? BigInt(bn.toString()) : BigInt(0)
  }
  return result
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8")

export const utf8ToString = (bytes: number[], length: number) => {
  return textDecoder.decode(new Uint8Array(bytes.slice(0, length)))
}
export const stringToUtf8 = (string: string) => {
  return Array.from(textEncoder.encode(string))
}
