import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { AnchorProvider, BN, Program } from "@project-serum/anchor"
import { StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { Auth } from "../auth"
import { StakeIdl } from "./idl"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"
import { WalletNotConnectedError } from "@solana/spl-governance"

export type StakeAccountInfo = TypeDef<AllAccountsMap<StakeIdl>["stakeAccount"], IdlTypes<StakeIdl>>
export type VoterWeightRecord = TypeDef<AllAccountsMap<StakeIdl>["voterWeightRecord"], IdlTypes<StakeIdl>>
export type VoterWeightAction = VoterWeightRecord["weightAction"]

export interface StakeBalance {
  stakedJet: BN | undefined
  unbondingJet: BN | undefined
}

export interface StakeAccountAddresses {
  stakeAccount: PublicKey
  voterWeightRecord: PublicKey
}

export class StakeAccount {
  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {StakeAccountAddresses}
   * @memberof StakeAccount
   */
  static deriveAccounts(
    stakeProgram: Program<StakeIdl>,
    stakePool: PublicKey,
    owner: PublicKey
  ): StakeAccountAddresses {
    const stakeAccount = findDerivedAccount(stakeProgram.programId, stakePool, owner)
    const voterWeightRecord = findDerivedAccount(stakeProgram.programId, "voter-weight-record", stakeAccount)
    return { stakeAccount, voterWeightRecord }
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<StakeAccount>}
   * @memberof StakeAccount
   */
  static async load(stakeProgram: Program<StakeIdl>, stakePool: PublicKey, owner: PublicKey): Promise<StakeAccount> {
    const addresses = this.deriveAccounts(stakeProgram, stakePool, owner)

    const stakeAccount = (await stakeProgram.account.stakeAccount.fetch(addresses.stakeAccount)) as StakeAccountInfo
    const voterWeightRecord = (await stakeProgram.account.voterWeightRecord.fetch(
      addresses.voterWeightRecord
    )) as VoterWeightRecord

    return new StakeAccount(stakeProgram, addresses, stakeAccount, voterWeightRecord)
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<boolean>}
   * @memberof StakeAccount
   */
  static async exists(stakeProgram: Program<StakeIdl>, stakePool: PublicKey, owner: PublicKey): Promise<boolean> {
    const addresses = this.deriveAccounts(stakeProgram, stakePool, owner)
    const stakeAccount = await stakeProgram.provider.connection.getAccountInfo(addresses.stakeAccount)
    return stakeAccount !== null
  }

  /**
   * Creates an instance of StakeAccount.
   * @private
   * @param {Program<StakeIdl>} program
   * @param {StakeAccountAddresses} addresses
   * @param {StakeAccountInfo} stakeAccount
   * @param {VoterWeightRecord} voterWeightRecord
   * @memberof StakeAccount
   */
  private constructor(
    public program: Program<StakeIdl>,
    public addresses: StakeAccountAddresses,
    public stakeAccount: StakeAccountInfo,
    public voterWeightRecord: VoterWeightRecord
  ) {}

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} [stakeProgram]
   * @param {StakePool} [stakePool]
   * @param {(PublicKey | null)} [wallet]
   * @returns {(StakeAccount | undefined)}
   * @memberof StakeAccount
   */
  static use(
    stakeProgram: Program<StakeIdl> | undefined,
    stakePool: StakePool | undefined,
    wallet: PublicKey | undefined
  ): StakeAccount | undefined {
    return Hooks.usePromise(
      async () =>
        stakeProgram && stakePool && wallet && StakeAccount.load(stakeProgram, stakePool.addresses.stakePool, wallet),
      [stakeProgram, stakePool?.addresses.stakePool?.toBase58(), wallet?.toBase58()]
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
    let stakedJet: BN | undefined
    let unbondingJet: BN | undefined

    if (!!stakePool && !!stakeAccount) {
      if (stakePool.stakePool.bonded.shares.isZero()) {
        stakedJet = new BN(0)
      } else {
        stakedJet = stakeAccount.stakeAccount.bondedShares
      }

      unbondingJet = stakeAccount.stakeAccount.unbondingShares
    }

    return {
      stakedJet,
      unbondingJet
    }
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} payer
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async create(
    stakeProgram: Program<StakeIdl>,
    stakePool: PublicKey,
    owner: PublicKey,
    payer: PublicKey
  ): Promise<string> {
    const instructions: TransactionInstruction[] = []

    await this.withCreate(instructions, stakeProgram, stakePool, owner, payer)

    if (!stakeProgram.provider.sendAndConfirm) {
      throw new WalletNotConnectedError()
    }
    return stakeProgram.provider.sendAndConfirm(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {StakePool} stakePool
   * @param {ProgramAccount<Realm>} realm
   * @param {PublicKey} owner
   * @param {PublicKey} collateralTokenAccount
   * @param {BN} amount
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async addStake(
    provider: AnchorProvider,
    stakePool: StakePool,
    owner: PublicKey,
    collateralTokenAccount: PublicKey,
    amount: BN
  ): Promise<string> {
    const instructions: TransactionInstruction[] = []

    await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool, owner, owner)
    await this.withAddStake(instructions, stakePool, owner, owner, collateralTokenAccount, amount)

    return provider.sendAndConfirm(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Program<StakeIdl>} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @memberof StakeAccount
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    stakeProgram: Program<StakeIdl>,
    stakePool: PublicKey,
    owner: PublicKey,
    payer: PublicKey
  ) {
    const addresses = this.deriveAccounts(stakeProgram, stakePool, owner)

    const info = await stakeProgram.provider.connection.getAccountInfo(addresses.stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      const auth = Auth.deriveUserAuthentication(owner)

      const ix = await stakeProgram.methods
        .initStakeAccount()
        .accounts({
          owner,
          auth,
          stakePool,
          stakeAccount: addresses.stakeAccount,
          voterWeightRecord: addresses.voterWeightRecord,
          payer,
          systemProgram: SystemProgram.programId
        })
        .instruction()

      instructions.push(ix)
    }
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} payer
   * @param {PublicKey} tokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withAddStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    owner: PublicKey,
    payer: PublicKey,
    tokenAccount: PublicKey,
    amount: BN | null = null
  ) {
    const addresses = this.deriveAccounts(stakePool.program, stakePool.addresses.stakePool, owner)

    const ix = await stakePool.program.methods
      .addStake(amount)
      .accounts({
        stakePool: stakePool.addresses.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault,
        stakeAccount: addresses.stakeAccount,
        voterWeightRecord: addresses.voterWeightRecord,
        maxVoterWeightRecord: stakePool.stakePool.maxVoterWeightRecord,
        payer,
        payerTokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction()

    instructions.push(ix)
  }
}
