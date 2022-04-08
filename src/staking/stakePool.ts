import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount, JetTokenAccount, JetMint } from "../common"
import { Hooks } from "../common/hooks"
import { StakeIdl } from "./idl"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"

export interface StakePoolAccounts {
  stakePool: PublicKey
  stakeCollateralMint: PublicKey
  stakePoolVault: PublicKey
}

// ----- Account Info -----

export type StakePoolInfo = TypeDef<AllAccountsMap<StakeIdl>["stakePool"], IdlTypes<StakeIdl>>
export type MaxVoterWeightRecord = TypeDef<AllAccountsMap<StakeIdl>["maxVoterWeightRecord"], IdlTypes<StakeIdl>>
export type SharedTokenPool = StakePoolInfo["bonded"]

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

    governanceRealm: PublicKey
  }
}

export class StakePool {
  /** The official Jet Stake Pool seed */
  public static readonly CANONICAL_SEED = "Yolo"

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

    const [collateralMintInfo, vaultInfo, tokenMintInfo] = await program.provider.connection.getMultipleAccountsInfo([
      addresses.stakeCollateralMint,
      addresses.stakePoolVault,
      stakePool.tokenMint
    ])

    if (!collateralMintInfo) {
      throw new Error("Invalid collateral mint")
    }
    if (!vaultInfo) {
      throw new Error("Invalid stake vault")
    }
    if (!tokenMintInfo) {
      throw new Error("Invalid token mint")
    }

    const maxVoterWeightRecord = (await program.account.maxVoterWeightRecord.fetch(
      stakePool.maxVoterWeightRecord
    )) as MaxVoterWeightRecord

    const collateralMint = parseMintAccount(collateralMintInfo.data as Buffer, addresses.stakeCollateralMint)
    const vault = parseTokenAccount(vaultInfo.data as Buffer, addresses.stakePoolVault)
    const tokenMint = parseMintAccount(tokenMintInfo?.data as Buffer, stakePool.tokenMint)

    return new StakePool(program, addresses, stakePool, collateralMint, vault, tokenMint, maxVoterWeightRecord)
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
    public collateralMint: JetMint,
    public vault: JetTokenAccount,
    public tokenMint: JetMint,
    public maxVoterWeightRecord: MaxVoterWeightRecord
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
    const stakeCollateralMint = findDerivedAccount(programId, seed, "collateral-mint")
    const stakePoolVault = findDerivedAccount(programId, seed, "vault")
    return {
      stakePool,
      stakeCollateralMint,
      stakePoolVault
    }
  }

  /**
   * Derive the MaxVoterWeightRecord for the realm
   *
   * @static
   * @param {PublicKey} programId
   * @param {PublicKey} realm
   * @return {PublicKey}
   * @memberof StakePool
   */
  static deriveMaxVoterWeightRecord(programId: PublicKey, realm: PublicKey): PublicKey {
    return findDerivedAccount(programId, realm, "max-vote-weight-record")
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
    const maxVoterWeightRecord = this.deriveMaxVoterWeightRecord(program.programId, params.args.governanceRealm)

    const accounts = {
      ...params.accounts,
      ...derivedAccounts,
      maxVoterWeightRecord,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    }

    return await program.methods
      .initPool(params.args.seed, {
        unbondPeriod: params.args.unbondPeriod,
        governanceRealm: params.args.governanceRealm
      })
      .accounts(accounts)
      .rpc()
  }
}
