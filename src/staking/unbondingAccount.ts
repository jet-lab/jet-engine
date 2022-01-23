import { MemcmpFilter, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { StakeAccount, StakePool } from "."
import { useEffect, useState } from "react"

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

  private static toBuffer(seed: BN) {
    if (seed.gtn(UnbondingAccount.UINT32_MAXVALUE)) {
      throw new Error(`Seed must not exceed ${this.UINT32_MAXVALUE}`)
    }
    if (seed.ltn(0)) {
      throw new Error(`Seed must not be negative`)
    }
    return seed.toBuffer("le", 4)
  }

  static randomSeed() {
    const min = 0
    const max = this.UINT32_MAXVALUE
    return new BN(Math.random() * (max - min) + min)
  }

  static async deriveUnbondingAccount(program: Program, stakeAccount: PublicKey, seed: BN) {
    return await findDerivedAccount(program.programId, stakeAccount, this.toBuffer(seed))
  }

  static async load(program: Program, stakeAccount: PublicKey, seed: BN) {
    const { address: address } = await this.deriveUnbondingAccount(program, stakeAccount, seed)

    const unbondingAccount = await program.account.UnbondingAccount.fetch(address)

    return new UnbondingAccount(address, unbondingAccount as any)
  }

  static async loadByStakeAccount(program: Program, stakeAccount: PublicKey) {
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

  constructor(public address: PublicKey, public unbondingAccount: UnbondingAccountInfo) {}

  static useByStakeAccount(stakeProgram: Program | undefined, stakeAccount: StakeAccount | undefined) {
    const [unbondingAccounts, setUnbondingAccounts] = useState<UnbondingAccount[] | undefined>()
    useEffect(() => {
      let abort = false

      if (stakeProgram && stakeAccount) {
        UnbondingAccount.loadByStakeAccount(stakeProgram, stakeAccount.address)
          .then(newUnbondingAccounts => !abort && setUnbondingAccounts(newUnbondingAccounts))
          .catch(console.error)
      } else {
        setUnbondingAccounts(undefined)
      }

      return () => {
        abort = true
      }
    }, [stakeProgram, stakeAccount])
    return unbondingAccounts
  }

  static async withUnbondStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    stakeAccount: StakeAccount,
    unbondingSeed: BN,
    amount: BN
  ) {
    const { address, bump } = await UnbondingAccount.deriveUnbondingAccount(
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
