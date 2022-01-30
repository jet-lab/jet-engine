import { BN, Program } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { AssociatedToken, DerivedAccount, findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { RewardsClient } from "./client"

/**
 * A distribution account from the rewards program.
 *
 * @export
 * @interface DistributionInfo
 */
export interface DistributionInfo {
  /**
   * The address of this distribution account
   *
   * @type {PublicKey}
   * @memberof DistributionInfo
   */
  address: PublicKey

  /**
   * The authority that can manage this distribution.
   *
   * @type {PublicKey}
   * @memberof DistributionInfo
   */
  authority: PublicKey

  /**
   * The account with the tokens to be distributed
   *
   * @type {PublicKey}
   * @memberof DistributionInfo
   */
  vault: PublicKey

  /**
   * The seed for the address
   *
   * @type {number[]}
   * @memberof DistributionInfo
   */
  seed: number[]

  /**
   * The length of the seed string
   *
   * @type {number}
   * @memberof DistributionInfo
   */
  seedLen: number

  /**
   * The bump seed for the address
   *
   * @type {number[]}
   * @memberof DistributionInfo
   */
  bumpSeed: number[]

  /**
   * The account the rewards are distributed into
   *
   * @type {PublicKey}
   * @memberof DistributionInfo
   */
  targetAccount: PublicKey

  /**
   * The details on the token distribution
   *
   * @type {TokenDistribution}
   * @memberof DistributionInfo
   */
  tokenDistribution: TokenDistribution
}

export interface TokenDistribution {
  /**
   * The total amount of tokens to be distributed
   *
   * @type {BN}
   * @memberof TokenDistribution
   */
  targetAmount: BN

  /**
   * The amount of tokens already distributed
   *
   * @type {BN}
   * @memberof TokenDistribution
   */
  distributed: BN

  /**
   * The time after which rewards will start to be distributed
   *
   * @type {BN}
   * @memberof TokenDistribution
   */
  begnAt: BN

  /**
   * The time the distribution will be complete by
   *
   * @type {BN}
   * @memberof TokenDistribution
   */
  endAt: BN

  /**
   * The type of distribution
   *
   * @type {DistributionKind}
   * @memberof TokenDistribution
   */
  kind: DistributionKind
}

export class DistributionKind {
  linear: Record<string, never> | undefined = {}
}

export interface DistributionAddresses {
  distribution: DerivedAccount
  vault: DerivedAccount
}

export class Distribution {
  /**
   * Derive the distribution account and its vault PDA
   * @static
   * @param {string} seed
   * @returns {DistributionAddresses}
   * @memberof Distribution
   */
  static derive(seed: string): DistributionAddresses {
    const distribution = findDerivedAccount(RewardsClient.PROGRAM_ID, seed)
    const vault = findDerivedAccount(RewardsClient.PROGRAM_ID, distribution.address, "vault")
    return { distribution, vault }
  }

  /**
   * Load the distribution account and its vault
   * @static
   * @param {Program} rewardsProgram
   * @param {string} seed
   * @returns {Promise<Distribution>}
   * @memberof Distribution
   */
  static async load(rewardsProgram: Program, seed: string): Promise<Distribution> {
    const addresses = Distribution.derive(seed)
    const vault = await AssociatedToken.loadAux(rewardsProgram.provider.connection, addresses.vault.address)
    const distribution = (await rewardsProgram.account.distribution.fetch(
      addresses.distribution.address
    )) as DistributionInfo
    if (!vault) {
      throw new Error("Vault is undefined")
    }
    return new Distribution(addresses, distribution, vault)
  }

  /**
   * Creates an instance of Distribution.
   * @param {DistributionAddresses} addresses
   * @param {DistributionInfo} distribution
   * @param {AssociatedToken} vault
   * @memberof Distribution
   */
  constructor(
    public addresses: DistributionAddresses,
    public distribution: DistributionInfo,
    public vault: AssociatedToken
  ) {}

  /**
   * React hook to load the distribution account and its vault
   * @static
   * @param {(Program | undefined)} rewardsProgram
   * @param {string} seed
   * @returns {Distribution | undefined}
   * @memberof Distribution
   */
  static use(rewardsProgram: Program | undefined, seed: string): Distribution | undefined {
    return Hooks.usePromise(
      async () => rewardsProgram && Distribution.load(rewardsProgram, seed),
      [rewardsProgram, seed]
    )
  }
}
