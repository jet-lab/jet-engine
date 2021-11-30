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

import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"
import { GovClient } from "."

export interface GovVoterData {
  address: PublicKey
  owner: PublicKey
  deposited: BN
  activeVotes: number
}

export class GovVoter implements GovVoterData {
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public owner: PublicKey,
    public deposited: BN,
    public activeVotes: number
  ) {}

  static async load(client: GovClient, address: PublicKey): Promise<GovVoter> {
    const data = await client.program.account.voter.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const voter = await GovVoter.load(this.client, this.address)

    this.address = voter.address
    this.owner = voter.owner
    this.deposited = voter.deposited
    this.activeVotes = voter.activeVotes
  }

  private static decode(client: GovClient, address: PublicKey, data: any) {
    return new GovVoter(client, address, data.owner, data.deposited, data.activeVotes)
  }
}

export interface GovVoteRecordData {
  address: PublicKey
  proposal: PublicKey
  owner: PublicKey
  weight: BN
  vote: Vote
}

export type VoteYes = { yes: Record<string, never> }
export type VoteNo = { no: Record<string, never> }
export type VoteAbstain = { abstain: Record<string, never> }

export type Vote = VoteYes | VoteNo | VoteAbstain

export class GovVoteRecord implements GovVoteRecordData {
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public proposal: PublicKey,
    public owner: PublicKey,
    public weight: BN,
    public vote: Vote
  ) {}

  static async load(client: GovClient, address: PublicKey): Promise<GovVoteRecord> {
    const data = await client.program.account.voteRecord.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const voteRecord = await GovVoteRecord.load(this.client, this.address)

    this.address = voteRecord.address
    this.owner = voteRecord.owner
    this.weight = voteRecord.weight
    this.vote = voteRecord.vote
  }

  private static decode(client: GovClient, address: PublicKey, data: any) {
    return new GovVoteRecord(client, address, data.proposal, data.owner, data.weight, data.vote)
  }
}
