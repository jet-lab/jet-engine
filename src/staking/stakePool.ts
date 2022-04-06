import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount, JetTokenAccount, JetMint } from "../common"
import { Hooks } from "../common/hooks"
import { StakeIdl } from "./idl"

export interface StakePoolAccounts {
  stakePool: PublicKey
  stakeVoteMint: PublicKey
  stakeCollateralMint: PublicKey
  stakePoolVault: PublicKey
}

// ----- Account Info -----

export interface StakePoolInfo {
  /** The authority allowed to withdraw the staked tokens */
  authority: PublicKey

  /** The seed used to generate the pool address */
  seed: number[]
  seedLen: number
  bumpSeed: number[]

  /** The mint for the tokens being staked */
  tokenMint: PublicKey

  /** The token account owned by this pool, holding the staked tokens */
  stakePoolVault: PublicKey

  /* The address of the max vote weight record, which is read by the governance program */
  maxVoterWeightRecord: PublicKey

  /* The governance realm that this pool has voting power in. */
  governanceRealm: PublicKey

  /** The mint for the derived collateral token */
  stakeCollateralMint: PublicKey

  /** Length of the unbonding period */
  unbondPeriod: BN

  /** The amount of tokens stored by the pool's vault */
  vaultAmount: BN

  /** Tokens that are currently bonded, */
  /** and the distinctly valued shares that represent stake in bonded tokens */
  bonded: SharedTokenPool

  /** Tokens that are in the process of unbonding, */
  /** and the distinctly valued shares that represent stake in unbonding tokens */
  unbonding: SharedTokenPool
}

export interface SharedTokenPool {
  /** Number of tokens held by this pool */
  tokens: BN

  /** Number of shares that have been issued to users
      to represent ownership of a portion of the tokens */
  shares: BN
}

// ----- SPL Governance Addin -----

/** The governance action VoterWeight is evaluated for */
export type VoterWeightAction =
  | {
      /** Cast vote for a proposal. Target: Proposal */
      CastVote: Record<string, never>
    }
  | {
      CommentProposal: Record<string, never>
    }
  | {
      CreateGovernance: Record<string, never>
    }
  | {
      CreateProposal: Record<string, never>
    }
  | {
      SignOffProposal: Record<string, never>
    }

export interface VoterWeightRecord {
  /** The Realm the VoterWeightRecord belongs to */
  realm: PublicKey

  /** Governing Token Mint the VoterWeightRecord is associated with
      Note: The addin can take deposits of any tokens and is not restricted to the community or council tokens only
      The mint here is to link the record to either community or council mint of the realm */
  governingTokenMint: PublicKey

  /** The owner of the governing token and voter
      This is the actual owner (voter) and corresponds to TokenOwnerRecord.governing_token_owner */
  owner: PublicKey

  /** The weight of the voter provided by the addin for the given realm, governing_token_mint and governing_token_owner (voter) */
  voterWeight: PublicKey

  /**  The slot when the voting weight expires
       It should be set to None if the weight never expires
       If the voter weight decays with time, for example for time locked based weights, then the expiry must be set
       As a common pattern Revise instruction to update the weight should be invoked before governance instruction within the same transaction
       and the expiry set to the current slot to provide up to date weight */
  voterWeightExpiry: BN | undefined

  /** The governance action the voter's weight pertains to
      It allows to provided voter's weight specific to the particular action the weight is evaluated for
      When the action is provided then the governance program asserts the executing action is the same as specified by the addin */
  weightAction: VoterWeightAction | undefined

  /** The target the voter's weight  action pertains to
      It allows to provided voter's weight specific to the target the weight is evaluated for
      For example when addin supplies weight to vote on a particular proposal then it must specify the proposal as the action target
      When the target is provided then the governance program asserts the target is the same as specified by the addin */
  weightTargetType: PublicKey | undefined

  /** Reserved space for future versions */
  reserved: number[]
}

export interface MaxVoterWeightRecord {
  /** The Realm the MaxVoterWeightRecord belongs to */
  realm: PublicKey

  /** Governing Token Mint the MaxVoterWeightRecord is associated with
      Note: The addin can take deposits of any tokens and is not restricted to the community or council tokens only
      The mint here is to link the record to either community or council mint of the realm */
  governingTokenMint: PublicKey

  /** The max voter weight provided by the addin for the given realm and governing_token_mint */
  maxVoterWeight: BN
  /** The slot when the max voting weight expires
      It should be set to None if the weight never expires
      If the max vote weight decays with time, for example for time locked based weights, then the expiry must be set
      As a pattern Revise instruction to update the max weight should be invoked before governance instruction within the same transaction
      and the expiry set to the current slot to provide up to date weight */
  maxVoterWeightExpiry: BN | undefined

  /** Reserved space for future versions */
  reserved: number[]
}
    
// ----- Instructions -----

interface CreateStakePoolParams {
  accounts: {
    /** The address paying to create this pool */
    payer: PublicKey

    /** The address allowed to sign for changes to the pool,
     and management of the token balance. */
    authority: PublicKey

    /** The mint for the tokens being staked into the pool. */
    tokenMint: PublicKey
  }
  args: {
    seed: string

    unbondPeriod: BN
  }
}

export class StakePool {
  /** The official Jet Stake Pool seed */
  public static readonly CANONICAL_SEED = "yea"

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} program
   * @param {string} seed
   * @returns {Promise<StakePool>}
   * @memberof StakePool
   */
  static async load(program: Program<StakeIdl>, seed: string): Promise<StakePool> {
    const addresses = this.deriveAccounts(program.programId, seed)

    const stakePool = (await program.account.stakePool.fetch(addresses.stakePool)) as StakePoolInfo

    const [voteMintInfo, collateralMintInfo, vaultInfo, tokenMintInfo] =
      await program.provider.connection.getMultipleAccountsInfo([
        addresses.stakeVoteMint,
        addresses.stakeCollateralMint,
        addresses.stakePoolVault,
        stakePool.tokenMint
      ])

    if (!voteMintInfo || !collateralMintInfo || !vaultInfo || !tokenMintInfo) {
      throw new Error("Invalid mint")
    }

    const voteMint = parseMintAccount(voteMintInfo.data as Buffer, addresses.stakeVoteMint)
    const collateralMint = parseMintAccount(collateralMintInfo.data as Buffer, addresses.stakeCollateralMint)
    const vault = parseTokenAccount(vaultInfo.data as Buffer, addresses.stakePoolVault)
    const tokenMint = parseMintAccount(tokenMintInfo?.data as Buffer, stakePool.tokenMint)

    return new StakePool(program, addresses, stakePool, voteMint, collateralMint, vault, tokenMint)
  }

  /**
   * Creates an instance of StakePool.
   * @param {Program<StakeIdl>} program
   * @param {StakePoolAccounts} addresses
   * @param {StakePoolInfo} stakePool
   * @param {MintInfo} voteMint
   * @param {MintInfo} collateralMint
   * @param {JetTokenAccount} vault
   * @param {MintInfo} tokenMint
   * @memberof StakePool
   */
  constructor(
    public program: Program<StakeIdl>,
    public addresses: StakePoolAccounts,
    public stakePool: StakePoolInfo,
    public voteMint: JetMint,
    public collateralMint: JetMint,
    public vault: JetTokenAccount,
    public tokenMint: JetMint
  ) {}

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} [stakeProgram]
   * @returns {*}  {(StakePool | undefined)}
   * @memberof StakePool
   */
  static use(stakeProgram: Program<StakeIdl> | undefined): StakePool | undefined {
    return Hooks.usePromise(
      async () => stakeProgram && StakePool.load(stakeProgram, StakePool.CANONICAL_SEED),
      [stakeProgram]
    )
  }

  /**
   * TODO:
   * @static
   * @param {PublicKey} programId
   * @param {string} seed
   * @returns {Promise<StakePoolAccounts>}
   * @memberof StakePool
   */
  static deriveAccounts(programId: PublicKey, seed: string): StakePoolAccounts {
    const stakePool = findDerivedAccount(programId, seed)
    const stakeVoteMint = findDerivedAccount(programId, seed, "vote-mint")
    const stakeCollateralMint = findDerivedAccount(programId, seed, "collateral-mint")
    const stakePoolVault = findDerivedAccount(programId, seed, "vault")
    return {
      stakePool,
      stakeVoteMint,
      stakeCollateralMint,
      stakePoolVault
    }
  }

  /**
   * TODO:
   * @static
   * @param {Program<StakeIdl>} program
   * @param {CreateStakePoolParams} params
   * @returns {Promise<string>}
   * @memberof StakePool
   */
  static async create(program: Program<StakeIdl>, params: CreateStakePoolParams): Promise<string> {
    const derivedAccounts = this.deriveAccounts(program.programId, params.args.seed)

    const accounts = {
      ...params.accounts,
      ...derivedAccounts,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    }

    return program.rpc.initPool(params.args.seed, { unbondPeriod: params.args.unbondPeriod }, { accounts })
  }
}
