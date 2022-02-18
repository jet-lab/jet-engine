import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { bnToNumber, findDerivedAccount } from "../common"
import { AssociatedToken } from "../common/associatedToken"
import { Hooks } from "../common/hooks"
import { Auth } from "../auth"

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

export interface StakeBalance {
  stakedJet: number
  unstakedJet: number
  unbondingJet: number
  unlockedVotes: number
}

export class StakeAccount {
  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<PublicKey>}
   * @memberof StakeAccount
   */
  static deriveStakeAccount(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): PublicKey {
    return findDerivedAccount(stakeProgram.programId, stakePool, owner)
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<StakeAccount>}
   * @memberof StakeAccount
   */
  static async load(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<StakeAccount> {
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const stakeAccount = await stakeProgram.account.stakeAccount.fetch(address)

    return new StakeAccount(stakeProgram, address, stakeAccount as StakeAccountInfo)
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<boolean>}
   * @memberof StakeAccount
   */
  static async exists(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<boolean> {
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)
    const stakeAccount = await stakeProgram.provider.connection.getAccountInfo(address)
    return stakeAccount !== null
  }

  /**
   * Creates an instance of StakeAccount.
   * @private
   * @param {Program} program
   * @param {PublicKey} address
   * @param {StakeAccountInfo} stakeAccount
   * @memberof StakeAccount
   */
  private constructor(public program: Program, public address: PublicKey, public stakeAccount: StakeAccountInfo) {}

  /**
   * TODO:
   * @static
   * @param {Program} [stakeProgram]
   * @param {StakePool} [stakePool]
   * @param {(PublicKey | null)} [wallet]
   * @returns {(StakeAccount | undefined)}
   * @memberof StakeAccount
   */
  static use(
    stakeProgram: Program | undefined,
    stakePool: StakePool | undefined,
    wallet: PublicKey | undefined
  ): StakeAccount | undefined {
    return Hooks.usePromise(
      async () =>
        stakeProgram && stakePool && wallet && StakeAccount.load(stakeProgram, stakePool.addresses.stakePool, wallet),
      [stakeProgram, stakePool?.addresses.stakePool, wallet]
    )
  }

  /**
   * TODO:
   * @static
   * @param {StakeAccount} [stakeAccount]
   * @param {StakePool} [stakePool]
   * @returns {StakeBalance}
   * @memberof StakeAccount
   */
  static useBalance(stakeAccount?: StakeAccount, stakePool?: StakePool): StakeBalance {
    const unlockedVoteLamports = AssociatedToken.use(
      stakePool?.program.provider.connection,
      stakePool?.addresses.stakeVoteMint,
      stakeAccount?.stakeAccount.owner
    )
    const voteDecimals = stakePool?.voteMint.decimals

    const jetPerStakedShare = bnToNumber(stakePool?.vault.amount.div(stakePool?.stakePool.sharesBonded))

    const stakedJet = bnToNumber(stakeAccount?.stakeAccount.shares) * jetPerStakedShare

    const unbondingJet = bnToNumber(stakeAccount?.stakeAccount.unbonding) * jetPerStakedShare

    const unstakedJet = -1

    const unlockedVotes =
      voteDecimals !== undefined ? bnToNumber(unlockedVoteLamports?.info.amount) / 10 ** voteDecimals : 0

    return {
      stakedJet,
      unbondingJet,
      unstakedJet,
      unlockedVotes
    }
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async create(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<string> {
    const instructions: TransactionInstruction[] = []
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    await this.withCreate(instructions, stakeProgram, address, owner)

    return stakeProgram.provider.send(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {StakePool} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} collateralTokenAccount
   * @param {BN} amount
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async addStake(
    stakePool: StakePool,
    owner: PublicKey,
    collateralTokenAccount: PublicKey,
    amount: BN
  ): Promise<string> {
    const instructions: TransactionInstruction[] = []

    const voterTokenAccount = await AssociatedToken.withCreate(
      instructions,
      stakePool.program.provider,
      owner,
      stakePool.addresses.stakeVoteMint
    )
    await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool, owner)
    await this.withAddStake(instructions, stakePool, owner, collateralTokenAccount, amount)
    await this.withMintVotes(instructions, stakePool, owner, voterTokenAccount, amount)

    return stakePool.program.provider.send(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @memberof StakeAccount
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    stakeProgram: Program,
    stakePool: PublicKey,
    owner: PublicKey
  ) {
    const stakeAccount = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const info = await stakeProgram.provider.connection.getAccountInfo(stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      const auth = Auth.deriveUserAuthentication(owner)
      const payer = stakeProgram.provider.wallet.publicKey

      const ix = stakeProgram.instruction.initStakeAccount({
        accounts: {
          owner,
          auth,
          stakePool,
          stakeAccount,
          payer,
          systemProgram: SystemProgram.programId
        }
      })
      instructions.push(ix)
    }
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} tokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withAddStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    owner: PublicKey,
    tokenAccount: PublicKey,
    amount: BN
  ) {
    const stakeAccount = this.deriveStakeAccount(stakePool.program, stakePool.addresses.stakePool, owner)

    const ix = stakePool.program.instruction.addStake(
      { kind: { tokens: {} }, value: amount },
      {
        accounts: {
          stakePool: stakePool.addresses.stakePool,
          stakePoolVault: stakePool.addresses.stakePoolVault,
          stakeAccount,
          payer: stakePool.program.provider.wallet.publicKey,
          payerTokenAccount: tokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }
    )
    instructions.push(ix)
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} voterTokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withMintVotes(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    owner: PublicKey,
    voterTokenAccount: PublicKey,
    amount: BN
  ) {
    const stakeAccount = this.deriveStakeAccount(stakePool.program, stakePool.addresses.stakePool, owner)

    const ix = stakePool.program.instruction.mintVotes(
      { kind: { tokens: {} }, value: amount },
      {
        accounts: {
          owner: owner,
          stakePool: stakePool.addresses.stakePool,
          stakePoolVault: stakePool.addresses.stakePoolVault,
          stakeVoteMint: stakePool.addresses.stakeVoteMint,
          stakeAccount,
          voterTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }
    )
    instructions.push(ix)
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {StakeAccount} stakeAccount
   * @param {PublicKey} owner
   * @param {PublicKey} voterTokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withBurnVotes(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    stakeAccount: StakeAccount,
    owner: PublicKey,
    voterTokenAccount: PublicKey,
    amount: BN
  ) {
    const ix = stakePool.program.instruction.burnVotes(amount, {
      accounts: {
        owner,
        stakePool: stakePool.addresses.stakePool,
        stakeVoteMint: stakePool.addresses.stakeVoteMint,
        stakeAccount: stakeAccount.address,
        voterTokenAccount,
        voter: owner,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }
}
