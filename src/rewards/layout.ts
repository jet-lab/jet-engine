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
import { numberField, i64Field, u64Field, pubkeyField } from "./util"

export const NUMBER_AIRDROP_RECEIPIENTS = 20000

export const Airdrop = BL.struct([
    pubkeyField("address"),
    pubkeyField("rewardVault"),
    pubkeyField("authority"),
    i64Field("vestStartAt"),
    i64Field("vestEndAt"),
    pubkeyField("stakePool"),
    numberField("shortDesc"),
    numberField("vaultBump"),
    numberField("targetInfo")
])

export const AirdropTargetInfo = BL.struct([
    u64Field("rewardTotal"),
    u64Field("recipientsTotal"),
    u64Field("finalized"),
    // TODO: how to put the BL.seq in BL.struct? for recipients:
    // https://github.com/jet-lab/jet-governance/blob/e0733ffc386dc5c595f6f058dc38168335aa469f/programs/rewards/src/state/airdrop.rs#L109
])

export const AirdropTarget = BL.struct([
    pubkeyField("recipient"),
    u64Field("amount")
])

export const AirdropTargetRecipientInfoStructList = BL.seq(AirdropTarget, NUMBER_AIRDROP_RECEIPIENTS)

export const Distribution = BL.struct([
    pubkeyField("address"),
    pubkeyField("authority"),
    pubkeyField("vault"),
    numberField("vaultBump"),
    pubkeyField("targetAccount"),
    u64Field("targetAmount"),
    u64Field("distributed"),
    u64Field("beginAt"),
    u64Field("endAt"),
    // TODO: how to put an enum type in BL-layout? 
    // DistributionKind is anchorSerialized, anchorDeserialized - Linear
    // currently DistributionKind is in ./type
    // https://github.com/jet-lab/jet-governance/blob/e0733ffc386dc5c595f6f058dc38168335aa469f/programs/rewards/src/state/distribution.rs#L33


])
