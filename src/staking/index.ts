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

export const StaticSeed = {
  CollateralMint: Buffer.from("collateral-mint"),
  VoteMint: Buffer.from("collateral-mint"),
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
}
