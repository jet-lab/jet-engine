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
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import BN from "bn.js"
import { GovClient, GovRealm, VoteCount } from "."
import { Amount } from "../."
import { VoteOption } from "./types"

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
  vote: VoteOption
}

export class GovVoteRecord implements GovVoteRecordData {
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public proposal: PublicKey,
    public owner: PublicKey,
    public weight: BN,
    public vote: VoteOption
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

  // TODO: init_voter.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * TODO: question - GovVoter or GovVoteRecord
   * @memberof GovVoter
   */
   async initVoter(voter: GovVoter, realm: GovRealm, bumpSeed: number): Promise<string> {
    // TODO: fixme
    const tx = await this.initVoterTx(voter, realm, bumpSeed)
    return await this.client.program.provider.send(tx)
  }
          
  /**
   * Create the populated transaction instruction for `initVoter`.
   * @param {GovVoter} voter
   * @param {GovRealm} realm
   * @param {number} bumpSeed
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  async initVoterIx(voter: GovVoter, realm: GovRealm, bumpSeed: number): Promise<TransactionInstruction> {
    return this.client.program.instruction.initVoter(bumpSeed, {
      accounts: {
        owner: voter.owner,
        realm: realm.address,
        voter: voter.address,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
   async initVoterTx(voter: GovVoter, realm: GovRealm, bumpSeed: number): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    // tx.add(this.initVoterIx(voter, realm, bumpSeed))
    return tx
  }


  // TODO: deposit_token.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * @memberof GovVoter
   */
   async depositToken(realm: GovRealm, voter: GovVoter, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    // TODO: fixme
    const tx = await this.depositTokenTx(realm, voter, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }
          
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

  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
   async depositTokenTx(realm: GovRealm, voter: GovVoter, tokenAccount: PublicKey, amount: Amount): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.depositTokenIx(realm, voter, tokenAccount, amount))
    return tx
  }

  // TODO: withdraw_token.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * @memberof GovVoter
   */
   async withdrawToken(realm: GovRealm,
    voter: GovVoter,
    tokenAccount: PublicKey,
    bump: number,
    amount: Amount): Promise<string> {
    // TODO: fixme
    const tx = await this.withdrawTokenTx(realm, voter, tokenAccount, bump, amount)
    return await this.client.program.provider.send(tx)
  }
          
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

  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
   async withdrawTokenTx(    realm: GovRealm,
    voter: GovVoter,
    tokenAccount: PublicKey,
    bump: number,
    amount: Amount): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.withdrawTokenIx(realm, voter, tokenAccount, bump, amount))
    return tx
  }

  // TODO: cast_vote.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * @memberof GovVoter
   */
   async castVote(realm: GovRealm,
    voter: GovVoter,
    voteRecord: GovVoteRecord,
    bump: number,
    vote: VoteCount): Promise<string> {
    // TODO: fixme
    const tx = await this.castVoteTx(realm, voter, voteRecord, bump, vote)
    return await this.client.program.provider.send(tx)
  }
          
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
  castVoteIx(
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

  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
   async castVoteTx(realm: GovRealm,
    voter: GovVoter,
    voteRecord: GovVoteRecord,
    bump: number,
    vote: VoteCount): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.castVoteIx(realm, voter, voteRecord, bump, vote))
    return tx
  }

  // TODO: change_vote.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * @memberof GovVoter
   */
  async changeVote(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord, vote: VoteCount): Promise<string> {
  // TODO: fixme
  const tx = await this.changeVoteTx(realm, voter, voteRecord, vote)
  return await this.client.program.provider.send(tx)
}
      
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

  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
   async changeVoteTx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord, vote: VoteCount): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.changeVoteIx(realm, voter, voteRecord, vote))
    return tx
  }

  // TODO: rescind_vote.rs - tx
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<string>}
   * @memberof GovVoter
   */
    async rescindVote(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord): Promise<string> {
  // TODO: fixme
  const tx = await this.rescindVoteTx(realm, voter, voteRecord)
  return await this.client.program.provider.send(tx)
}
  
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
  
  /**
   * TODO: fixme
   * @param 
   * @param 
   * @returns {Promise<Transaction>}
   * @memberof GovVoter
   */
    async rescindVoteTx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc
  
    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.rescindVoteIx(realm, voter, voteRecord))
    return tx
  }
}
