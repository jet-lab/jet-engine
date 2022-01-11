import { MemcmpFilter, PublicKey } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"

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
  static async deriveUnbondingAccount(program: Program, stakeAccount: PublicKey, seed: string) {
    return await findDerivedAccount(program.programId, stakeAccount, seed)
  }

  static async load(program: Program, stakeAccount: PublicKey, seed: string) {
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
}
