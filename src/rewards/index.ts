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

export * from "./airdrop"
export * from "./distribution"

const JET_REWARD_PROGRAM_ID = new PublicKey("JET777rQuPU8BatFbhp6irc1NAbozxTheBqNo25eLQP") 

export const StaticSeed = {
  Vault: Buffer.from("vault"),
}

export class RewardsClient {
  constructor(public program: Program) {}

  static async connect(provider: Provider): Promise<RewardsClient> {
    const idl = await Program.fetchIdl(JET_REWARD_PROGRAM_ID, provider)
    return new RewardsClient(new Program(idl as any, JET_REWARD_PROGRAM_ID))
  }

  async deriveVault(realm: PublicKey) { 
    return await PublicKey.findProgramAddress([StaticSeed.Vault, realm.toBuffer()], this.program.programId)
  }
}
