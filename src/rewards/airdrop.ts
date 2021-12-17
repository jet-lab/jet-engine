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

import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { RewardsClient } from "./index"

export interface GovRewardsAirdropData {
  address: PublicKey
  rewardVault: PublicKey
  authority: PublicKey
  vestStartAt: BN
  vestEndAt: BN
  stakePool: PublicKey
  shortDesc: number[]
  vaultBump: [number]
  targetInfo: number[]
}

export class GovRewardsAirdrop implements GovRewardsAirdropData {
  private constructor(
    private client: RewardsClient,
    public address: PublicKey,
    public rewardVault: PublicKey,
    public authority: PublicKey,
    public vestStartAt: BN,
    public vestEndAt: BN,
    public stakePool: PublicKey,
    public shortDesc: number[],
    public vaultBump: [number],
    public targetInfo: number[]
  ) {}

  static async load(client: RewardsClient, address: PublicKey): Promise<GovRewardsAirdrop> {
    const data = await client.program.account.voter.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const Airdrop = await GovRewardsAirdrop.load(this.client, this.address)

    this.address = Airdrop.address
    this.rewardVault = Airdrop.rewardVault
    this.authority = Airdrop.authority
    this.vestStartAt = Airdrop.vestStartAt
    this.vestEndAt = Airdrop.vestEndAt
    this.stakePool = Airdrop.stakePool
    this.shortDesc = Airdrop.shortDesc
    this.vaultBump = Airdrop.vaultBump
    this.targetInfo = Airdrop.targetInfo
  }

  private static decode(client: RewardsClient, address: PublicKey, data: any) {
    return new GovRewardsAirdrop(
      client,
      address,
      data.rewardVault,
      data.authority,
      data.vestStartAt,
      data.vestEndAt,
      data.stakePool,
      data.shortDesc,
      data.vaultBump,
      data.targetInfo
    )
  }
}

// TODO: instructions IX & TX integrations
