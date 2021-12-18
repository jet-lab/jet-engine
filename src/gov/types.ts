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

import BN from "bn.js"
import { PublicKey } from "@solana/web3.js"
import { ProposalContent, ProposalLifecycle, VoteCount } from "./proposal"

type Uninitialized = { uninitialized: Record<string, never> }
type Realm = { realm: Record<string, never> }
type TokenOwnerRecord = { tokenOwnerRecord: Record<string, never> }
type AccountGovernance = { accountGovernance: Record<string, never> }
type ProgramGovernance = { programGovernance: Record<string, never> }
type ProposalV1 = { proposalV1: Record<string, never> }
type SignatoryRecord = { signatoryRecord: Record<string, never> }
type VoteRecordV1 = { voteRecordV1: Record<string, never> }
type ProposalInstructionV1 = { proposalInstructionV1: Record<string, never> }
type MintGovernance = { mintGovernance: Record<string, never> }
type TokenGovernance = { tokenGovernance: Record<string, never> }
type RealmConfig = { realmConfig: Record<string, never> }
type VoteRecordV2 = { voteRecordV2: Record<string, never> }
type ProposalInstructionV2 = { proposalInstructionV2: Record<string, never> }
type ProposalV2 = { proposalV2: Record<string, never> }

export type GovernanceAccountType = Uninitialized | Realm | TokenOwnerRecord | AccountGovernance | ProgramGovernance | ProposalV1 | SignatoryRecord | VoteRecordV1 | ProposalInstructionV1 | MintGovernance | TokenGovernance | RealmConfig | VoteRecordV2 | ProposalInstructionV2 | ProposalV2

// TODO: what is the type? YesVote(u8) 
type YesVote = { yesVote: Record<number, never> }
type Quorum = { quorum: Record<number, never> }

export type VoteThresholdPercentage = YesVote | Quorum

type Deposit = { deposit: Record<string, never> }
type Snapshot = { snapshot: Record<string, never> }

export type VoteWeightSource = Deposit | Snapshot

type None = { none: Record<string, never> }
type Success = { success: Record<string, never> }
type Error = { error: Record<string, never> }

export type InstructionExecutionStatus = None | Success | Error

type Draft = { draft: Record<string, never> }
type SigningOff = { signingOff: Record<string, never>} 
type Voting = { voting: Record<string, never> }
type Succeeded = { succeeded: Record<string, never> }
type Executing = { executing: Record<string, never> }
type Completed = { completed: Record<string, never> }
type Cancelled = { cancelled: Record<string, never> }
type Defeated = { defeated: Record<string, never> }
type ExecutingWithErrors = { executingWithErrors: Record<string, never> }

export type ProposalState = Draft | SigningOff | Voting | Succeeded | Executing | Completed | Cancelled | Defeated | ExecutingWithErrors

// TODO: none declared for SingleChoice, u16 declared for MultiChoice
type SingleChoice = { singleChoice: Record<string, never> }
type MultiChoice = { multiChoice: Record<number, never> }

export type VoteType = SingleChoice | MultiChoice

export type OptionVoteResult = None | Succeeded | Defeated

type Ordered = { ordered: Record<string, never> }
type UseTransaction = { useTransaction: Record<string, never> }

export type InstructionExecutionFlags = None | Ordered | UseTransaction

// TODO: how to pass the vector in here?? Vec<u8>
// Approve(Vec<VoteChoice>) ?? 
// type Approve =     /// Vote approving choices
type Deny = { deny: Record<string, never> }

export type Vote = /* Approve */ | Deny



export type RealmAccount = {
  owner: PublicKey
  authority: PublicKey
  vault: PublicKey
}

export type VoterAccount = {
  realm: PublicKey
  owner: PublicKey
  deposited: number
  active_votes: number
}

export type VoteRecord = {
  proposal: PublicKey
  voter: PublicKey
  weight: number
  vote: VoteOption
}
