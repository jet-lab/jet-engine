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

import * as BL from "@solana/buffer-layout"
import { numberField, i64Field, u64Field, u32Field, pubkeyField, booleanField } from "./util"
import { GovernanceAccountType, VoteThresholdPercentage, VoteWeightSource, InstructionExecutionStatus, ProposalState } from "./types"
import { name } from "eventemitter3"

// TODO: setting some random big number for the Vec<>
export const VECTOR_WITHOUT_LIMIT = 1000000000000

// governance.rs
export const GovernanceStruct = BL.struct([
  BL.u8("accountType"),
  pubkeyField("realm"),
  pubkeyField("governedAccount"),
  u32Field("totalDeposits"),
  numberField("reserved"),
  BL.u8("voteThresholdPercentage"),
  u64Field("minCommunityTokensToCreateProposal"),
  u32Field("minInstructionHoldUpTime"),
  u32Field("maxVotingTime"),
  BL.u8("voteWeightSource"),
  u32Field("proposalCoolOffTime"),
  u64Field("minCouncilTokensToCreateProposal")
])

// proposal_instruction.rs
export const AccountMetaDataStruct = BL.struct([
    pubkeyField("pubkey"),
    booleanField("isSigner"),
    booleanField("isWritable")
])
  
export const AccountMetaDataInfoStructList = BL.seq(AccountMetaDataStruct, VECTOR_WITHOUT_LIMIT)

export const ProposalInstructionV2Struct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("proposal"),
    BL.u16("optionIndex"),
    BL.u16("instructionIndex"),
    u32Field("holdUpTime"),

    // TODO: this is InstructionData Struct, do i flatten this to ProposalInstructionV2Struct?
    pubkeyField("programId"),
    // TODO: Vec<> how to set number constraints
    BL.blob(AccountMetaDataInfoStructList.span, "accounts"),
    // TODO: is Vec<u8> same as [u8; some really big number]?
    // do i need to create a new field?
    numberField("data"),

    // TODO: do we use the same field for Option? a NONE or SOME scenario?
    i64Field("executedAt"),
    BL.u8("executionStatus")
])

// proposal.rs
export const ProposalOptionStruct = BL.struct([
    // TODO: can i use cstr for String? how to deal with dynamically sized?
    BL.cstr("label"),
    u64Field("voteWeight"),
    BL.u8("voteResult"),
    BL.u16("instructionsExecutedCount"),
    BL.u16("instructionsCount"),
    BL.u16("instructionsNextIndex"),
])

export const ProposalOptionStructList = BL.seq(ProposalOptionStruct, VECTOR_WITHOUT_LIMIT)
  
export const ProposalV2Struct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("governance"),
    pubkeyField("governingTokenMint"),
    BL.u8("state"),
    pubkeyField("tokenOwnerRecord"),
    BL.u8("signatoriesCount"),
    BL.u8("signatoriesSignedOffCount"),
    BL.u16("voteType"),
    BL.blob(ProposalOptionStructList.span, "options"),
    // TODO: do we use the same field for Option? a NONE or SOME scenario?
    u64Field("denyVoteWeight"),
    i64Field("draftAt"),
    i64Field("signingOffAt"),
    i64Field("votingAt"),
    u64Field("votingAtSlot"),
    i64Field("votingCompletedAt"),
    i64Field("executingAt"),
    i64Field("closeAt"),
    BL.u8("execution_flags"),
    u64Field("maxVoteWeight"),
    BL.u8("voteThresholdPercentage"),
    // TODO: how to deal with dynamically sized? name & description?
    BL.blob(VECTOR_WITHOUT_LIMIT, "name"),
    BL.blob(VECTOR_WITHOUT_LIMIT, "description_link")
])

// realm_config.rs

export const RealmConfigAccountStruct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("proposal"),
    pubkeyField("communityVoterWeightAddin"),
    pubkeyField("communityMaxVoteWeightAddin"),
    pubkeyField("councilVoterWeightAddin"),
    pubkeyField("councilMaxVoteWeightAddin"),
    numberField("reserved"),
])

// signatory_record.rs

export const SignatoryRecordStruct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("proposal"),
    pubkeyField("signatory"),
    booleanField("signedOff")
])

// token_owner_record.rs

export const TokenOwnerRecordStruct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("realm"),
    pubkeyField("governingTokenMint"),
    pubkeyField("governingTokenOwner"),
    u64Field("governingTokenDepositAmount"),
    u32Field("unrelinquishedVotesCount"),
    u32Field("totalVotesCount"),
    BL.u8("outstandingProposalCount"),
    numberField("reserved"),
    pubkeyField("governanceDelegate")
])

export const TokenOwnerRecordV1Struct = BL.struct([
    BL.u8("accountType"),
    pubkeyField("realm"),
    pubkeyField("governingTokenMint"),
    pubkeyField("governingTokenOwner"),
    u64Field("governingTokenDepositAmount"),
    u32Field("unrelinquishedVotesCount"),
    u32Field("totalVotesCount"),
    numberField("reserved"),
    pubkeyField("governanceDelegate")
])

// vote_record.rs

export const VoteChoice = BL.struct([
    BL.u8("rank"),
    BL.u8("weightPercentage")
])

export const VoteRecordV2 = BL.struct([
    BL.u8("accountType"),
    pubkeyField("proposal"),
    pubkeyField("governingTokenOwner"),
    booleanField("isRelinquished"),
    u64Field("voterWeight"),
    BL.blob(VECTOR_WITHOUT_LIMIT, "vote")
])

