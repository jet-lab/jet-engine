import { MemcmpFilter, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { bnToNumber, DerivedAccount, findDerivedAccount } from "../common"
import { StakeAccount, StakePool } from "."
import { Hooks } from "../common/hooks"

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
  private static UINT32_MAXVALUE = 0xffffffff

  /**
   * TODO:
   * @private
   * @static
   * @param {BN} seed
   * @returns {Buffer}
   * @memberof UnbondingAccount
   */
  private static toBuffer(seed: BN): Buffer {
    if (seed.gtn(UnbondingAccount.UINT32_MAXVALUE)) {
      throw new Error(`Seed must not exceed ${this.UINT32_MAXVALUE}`)
    }
    if (seed.ltn(0)) {
      throw new Error(`Seed must not be negative`)
    }
    return seed.toBuffer("le", 4)
  }

  /**
   * TODO:
   * @static
   * @returns {BN}
   * @memberof UnbondingAccount
   */
  static randomSeed(): BN {
    const min = 0
    const max = this.UINT32_MAXVALUE
    return new BN(Math.random() * (max - min) + min)
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
  static deriveUnbondingAccount(program: Program, stakeAccount: PublicKey, seed: BN): DerivedAccount {
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
  static async load(program: Program, stakeAccount: PublicKey, seed: BN): Promise<UnbondingAccount> {
    const { address: address } = this.deriveUnbondingAccount(program, stakeAccount, seed)

    const unbondingAccount = await program.account.unbondingAccount.fetch(address)

    return new UnbondingAccount(address, unbondingAccount as any)
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

    const unbondingAccounts = await program.account.UnbondingAccount.all([stakeAccountFilter])
    return unbondingAccounts.map(info => new UnbondingAccount(info.publicKey, info as any))
  }

  /**
   * Creates an instance of UnbondingAccount.
   * @param {PublicKey} address
   * @param {UnbondingAccountInfo} unbondingAccount
   * @memberof UnbondingAccount
   */
  constructor(public address: PublicKey, public unbondingAccount: UnbondingAccountInfo) {}

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
     static useUnbondingAmountTotal(
      unbondingAccounts: UnbondingAccount[] | undefined,
    ): number {
      const unbondingTokens: BN[] = []

      unbondingAccounts?.forEach(acc => unbondingTokens.push(acc.unbondingAccount.amount.tokens))

      const unbondingAmountTotal = unbondingAccounts && bnToNumber(unbondingTokens.reduce((a, b) => a.iadd(b)))

      return unbondingAmountTotal ?? 0
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
    unbondingSeed: BN,
    amount: BN
  ) {
    const { address, bump } = UnbondingAccount.deriveUnbondingAccount(
      stakePool.program,
      stakeAccount.address,
      unbondingSeed
    )
    const ix = stakePool.program.instruction.unbondStake(
      bump,
      this.toBuffer(unbondingSeed),
      { kind: { tokens: {} }, amount },
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
}
