/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { BN, Program } from "@project-serum/anchor"
import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { StakeAccount, StakePool, StakeClient } from "../staking"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { AssociatedToken, findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { RewardsClient } from "./client"

import { AirdropTargetsStruct } from "./layout"

export interface AirdropInfo {
  /**
   * The address of this account
   *
   * @type {PublicKey}
   * @memberof AirdropInfo
   */
  address: PublicKey

  /**
   * The token account containing the tokens to be distributed as the airdrop reward
   *
   * @type {PublicKey}
   * @memberof AirdropInfo
   */
  rewardVault: PublicKey

  /**
   * The address allowed to make changes to the airdrop metadata before finalizing.
   *
   * @type {PublicKey}
   * @memberof AirdropInfo
   */
  authority: PublicKey

  /**
   * The time at which this airdrop expires, and can no longer be claimed
   *
   * @type {BN}
   * @memberof AirdropInfo
   */
  expireAt: BN

  /**
   * The stake pool that rewards are staked into when claimed
   *
   * @type {PublicKey}
   * @memberof AirdropInfo
   */
  stakePool: PublicKey

  /**
   * Settings for airdrops
   *
   * @type {BN}
   * @memberof AirdropInfo
   */
  flags: BN

  /**
   * A short descriptive text for the airdrop
   *
   * @type {number[]}
   * @memberof AirdropInfo
   */
  shortDesc: number[]

  /**
   * The bump seed for the reward vault
   *
   * @type {number[]}
   * @memberof AirdropInfo
   */
  vaultBump: number[]

  /**
   * Storage space for the list of airdrop recipients
   *
   * @type {number[]}
   * @memberof AirdropInfo
   */
  targetInfo: number[]
}

/**
 * List of airdrop recipients
 *
 * @export
 * @interface AirdropTargetInfo
 */
export interface AirdropTargetInfo {
  /**
   * The total amount of reward tokens that are claimable by recipients
   *
   * @type {BN}
   * @memberof AirdropTargetInfo
   */
  rewardTotal: BN

  /**
   * The total number of airdrop recipients
   *
   * @type {BN}
   * @memberof AirdropTargetInfo
   */
  recipientsTotal: BN

  /**
   * Marker to indicate when the airdrop has been finalized from further edits
   *
   * @type {BN}
   * @memberof AirdropTargetInfo
   */
  finalized: BN

  /**
   * List of airdrop recipients that can claim tokens
   *
   * @type {AirdropTarget[]}
   * @memberof AirdropTargetInfo
   */
  recipients: AirdropTarget[]
}

/**
 * An airdrop recipients that can claim tokens
 *
 * @export
 * @interface AirdropTarget
 */
export interface AirdropTarget {
  /**
   * The amount of tokens that the target can claim
   *
   * @type {BN}
   * @memberof AirdropTarget
   */
  amount: BN

  /**
   * The address allowed to claim the airdrop tokens
   *
   * @type {PublicKey}
   * @memberof AirdropTarget
   */
  recipient: PublicKey
}

export class Airdrop {
  targetInfo: AirdropTargetInfo

  /**
   * Derives the reward vault for the airdrop
   *
   * @static
   * @param {PublicKey} airdrop
   * @returns {PublicKey}
   * @memberof Airdrop
   */
  static deriveRewardsVault(airdrop: PublicKey): PublicKey {
    return findDerivedAccount(RewardsClient.PROGRAM_ID, airdrop, "vault")
  }

  /**
   * Loads the airdrop account and its reward vault
   *
   * @static
   * @param {Program} rewardsProgram
   * @param {PublicKey} airdropAddress
   * @returns {Promise<Airdrop>}
   * @memberof Airdrop
   */
  static async load(rewardsProgram: Program, airdropAddress: PublicKey): Promise<Airdrop> {
    const rewardsVaultAddress = this.deriveRewardsVault(airdropAddress)
    const rewardsVault = await AssociatedToken.loadAux(rewardsProgram.provider.connection, rewardsVaultAddress)
    const airdrop = (await rewardsProgram.account.airdrop.fetch(airdropAddress)) as AirdropInfo
    if (!rewardsVault) {
      throw new Error("Rewards vault is undefined")
    }
    return new Airdrop(airdropAddress, rewardsVaultAddress, airdrop, rewardsVault)
  }

  static async loadAll(rewardsProgram: Program): Promise<Airdrop[]> {
    const airdropInfos = await rewardsProgram.account.airdrop.all()
    const rewardVaultAddresses = airdropInfos.map(airdrop => this.deriveRewardsVault(airdrop.publicKey))
    const rewardVaults = await AssociatedToken.loadMultipleAux(rewardsProgram.provider.connection, rewardVaultAddresses)
    const airdrops: Airdrop[] = []
    for (let i = 0; i < airdropInfos.length; i++) {
      const airdropInfo = airdropInfos[i]
      const rewardVaultAddress = rewardVaultAddresses[i]
      const rewardVault = rewardVaults[i]
      if (!rewardVault) {
        throw new Error(`Rewards vault at ${rewardVaultAddress.toBase58()} is undefined`)
      }
      const airdrop = new Airdrop(
        airdropInfo.publicKey,
        rewardVaultAddress,
        airdropInfo.account as AirdropInfo,
        rewardVault
      )
      airdrops.push(airdrop)
    }
    return airdrops
  }

  private static decodeTargetInfo(targetInfo: number[]) {
    return AirdropTargetsStruct.decode(new Uint8Array(targetInfo)) as AirdropTargetInfo
  }

  /**
   * Creates an instance of Airdrop.
   * @param {PublicKey} airdropAddress
   * @param {DerivedAccount} rewardsVaultAddress
   * @param {AirdropInfo} airdrop
   * @param {AssociatedToken} rewardsVault
   * @memberof Airdrop
   */
  constructor(
    public airdropAddress: PublicKey,
    public rewardsVaultAddress: PublicKey,
    public airdrop: AirdropInfo,
    public rewardsVault: AssociatedToken
  ) {
    this.targetInfo = Airdrop.decodeTargetInfo(airdrop.targetInfo)
  }

  /**
   * React hook to use the airdrop account and its hook
   *
   * @static
   * @param {(Program | undefined)} rewardsProgram
   * @param {(PublicKey | undefined)} airdrop
   * @returns Airdrop | undefined
   * @memberof Airdrop
   */
  static use(rewardsProgram: Program | undefined, airdrop: PublicKey | undefined): Airdrop | undefined {
    return Hooks.usePromise(
      async () => rewardsProgram && airdrop && Airdrop.load(rewardsProgram, airdrop),
      [rewardsProgram, airdrop]
    )
  }

  static useAll(rewardsProgram: Program | undefined): Airdrop[] | undefined {
    return Hooks.usePromise(async () => rewardsProgram && Airdrop.loadAll(rewardsProgram), [rewardsProgram])
  }

  getRecipient(wallet: PublicKey) {
    return this.targetInfo.recipients.find(recipient => wallet.equals(recipient.recipient))
  }

  static async withClaim(
    instructions: TransactionInstruction[],
    rewardsProgram: Program,
    airdrop: Airdrop,
    stakePool: StakePool,
    stakeAccount: StakeAccount
  ) {
    console.log("Claiming and staking the airdrop.")
    const ix = rewardsProgram.instruction.airdropClaim({
      accounts: {
        /** The airdrop to claim from */
        airdrop: airdrop.airdropAddress,
        /** The token account to claim the rewarded tokens from */
        rewardVault: airdrop.rewardsVaultAddress,
        /** The address entitled to the airdrop, which must sign to claim */
        recipient: stakeAccount.stakeAccount.owner,
        /** The address to receive rent recovered from the claim account */
        receiver: stakeAccount.stakeAccount.owner,
        /** The stake pool to deposit stake into */
        stakePool: airdrop.airdrop.stakePool,
        /** The stake pool token vault */
        stakePoolVault: stakePool.vault.address,
        /** The account to own the stake being deposited */
        stakeAccount: stakeAccount.address,
        stakingProgram: StakeClient.PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }

  static async claim(rewardsProgram: Program, airdrop: Airdrop, stakePool: StakePool, stakeAccount: StakeAccount) {
    const ix: TransactionInstruction[] = []
    this.withClaim(ix, rewardsProgram, airdrop, stakePool, stakeAccount)
    console.log("claim ix", ix)
    return ix
  }
}
