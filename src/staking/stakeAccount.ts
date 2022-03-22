import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Program, Provider } from "@project-serum/anchor"
import { StakePool } from "."
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { findDerivedAccount } from "../common"
import { AssociatedToken } from "../common/associatedToken"
import { Hooks } from "../common/hooks"
import { Auth } from "../auth"
import { getTokenOwnerRecordAddress, ProgramAccount, Realm } from "@solana/spl-governance"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"

export interface StakeAccountInfo {
  /** The account that has ownership over this stake */
  owner: PublicKey

  /** The pool this account is associated with */
  stakePool: PublicKey

  /** The stake balance (in share units) */
  shares: BN

  /** The token balance locked by existence of voting tokens */
  mintedVotes: BN

  /** The stake balance locked by existence of collateral tokens */
  mintedCollateral: BN

  /** The total staked tokens currently unbonding so as to be withdrawn in the future */
  unbonding: BN
}

export interface StakeBalance {
  stakedJet: BN | undefined
  unbondingJet: BN | undefined
}

export class StakeAccount {
  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<PublicKey>}
   * @memberof StakeAccount
   */
  static deriveStakeAccount(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): PublicKey {
    return findDerivedAccount(stakeProgram.programId, stakePool, owner)
  }

  /**
   * The seed used by governance program PDAs.
   *
   * @private
   * @static
   * @memberof StakeAccount
   */
  private static readonly GOVERNANCE_PROGRAM_SEED = "governance"

  /**
   * Derive the token owner record for a realm community mint or council mint
   *
   * @private
   * @static
   * @param {ProgramAccount<Realm>} realm
   * @param {PublicKey} governingTokenMint
   * @param {PublicKey} governingTokenOwner
   * @return {Promise<PublicKey>}
   * @memberof StakeAccount
   */
  private static async deriveGovernanceTokenOwnerRecord(
    realm: ProgramAccount<Realm>,
    governingTokenMint: PublicKey,
    governingTokenOwner: PublicKey
  ): Promise<PublicKey> {
    const tokenOwnerRecordAddress = await getTokenOwnerRecordAddress(
      realm.owner,
      realm.pubkey,
      governingTokenMint,
      governingTokenOwner
    )
    return tokenOwnerRecordAddress
  }

  /**
   * Derive the vault token account that stores all communty or council tokens for a realm
   *
   * @private
   * @static
   * @param {PublicKey} governingProgramId
   * @param {PublicKey} realm
   * @param {PublicKey} governingTokenMint
   * @return {PublicKey}
   * @memberof StakeAccount
   */
  private static deriveGovernanceVault(
    governingProgramId: PublicKey,
    realm: PublicKey,
    governingTokenMint: PublicKey
  ): PublicKey {
    const [governingTokenHoldingAddress] = findProgramAddressSync(
      [Buffer.from(StakeAccount.GOVERNANCE_PROGRAM_SEED), realm.toBuffer(), governingTokenMint.toBuffer()],
      governingProgramId
    )
    return governingTokenHoldingAddress
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<StakeAccount>}
   * @memberof StakeAccount
   */
  static async load(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<StakeAccount> {
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const stakeAccount = await stakeProgram.account.stakeAccount.fetch(address)

    return new StakeAccount(stakeProgram, address, stakeAccount as StakeAccountInfo)
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @returns {Promise<boolean>}
   * @memberof StakeAccount
   */
  static async exists(stakeProgram: Program, stakePool: PublicKey, owner: PublicKey): Promise<boolean> {
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)
    const stakeAccount = await stakeProgram.provider.connection.getAccountInfo(address)
    return stakeAccount !== null
  }

  /**
   * Creates an instance of StakeAccount.
   * @private
   * @param {Program} program
   * @param {PublicKey} address
   * @param {StakeAccountInfo} stakeAccount
   * @memberof StakeAccount
   */
  private constructor(public program: Program, public address: PublicKey, public stakeAccount: StakeAccountInfo) {}

  /**
   * TODO:
   * @static
   * @param {Program} [stakeProgram]
   * @param {StakePool} [stakePool]
   * @param {(PublicKey | null)} [wallet]
   * @returns {(StakeAccount | undefined)}
   * @memberof StakeAccount
   */
  static use(
    stakeProgram: Program | undefined,
    stakePool: StakePool | undefined,
    wallet: PublicKey | undefined
  ): StakeAccount | undefined {
    return Hooks.usePromise(
      async () =>
        stakeProgram && stakePool && wallet && StakeAccount.load(stakeProgram, stakePool.addresses.stakePool, wallet),
      [stakeProgram, stakePool?.addresses.stakePool?.toBase58(), wallet?.toBase58()]
    )
  }

  /**
   * TODO:
   * @static
   * @param {StakeAccount} [stakeAccount]
   * @param {StakePool} [stakePool]
   * @returns {StakeBalance}
   * @memberof StakeAccount
   */
  static useBalance(stakeAccount?: StakeAccount, stakePool?: StakePool): StakeBalance {
    let stakedJet: BN | undefined
    let unbondingJet: BN | undefined

    if (!!stakePool && !!stakeAccount) {
      stakedJet = stakePool.vault.amount.mul(stakeAccount.stakeAccount.shares).div(stakePool.stakePool.sharesBonded)

      unbondingJet = stakeAccount.stakeAccount.unbonding
    }

    return {
      stakedJet,
      unbondingJet
    }
  }

  /**
   * TODO:
   * @static
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} payer
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async create(
    stakeProgram: Program,
    stakePool: PublicKey,
    owner: PublicKey,
    payer: PublicKey
  ): Promise<string> {
    const instructions: TransactionInstruction[] = []
    const address = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    await this.withCreate(instructions, stakeProgram, address, owner, payer)

    return stakeProgram.provider.send(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {StakePool} stakePool
   * @param {ProgramAccount<Realm>} realm
   * @param {PublicKey} owner
   * @param {PublicKey} collateralTokenAccount
   * @param {BN} amount
   * @returns {Promise<string>}
   * @memberof StakeAccount
   */
  static async addStake(
    provider: Provider,
    stakePool: StakePool,
    realm: ProgramAccount<Realm>,
    owner: PublicKey,
    collateralTokenAccount: PublicKey,
    amount: BN
  ): Promise<string> {
    const instructions: TransactionInstruction[] = []

    const voterTokenAccount = await AssociatedToken.withCreate(
      instructions,
      provider,
      owner,
      stakePool.addresses.stakeVoteMint
    )
    await this.withCreate(instructions, stakePool.program, stakePool.addresses.stakePool, owner, owner)
    await this.withAddStake(instructions, stakePool, owner, owner, collateralTokenAccount, amount)
    await this.withMintVotes(instructions, stakePool, realm, owner, voterTokenAccount)

    return provider.send(new Transaction().add(...instructions))
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Program} stakeProgram
   * @param {PublicKey} stakePool
   * @param {PublicKey} owner
   * @memberof StakeAccount
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    stakeProgram: Program,
    stakePool: PublicKey,
    owner: PublicKey,
    payer: PublicKey
  ) {
    const stakeAccount = this.deriveStakeAccount(stakeProgram, stakePool, owner)

    const info = await stakeProgram.provider.connection.getAccountInfo(stakeAccount)

    // It would be nice to have seperate options
    // 1) The account is from the right program. Relevant to non PDAs
    // 2) The account is the right type. Relevant to non PDAs
    // 3) If the account doesn't exist, should we create it. Relevant to caller
    // 4) If the account exists, should we error or not

    if (!info) {
      const auth = Auth.deriveUserAuthentication(owner)

      const ix = stakeProgram.instruction.initStakeAccount({
        accounts: {
          owner,
          auth,
          stakePool,
          stakeAccount,
          payer,
          systemProgram: SystemProgram.programId
        }
      })
      instructions.push(ix)
    }
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {PublicKey} owner
   * @param {PublicKey} payer
   * @param {PublicKey} tokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withAddStake(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    owner: PublicKey,
    payer: PublicKey,
    tokenAccount: PublicKey,
    amount: BN
  ) {
    const stakeAccount = this.deriveStakeAccount(stakePool.program, stakePool.addresses.stakePool, owner)

    const ix = stakePool.program.instruction.addStake(amount, {
      accounts: {
        stakePool: stakePool.addresses.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault,
        stakeAccount,
        payer,
        payerTokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {Realm} realm
   * @param {PublicKey} owner
   * @param {PublicKey} voterTokenAccount
   * @memberof StakeAccount
   */
  static async withMintVotes(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    realm: ProgramAccount<Realm>,
    owner: PublicKey,
    voterTokenAccount: PublicKey
  ) {
    const stakeAccount = this.deriveStakeAccount(stakePool.program, stakePool.addresses.stakePool, owner)
    const governanceVault = this.deriveGovernanceVault(realm.owner, realm.pubkey, realm.account.communityMint)
    const tokenOwnerRecord = await this.deriveGovernanceTokenOwnerRecord(realm, realm.account.communityMint, owner)

    const ix = stakePool.program.instruction.mintVotes(null, {
      accounts: {
        owner: owner,
        stakePool: stakePool.addresses.stakePool,
        stakePoolVault: stakePool.addresses.stakePoolVault,
        stakeVoteMint: stakePool.addresses.stakeVoteMint,
        stakeAccount,
        voterTokenAccount,
        governanceRealm: realm.pubkey,
        governanceVault,
        governanceOwnerRecord: tokenOwnerRecord,
        payer: owner,
        governanceProgram: realm.owner,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
    instructions.push(ix)
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {StakePool} stakePool
   * @param {StakeAccount} stakeAccount
   * @param {PublicKey} owner
   * @param {PublicKey} voterTokenAccount
   * @param {BN} amount
   * @memberof StakeAccount
   */
  static async withBurnVotes(
    instructions: TransactionInstruction[],
    stakePool: StakePool,
    stakeAccount: StakeAccount,
    owner: PublicKey,
    voterTokenAccount: PublicKey,
    amount: BN
  ) {
    const ix = stakePool.program.instruction.burnVotes(amount, {
      accounts: {
        owner,
        stakePool: stakePool.addresses.stakePool,
        stakeVoteMint: stakePool.addresses.stakeVoteMint,
        stakeAccount: stakeAccount.address,
        voterTokenAccount,
        voter: owner,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
    instructions.push(ix)
  }
}
