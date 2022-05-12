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
import { number192Field, pubkeyField, u64Field } from "../common/accountParser"
import { i64Field } from "./util"
import { RawReserveStateData, RawJetMarketReserveInfo, RawObligationPositionStruct } from "./types"

export const MAX_RESERVES = 32

export const ReserveStateStruct = BL.struct<RawReserveStateData>([
  i64Field("accruedUntil"),
  number192Field("outstandingDebt"),
  number192Field("uncollectedFees"),
  u64Field("totalDeposits"),
  u64Field("totalDepositNotes"),
  u64Field("totalLoanNotes"),
  BL.blob(416, "_UNUSED_0_"),
  u64Field("lastUpdated"),
  BL.u8("invalidated"),
  BL.blob(7, "_UNUSED_1_")
])

export const ReserveInfoStruct = BL.struct<RawJetMarketReserveInfo>([
  pubkeyField("reserve"),
  BL.blob(80, "_UNUSED_0_"),
  number192Field("price"),
  number192Field("depositNoteExchangeRate"),
  number192Field("loanNoteExchangeRate"),
  number192Field("minCollateralRatio"),
  BL.u16("liquidationBonus"),
  BL.blob(158, "_UNUSED_1_"),
  u64Field("lastUpdated"),
  BL.u8("invalidated"),
  BL.blob(7, "_UNUSED_2_")
])

export const MarketReserveInfoStructList = BL.seq(ReserveInfoStruct, MAX_RESERVES)

export const PositionInfoStruct = BL.struct<RawObligationPositionStruct>([
  pubkeyField("account"),
  number192Field("amount"),
  BL.u32("side"),
  BL.u16("reserveIndex"),
  BL.blob(66, "_reserved")
])

export const PositionInfoStructList = BL.seq(PositionInfoStruct, 16, "positions")
