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

import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { GovStakingClient, DerivedAccount } from "./index"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { StaticSeeds, Amount } from "./util"
import { publicKey } from "@project-serum/anchor/dist/cjs/utils"
import account from "@project-serum/anchor/dist/cjs/program/namespace/account"

export interface GovStakePoolData {
  authority: PublicKey
  seed: number[]
  bumpSeed: [number]
  tokenMint: PublicKey
  stakePoolVault: PublicKey
  stakeCollateralMint: PublicKey
  unbondPeriod: BN
  sharesBonded: BN
  sharesUnbonded: BN
}

// TODO: question - findProgramAddress or create derived account first then get the pubkey
export interface StakePoolAccounts {
  stakeVoteMint: DerivedAccount
  stakeCollateralMint: DerivedAccount
  stakePoolVault: DerivedAccount
}

export type InitPoolSeeds = Record<"stakePool" | "stakeTokenMint" | "stakePoolVault", number>

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
    public sharesBonded: BN,
    public sharesUnbonded: BN
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
    this.sharesBonded = distribution.sharesBonded
    this.sharesUnbonded = distribution.sharesUnbonded
  }

  private static decode(client: GovStakingClient, authority: PublicKey, data: any) {
    return new GovStakePool(
      client,
      authority,
      data.seed,
      data.bumpSeed,
      data.tokenMint,
      data.stakePoolVault,
      data.stakeCollateralMint,
      data.unbondPeriod,
      data.sharesBonded,
      data.sharesUnbonded
    )
  }

  /**
   * Derive all the associated accounts for a stakePool.
   * @param {GovStakingClient} client The client to use for the request
   * @param {PublicKey} address The stakePool address to derive the accounts for.
   * @param {PublicKey} tokenMint The address of the mint for the token stored in the reserve.
   * @returns {Promise<ReserveAccounts>}
   * @memberof GovStakePool
   */
  static async deriveAccounts(
    client: GovStakingClient,
    address: PublicKey,
    tokenMint: PublicKey
  ): Promise<StakePoolAccounts> {
    return {
      stakeVoteMint: await client.findDerivedAccount([StaticSeeds.VoteMint, address, tokenMint]),
      stakeCollateralMint: await client.findDerivedAccount([StaticSeeds.CollateralMint, address, tokenMint]),
      stakePoolVault: await client.findDerivedAccount([StaticSeeds.Vault, address, tokenMint])
    }
  }

  // TODO: instructions IX & TX integrations
  // TODO: init_pool.rs - tx
  /**
   * @param { PublicKey } signer
   * @param { GovStakePool } stakePoolData
   * @param { string } seed
   * @param { InitPoolSeeds } bump
   * @returns {Promise<string>}
   * @memberof GovStakePool
   */
  async initPool(signer: PublicKey, stakePoolData: GovStakePool, seed: string, bump: InitPoolSeeds): Promise<string> {
    const tx = await this.initPoolTx(signer, stakePoolData, seed, bump)
    return await this.client.program.provider.send(tx)
  }

  // TODO: figure out the initializing accounts
  // stakePool
  // stakeVoteMint
  // stakeCollateralMint
  // maybe findDerivedAccount(seed)?

  /**
   * Creates the populated transaction instruction for a `initPool`.
   * @param { PublicKey } signer
   * @param { GovStakePool } stakePoolData
   * @param { string } seed
   * @param { InitPoolSeeds } bump
   * @returns {TransactionInstruction}
   * @memberof GovStakePool
   */
  initPoolIx(
    signer: PublicKey,
    stakePoolData: GovStakePool,
    seed: string,
    bump: InitPoolSeeds,
    stakePool: PublicKey,
    stakePoolAccounts: StakePoolAccounts
  ): TransactionInstruction {
    return this.client.program.instruction.initPool(seed, bump, {
      accounts: {
        payer: signer,
        authority: stakePoolData.authority,
        tokenMint: stakePoolData.tokenMint,
        stakePool: stakePool,
        stakeVoteMint: stakePoolAccounts.stakeVoteMint.address,
        stakeCollateralMint: stakePoolAccounts.stakeCollateralMint.address,
        stakePoolVault: stakePoolAccounts.stakePoolVault.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }

  /**
   * @param { PublicKey } signer
   * @param { GovStakePool } stakePoolData
   * @param { string } seed
   * @param { InitPoolSeeds } bump
   * @returns {Promise<Transaction>}
   * @memberof GovStakePool
   */
  async initPoolTx(
    signer: PublicKey,
    stakePoolData: GovStakePool,
    seed: string,
    bump: InitPoolSeeds
  ): Promise<Transaction> {
    //TODO: question: what is [seed.as_bytes()], in the buffer representation?
    // is `this.client.program.programId` necessary?
    const [stakePool] = await PublicKey.findProgramAddress([signer.toBuffer()], this.client.program.programId)
    const stakePoolAccounts = await GovStakePool.deriveAccounts(this.client, stakePool, stakePoolData.tokenMint)

    const tx = new Transaction()

    const bumpSeeds = {
      stakePool: bump.stakePool,
      stakeTokenMint: bump.stakeTokenMint,
      stakePoolVault: bump.stakePoolVault
    }

    tx.add(this.initPoolIx(signer, stakePoolData, seed, bumpSeeds, stakePool, stakePoolAccounts))
    return tx
  }
}

export interface GovStakeAccountData {
  owner: PublicKey
  stakePool: PublicKey
  unlocked: BN
  locked: BN
  mintedVotes: BN
  mintedCollateral: BN
  unbonding: BN
}

export type InitStakeAccountSeeds = Record<"stakeAccount" | "stakeTokenAccount", number>

export class GovStakeAccount implements GovStakeAccountData {
  private constructor(
    private client: GovStakingClient,
    public owner: PublicKey,
    public stakePool: PublicKey,
    public unlocked: BN,
    public locked: BN,
    public mintedVotes: BN,
    public mintedCollateral: BN,
    public unbonding: BN
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
    this.unbonding = distribution.unbonding
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
      data.unbonding
    )
  }

  // TODO: instructions IX & TX integrations
  // TODO: init_stake_account
  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovStakeAccount
   */
  async initStakeAccount(GovStakeAccountData: GovStakeAccount, bump: InitStakeAccountSeeds): Promise<string> {
    const tx = await this.initStakeAccountTx(GovStakeAccountData, bump)
    return await this.client.program.provider.send(tx)
  }

  // TODO: figure out the initializing accounts
  // stakeAccount - static fx

  /**
   * Creates the populated transaction instruction for a `initStakeAccount`.
   * @param {GovStakeAccount} GovStakeAccountData
   * @returns {TransactionInstruction}
   * @memberof GovStakeAccount
   */
  initStakeAccountIx(
    GovStakeAccountData: GovStakeAccount,
    bump: InitStakeAccountSeeds,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initStakeAccount(bump, {
      accounts: {
        owner: GovStakeAccountData.owner,
        stakePool: GovStakeAccountData.stakePool,
        stakeAccount: account.address,
        payer: GovStakeAccountData.owner,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovStakeAccount
   */
  async initStakeAccountTx(GovStakeAccountData: GovStakeAccount, bump: InitStakeAccountSeeds): Promise<Transaction> {
    const stakeAccount = await this.client.findDerivedAccount([
      GovStakeAccountData.stakePool,
      GovStakeAccountData.owner
    ])
    const tx = new Transaction()

    tx.add(this.initStakeAccountIx(GovStakeAccountData, bump, stakeAccount))
    return tx
  }

  // TODO: instructions IX & TX integrations
  // TODO: add_stake
  // check if parameter are good, check frontend needs
  // create fx to call the initialized stake account
  // what interface has/should have the tokenAccount

  /**
   * @param {GovStakePool} stakePoolData
   * @param {GovStakeAccount} GovStakeAccountData
   * @returns {Promise<string>}
   * @memberof GovStakeAccount
   */
  async addStake(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<string> {
    const tx = await this.addStakeTx(stakePoolData, GovStakeAccountData, amount, tokenAccount)
    return await this.client.program.provider.send(tx)
  }
  /**
   * Creates the populated transaction instruction for a `addStake`.
   * @param {GovStakePool} stakePoolData
   * @param {GovStakeAccount} proposalData
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovStakeAccount
   */
  addStakeIx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    account: DerivedAccount,
    tokenAccount: PublicKey
  ): TransactionInstruction {
    return this.client.program.instruction.addStake(amount.toRpcArg(), {
      accounts: {
        stakePool: GovStakeAccountData.stakePool,
        stakePoolVault: stakePoolData.stakePoolVault,
        stakeAccount: account.address,
        payer: GovStakeAccountData.owner,
        payerTokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * @param {GovStakePool} stakePoolData
   * @param {GovStakeAccount} GovStakeAccountData
   * @returns {Promise<Transaction>}
   * @memberof GovStakeAccount
   */
  async addStakeTx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<Transaction> {
    // TODO: check the buffer passed in
    const account = await this.client.findDerivedAccount([GovStakeAccountData.stakePool, GovStakeAccountData.owner])
    const tx = new Transaction()

    tx.add(this.addStakeIx(stakePoolData, GovStakeAccountData, amount, account, tokenAccount))
    return tx
  }

  // TODO: instructions IX & TX integrations
  // TODO: mint_votes
  // check stakeVoteMint, stakeAccount & voterTokenAccount

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovStakeAccount
   */
  async mintVotes(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<string> {
    const tx = await this.mintVotesTx(stakePoolData, GovStakeAccountData, amount, tokenAccount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `mintVotes`.
   * @param {GovStakePool} stakePoolData
   * @param {GovStakeAccount} GovStakeAccountData
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof GovStakeAccount
   */
  mintVotesIx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    account: DerivedAccount,
    tokenAccount: PublicKey
  ): TransactionInstruction {
    return this.client.program.instruction.mintVotes(amount.toRpcArg(), {
      accounts: {
        owner: GovStakeAccountData.owner,
        stakePool: GovStakeAccountData.stakePool,
        stakeVoteMint: stakePoolData.tokenMint,
        stakeAccount: account.address,
        voterTokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovStakeAccount
   */
  async mintVotesTx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<Transaction> {
    // TODO: check the buffer passed in
    const account = await this.client.findDerivedAccount([GovStakeAccountData.stakePool, GovStakeAccountData.owner])
    const tx = new Transaction()

    tx.add(this.mintVotesIx(stakePoolData, GovStakeAccountData, amount, account, tokenAccount))
    return tx
  }

  // TODO: instructions IX & TX integrations
  // TODO: burn_votes
  // check stakeVoteMint, stakeAccount, voterTokenAccount & voter
  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovStakeAccount
   */
  async burnVotes(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<string> {
    const tx = await this.burnVotesTx(stakePoolData, GovStakeAccountData, amount, tokenAccount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `burnVotes`.
   * @param {GovProposalData} proposalData
   * @param {GovVoteRecord} voteRecord
   * @param {ProposalLifecycle} event
   * @param {Time} when
   * @returns {TransactionInstruction}
   * @memberof GovStakeAccount
   */
  burnVotesIx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    account: DerivedAccount,
    tokenAccount: PublicKey
  ): TransactionInstruction {
    return this.client.program.instruction.burnVotes(amount.toRpcArg(), {
      accounts: {
        owner: GovStakeAccountData.owner,
        stakePool: GovStakeAccountData.stakePool,
        stakeVoteMint: stakePoolData.tokenMint,
        stakeAccount: account.address,
        voterTokenAccount: tokenAccount,
        voter: GovStakeAccountData.owner,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovStakeAccount
   */
  async burnVotesTx(
    stakePoolData: GovStakePool,
    GovStakeAccountData: GovStakeAccount,
    amount: Amount,
    tokenAccount: PublicKey
  ): Promise<Transaction> {
    // TODO: check the buffer passed in
    const account = await this.client.findDerivedAccount([GovStakeAccountData.stakePool, GovStakeAccountData.owner])
    const tx = new Transaction()

    tx.add(this.burnVotesIx(stakePoolData, GovStakeAccountData, amount, account, tokenAccount))
    return tx
  }
}

export interface GovUnbondingAccountData {
  stakeAccount: PublicKey
  amount: BN
  tokenAmount: BN
  unbondedAt: BN
}

export class GovUnbondingAccount implements GovUnbondingAccountData {
  private constructor(
    private client: GovStakingClient,
    public stakeAccount: PublicKey,
    public amount: BN,
    public tokenAmount: BN,
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
    return new GovUnbondingAccount(client, stakeAccount, data.amount, data.tokenAmount, data.unbondedAt)
  }

  // TODO: unbond_stake

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovUnbondingAccount
   */
  async unbondStake(
    // ??,
    bump: number,
    seed: number,
    sharedAmount: Amount
  ): Promise<string> {
    const tx = await this.unbondStakeTx(bump, seed, sharedAmount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `unbondStake`.
   * @param
   * @returns {TransactionInstruction}
   * @memberof GovUnbondingAccount
   */
  unbondStakeIx(
    // GovStakeAccountData: GovStakeAccount,
    // unbondingAccount: GovUnbondingAccount,
    bump: number,
    seed: number,
    sharedAmount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.unbondStake(bump, seed, sharedAmount, {
      accounts: {
        // owner: GovStakeAccountData.owner,
        // payer: GovStakeAccountData.owner,
        // stakeAccount: ..,
        // stakePool: ..,
        // stakePoolVault: ..,
        // unbondingAccount: ..,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovUnbondingAccount
   */
  async unbondStakeTx(
    // ??,
    bump: number,
    seed: number,
    sharedAmount: Amount
  ): Promise<Transaction> {
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.unbondStakeIx(bump, seed, sharedAmount))
    return tx
  }

  // TODO: withdraw_unbonded

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovUnbondingAccount
   */
  async withdrawUnbonded(): // ??,
  Promise<string> {
    const tx = await this.withdrawUnbondedTx()
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `withdrawUnbonded`.
   * @param
   * @returns {TransactionInstruction}
   * @memberof GovUnbondingAccount
   */
  withdrawUnbondedIx(): // ??,
  TransactionInstruction {
    return this.client.program.instruction.withdrawUnbonded({
      accounts: {
        // owner: ..,
        // closer: ..,
        // tokenReceiver: ..,
        // stakeAccount: ..,
        // stakeTokenAccount: ..,
        // stakePool: ..,
        // stakePoolVault: ..,
        // unbondingAccount: ..,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovUnbondingAccount
   */
  async withdrawUnbondedTx(): // ??,
  Promise<Transaction> {
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.withdrawUnbondedIx())
    return tx
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

  // TODO: add_stake_locked

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovVestingAccount
   */
  async addStakeLocked(vestingAccount: GovVestingAccount, amount: Amount, bump: number, seed: number): Promise<string> {
    const tx = await this.addStakeLockedTx(vestingAccount, amount, bump, seed)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `addStakeLocked`.
   * @param
   * @returns {TransactionInstruction}
   * @memberof GovVestingAccount
   */
  addStakeLockedIx(
    vestingAccount: GovVestingAccount,
    amount: Amount,
    bump: number,
    seed: number
  ): TransactionInstruction {
    return this.client.program.instruction.addStakeLocked(
      bump,
      seed,
      amount,
      vestingAccount.vestStartAt,
      vestingAccount.vestEndAt,
      {
        accounts: {
          // stakePool: ..,
          // stakePoolVault: ..,
          // stakeAccount: ..,
          // vestingAccount: ..,
          // payer: ..,
          // payerTokenAccount: ..,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        }
      }
    )
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovVestingAccount
   */
  async addStakeLockedTx(
    vestingAccount: GovVestingAccount,
    amount: Amount,
    bump: number,
    seed: number
  ): Promise<Transaction> {
    // set const to get data needed to initialize proposal
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.addStakeLockedIx(vestingAccount, amount, bump, seed))
    return tx
  }

  // TODO: unlock_stake

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovVestingAccount
   */
  async unlockStake(): Promise<string> {
    const tx = await this.unlockStakeTx()
    return await this.client.program.provider.send(tx)
  }
  /**
   * Creates the populated transaction instruction for a `unlockStake`.
   * @param
   * @returns {TransactionInstruction}
   * @memberof GovVestingAccount
   */
  unlockStakeIx(): // ??,
  TransactionInstruction {
    return this.client.program.instruction.unlockStake({
      accounts: {
        // owner: ..,
        // stakeAccount: ..,
        // vestingAccount: ..,
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovVestingAccount
   */
  async unlockStakeTx(): // ??,
  Promise<Transaction> {
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.unlockStakeIx())
    return tx
  }

  // TODO: close_vesting_account

  /**
   * @param
   * @returns {Promise<string>}
   * @memberof GovVestingAccount
   */
  async unbondStake(): // ??,
  Promise<string> {
    const tx = await this.closeVestingAccountTx()
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `closeVestingAccount`.
   * @param
   * @returns {TransactionInstruction}
   * @memberof GovVestingAccount
   */
  closeVestingAccountIx(): // ??,
  TransactionInstruction {
    return this.client.program.instruction.closeVestingAccount({
      accounts: {
        // owner: ..,
        // closer: ..,
        // stakeAccount: ..,
        // vestingAccount: ..
      }
    })
  }

  /**
   * @param
   * @returns {Promise<Transaction>}
   * @memberof GovVestingAccount
   */
  async closeVestingAccountTx(): // ??,
  Promise<Transaction> {
    // set const to get data needed
    // const name = content.name // await data
    // etc

    const tx = new Transaction()
    // fill in data
    //tx.add()
    // tx.add()
    tx.add(this.closeVestingAccountIx())
    return tx
  }
}

// TODO: instructions IX & TX integrations

// TODO: add_stake_locked.rs - tx
// TODO: add_stake.rs - tx
// TODO: burn_votes.rs - tx
// TODO: close_stake_account.rs - tx
// TODO: close_vesting_account.rs - tx
// TODO: init_pool.rs - tx
// TODO: init_stake_account.rs - tx
// TODO: mint_votes.rs - tx
// TODO: unbond_stake.rs - tx
// TODO: unlock_stake.rs - tx
// TODO: withdraw_unbonded.rs - tx

// which one belongs to which
// 1. stakePool
// 2. stakeAccount
// init_stake_account
// add_stake
// mint_votes
// burn_votes
// 3. unbondingAccount
// unbond_stake
// withdraw_unbonded
// 4. vestingAccount
// add_stake_locked
// unlock_stake
// close_vesting_account
