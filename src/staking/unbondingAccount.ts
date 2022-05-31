import { AssociatedToken } from "./../common/associatedToken"
import { MemcmpFilter, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { AnchorProvider, BN, Program } from "@project-serum/anchor"
import { bnToNumber, findDerivedAccount } from "../common"
import { StakeAccount, StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { StakeIdl } from "./idl"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"

export type UnbondingAccountInfo = TypeDef<AllAccountsMap<StakeIdl>["unbondingAccount"], IdlTypes<StakeIdl>>

export interface FullAmount {
  tokenAmount: BN
  shareAmount: BN
  allShares: BN
  allTokens: BN
}

export interface UnbondingAmount {
  unbondingQueue: BN
  unbondingComplete: BN
}

export class UnbondingAccount {
  private static readonly UINT32_MAXVALUE = 2 ** 32

  /** The total amount of tokens unbonding */
  public tokens: BN = new BN(0)

  /**
   * TODO:
   * @private
   * @static
   * @param {BN} seed
   * @returns {Buffer}
   * @memberof UnbondingAccount
   */
  private static toBuffer(seed: number): Buffer {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(seed)
    return buffer
  }

  /**
   * TODO:
   * @static
   * @returns {BN}
   * @memberof UnbondingAccount
   */
  static randomSeed(): number {
    const min = 0
    const max = this.UINT32_MAXVALUE
    return Math.floor(Math.random() * (max - min) + min)
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} program
   * @param {PublicKey} stakeAccount
   * @param {BN} seed
   * @returns {Promise<PublicKey>}
   * @memberof UnbondingAccount
   */
  static deriveUnbondingAccount(program: Program<StakeIdl>, stakeAccount: PublicKey, seed: number): PublicKey {
    return findDerivedAccount(program.programId, stakeAccount, this.toBuffer(seed))
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} program
   * @param {PublicKey} stakeAccount
   * @param {BN} seed
   * @param {StakePool} stakePool
   * @returns {Promise<UnbondingAccount>}
   * @memberof UnbondingAccount
   */
  static async load(
    program: Program<StakeIdl>,
    stakeAccount: PublicKey,
    seed: number,
    stakePool: StakePool
  ): Promise<UnbondingAccount> {
    const address = this.deriveUnbondingAccount(program, stakeAccount, seed)

    const unbondingAccount = await program.account.unbondingAccount.fetch(address)
    return new UnbondingAccount(program, address, unbondingAccount, stakePool)
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} program
   * @param {PublicKey} stakeAccount
   * @param {StakePool} stakePool
   * @returns {Promise<UnbondingAccount[]>}
   * @memberof UnbondingAccount
   */
  static async loadByStakeAccount(
    program: Program<StakeIdl>,
    stakeAccount: PublicKey,
    stakePool: StakePool
  ): Promise<UnbondingAccount[]> {
    // Filter by UnbondingAccount.stakeAccount
    const stakeAccountFilter: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: stakeAccount.toBase58()
      }
    }

    const unbondingAccounts = await program.account.unbondingAccount.all([stakeAccountFilter])
    return unbondingAccounts.map(info => new UnbondingAccount(program, info.publicKey, info.account, stakePool))
  }

  /**
   * Creates an instance of UnbondingAccount.
   * @param {PublicKey} address
   * @param {UnbondingAccountInfo} unbondingAccount
   * @memberof UnbondingAccount
   */
  constructor(
    public program: Program<StakeIdl>,
    public address: PublicKey,
    public unbondingAccount: UnbondingAccountInfo,
    public stakePool: StakePool
  ) {
    if (!stakePool.stakePool.unbonding.shares.isZero()) {
      this.tokens = unbondingAccount.shares
        .mul(stakePool.stakePool.unbonding.tokens)
        .div(stakePool.stakePool.unbonding.shares)
    } else {
      this.tokens = new BN(0)
    }
  }

  /**
   * TODO:
   * @static
   * @param {UnbondingAccount} [unbondingAccount]
   * @returns {boolean}
   * @memberof UnbondingAccount
   */
  static isUnbonded(unbondingAccount: UnbondingAccount): boolean {
    const time = new Date().getTime() / 1000
    const canWithdraw = time > bnToNumber(unbondingAccount?.unbondingAccount.unbondedAt)

    return canWithdraw
  }

  /**
   * TODO:
   * @static
   * @param {UnbondingAccount[] | undefined} [unbondingAccounts]
   * @returns {UnbondingAmount}
   * @memberof UnbondingAccount
   */
  static useUnbondingAmountTotal(unbondingAccounts: UnbondingAccount[] | undefined): UnbondingAmount {
    let unbondingQueue = new BN(0)
    let unbondingComplete = new BN(0)

    if (unbondingAccounts) {
      unbondingQueue = unbondingAccounts.reduce<BN>(
        (total: BN, curr: UnbondingAccount) => total.add(UnbondingAccount.isUnbonded(curr) ? new BN(0) : curr.tokens),
        new BN(0)
      )

      unbondingComplete = unbondingAccounts.reduce<BN>(
        (total: BN, curr: UnbondingAccount) => total.add(UnbondingAccount.isUnbonded(curr) ? curr.tokens : new BN(0)),
        new BN(0)
      )
    }
    return { unbondingQueue, unbondingComplete }
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {StakeAccount} stakeAccount
   * @param {ProgramAccount<TokenOwnerRecord>} tokenOwnerRecord
   * @param {PublicKey} payer
   * @param {BN} unbondingSeed
   * @param {BN} amount
   * @memberof UnbondingAccount
   */
  static async withUnbondStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    stakeAccount: StakeAccount,
    tokenOwnerRecord: PublicKey,
    payer: PublicKey,
    unbondingSeed: number,
    amount: BN | null = null
  ) {
    const address = this.deriveUnbondingAccount(stakePool.program, stakeAccount.addresses.stakeAccount, unbondingSeed)
    const ix = await stakePool.program.methods
      .unbondStake(unbondingSeed, amount)
      .accounts({
        owner: stakeAccount.stakeAccount.owner,
        payer,
        stakeAccount: stakeAccount.addresses.stakeAccount,
        stakePool: stakePool.addresses.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault,
        unbondingAccount: address,
        voterWeightRecord: stakeAccount.addresses.voterWeightRecord,
        maxVoterWeightRecord: stakePool.stakePool.maxVoterWeightRecord,
        tokenOwnerRecord: tokenOwnerRecord,
        systemProgram: SystemProgram.programId
      })
      .instruction()

    instructions.push(ix)
  }

  /**
   * TODO:
   *
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {UnbondingAccount} unbondingAccount
   * @param {StakeAccount} stakeAccount
   * @param {StakePool} stakePool
   * @param {PublicKey} tokenReceiver
   * @param {PublicKey} rentReceiver
   * @memberof UnbondingAccount
   */
  static async withWithdrawUnbonded(
    instructions: TransactionInstruction[],
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    tokenReceiver: PublicKey,
    rentReceiver: PublicKey
  ) {
    const ix = await stakeAccount.program.methods
      .withdrawUnbonded()
      .accounts({
        owner: stakeAccount.stakeAccount.owner,
        closer: rentReceiver,
        tokenReceiver: tokenReceiver,
        stakeAccount: stakeAccount.addresses.stakeAccount,
        stakePool: stakeAccount.stakeAccount.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault,
        unbondingAccount: unbondingAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction()

    instructions.push(ix)
  }

  /**
   * TODO:
   *
   * @static
   * @param {UnbondingAccount} unbondingAccount
   * @param {StakeAccount} stakeAccount
   * @param {StakePool} stakePool
   * @param {Provider} provider
   * @returns {Promise<TransactionInstruction[]>}
   * @memberof UnbondingAccount
   */
  static async withdrawUnbonded(
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    provider: AnchorProvider
  ): Promise<TransactionInstruction[]> {
    const ix: TransactionInstruction[] = []
    const tokenReceiver = await AssociatedToken.withCreate(
      ix,
      provider,
      stakeAccount.stakeAccount.owner,
      stakePool.stakePool.tokenMint
    )
    this.withWithdrawUnbonded(ix, unbondingAccount, stakeAccount, stakePool, tokenReceiver, provider.wallet.publicKey)
    return ix
  }

  /**
   * TODO:
   *
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {UnbondingAccount} unbondingAccount
   * @param {StakeAccount} stakeAccount
   * @param {StakePool} stakePool
   * @param {PublicKey} rentReceiver
   * @memberof UnbondingAccount
   */
  static async withCancelUnbond(
    instructions: TransactionInstruction[],
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    rentReceiver: PublicKey
  ) {
    const ix = await unbondingAccount.program.methods
      .cancelUnbond()
      .accounts({
        owner: stakeAccount.stakeAccount.owner,
        receiver: rentReceiver,
        stakeAccount: stakeAccount.addresses.stakeAccount,
        voterWeightRecord: stakeAccount.stakeAccount.voterWeightRecord,
        maxVoterWeightRecord: stakePool.stakePool.maxVoterWeightRecord,
        stakePool: stakePool.addresses.stakePool,
        stakePoolVault: stakePool.vault.address,
        unbondingAccount: unbondingAccount.address
      })
      .instruction()

    instructions.push(ix)
  }

  /**
   * TODO:
   *
   * @static
   * @param {UnbondingAccount} unbondingAccount
   * @param {StakeAccount} stakeAccount
   * @param {StakePool} stakePool
   * @param {PublicKey} rentReceiver
   * @returns {TransactionInstruction[]}
   * @memberof UnbondingAccount
   */
  static cancelUnbond(
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    rentReceiver: PublicKey
  ): TransactionInstruction[] {
    const ix: TransactionInstruction[] = []
    this.withCancelUnbond(ix, unbondingAccount, stakeAccount, stakePool, rentReceiver)
    return ix
  }
}
