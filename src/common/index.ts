import { PublicKey } from "@solana/web3.js"
import { DerivedAccount } from ".."

export * from "./airdrop"
export * from "./tokenAmount"
export { bnToNumber } from "./accountParser"

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
