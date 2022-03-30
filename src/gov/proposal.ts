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
import BN from "bn.js"
import { GovClient, GovVoteRecord } from "."

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

type TimeNow = { now: Record<string, never> }
type TimeAt = { at: { value: BN } }
type TimeNever = { never: Record<string, never> }

export type Time = TimeNow | TimeAt | TimeNever

export interface VoteCount {
  yes: BN
  no: BN
  abstain: BN
}

export class GovProposal implements GovProposalData {
  /**
   * Creates an instance of GovProposal.
   * @private
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {PublicKey} realm
   * @param {PublicKey} owner
   * @param {number} createdTimestamp
   * @param {ProposalContent} content
   * @param {ProposalLifecycle} lifecycle
   * @param {VoteCount} count
   * @memberof GovProposal
   */
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

  /**
   * TODO:
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @returns {Promise<GovProposal>}
   * @memberof GovProposal
   */
  static async load(client: GovClient, address: PublicKey): Promise<GovProposal> {
    const data = await client.program.account.proposal.fetch(address)
    return this.decode(client, address, data)
  }

  /**
   * TODO:
   * @memberof GovProposal
   */
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

  /**
   * TODO:
   * @private
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {any} data
   * @returns {GovProposal}
   * @memberof GovProposal
   */
  private static decode(client: GovClient, address: PublicKey, data: any): GovProposal {
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

  // TODO: make_proposal.rs - checked
  // CREATE ME - static method for accessing the proposal address
  // Try: pass in proposal as a public key, the proposal data owner should have this key pair, client, `this` keyword and whatever that's needed
  /**
   * Creates the populated transaction instruction for a `initProposal`.
   * @param {GovProposal} proposalData
   * @param {ProposalContent} content
   * @param {ProposalLifecycle} lifecycle
   * @returns {Promise<TransactionInstruction>}
   * @memberof GovProposal
   */
  initProposalIx(
    proposalData: GovProposal,
    content: ProposalContent,
    lifecycle: ProposalLifecycle
  ): Promise<TransactionInstruction> {
    return this.client.program.methods
      .initProposal(content.name, content.description, lifecycle.activate, lifecycle.finalize)
      .accounts({
        owner: proposalData.owner,
        realm: proposalData.realm,
        proposal: proposalData.address,
        systemProgram: SystemProgram.programId
      })
      .instruction()
  }

  // TODO: edit_proposal.rs - checked
  /**
   * Creates the populated transaction instruction for a `editProposal`.
   * @param {GovProposal} proposalData
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalContent} content
   * @returns {Promise<TransactionInstruction>}
   * @memberof GovProposal
   */
  editProposalIx(
    proposalData: GovProposal,
    voteRecord: GovVoteRecord,
    content: ProposalContent
  ): Promise<TransactionInstruction> {
    return this.client.program.methods
      .editProposal(content.name, content.description)
      .accounts({
        owner: proposalData.owner,
        realm: proposalData.realm,
        voter: voteRecord.owner,
        proposal: proposalData.address
      })
      .instruction()
  }

  // TODO: transition_proposal.rs - checked
  /**
   * Creates the populated transaction instruction for a `transitionProposal`.
   * @param {GovProposalData} proposalData
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalLifecycle} event
   * @param {Time} when
   * @returns {Promise<TransactionInstruction>}
   * @memberof GovProposal
   */
  transitionProposalIx(
    proposalData: GovProposalData,
    voteRecord: GovVoteRecord,
    event: ProposalLifecycle,
    when: Time
  ): Promise<TransactionInstruction> {
    return this.client.program.methods
      .transitionProposal(event, when)
      .accounts({
        owner: proposalData.owner,
        realm: proposalData.realm,
        voter: voteRecord.owner,
        proposal: voteRecord.proposal
      })
      .instruction()
  }
}
