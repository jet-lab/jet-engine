import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { GovClient } from ".";

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
  ) { }

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
}