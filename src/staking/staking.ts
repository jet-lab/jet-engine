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

import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { GovStakingClient } from "./index"

export interface GovStakePoolData {
  authority: PublicKey
  seed: number[]
  bumpSeed: [number]
  tokenMint: PublicKey
  stakePoolVault: PublicKey
  stakeCollateralMint: PublicKey
  unbondPeriod: BN
  shareSupply: BN
}

export class GovStakePool implements GovStakePoolData {
  private constructor(
    private client: GovStakingClient,
    public authority: PublicKey,
    public seed: number[],
    public bumpSeed: [number],
    public tokenMint: PublicKey,
    public stakePoolVault: PublicKey,
    public stakeCollateralMint: PublicKey,
    public unbondPeriod: BN,
    public shareSupply: BN
  ) {}

  static async load(client: GovStakingClient, authority: PublicKey): Promise<GovStakePool> {
    const data = await client.program.account.voter.fetch(authority)
    return this.decode(client, authority, data)
  }

  async refresh() {
    const distribution = await GovStakePool.load(this.client, this.authority)

    this.authority = distribution.authority
    this.seed = distribution.seed
    this.bumpSeed = distribution.bumpSeed
    this.tokenMint = distribution.tokenMint
    this.stakePoolVault = distribution.stakePoolVault
    this.stakeCollateralMint = distribution.stakeCollateralMint
    this.unbondPeriod = distribution.unbondPeriod
    this.shareSupply = distribution.shareSupply
  }

  private static decode(client: GovStakingClient, authority: PublicKey, data: any) {
    return new GovStakePool(
      client,
      authority,
      data,
      data.seed,
      data.bumpSeed,
      data.tokenMint,
      data.stakePoolVault,
      data.stakeCollateralMint,
      data.unbondPeriod,
      data.shareSupply
    )
  }
}

export interface GovStakeAccountData {
  owner: PublicKey
  stakePool: PublicKey
  unlocked: BN
  locked: BN
  mintedVotes: BN
  mintedCollateral: BN
  unbounding: BN
}

export class GovStakeAccount implements GovStakeAccountData {
  private constructor(
    private client: GovStakingClient,
    public owner: PublicKey,
    public stakePool: PublicKey,
    public unlocked: BN,
    public locked: BN,
    public mintedVotes: BN,
    public mintedCollateral: BN,
    public unbounding: BN
  ) {}

  static async load(client: GovStakingClient, owner: PublicKey): Promise<GovStakeAccount> {
    const data = await client.program.account.voter.fetch(owner)
    return this.decode(client, owner, data)
  }

  async refresh() {
    const distribution = await GovStakeAccount.load(this.client, this.owner)

    this.owner = distribution.owner
    this.stakePool = distribution.stakePool
    this.unlocked = distribution.unlocked
    this.locked = distribution.locked
    this.mintedVotes = distribution.mintedVotes
    this.mintedCollateral = distribution.mintedCollateral
    this.unbounding = distribution.unbounding
  }

  private static decode(client: GovStakingClient, owner: PublicKey, data: any) {
    return new GovStakeAccount(
      client,
      owner,
      data.stakePool,
      data.unlocked,
      data.locked,
      data.mintedVotes,
      data.mintedCollateral,
      data.unbounding
    )
  }
}

export interface GovUnbondingAccountData {
  stakeAccount: PublicKey
  amount: BN
  unbondedAt: BN
}

export class GovUnbondingAccount implements GovUnbondingAccountData {
  private constructor(
    private client: GovStakingClient,
    public stakeAccount: PublicKey,
    public amount: BN,
    public unbondedAt: BN
  ) {}

  static async load(client: GovStakingClient, stakeAccount: PublicKey): Promise<GovUnbondingAccount> {
    const data = await client.program.account.voter.fetch(stakeAccount)
    return this.decode(client, stakeAccount, data)
  }

  async refresh() {
    const distribution = await GovUnbondingAccount.load(this.client, this.stakeAccount)

    this.stakeAccount = distribution.stakeAccount
    this.amount = distribution.amount
    this.unbondedAt = distribution.unbondedAt
  }

  private static decode(client: GovStakingClient, stakeAccount: PublicKey, data: any) {
    return new GovUnbondingAccount(client, stakeAccount, data.amount, data.unbondedAt)
  }
}

export interface GovVestingAccountData {
  stakeAccount: PublicKey
  seed: BN
  bump: number
  total: BN
  unlocked: BN
  vestStartAt: BN
  vestEndAt: BN
}

export class GovVestingAccount implements GovVestingAccountData {
  private constructor(
    private client: GovStakingClient,
    public stakeAccount: PublicKey,
    public seed: BN,
    public bump: number,
    public total: BN,
    public unlocked: BN,
    public vestStartAt: BN,
    public vestEndAt: BN
  ) {}

  static async load(client: GovStakingClient, stakeAccount: PublicKey): Promise<GovVestingAccount> {
    const data = await client.program.account.voter.fetch(stakeAccount)
    return this.decode(client, stakeAccount, data)
  }

  async refresh() {
    const distribution = await GovVestingAccount.load(this.client, this.stakeAccount)

    this.stakeAccount = distribution.stakeAccount
    this.seed = distribution.seed
    this.bump = distribution.bump
    this.total = distribution.total
    this.unlocked = distribution.unlocked
    this.vestStartAt = distribution.vestStartAt
    this.vestEndAt = distribution.vestEndAt
  }

  private static decode(client: GovStakingClient, stakeAccount: PublicKey, data: any) {
    return new GovVestingAccount(
      client,
      stakeAccount,
      data.seed,
      data.bump,
      data.total,
      data.unlocked,
      data.vestStartAt,
      data.vestEndAt
    )
  }
}

// TODO: instructions IX & TX integrations
