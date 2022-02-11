import { AssociatedToken } from "./../common/associatedToken"
import { MemcmpFilter, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { bnToNumber, DerivedAccount, findDerivedAccount } from "../common"
import { StakeAccount, StakePool } from "."
import { Hooks } from "../common/hooks"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

export interface UnbondingAccountInfo {
  /// The related account requesting to unstake
  stakeAccount: PublicKey

  /// The amount of shares/tokens to be unstaked
  amount: FullAmount

  /// The time after which the staked amount can be withdrawn
  unbondedAt: BN
}

export interface FullAmount {
  shares: BN
  tokens: BN
}

export class UnbondingAccount {
  private static readonly UINT32_MAXVALUE = 2 ** 32

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
   * @param {Program} program
   * @param {PublicKey} stakeAccount
   * @param {BN} seed
   * @returns {Promise<DerivedAccount>}
   * @memberof UnbondingAccount
   */
  static deriveUnbondingAccount(program: Program, stakeAccount: PublicKey, seed: number): DerivedAccount {
    return findDerivedAccount(program.programId, stakeAccount, this.toBuffer(seed))
  }

  /**
   * TODO:
   * @static
   * @param {Program} program
   * @param {PublicKey} stakeAccount
   * @param {BN} seed
   * @returns {Promise<UnbondingAccount>}
   * @memberof UnbondingAccount
   */
  static async load(program: Program, stakeAccount: PublicKey, seed: number): Promise<UnbondingAccount> {
    const { address: address } = this.deriveUnbondingAccount(program, stakeAccount, seed)

    const unbondingAccount = await program.account.unbondingAccount.fetch(address)

    return new UnbondingAccount(program, address, unbondingAccount as any)
  }

  /**
   * TODO:
   * @static
   * @param {Program} program
   * @param {PublicKey} stakeAccount
   * @returns {Promise<UnbondingAccount[]>}
   * @memberof UnbondingAccount
   */
  static async loadByStakeAccount(program: Program, stakeAccount: PublicKey): Promise<UnbondingAccount[]> {
    // Filter by UnbondingAccount.stakeAccount
    const stakeAccountFilter: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: stakeAccount.toBase58()
      }
    }

    const unbondingAccounts = await program.account.unbondingAccount.all([stakeAccountFilter])
    return unbondingAccounts.map(info => new UnbondingAccount(program, info.publicKey, info.account as any))
  }

  /**
   * Creates an instance of UnbondingAccount.
   * @param {PublicKey} address
   * @param {UnbondingAccountInfo} unbondingAccount
   * @memberof UnbondingAccount
   */
  constructor(public program: Program, public address: PublicKey, public unbondingAccount: UnbondingAccountInfo) {}

  /**
   * TODO:
   * @static
   * @param {Program} [stakeProgram]
   * @param {StakeAccount} [stakeAccount]
   * @returns {(UnbondingAccount[] | undefined)}
   * @memberof UnbondingAccount
   */
  static useByStakeAccount(
    stakeProgram: Program | undefined,
    stakeAccount: StakeAccount | undefined
  ): UnbondingAccount[] | undefined {
    return Hooks.usePromise(
      async () =>
        stakeProgram && stakeAccount && UnbondingAccount.loadByStakeAccount(stakeProgram, stakeAccount.address),
      [stakeProgram, stakeAccount?.address]
    )
  }

  /**
   * TODO:
   * @static
   * @param {UnbondingAccount[] | undefined} [unbondingAccounts]
   * @returns {number}
   * @memberof UnbondingAccount
   */
  static useUnbondingAmountTotal(unbondingAccounts: UnbondingAccount[] | undefined): number {
    const unbondingTokens =
      unbondingAccounts &&
      unbondingAccounts?.reduce<BN>(
        (acc: BN, curr: UnbondingAccount) => acc.add(curr.unbondingAccount.amount.tokens),
        new BN(0)
      )

    return bnToNumber(unbondingTokens) ?? 0
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {StakeAccount} stakeAccount
   * @param {BN} unbondingSeed
   * @param {BN} amount
   * @memberof UnbondingAccount
   */
  static async withUnbondStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    stakeAccount: StakeAccount,
    unbondingSeed: number,
    amount: BN
  ) {
    const { address, bump } = UnbondingAccount.deriveUnbondingAccount(
      stakePool.program,
      stakeAccount.address,
      unbondingSeed
    )
    const ix = stakePool.program.instruction.unbondStake(
      bump,
      unbondingSeed,
      { kind: { tokens: {} }, value: amount },
      {
        accounts: {
          owner: stakeAccount.stakeAccount.owner,
          payer: stakePool.program.provider.wallet.publicKey,
          stakeAccount: stakeAccount.address,
          stakePool: stakePool.addresses.stakePool.address,
          stakePoolVault: stakePool.addresses.stakePoolVault.address,
          unbondingAccount: address,
          systemProgram: SystemProgram.programId
        }
      }
    )
    instructions.push(ix)
  }

  static async withWithdrawUnbonded(
    instructions: TransactionInstruction[],
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    tokenReceiver: PublicKey,
    rentReceiver: PublicKey
  ) {
    const ix = stakeAccount.program.instruction.unbondStake({
      accounts: {
        owner: stakeAccount.stakeAccount.owner,
        closer: rentReceiver,
        tokenReceiver: tokenReceiver,
        stakeAccount: stakeAccount.address,
        stakePool: stakeAccount.stakeAccount.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault.address,
        unbondingAccount: unbondingAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }

  static async withdrawUnbonded(
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    stakePool: StakePool,
    rentReceiver: PublicKey
  ) {
    const provider = unbondingAccount.program.provider
    const ix: TransactionInstruction[] = []
    const tokenReceiver = await AssociatedToken.withCreate(
      ix,
      provider,
      provider.wallet.publicKey,
      stakePool.stakePool.tokenMint
    )
    await this.withWithdrawUnbonded(ix, unbondingAccount, stakeAccount, stakePool, tokenReceiver, rentReceiver)
    return ix
  }

  static async withCancelUnbond(
    instructions: TransactionInstruction[],
    unbondingAccount: UnbondingAccount,
    stakeAccount: StakeAccount,
    rentReceiver: PublicKey
  ) {
    const ix = unbondingAccount.program.instruction.cancelUnbond({
      accounts: {
        owner: stakeAccount.stakeAccount.owner,
        receiver: rentReceiver,
        stakeAccount: stakeAccount.address,
        stakePool: stakeAccount.stakeAccount.stakePool,
        unbondingAccount: unbondingAccount.address
      }
    })
    instructions.push(ix)
  }

  static async cancelUnbond(unbondingAccount: UnbondingAccount, stakeAccount: StakeAccount, rentReceiver: PublicKey) {
    const ix: TransactionInstruction[] = []
    this.withCancelUnbond(ix, unbondingAccount, stakeAccount, rentReceiver)
    return ix
  }
}
