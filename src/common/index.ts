import { Idl, Program, Provider } from "@project-serum/anchor"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"
import { PublicKey } from "@solana/web3.js"

export * from "./tokenAmount"
export { TokenFaucet } from "./tokenFaucet"
export { AssociatedToken } from "./associatedToken"
export {
  parseMintAccount,
  parseTokenAccount,
  bnToNumber,
  bnToBigInt,
  bigIntToBn,
  bigIntToNumber
} from "./accountParser"
export { Hooks } from "./hooks"

export type AccountSeed = { toBytes(): Uint8Array } | { publicKey: PublicKey } | Uint8Array | string | Buffer

/**
 * Utility class to store a calculated PDA and
 * the bump nonce associated with it.
 * @export
 * @class DerivedAccount
 */
export interface DerivedAccount {
  address: PublicKey
  bump: number
}

/**
 * Derive a PDA from the argued list of seeds.
 * @param {PublicKey} programId
 * @param {AccountSeed[]} seeds
 * @returns {Promise<PublicKey>}
 * @memberof JetClient
 */
export function findDerivedAccount(programId: PublicKey, ...seeds: AccountSeed[]): PublicKey {
  const seedBytes = seeds.map(s => {
    if (typeof s == "string") {
      return Buffer.from(s)
    } else if ("publicKey" in s) {
      return s.publicKey.toBytes()
    } else if ("toBytes" in s) {
      return s.toBytes()
    } else {
      return s
    }
  })

  const [address] = findProgramAddressSync(seedBytes, programId)
  return address
}

/**
 * Derive a PDA and associated bump nonce from
 * the argued list of seeds.
 * @param {PublicKey} programId
 * @param {AccountSeed[]} seeds
 * @returns {Promise<DerivedAccount>}
 * @memberof JetClient
 */
export function findDerivedAccountWithBump(programId: PublicKey, ...seeds: AccountSeed[]): DerivedAccount {
  const seedBytes = seeds.map(s => {
    if (typeof s == "string") {
      return Buffer.from(s)
    } else if ("publicKey" in s) {
      return s.publicKey.toBytes()
    } else if ("toBytes" in s) {
      return s.toBytes()
    } else {
      return s
    }
  })

  const [address, bump] = findProgramAddressSync(seedBytes, programId)
  return { address, bump }
}

/**
 * Create a new client for interacting with the Jet staking program.
 * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
 * @param {PublicKey} programId
 * @returns {Promise<Program<Idl>>} The client
 * @memberof JetClient
 */
export async function connect<T extends Idl>(programId: PublicKey, provider: Provider): Promise<Program<T>> {
  const idl = await Program.fetchIdl<T>(programId, provider)

  if (!idl) {
    throw new Error("Program lacks an IDL account.")
  }

  return new Program(idl, programId, provider)
}
