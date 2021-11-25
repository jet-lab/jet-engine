import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import BN from "bn.js"
import { GovClient, GovRealm, StaticSeed, VoteCount } from "."
import { Amount } from "../."

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

  // TODO: init_voter.rs
  /**
   * Create the populated transaction instruction for `initVoter`.
   * @param {GovVoter} initVoter
   * @returns {TransactionInstruction}
   * @memberof GovVoteRecord
   */
  async createVoterIx(initVoter: GovVoter): Promise<TransactionInstruction> {
    // TODO: Fix me - how to get derive voter account?
    // const deriveVoter = await initVoter.load(this.client, initVoter.address)

    return this.client.program.instruction.initVoter({
      accounts: {
        realm: initVoter.address,
        owner: initVoter.owner,
        // TODO: Fix me - how to get derive voter account?
        // voter: deriveVoter.address,
        payer: initVoter.owner,
        systemProgram: SystemProgram.programId
      }
    })
  }

  // TODO: deposit.rs
  /**
   * Create the populated transaction instruction for `deposit`.
   * @param {GovProposal} proposal
   * @param {GovVoter} voter
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  depositIx(realm: GovRealm, voter: GovVoter, amount: Amount): TransactionInstruction {
    return this.client.program.instruction.deposit(amount.toRpcArg(), {
      accounts: {
        // TODO: Double check - is voter address realm? use GovVoter or GovRealm?
        realm: realm.address,
        owner: voter.owner,
        vault: realm.vault,
        // TODO: Fix me - what is the token account that contains the token to deposit? wallet?
        // tokenAccount: ??,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  // TODO: withdraw.rs
  /**
   * Create the populated transaction instruction for `withdraw`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  withdrawIx(realm: GovRealm, voter: GovVoter, amount: Amount): TransactionInstruction {
    return this.client.program.instruction.withdraw(StaticSeed.RealmAuthority, amount.toRpcArg(), {
      accounts: {
        // TODO: Double check - is voter address realm? use GovVoter or GovRealm?
        realm: realm.address,
        owner: voter.owner,
        authority: realm.authority,
        vault: realm.vault,
        // TODO: Fix me - what is the token account that contains the token to deposit? wallet?
        // tokenAccount: ??,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  // TODO: vote.rs
  /**
   * Create the populated transaction instruction for `vote`.
   * @param {GovRealm} realm
   * @param {GovVoter} voter
   * @param {GovVoteRecord} voteRecord
   * @param {VoteCount} vote
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  voteIx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord, vote: VoteCount): TransactionInstruction {
    return this.client.program.instruction.vote(vote, {
      accounts: {
        realm: realm.address,
        owner: voter.owner,
        voter: voter.address,
        proposal: voteRecord.proposal,
        voteRecord: voteRecord.address,
        systemProgram: SystemProgram.programId
      }
    })
  }

  // TODO: change_vote.rs
  /**
   * Create the populated transaction instruction for `changeVote`.
   * @param {GovRealm} realm
   * @param {PublicKey} governanceTokenMint
   * @returns {TransactionInstruction}
   * @memberof GovVoter
   */
  changeVoteIx(realm: GovRealm, voter: GovVoter, voteRecord: GovVoteRecord, vote: VoteCount): TransactionInstruction {
    return this.client.program.instruction.changeVote(vote, {
      accounts: {
        realm: realm.address,
        owner: voter.owner,
        voter: voter.address,
        proposal: voteRecord.proposal,
        voteRecord: voteRecord.address
      }
    })
  }
}
