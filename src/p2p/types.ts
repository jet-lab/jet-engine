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

import { PublicKey } from "@solana/web3.js"

export type AcceptOfferAccounts = Record<
  "owner" | "borrower" | "lease" | "listing" | "offer" | "ownerAssetAccount" | "ownerFeeAccount" | "feeEscrow",
  PublicKey
>

export type CancelOfferAccounts = Record<
  "borrower" | "listing" | "offer" | "collateralEscrow" | "feeEscrow" | "collateralDestination" | "feeDestination",
  PublicKey
>

export type EndLeaseAccounts = Record<
  | "borrower"
  | "owner"
  | "lease"
  | "listing"
  | "offer"
  | "borrowerAssetAccount"
  | "borrowerCollateralAccount"
  | "collateralEscrow",
  PublicKey
>

export type ForecloseAccounts = Record<
  "owner" | "borrower" | "lease" | "listing" | "offer" | "collateralEscrow" | "ownerCollateralAccount",
  PublicKey
>

export type MakeOfferBumps = Record<"collateralEscrow" | "feeEscrow" | "offer", number>
export type MakeOfferAccounts = Record<
  | "borrower"
  | "listing"
  | "offer"
  | "collateralEscrow"
  | "feeEscrow"
  | "borrowerCollateralAccount"
  | "borrowerFeeAccount"
  | "payer"
  | "collateralMint"
  | "feeMint",
  PublicKey
>

export type ListAssetAccounts = Record<
  "owner" | "listing" | "payer" | "asset_mint" | "fee_mint" | "collateral_mint",
  PublicKey
>
