import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { GovClient, GovVoter, GovVoteRecord } from "."


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
  activate?: BN
  finalize?: BN
}

// TODO: Ask questions - should this be here or voter?
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

  static async load(client: GovClient, address: PublicKey): Promise<GovProposal> {
    const data = await client.program.account.proposal.fetch(address)
    return this.decode(client, address, data)
  }

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

  // TODO: propose.rs
  /**
   * Creates the populated transaction instruction for a `proposal`.
   * @param {GovProposalData} proposalData
   * @param {ProposalContent} content
   * @param {ProposalLifecycle} lifecycle
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
   makeProposalIx(proposalData: GovProposalData, content: ProposalContent, lifecycle: ProposalLifecycle): TransactionInstruction {
    return this.client.program.instruction.propose(content.name, content.description, lifecycle.activate, lifecycle.finalize, {
      accounts: {
        realm: proposalData.realm,
        owner: proposalData.owner,
        // TODO: Double check - how to load the proposal program?
        proposal: this.address, 
        payer: proposalData.owner,
        systemProgram: SystemProgram.programId,
      }
    })
  } 
  
  // TODO: edit_draft.rs
  /**
   * Creates the populated transaction instruction for a `editProposal`.
   * @param {GovProposalData} proposalData
   * @param {GovVoter} voter
   * @param {ProposalContent} content
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
   editProposalIx(proposalData: GovProposalData, voter: GovVoter, content: ProposalContent): TransactionInstruction {
    return this.client.program.instruction.editDraft(content.name, content.description, {
      accounts: {
        realm: proposalData.realm,
        owner: proposalData.owner,
        // TODO: Double check -  how to load the proposal, voter program?
        proposal: this.address,
        voter: voter.address
      }
    })
  } 
  
  // TODO: rescind.rs
  /**
   * Creates the populated transaction instruction for a `rescind`.
   * @param {GovProposalData} proposalData
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
   rescindProposalIx(proposalData: GovProposalData, voter: GovVoter, voteRecord: GovVoteRecord): TransactionInstruction {
    return this.client.program.instruction.rescind( {
      accounts: {
        realm: proposalData.realm,
        owner: proposalData.owner,
        // TODO: Double check -  how to load the proposal, voter, voteRecord program?
        proposal: this.address,
        voter: voter.address,
        voteRecord: voteRecord.address,
      }
    })
  } 

  // TODO: transition_proposal.rs
  /**
   * Creates the populated transaction instruction for a `transitionProposal`.
   * @param {GovProposalData} proposalData
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalLifecycle} lifecycle
   * @returns {TransactionInstruction}
   * @memberof GovProposal
   */
   transitionProposalIx(proposalData: GovProposalData, voter: GovVoter, voteRecord: GovVoteRecord, lifecycle: ProposalLifecycle): TransactionInstruction {
    return this.client.program.instruction.transitionProposal(lifecycle, proposalData.createdTimestamp, {
      accounts: {
        realm: proposalData.realm,
        owner: proposalData.owner,
        // TODO: Double check -  how to load the proposal, voter, voteRecord program?
        proposal: this.address,
        voter: voter.address,
        voteRecord: voteRecord.address,
      }
    })
  }   
}
