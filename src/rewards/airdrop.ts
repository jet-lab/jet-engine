import { Program } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"
import { AssociatedToken, DerivedAccount, findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { RewardsClient } from "./client"

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
  /**
   * Derives the reward vault for the airdrop
   *
   * @static
   * @param {PublicKey} airdrop
   * @returns {DerivedAccount}
   * @memberof Airdrop
   */
  static deriveRewardsVault(airdrop: PublicKey): DerivedAccount {
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
    const rewardsVault = await AssociatedToken.loadAux(rewardsProgram.provider.connection, rewardsVaultAddress.address)
    const airdrop = (await rewardsProgram.account.airdrop.fetch(airdropAddress)) as AirdropInfo
    if (!rewardsVault) {
      throw new Error("Rewards vault is undefined")
    }
    return new Airdrop(airdropAddress, rewardsVaultAddress, airdrop, rewardsVault)
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
    public rewardsVaultAddress: DerivedAccount,
    public airdrop: AirdropInfo,
    public rewardsVault: AssociatedToken
  ) {}

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
}
