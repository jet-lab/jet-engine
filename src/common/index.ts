import { Idl, Program, Provider } from "@project-serum/anchor"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"
import { Commitment, ConfirmOptions, Connection, PublicKey } from "@solana/web3.js"
import { useMemo } from "react"

export * from "./tokenAmount"
export * from "./tokenMintKeys"
export { JetTokenAccount, JetMint } from "./types"
export { TokenFaucet } from "./tokenFaucet"
export { AssociatedToken } from "./associatedToken"
export { bnToNumber } from "./accountParser"
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

const confirmOptions: ConfirmOptions = {
  skipPreflight: true,
  commitment: "recent" as Commitment,
  preflightCommitment: "recent"
}

/**
 * TODO:
 * @export
 * @param {Connection} connection
 * @param {any} wallet
 * @returns {Provider}
 */
export function useProvider(connection: Connection, wallet: any): Provider {
  return useMemo(() => new Provider(connection, wallet, confirmOptions), [connection, wallet, confirmOptions])
}

export function checkNull(value: any): void {
  if (value === null) {
    throw new Error(`Invalid ${value}`)
  }
}
