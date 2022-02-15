import { Program } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { AssociatedToken, findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { RewardsClient } from "./client"
import { TokenDistribution } from "./distribution"

export interface AwardInfo {
  /**
   * The authority allowed to revoke/close the award
   *
   * @type {PublicKey}
   * @memberof AwardInfo
   */
  authority: PublicKey

  /**
   * The seed for the address
   *
   * @type {PublicKey}
   * @memberof AwardInfo
   */
  seed: PublicKey

  /**
   * The bump seed for the address
   *
   * @type {number[]}
   * @memberof AwardInfo
   */
  bumpSeed: number[]

  /**
   * The stake account the award is deposited to
   *
   * @type {PublicKey}
   * @memberof AwardInfo
   */
  stakeAccount: PublicKey

  /**
   * The token account storing the unvested balance
   *
   * @type {PublicKey}
   * @memberof AwardInfo
   */
  vault: PublicKey

  /**
   * The details on the token distribution
   *
   * @type {TokenDistribution}
   * @memberof AwardInfo
   */
  tokenDistribution: TokenDistribution
}

export interface AwardAddresses {
  award: PublicKey
  vault: PublicKey
}

export class Award {
  /**
   * Derive the award account and vault token account PDAs
   *
   * @static
   * @param {PublicKey} stakeAccount
   * @param {string} seed
   * @returns {AwardAddresses}
   * @memberof Award
   */
  static derive(stakeAccount: PublicKey, seed: string): AwardAddresses {
    const award = findDerivedAccount(RewardsClient.PROGRAM_ID, stakeAccount, seed)
    const vault = findDerivedAccount(RewardsClient.PROGRAM_ID, award, "vault")
    return { award, vault }
  }

  /**
   * Load the award account and its vault
   *
   * @static
   * @param {Program} rewardsProgram
   * @param {PublicKey} stakeAccount
   * @param {string} seed
   * @returns {Promise<Award>}
   * @memberof Award
   */
  static async load(rewardsProgram: Program, stakeAccount: PublicKey, seed: string): Promise<Award> {
    const addresses = this.derive(stakeAccount, seed)
    const award = (await rewardsProgram.account.award.fetch(addresses.award)) as AwardInfo
    const vault = await AssociatedToken.loadAux(rewardsProgram.provider.connection, addresses.vault)
    if (!vault) {
      throw new Error("Vault is undefined")
    }
    return new Award(addresses, award, vault)
  }

  /**
   * Creates an instance of Award.
   * @param {AwardAddresses} addresses
   * @param {AwardInfo} award
   * @param {AssociatedToken} vault
   * @memberof Award
   */
  constructor(public addresses: AwardAddresses, public award: AwardInfo, public vault: AssociatedToken) {}

  /**
   * React hook to use the award account and its vault
   *
   * @static
   * @param {(Program | undefined)} rewardsProgram
   * @param {(PublicKey | undefined)} stakeAccount
   * @param {string} seed
   * @returns {(Award | undefined)}
   * @memberof Award
   */
  static use(
    rewardsProgram: Program | undefined,
    stakeAccount: PublicKey | undefined,
    seed: string
  ): Award | undefined {
    return Hooks.usePromise(
      async () => rewardsProgram && stakeAccount && Award.load(rewardsProgram, stakeAccount, seed),
      [rewardsProgram, stakeAccount, seed]
    )
  }
}
