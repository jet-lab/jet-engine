import { Idl, Program, Provider } from "@project-serum/anchor"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"
import { Commitment, ConfirmOptions, Connection, PublicKey } from "@solana/web3.js"
import { useMemo } from "react"
import { DerivedAccount } from "./associatedToken"

export * from "./tokenAmount"
export { TokenFaucet } from "./tokenFaucet"
export { AssociatedToken } from "./associatedToken"
export { bnToNumber } from "./accountParser"
export { DerivedAccount } from "./associatedToken"

export type DerivedAccountSeed = { toBytes(): Uint8Array } | { publicKey: PublicKey } | Uint8Array | string

/**
 * Derive a PDA and associated bump nonce from
 * the argued list of seeds.
 * @param {PublicKey} programId
 * @param {DerivedAccountSeed[]} seeds
 * @returns {Promise<DerivedAccount>}
 * @memberof JetClient
 */
export function findDerivedAccount(programId: PublicKey, ...seeds: DerivedAccountSeed[]): DerivedAccount {
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
export async function connect(programId: PublicKey, provider: Provider): Promise<Program<Idl>> {
  const idl = await Program.fetchIdl(programId, provider)

  if (!idl) {
    throw new Error("Program lacks an IDL account.")
  }
  const program = new Program(idl, programId, provider)

  return program
}

const confirmOptions: ConfirmOptions = {
  skipPreflight: false,
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
