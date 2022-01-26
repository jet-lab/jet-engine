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

import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import BN from "bn.js"
import { GovClient, GovRealm, VoteCount } from "."
import { Amount } from "../."

export interface GovVoterData {
  address: PublicKey
  owner: PublicKey
  deposited: BN
  activeVotes: number
}

export class GovVoter implements GovVoterData {
  /**
   * Creates an instance of GovVoter.
   * @private
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {PublicKey} owner
   * @param {BN} deposited
   * @param {number} activeVotes
   * @memberof GovVoter
   */
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public owner: PublicKey,
    public deposited: BN,
    public activeVotes: number
  ) {}

  /**
   * TODO:
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @returns {Promise<GovVoter>}
   * @memberof GovVoter
   */
  static async load(client: GovClient, address: PublicKey): Promise<GovVoter> {
    const data = await client.program.account.voter.fetch(address)
    return this.decode(client, address, data)
  }

  /**
   * TODO:
   * @memberof GovVoter
   */
  async refresh() {
    const voter = await GovVoter.load(this.client, this.address)
    this.address = voter.address
    this.owner = voter.owner
    this.deposited = voter.deposited
    this.activeVotes = voter.activeVotes
  }

  /**
   * TODO:
   * @private
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {any} data
   * @returns {GovVoter}
   * @memberof GovVoter
   */
  private static decode(client: GovClient, address: PublicKey, data: any): GovVoter {
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
  /**
   * Creates an instance of GovVoteRecord.
   * @private
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {PublicKey} proposal
   * @param {PublicKey} owner
   * @param {BN} weight
   * @param {Vote} vote
   * @memberof GovVoteRecord
   */
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public proposal: PublicKey,
    public owner: PublicKey,
    public weight: BN,
    public vote: Vote
  ) {}

  /**
   * TODO:
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @returns {Promise<GovVoteRecord>}
   * @memberof GovVoteRecord
   */
  static async load(client: GovClient, address: PublicKey): Promise<GovVoteRecord> {
    const data = await client.program.account.voteRecord.fetch(address)
    return this.decode(client, address, data)
  }

  /**
   * TODO:
   * @memberof GovVoteRecord
   */
  async refresh() {
    const voteRecord = await GovVoteRecord.load(this.client, this.address)
    this.address = voteRecord.address
    this.owner = voteRecord.owner
    this.weight = voteRecord.weight
    this.vote = voteRecord.vote
  }

  /**
   * TODO:
   * @private
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {any} data
   * @returns {GovVoteRecord}
   * @memberof GovVoteRecord
   */
  private static decode(client: GovClient, address: PublicKey, data: any): GovVoteRecord {
    return new GovVoteRecord(client, address, data.proposal, data.owner, data.weight, data.vote)
  }

  // TODO: init_voter.rs - checked
  /**
   * Create the populated transaction instruction for `initVoter`.
   * @param {GovVoter} voter
   * @param {GovRealm} realm
   * @param {number} bumpSeed
   * @returns {TransactionInstruction}
   * @memberof GovVoteRecord
   */
  async createVoterIx(voter: GovVoter, realm: GovRealm, bumpSeed: number): Promise<TransactionInstruction> {
    return this.client.program.instruction.initVoter(bumpSeed, {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        voter: voter.address,
        systemProgram: SystemProgram.programId
      }
    })
  }

  // TODO: deposit_token.rs - checked
  /**
   * Create the populated transaction instruction for `depositToken`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  depositTokenIx(realm: GovRealm, voter: GovVoter, tokenAccount: PublicKey, amount: Amount): TransactionInstruction {
    return this.client.program.instruction.depositToken(amount.toRpcArg(), {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        vault: realm.vault,
        voter: voter.address,
        tokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  // TODO: withdraw_token.rs - checked
  /**
   * Create the populated transaction instruction for `withdrawToken`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {PublicKey} tokenAccount
   * @param {number} bump
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  withdrawTokenIx(
    realm: GovRealm,
    voter: GovVoter,
    tokenAccount: PublicKey,
    bump: number,
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.withdrawToken(bump, amount.toRpcArg(), {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        authority: realm.authority,
        vault: realm.vault,
        voter: voter.address,
        tokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  // TODO: cast_vote.rs - checked
  /**
   * Create the populated transaction instruction for `castVote`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @param {VoteCount} vote
   * @param {number} bump
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  voteIx(
    realm: GovRealm,
    voter: GovVoter,
    voteRecord: GovVoteRecord,
    bump: number,
    vote: VoteCount
  ): TransactionInstruction {
    return this.client.program.instruction.castVote(bump, vote, {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        voter: voter.address,
        proposal: voteRecord.proposal,
        voteRecord: voteRecord.address,
        systemProgram: SystemProgram.programId
      }
    })
  }

  // TODO: change_vote.rs - checked
  /**
   * Create the populated transaction instruction for `changeVote`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @param {VoteCount} vote
   * @param {PublicKey} governanceTokenMint
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  changeVoteIx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord, vote: VoteCount): TransactionInstruction {
    return this.client.program.instruction.changeVote(vote, {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        voter: voter.address,
        proposal: voteRecord.proposal,
        voteRecord: voteRecord.address
      }
    })
  }

  // TODO: rescind_vote.rs - checked
  /**
   * Creates the populated transaction instruction for a `rescindVote`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  rescindVoteIx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord): TransactionInstruction {
    return this.client.program.instruction.rescindVote({
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        voter: voter.address,
        proposal: voteRecord.proposal,
        voteRecord: voteRecord.address
      }
    })
  }
}
