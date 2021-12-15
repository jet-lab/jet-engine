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
import { GovStakingClient } from "."
import { DistributionKind } from "./types"

export interface GovRewardsDistributionData {
  address: PublicKey
  authority: PublicKey
  vault: PublicKey
  vaultBump: [number]
  targetAccount: PublicKey
  targetAmount: BN
  distributed: BN
  beginAt: BN
  endAt: BN
  kind: DistributionKind
}



export class GovRewardsDistribution implements GovRewardsDistributionData {
  private constructor(
    private client: GovStakingClient,
    public address: PublicKey,
    public authority: PublicKey,
    public vault: PublicKey,
    public vaultBump: [number],
    public targetAccount: PublicKey,
    public targetAmount: BN,
    public distributed: BN,
    public beginAt: BN,
    public endAt: BN,
    public kind: DistributionKind,
  ) {}

  static async load(client: GovStakingClient, address: PublicKey): Promise<GovRewardsDistribution> {
    const data = await client.program.account.voter.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const distribution = await GovRewardsDistribution.load(this.client, this.address)

    this.address = distribution.address
    this.authority = distribution.authority
    this.vault = distribution.vault
    this.vaultBump = distribution.vaultBump
    this.targetAccount = distribution.targetAccount
    this.targetAmount = distribution.targetAmount
    this.distributed = distribution.distributed
    this.beginAt = distribution.beginAt
    this.endAt = distribution.endAt
    this.kind = distribution.kind
  }

  private static decode(client: GovStakingClient, address: PublicKey, data: any) {
    return new GovRewardsDistribution(client, address, data.authority, data.vault, data.vaultBump, data.targetAccount, data.targetAmount, data.distributed, data.beginAt, data.endAt, data.kind)
  }
}
