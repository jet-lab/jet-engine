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

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { GovClient, GovRealm, GovVoteRecord } from "."
import { Time, ProposalAccount } from "./types"

export interface GovProposalData {
  realm: PublicKey
  owner: PublicKey
  createdTimestamp: number
  content: ProposalContent
  lifecycle: ProposalLifecycle
  count: VoteCount
}

export interface ProposalContent {
  name: string
  description: string
}

export interface ProposalLifecycle {
  activate?: Time
  finalize?: Time
}

export interface ProposalEvent {
  activate: Record<string, never>
  finalize: Record<string, never>
}

// TODO: question - what is the difference between this Proposal's VoteCount and Voter's Vote2 enum (named VoteOption in types.ts)
export interface VoteCount {
  yes: BN
  no: BN
  abstain: BN
}

export class GovProposal implements GovProposalData {
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public realm: PublicKey,
    public owner: PublicKey,
    public createdTimestamp: number,
    public content: ProposalContent,
    public lifecycle: ProposalLifecycle,
    public count: VoteCount
  ) {}

  static async load(connection: Connection, address: PublicKey): Promise<GovProposal> {
    // connect with spl directly, give buffer with public key -proposalPubKey
    const info = await connection.getAccountInfo(address)
    // connect with anchor
    // const data = await client.program.account.proposal.fetch(address)
    return this.decode(proposalInfo)
  }

  // TODO: create loadMultiple(client, realm) - done
  /**
   * Return all `Proposal` program accounts that are associated with the realm.
   * @param client The client to fetch data
   * @param realm The realm that contains all proposals
   * @returns
   */
  // TODO: question -- currently can't access multiple proposals,
  // TODO: possible solution - if realm account struct stores proposals[], then we can loadMultiple like following
  // static async loadMultiple(client: GovClient, realm: GovRealm) {
  //   const proposalAddresses = realm.proposals
  //     .map(GovProposals => GovProposals.proposal)
  //     .filter(proposalAddress => !proposalAddress.equals(PublicKey.default))
  //   const proposalInfos = (await client.program.account.realm.fetchMultiple(proposalAddresses)) as ProposalAccount[]

  //   const nullProposalIndex = proposalInfos.findIndex(info => info == null)
  //   if (nullProposalIndex !== -1) {
  //     throw new Error(`Governance Proposal at address ${proposalAddresses[nullProposalIndex]} is invalid.`)
  //   }

  //   const proposals = proposalInfos.map((proposalInfo, i) => {
  //     return this.decode(client, proposalAddresses[i], proposalInfo)
  //   })

  //   return proposals
  // }

  async refresh() {
    const proposal = await GovProposal.load(this.client, this.address)

    this.address = proposal.address
    this.realm = proposal.realm
    this.owner = proposal.owner
    this.createdTimestamp = proposal.createdTimestamp
    this.content = proposal.content
    this.lifecycle = proposal.lifecycle
    this.count = proposal.count
  }

  private static decode(client: GovClient, address: PublicKey, data: any) {
    return new GovProposal(
      client,
      address,
      data.realm,
      data.owner,
      data.createdTimestamp,
      data.content,
      data.lifecycle,
      data.count
    )
  }

  // TODO: init_proposal.rs - tx
  // CREATE ME - static method for accessing the proposal address
  // Try: pass in proposal as a public key, the proposal data owner should have this key pair, client, `this` keyword and whatever that's needed
  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<string>}
   * @memberof GovProposal
   */
  async initProposal(
    proposalData: GovProposal,
    content: ProposalContent,
    lifecycle: ProposalLifecycle
  ): Promise<string> {
    // TODO: fixme
    const tx = await this.initProposalTx(proposalData, content, lifecycle)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `initProposal`.
   * @param {GovProposal} proposalData
   * @param {ProposalContent} content
   * @param {ProposalLifecycle} lifecycle
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
  initProposalIx(
    proposalData: GovProposal,
    content: ProposalContent,
    lifecycle: ProposalLifecycle
  ): TransactionInstruction {
    return this.client.program.instruction.initProposal(
      content.name,
      content.description,
      lifecycle.activate,
      lifecycle.finalize,
      {
        accounts: {
          owner: proposalData.owner,
          realm: proposalData.realm,
          proposal: proposalData.address,
          systemProgram: SystemProgram.programId
        }
      }
    )
  }

  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovProposal
   */
  async initProposalTx(
    proposalData: GovProposal,
    content: ProposalContent,
    lifecycle: ProposalLifecycle
  ): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed to initialize proposal
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.initProposalIx(proposalData, content, lifecycle))
    return tx
  }

  // TODO: edit_proposal.rs - tx
  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<string>}
   * @memberof GovProposal
   */
  async editProposal(proposalData: GovProposal, voteRecord: GovVoteRecord, content: ProposalContent): Promise<string> {
    // TODO: fixme
    const tx = await this.editProposalTx(proposalData, voteRecord, content)
    return await this.client.program.provider.send(tx)
  }
  /**
   * Creates the populated transaction instruction for a `editProposal`.
   * @param {GovProposal} proposalData
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalContent} content
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
  editProposalIx(
    proposalData: GovProposal,
    voteRecord: GovVoteRecord,
    content: ProposalContent
  ): TransactionInstruction {
    return this.client.program.instruction.editProposal(content.name, content.description, {
      accounts: {
        owner: proposalData.owner,
        realm: proposalData.realm,
        voter: voteRecord.owner,
        proposal: proposalData.address
      }
    })
  }

  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovProposal
   */
  async editProposalTx(
    proposalData: GovProposal,
    voteRecord: GovVoteRecord,
    content: ProposalContent
  ): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.editProposalIx(proposalData, voteRecord, content))
    return tx
  }

  // TODO: transition_proposal.rs - tx
  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<string>}
   * @memberof GovProposal
   */
  async transitionProposal(
    proposalData: GovProposalData,
    voteRecord: GovVoteRecord,
    event: ProposalLifecycle,
    when: Time
  ): Promise<string> {
    // TODO: fixme
    const tx = await this.transitionProposalTx(proposalData, voteRecord, event, when)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `transitionProposal`.
   * @param {GovProposalData} proposalData
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalLifecycle} event
   * @param {Time} when
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
  transitionProposalIx(
    proposalData: GovProposalData,
    voteRecord: GovVoteRecord,
    event: ProposalLifecycle,
    when: Time
  ): TransactionInstruction {
    return this.client.program.instruction.transitionProposal(event, when, {
      accounts: {
        owner: proposalData.owner,
        realm: proposalData.realm,
        voter: voteRecord.owner,
        proposal: voteRecord.proposal
      }
    })
  }

  /**
   * TODO: fixme
   * @param
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovProposal
   */
  async transitionProposalTx(
    proposalData: GovProposalData,
    voteRecord: GovVoteRecord,
    event: ProposalLifecycle,
    when: Time
  ): Promise<Transaction> {
    // TODO: fixme
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.transitionProposalIx(proposalData, voteRecord, event, when))
    return tx
  }
}
