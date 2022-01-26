import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { bnToNumber, findDerivedAccount } from "../common"
import { AssociatedToken, DerivedAccount } from "../common/associatedToken"
import { useEffect, useState } from "react"

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
   * @returns {Promise<DerivedAccount>}
   * @memberof StakeAccount
   */
  static deriveStakeAccount(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<DerivedAccount> {
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
    const { address: address } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const stakeAccount = await stakeProgram.account.stakeAccount.fetch(address)

    return new StakeAccount(stakeProgram, address, stakeAccount as any) // FIXME! Looks like the IDL in ./idl is out of date
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
    const { address } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)
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
  static use(stakeProgram?: Program, stakePool?: StakePool, wallet?: PublicKey | null): StakeAccount | undefined {
    const [stakeAccount, setStakeAccount] = useState<StakeAccount | undefined>()
    useEffect(() => {
      let abort = false

      if (stakeProgram && stakePool && wallet) {
        StakeAccount.load(stakeProgram, stakePool.addresses.stakePool.address, wallet)
          .then(newStakeAccount => !abort && setStakeAccount(newStakeAccount))
          .catch(() => !abort && setStakeAccount(undefined))
      } else {
        setStakeAccount(undefined)
      }

      return () => {
        abort = true
      }
    }, [stakeProgram, stakePool, wallet])
    return stakeAccount
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
      stakePool?.program.provider,
      stakePool?.addresses.stakeVoteMint.address,
      stakeAccount?.stakeAccount.owner
    )
    const unstakedJetLamports = AssociatedToken.use(
      stakePool?.program.provider,
      stakePool?.stakePool.tokenMint,
      stakeAccount?.stakeAccount.owner
    )

    const decimals = stakePool?.collateralMint.decimals
    const voteDecimals = stakePool?.voteMint.decimals

    const unlockedVotes = voteDecimals !== undefined ? bnToNumber(unlockedVoteLamports?.amount) / 10 ** voteDecimals : 0

    const unstakedJet = decimals !== undefined ? bnToNumber(unstakedJetLamports?.amount) / 10 ** decimals : 0

    const stakedJet =
      stakeAccount && decimals !== undefined ? bnToNumber(stakeAccount.stakeAccount.shares) / 10 ** decimals : 0

    const unbondingJet = -1

    return {
      stakedJet,
      unstakedJet,
      unbondingJet,
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
    const { address } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

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
      stakePool.addresses.stakeVoteMint.address
    )
    await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool.address, owner)
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
    const { address: stakeAccount, bump: bumpSeed } = await this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const info = await stakeProgram.provider.connection.getAccountInfo(stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      console.log("Creating the stake account.")
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
        stakePool: stakePool.addresses.stakePool.address,
        stakeVoteMint: stakePool.addresses.stakeVoteMint.address,
        stakeAccount: stakeAccount.address,
        voterTokenAccount,
        voter: owner,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }
}
