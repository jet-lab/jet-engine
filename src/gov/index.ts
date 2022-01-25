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

export * from "./proposal"
export * from "./realm"
export * from "./voter"

const JET_GOV_PROGRAM_ID = new PublicKey("5TBwvU5xoA13fzmZgWVgFBUmBz1YCdiq2AshDZpPn3AL") // FIXME: deploy program

export const StaticSeed = {
  RealmAuthority: Buffer.from("realm-authority"),
  Vault: Buffer.from("vault"),
  Voter: Buffer.from("voter")
}

export class GovClient {
  constructor(public program: Program) {}

  static async connect(provider: Provider): Promise<GovClient> {
    const idl = await Program.fetchIdl(JET_GOV_PROGRAM_ID, provider)
    return new GovClient(new Program(idl as any, JET_GOV_PROGRAM_ID))
  }

  deriveRealmAuthority(realm: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([StaticSeed.RealmAuthority, realm.toBuffer()], this.program.programId)
  }

  deriveVault(realm: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([StaticSeed.Vault, realm.toBuffer()], this.program.programId)
  }

  deriveVoter(realm: PublicKey, wallet: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([StaticSeed.Voter, wallet.toBuffer(), realm.toBuffer()], this.program.programId)
  }
}
