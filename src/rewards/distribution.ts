import { StakePool } from "./../staking/stakePool"
import { bnToNumber, utf8ToString } from "./../common/accountParser"
import { BN, Program, ProgramAccount } from "@project-serum/anchor"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { AssociatedToken, findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { RewardsClient } from "./client"
import _ from "lodash"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { RewardsIdl } from "./idl"

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
  beginAt: BN

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
  distribution: PublicKey
  vault: PublicKey
}

export class Distribution {
  /**
   * Derive the distribution account and its vault PDA
   * @static
   * @param {string} seed
   * @return {*}  {DistributionAddresses}
   * @memberof Distribution
   */
  static derive(seed: string): DistributionAddresses
  /**
   * Derive the distribution account and its vault PDA
   * @static
   * @param {number[]} seed
   * @param {number} seedLen
   * @return {DistributionAddresses}
   * @memberof Distribution
   */
  static derive(seed: number[], seedLen: number): DistributionAddresses

  static derive(seed: string | number[], seedLen?: number): DistributionAddresses {
    if (seed instanceof Array) {
      if (!seedLen) {
        throw new Error("Seed length required")
      }
      seed = utf8ToString(seed, seedLen)
    }
    const distribution = findDerivedAccount(RewardsClient.PROGRAM_ID, "distribution", seed)
    const vault = findDerivedAccount(RewardsClient.PROGRAM_ID, distribution, "vault")
    return { distribution, vault }
  }

  /**
   * Load the distribution account and its vault
   * @static
   * @param {Program<RewardsIdl>} rewardsProgram
   * @param {string} seed
   * @returns {Promise<Distribution>}
   * @memberof Distribution
   */
  static async load(rewardsProgram: Program<RewardsIdl>, seed: string): Promise<Distribution> {
    const addresses = Distribution.derive(seed)
    const vault = await AssociatedToken.loadAux(rewardsProgram.provider.connection, addresses.vault)
    const distribution = (await rewardsProgram.account.distribution.fetch(addresses.distribution)) as DistributionInfo
    if (!vault) {
      throw new Error("Vault is undefined")
    }
    return new Distribution(addresses, distribution, vault)
  }

  /**
   * TODO:
   *
   * @static
   * @param {Program<RewardsIdl>} rewardsProgram
   * @returns {Promise<Distribution[]>}
   * @memberof Distribution
   */
  static async loadAll(rewardsProgram: Program<RewardsIdl>): Promise<Distribution[]> {
    const distributions = (await rewardsProgram.account.distribution.all()) as ProgramAccount<DistributionInfo>[]
    const addresses = distributions.map(dist => Distribution.derive(dist.account.seed, dist.account.seedLen))
    const vaultAddresses = addresses.map(address => address.vault)
    const vaults = await AssociatedToken.loadMultipleAux(rewardsProgram.provider.connection, vaultAddresses)

    return (
      _.zip(addresses, distributions, vaults)
        .filter(([address, distribution, vault]) => address && distribution && vault)
        .map(([address, distribution, vault]) => {
          if (!address) {
            throw new Error("Address is undefined")
          }
          if (!distribution) {
            throw new Error("Distribution is undefined")
          }
          if (!vault) {
            throw new Error("Vault is undefined")
          }
          return new Distribution(address, distribution.account, vault)
        })
        // Sort by beginAt descending
        .sort((a, b) =>
          b.distribution.tokenDistribution.beginAt.sub(a.distribution.tokenDistribution.beginAt).toNumber()
        )
    )
  }

  /**
   * TODO:
   *
   * @static
   * @param {Program<RewardsIdl>} rewardsProgram
   * @param {StakePool} distributionTarget
   * @param {DistributionCreateParams} params
   * @memberof Distribution
   */
  static async createForStakePool(
    rewardsProgram: Program<RewardsIdl>,
    distributionTarget: StakePool,
    params: DistributionCreateParams
  ) {
    const stakePoolVault = distributionTarget.addresses.stakePoolVault
    const tokenMint = distributionTarget.stakePool.tokenMint
    await this.create(rewardsProgram, stakePoolVault, tokenMint, params)
  }

  /**
   * TODO:
   *
   * @static
   * @param {Program<RewardsIdl>} rewardsProgram
   * @param {PublicKey} targetAccount
   * @param {PublicKey} tokenMint
   * @param {DistributionCreateParams} params
   * @returns {Promise<string>}
   * @memberof Distribution
   */
  static async create(
    rewardsProgram: Program<RewardsIdl>,
    targetAccount: PublicKey,
    tokenMint: PublicKey,
    params: DistributionCreateParams
  ): Promise<string> {
    const addresses = this.derive(params.args.seed)
    return rewardsProgram.methods
      .distributionCreate({
        ...params.args,
        targetAccount
      })
      .accounts({
        ...params.accounts,
        distribution: addresses.distribution,
        vault: addresses.vault,
        payerRent: rewardsProgram.provider.wallet.publicKey,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc()
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
   * @param {(Program<RewardsIdl> | undefined)} rewardsProgram
   * @param {string} seed
   * @returns {Distribution | undefined}
   * @memberof Distribution
   */
  static use(rewardsProgram: Program<RewardsIdl> | undefined, seed: string): Distribution | undefined {
    return Hooks.usePromise(
      async () => rewardsProgram && Distribution.load(rewardsProgram, seed),
      [rewardsProgram, seed]
    )
  }

  /**
   * React hook to load all the distribution accounts and their vaults
   * @static
   * @param {(Program<RewardsIdl> | undefined)} rewardsProgram
   * @returns {Distribution[] | undefined}
   * @memberof Distribution
   */
  static useAll(rewardsProgram: Program<RewardsIdl> | undefined): Distribution[] | undefined {
    return Hooks.usePromise(async () => rewardsProgram && Distribution.loadAll(rewardsProgram), [rewardsProgram])
  }

  /**
   * TODO:
   *
   * @param {BN} now
   * @returns {boolean}
   * @memberof Distribution
   */
  isActive(now: BN): boolean {
    if (this.distribution.tokenDistribution.beginAt.gt(now)) {
      return false
    }
    if (this.distribution.tokenDistribution.endAt.lte(now)) {
      return false
    }
    return true
  }

  /**
   * TODO:
   *
   * @static
   * @param {Distribution} dist
   * @param {number} totalDeposits
   * @param {number} totalShares
   * @param {number} usersShares
   * @returns {DistributionYield}
   * @memberof Distribution
   */
  static estimateYield(
    dist: Distribution,
    totalDeposits: number,
    totalShares: number,
    usersShares: number
  ): DistributionYield {
    const tokenDist = dist.distribution.tokenDistribution
    if (tokenDist.kind.linear === undefined) {
      throw new Error("Calculatng non linear yield not implemented.")
    }

    const day = 24 * 3600
    const year = day * 365.25
    const distAmount = bnToNumber(tokenDist.targetAmount)
    const duration = bnToNumber(tokenDist.endAt.sub(tokenDist.beginAt))
    const durationInYears = duration / year
    const equityPercent = totalShares !== 0 ? usersShares / totalShares : 1

    const perDay = (distAmount / duration) * equityPercent * day
    const perMonth = (distAmount / duration) * equityPercent * day * 30.4375
    const perYear = (distAmount / duration) * equityPercent * day * 365.25
    const apr = distAmount / totalDeposits / durationInYears

    return new DistributionYield(apr, perDay, perMonth, perYear)
  }

  /**
   * TODO:
   *
   * @static
   * @param {Distribution[]} distributions
   * @param {number} totalDeposits
   * @param {number} totalShares
   * @param {number} usersShares
   * @returns {DistributionYield}
   * @memberof Distribution
   */
  static estimateCombinedYield(
    distributions: Distribution[],
    totalDeposits: number,
    totalShares: number,
    usersShares: number
  ): DistributionYield {
    const initialValue = new DistributionYield()
    return distributions.reduce((combinedYield: DistributionYield, dist: Distribution) => {
      return Distribution.estimateYield(dist, totalDeposits, totalShares, usersShares).combine(combinedYield)
    }, initialValue)
  }
}

export class DistributionYield {
  constructor(public apr: number = 0, public perDay?: number, public perMonth?: number, public perYear?: number) {}

  /**
   * TODO:
   *
   * @param {DistributionYield} other
   * @returns {DistributionYield}
   * @memberof DistributionYield
   */
  combine(other: DistributionYield): DistributionYield {
    return new DistributionYield(
      this.apr + other.apr,
      (this.perDay ?? 0) + (other.perDay ?? 0),
      (this.perMonth ?? 0) + (other.perMonth ?? 0),
      (this.perYear ?? 0) + (other.perYear ?? 0)
    )
  }
}

export interface DistributionCreateParams {
  args: {
    seed: string
    authority: PublicKey
    amount: BN
    beginAt: BN
    endAt: BN
  }
  accounts: {
    payerTokenAuthority: PublicKey
    payerTokenAccount: PublicKey
  }
}
