/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
export * from "./staking"

const JET_GOV_STAKING_PROGRAM_ID = new PublicKey("JPLockxtkngHkaQT5AuRYow3HyUv5qWzmhwsCPd653n")

interface ToBytes {
  toBytes(): Uint8Array
}

interface HasPublicKey {
  publicKey: PublicKey
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string

/**
 * Utility class to store a calculated PDA and
 * the bump nonce associated with it.
 * @export
 * @class DerivedAccount
 */
export class DerivedAccount {
  /**
   * Creates an instance of DerivedAccount.
   * @param {PublicKey} address
   * @param {number} bumpSeed
   * @memberof DerivedAccount
   */
  constructor(public address: PublicKey, public bumpSeed: number) {}
}

export const StaticSeed = {
  CollateralMint: Buffer.from("collateral-mint"),
  VoteMint: Buffer.from("vote-mint"),
  Vault: Buffer.from("vault")
}

export class GovStakingClient {
  constructor(public program: Program) {}

  static async connect(provider: Provider): Promise<GovStakingClient> {
    const idl = await Program.fetchIdl(JET_GOV_STAKING_PROGRAM_ID, provider)
    return new GovStakingClient(new Program(idl as any, JET_GOV_STAKING_PROGRAM_ID))
  }

  async deriveCollateralMint(realm: PublicKey) {
    return await PublicKey.findProgramAddress([StaticSeed.CollateralMint, realm.toBuffer()], this.program.programId)
  }

  async deriveVoteMint(realm: PublicKey, wallet: PublicKey) {
    return await PublicKey.findProgramAddress(
      [StaticSeed.VoteMint, wallet.toBuffer(), realm.toBuffer()],
      this.program.programId
    )
  }

  async deriveVault(realm: PublicKey) {
    return await PublicKey.findProgramAddress([StaticSeed.Vault, realm.toBuffer()], this.program.programId)
  }

  /**
   * Derive a PDA and associated bump nonce from
   * the argued list of seeds.
   * @param {DerivedAccountSeed[]} seeds
   * @returns {Promise<DerivedAccount>}
   * @memberof JetClient
   */
  async findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount> {
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
    const [address, bumpSeed] = await PublicKey.findProgramAddress(seedBytes, this.program.programId)
    return new DerivedAccount(address, bumpSeed)
  }
}
