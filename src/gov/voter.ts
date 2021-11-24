import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"

export interface GovVoterData {
  address: PublicKey
  owner: PublicKey
  deposited: BN
  activeVotes: number
}

export interface GovVoteRecord {
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

// FIXME: Implement GovVoter class
