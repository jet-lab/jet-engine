import { Program, Provider } from "@project-serum/anchor"
import { Commitment, ConfirmOptions, Connection, PublicKey } from "@solana/web3.js"
import { useMemo } from "react"
import { DerivedAccount } from "./associatedToken"

export * from "./tokenAmount"
export { Airdrop } from "./airdrop"
export { AssociatedToken } from "./associatedToken"
export { bnToNumber } from "./accountParser"
export { DerivedAccount } from "./associatedToken"

export type DerivedAccountSeed = { toBytes(): Uint8Array } | { publicKey: PublicKey } | Uint8Array | string

/**
 * Derive a PDA and associated bump nonce from
 * the argued list of seeds.
 * @param {DerivedAccountSeed[]} seeds
 * @returns {Promise<DerivedAccount>}
 * @memberof JetClient
 */
export async function findDerivedAccount(
  programId: PublicKey,
  ...seeds: DerivedAccountSeed[]
): Promise<DerivedAccount> {
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

  const [address, bumpSeed] = await PublicKey.findProgramAddress(seedBytes, programId)
  return new DerivedAccount(address, bumpSeed)
}

/**
 * Create a new client for interacting with the Jet staking program.
 * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
 * @returns {Promise<JetClient>} The client
 * @memberof JetClient
 */
export async function connect(provider: Provider, programId: PublicKey) {
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

export function useProvider(connection: Connection, wallet: any) {
  return useMemo(() => new Provider(connection, wallet, confirmOptions), [connection, wallet, confirmOptions])
}
