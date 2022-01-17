import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { findDerivedAccount } from "../common"
import { AssociatedToken } from "../common/associatedToken"

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
  static async deriveStakeAccount(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey) {
    return await findDerivedAccount(stakeProgram.programId, stakePool, owner)
  }

  static async load(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey) {
    const { address: address } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const stakeAccount = await stakeProgram.account.StakeAccount.fetch(address)

    return new StakeAccount(address, stakeAccount as any) // FIXME! Looks like the IDL in ./idl is out of date
  }

  private constructor(public address: PublicKey, public stakeAccount: StakeAccountInfo) {}

  static async create(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey) {
    const instructions: TransactionInstruction[] = []
    const { address } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

    await this.withCreate(instructions, stakeProgram, address, owner)

    return await stakeProgram.provider.send(new Transaction().add(...instructions))
  }

  static async addStake(stakePool: StakePool, owner: PublicKey, collateralTokenAccount: PublicKey, amount: BN) {
    const instructions: TransactionInstruction[] = []

    const voterTokenAccount = await AssociatedToken.withCreateAssociatedToken(
      instructions,
      stakePool.program.provider,
      owner,
      stakePool.addresses.stakeVoteMint.address
    )
    await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool.address, owner)
    await this.withAddStake(instructions, stakePool, owner, collateralTokenAccount, amount)
    await this.withMintVotes(instructions, stakePool, owner, voterTokenAccount.address, amount)

    return await stakePool.program.provider.send(new Transaction().add(...instructions))
  }

  private static async withCreate(
    instructions: TransactionInstruction[],
    stakeProgram: Program,
    stakePool: PublicKey,
    owner: PublicKey
  ) {
    const { address: stakeAccount, bumpSeed } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const info = await stakeProgram.provider.connection.getAccountInfo(stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      const ix = stakeProgram.instruction.initStakeAccount(bumpSeed, {
        accounts: {
          owner,
          payer: stakeProgram.provider.wallet.publicKey,
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
    stakePool: StakePool,
    owner: PublicKey,
    tokenAccount: PublicKey,
    amount: BN
  ) {
    const { address: stakeAccount } = await this.deriveStakeAccount(
      stakePool.program,
      stakePool.addresses.accounts.stakePool,
      owner
    )

    const ix = stakePool.program.instruction.addStake(
      { kind: { tokens: {} }, value: amount },
      {
        accounts: {
          stakePool: stakePool.addresses.stakePool.address,
          stakePoolVault: stakePool.addresses.accounts.stakePoolVault,
          stakeAccount,
          payer: stakePool.program.provider.wallet.publicKey,
          payerTokenAccount: tokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }
    )
    instructions.push(ix)
  }

  private static async withMintVotes(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    owner: PublicKey,
    voterTokenAccount: PublicKey,
    amount: BN
  ) {
    const { address: stakeAccount } = await this.deriveStakeAccount(
      stakePool.program,
      stakePool.addresses.stakePool.address,
      owner
    )

    const ix = stakePool.program.instruction.mintVotes(
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
}
