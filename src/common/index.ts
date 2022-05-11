import { inflate } from "pako"
import { Address, Idl, Program, Provider, translateAddress } from "@project-serum/anchor"
import { decodeIdlAccount, idlAddress } from "@project-serum/anchor/dist/cjs/idl"
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"
import { PublicKey } from "@solana/web3.js"
import bs58 from "bs58"

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
export function findDerivedAccount(programId: Address, ...seeds: AccountSeed[]): PublicKey {
  const seedBytes = seeds.map(s => {
    if (typeof s == "string") {
      const pubkeyBytes = bs58.decodeUnsafe(s)
      if (!pubkeyBytes || pubkeyBytes.length !== 32) {
        return Buffer.from(s)
      } else {
        return translateAddress(s).toBytes()
      }
    } else if ("publicKey" in s) {
      return s.publicKey.toBytes()
    } else if ("toBytes" in s) {
      return s.toBytes()
    } else {
      return s
    }
  })

  const [address] = findProgramAddressSync(seedBytes, translateAddress(programId))
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

/**
 * Fetches multiple idls from the blockchain.
 *
 * In order to use this method, an IDL must have been previously initialized
 * via the anchor CLI's `anchor idl init` command.
 *
 * @param programIds The on-chain addresses of the programs.
 * @param provider   The network and wallet context.
 */
export async function fetchMultipleIdls<Idls extends Idl[] = Idl[]>(
  provider: Provider,
  programIds: Address[]
): Promise<Idls> {
  const idlAddresses: PublicKey[] = []
  for (const programId of programIds) {
    const programAddress = translateAddress(programId)

    const idlAddr = await idlAddress(programAddress)
    idlAddresses.push(idlAddr)
  }

  const accountInfos = await provider.connection.getMultipleAccountsInfo(idlAddresses)
  console.log(
    "Program Ids",
    programIds.map(id => translateAddress(id).toBase58())
  )
  console.log(
    "Idls",
    idlAddresses.map(id => id.toBase58())
  )

  const idls: Idl[] = []
  for (const accountInfo of accountInfos) {
    if (!accountInfo) {
      throw new Error("Idl does not exists")
    }
    const idlAccount = decodeIdlAccount(accountInfo.data.slice(8))
    const inflatedIdl = inflate(idlAccount.data)
    const idl = JSON.parse(utf8.decode(inflatedIdl))
    idls.push(idl)
  }
  return idls as Idls
}
