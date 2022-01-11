import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { StakePool } from "."
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { findDerivedAccount } from "../common"

export interface StakeAccountInfo {
  /** The account that has ownership over this stake */
  owner: PublicKey

  /** The pool this account is associated with */
  stakePool: PublicKey

  /** The stake balance (in share units) */
  shares: BN

  /** The token balance locked by existence of voting tokens */
  mintedVotes: BN

  /** The stake balance locked by existence of collateral tokens */
  mintedCollateral: BN

  /** The total staked tokens currently unbonding so as to be withdrawn in the future */
  unbonding: BN
}

export class StakeAccount {
  static async deriveStakeAccount(program: Program, stakePool: PublicKey, owner: PublicKey) {
    return await findDerivedAccount(program.programId, stakePool, owner)
  }

  static async load(program: Program, stakePool: PublicKey, owner: PublicKey) {
    const { address: address } = await this.deriveStakeAccount(program, stakePool, owner)

    const stakeAccount = await program.account.StakeAccount.fetch(address)

    return new StakeAccount(address, stakeAccount as any) // FIXME! Looks like the IDL in ./idl is out of date
  }

  private constructor(public address: PublicKey, public stakeAccount: StakeAccountInfo) {}

  static async create(program: Program, stakePool: PublicKey, owner: PublicKey) {
    const instructions: TransactionInstruction[] = []
    const { address } = await this.deriveStakeAccount(program, stakePool, owner)

    this.withCreate(instructions, program, address, owner)

    program.provider.send(new Transaction().add(...instructions))
  }

  static async addStake(program: Program, stakePool: StakePool, owner: PublicKey, tokenAccount: PublicKey, amount: BN) {
    const instructions: TransactionInstruction[] = []

    const voterTokenAccount = await this.withCreateAssociatedToken(
      instructions,
      program.provider.connection,
      owner,
      owner,
      stakePool.addresses.stakeVoteMint.address
    )
    this.withCreate(instructions, program, stakePool.addresses.stakePool.address, owner)
    this.withAddStake(instructions, program, stakePool, owner, tokenAccount, amount)
    this.withMintVotes(instructions, program, stakePool, owner, voterTokenAccount, amount)

    program.provider.send(new Transaction().add(...instructions))
  }

  private static async withCreate(
    instructions: TransactionInstruction[],
    program: Program,
    stakePool: PublicKey,
    owner: PublicKey
  ) {
    const { address: stakeAccount, bumpSeed } = await this.deriveStakeAccount(program, stakePool, owner)

    const info = program.provider.connection.getAccountInfo(stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      const ix = program.instruction.initStakeAccount(bumpSeed, {
        accounts: {
          owner,
          payer: owner,
          stakeAccount,
          stakePool,
          systemProgram: SystemProgram.programId
        }
      })
      instructions.push(ix)
    }
  }

  private static async withAddStake(
    instructions: TransactionInstruction[],
    program: Program,
    stakePool: StakePool,
    owner: PublicKey,
    tokenAccount: PublicKey,
    amount: BN
  ) {
    const { address: stakeAccount } = await this.deriveStakeAccount(
      program,
      stakePool.addresses.accounts.stakePool,
      owner
    )

    const ix = program.instruction.addStake(
      { kind: { tokens: {} }, value: amount },
      {
        accounts: {
          stakePool: stakePool.addresses.stakePool.address,
          stakePoolVault: stakePool.addresses.accounts.stakePoolVault,
          stakeAccount,
          payer: owner,
          payerTokenAccount: tokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }
    )
    instructions.push(ix)
  }

  private static async withMintVotes(
    instructions: TransactionInstruction[],
    program: Program,
    stakePool: StakePool,
    owner: PublicKey,
    voterTokenAccount: PublicKey,
    amount: BN
  ) {
    const { address: stakeAccount } = await this.deriveStakeAccount(
      program,
      stakePool.addresses.stakePool.address,
      owner
    )

    const ix = program.instruction.mintVotes(
      { kind: { tokens: {} }, amount },
      {
        accounts: {
          owner: owner,
          stakePool: stakePool.addresses.stakePool.address,
          stakePoolVault: stakePool.addresses.stakePoolVault.address,
          stakeVoteMint: stakePool.addresses.stakeVoteMint.address,
          stakeAccount,
          voterTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }
    )
    instructions.push(ix)
  }

  private static async withCreateAssociatedToken(
    instructions: TransactionInstruction[],
    connection: Connection,
    owner: PublicKey,
    payer: PublicKey,
    mint: PublicKey
  ) {
    const associatedAccount = await this.getAssociatedTokenAddress(mint, owner)
    const info = await connection.getAccountInfo(associatedAccount)
    if (!info) {
      const ix = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        associatedAccount,
        owner,
        payer
      )
      instructions.push(ix)
    }
    return associatedAccount
  }

  /**
   * Get the address for the associated token account
   *
   * @param mint Token mint account
   * @param owner Owner of the new account
   * @return Public key of the associated token account
   */
  private static async getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
    return (
      await PublicKey.findProgramAddress(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )[0]
  }
}
