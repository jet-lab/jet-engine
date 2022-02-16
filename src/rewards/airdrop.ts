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
import { StakeAccount, StakePool, JET_STAKE_ID } from "../staking"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { AssociatedToken, DerivedAccount, findDerivedAccount } from "../common"
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

export interface AirdropCreateParams {
  /// The expiration time for the airdrop
  expire_at: BN

  /// The stake pool that claimed rewards are deposited into.
  stake_pool: PublicKey

  /// A description for this airdrop
  short_desc: string

  /// The bump seed needed to generate the airdrop account address
  vault_bump: number

  /// Airdrop settings
  flags: BN
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


  // claim
  // TODO - now: airdrop_claim.rs

  static async withClaim(
    instructions: TransactionInstruction[],
    rewardsProgram: Program,
    airdrop: Airdrop,
    stakePool: StakePool,
    stakeAccount: StakeAccount
  ) {
    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (stakeAccount.stakeAccount) {
      console.log("Claiming and staking the airdrop.")
      const ix = rewardsProgram.instruction.airdropClaim({
        accounts: {
          /// The airdrop to claim from
          airdrop: airdrop.airdropAddress,
          /// The token account to claim the rewarded tokens from
          rewardVault: airdrop.rewardsVaultAddress,
          /// The address entitled to the airdrop, which must sign to claim
          recipient: stakeAccount.stakeAccount.owner,
          /// TODO - question: is this jet token account or user's token account?
          /// The address to receive rent recovered from the claim account
          receiver: stakeAccount.stakeAccount.owner,
          /// The stake pool to deposit stake into
          stakePool: airdrop.airdrop.stakePool,
          /// The stake pool token vault
          stakePoolVault: stakePool.vault.address,
          /// The account to own the stake being deposited
          stakeAccount: stakeAccount.address,
          stakingProgram: JET_STAKE_ID,
          tokenProgram: TOKEN_PROGRAM_ID
       }
      })
      instructions.push(ix)
    }
  }

  // TODO: take a look to see if i need to use this pattern
  // static use(
  //   rewardsProgram: Program | undefined,
  //   stakePool: StakePool | undefined,
  //   wallet: PublicKey | undefined | null
  // ) {
  //   const [stakeAccount, setStakeAccount] = useState<StakeAccount | undefined>()
  //   useEffect(() => {
  //     let abort = false
  //     if (rewardsProgram && stakePool && wallet) {
  //       StakeAccount.load(rewardsProgram, stakePool.addresses.stakePool.address, wallet)
  //         .then(newStakeAccount => !abort && setStakeAccount(newStakeAccount))
  //         .catch(() => !abort && setStakeAccount(undefined))
  //     } else {
  //       setStakeAccount(undefined)
  //     }
  //     return () => {
  //       abort = true
  //     }
  //   }, [rewardsProgram, stakePool, wallet])
  //   return stakeAccount
  // }
  // static useBalance(stakeAccount: StakeAccount | undefined, stakePool: StakePool | undefined): StakeBalance {
  //   const unlockedVoteLamports = AssociatedToken.use(
  //     stakePool?.program.provider,
  //     stakePool?.addresses.stakeVoteMint.address,
  //     stakeAccount?.stakeAccount.owner
  //   )
  //   const unstakedJetLamports = AssociatedToken.use(
  //     stakePool?.program.provider,
  //     stakePool?.stakePool.tokenMint,
  //     stakeAccount?.stakeAccount.owner
  //   )
  //   const decimals = stakePool?.collateralMint.decimals
  //   const voteDecimals = stakePool?.voteMint.decimals
  //   const unlockedVotes = voteDecimals !== undefined ? bnToNumber(unlockedVoteLamports?.amount) / 10 ** voteDecimals : 0
  //   const unstakedJet = decimals !== undefined ? bnToNumber(unstakedJetLamports?.amount) / 10 ** decimals : 0
  //   const stakedJet =
  //     stakeAccount && decimals !== undefined ? bnToNumber(stakeAccount.stakeAccount.shares) / 10 ** decimals : 0
  //   const unbondingJet = -1
  //   return {
  //     stakedJet,
  //     unstakedJet,
  //     unbondingJet,
  //     unlockedVotes
  //   }
  // }

  // static async create(rewardsProgram: Program, airdrop: PublicKey) {
  //   const instructions: TransactionInstruction[] = []
  //   const { address, bumpSeed } = await this.deriveRewardVault(rewardsProgram, airdrop)
  //   await this.withCreate(instructions, rewardsProgram, address, owner)
  //   return await rewardsProgram.provider.send(new Transaction().add(...instructions))
  // }
  // static async addStake(stakePool: StakePool, owner: PublicKey, collateralTokenAccount: PublicKey, amount: BN) {
  //   const instructions: TransactionInstruction[] = []
  //   const voterTokenAccount = await AssociatedToken.withCreate(
  //     instructions,
  //     stakePool.program.provider,
  //     owner,
  //     stakePool.addresses.stakeVoteMint.address
  //   )
  //   await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool.address, owner)
  //   await this.withAddRecipients(instructions, stakePool, owner, collateralTokenAccount, amount)
  //   return await stakePool.program.provider.send(new Transaction().add(...instructions))
  // }
  // static async withCreate(
  //   instructions: TransactionInstruction[],
  //   rewardsProgram: Program,
  //   airdropAddress: PublicKey,
  //   authority: PublicKey,
  //   payer: PublicKey,
  //   token_mint: PublicKey,
  //   params: AirdropCreateParams
  // ) {
  //   const airdrop = await rewardsProgram.provider.connection.getAccountInfo(airdropAddress)
  //   const { address } = Airdrop.deriveRewardVault(rewardsProgram, airdropAddress)
  //   // It would be nice to have seperate options
  //   // 1) The account is from the right program. Relevant to non PDAs
  //   // 2) The account is the right type. Relevant to non PDAs
  //   // 3) If the account doesn't exist, should we create it. Relevant to caller
  //   // 4) If the account exists, should we error or not
  //   if (!airdrop) {
  //     console.log("Creating the airdrop.")
  //     const ix = rewardsProgram.instruction.airdropCreate(params, {
  //       accounts: {
  //         airdrop: airdropAddress,
  //         authority,
  //         reward_vault: address,
  //         payer,
  //         token_mint,
  //         token_program: TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //         rent: SYSVAR_RENT_PUBKEY,
  //       }
  //     })
  //     instructions.push(ix)
  //   }
  // }

  // static async withAddRecipients(
  //   instructions: TransactionInstruction[],
  //   stakePool: StakePool,
  //   owner: PublicKey,
  //   tokenAccount: PublicKey,
  //   amount: BN
  // ) {
  //   const { address: stakeAccount } = await this.deriveStakeAccount(
  //     stakePool.program,
  //     stakePool.addresses.accounts.stakePool,
  //     owner
  //   )
  //   const ix = stakePool.program.instruction.addStake(
  //     { kind: { tokens: {} }, value: amount },
  //     {
  //       accounts: {
  //         stakePool: stakePool.addresses.stakePool.address,
  //         stakePoolVault: stakePool.addresses.accounts.stakePoolVault,
  //         stakeAccount,
  //         payer: stakePool.program.provider.wallet.publicKey,
  //         payerTokenAccount: tokenAccount,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       }
  //     }
  //   )
  //   instructions.push(ix)
  // }

  // static async withFinalize(
  //   instructions: TransactionInstruction[],
  //   stakePool: StakePool,
  //   owner: PublicKey,
  //   voterTokenAccount: PublicKey,
  //   amount: BN
  // ) {
  //   const { address: stakeAccount } = await this.deriveStakeAccount(
  //     stakePool.program,
  //     stakePool.addresses.stakePool.address,
  //     owner
  //   )
  //   const ix = stakePool.program.instruction.mintVotes(
  //     { kind: { tokens: {} }, amount },
  //     {
  //       accounts: {
  //         owner: owner,
  //         stakePool: stakePool.addresses.stakePool.address,
  //         stakePoolVault: stakePool.addresses.stakePoolVault.address,
  //         stakeVoteMint: stakePool.addresses.stakeVoteMint.address,
  //         stakeAccount,
  //         voterTokenAccount,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       }
  //     }
  //   )
  //   instructions.push(ix)
  // }
  // static async withClose(
  //   instructions: TransactionInstruction[],
  //   stakePool: StakePool,
  //   stakeAccount: StakeAccount,
  //   owner: PublicKey,
  //   voterTokenAccount: PublicKey,
  //   amount: BN
  // ) {
  //   const ix = stakePool.program.instruction.burnVotes(amount, {
  //     accounts: {
  //       owner,
  //       stakePool: stakePool.addresses.stakePool.address,
  //       stakeVoteMint: stakePool.addresses.stakeVoteMint.address,
  //       stakeAccount: stakeAccount.address,
  //       voterTokenAccount,
  //       voter: owner,
  //       tokenProgram: TOKEN_PROGRAM_ID
  //     }
  //   })
  //   instructions.push(ix)
  // }

  // create
  // TODO - later: airdrop_create.rs
  // TODO - later: airdrop_add_recipients.rs
  // finalize
  // TODO - later: airdrop_finalize.rs
  // close
  // TODO - later: airdrop_close.rs
}
