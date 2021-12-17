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

export type ProposalAccount = {
  realm: PublicKey
  owner: PublicKey
  created_timestamp: number
  content: ProposalContent
  lifecycle: ProposalLifecycle
  count: VoteCount
}

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

type VoteYes = { yes: Record<string, never> }
type VoteNo = { no: Record<string, never> }
type VoteAbstain = { abstain: Record<string, never> }

export type VoteOption = VoteYes | VoteNo | VoteAbstain

type TimeNow = { now: Record<string, never> }
type TimeAt = { at: { value: BN } }
type TimeNever = { never: Record<string, never> }

export type Time = TimeNow | TimeAt | TimeNever
