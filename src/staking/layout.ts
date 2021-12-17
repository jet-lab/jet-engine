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
import { numberField, i64Field, u64Field, u32Field, u8Field, pubkeyField } from "./util"

export const StakePoolStruct = BL.struct([
  pubkeyField("authority"),
  pubkeyField("tokenMint"),
  pubkeyField("stakePoolVault"),
  pubkeyField("stakeVoteMint"),
  numberField("stakeCollateralMint"),
  i64Field("unboundPeriod"),
  u64Field("shareSupply")
])

export const StakeAccountStruct = BL.struct([
  pubkeyField("owner"),
  pubkeyField("stakePool"),
  u64Field("unlocked"),
  u64Field("locked"),
  u64Field("mintedVotes"),
  u64Field("mintedCollateral"),
  u64Field("unbonding")
])

export const UnbondingAccountStruct = BL.struct([
  pubkeyField("stakeAccount"),
  u64Field("amount"),
  i64Field("unbonded_at")
])

export const VestingAccountStruct = BL.struct([
  pubkeyField("stakeAccount"),
  u32Field("seed"),
  u8Field("bump"),
  u64Field("total"),
  u64Field("unlocked"),
  i64Field("vestStartAt"),
  i64Field("vestEndAt")
])
