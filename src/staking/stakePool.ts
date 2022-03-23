import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount, JetTokenAccount, JetMint } from "../common"
import { Hooks } from "../common/hooks"

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
  seed: number | number[]

  bumpSeed: number[]

  /** The mint for the tokens being staked */
  tokenMint: PublicKey

  /** The token account owned by this pool, holding the staked tokens */
  stakePoolVault: PublicKey

  /** The mint for the derived voting token */
  stakeVoteMint: PublicKey

  /** The mint for the derived collateral token */
  stakeCollateralMint: PublicKey

  /** Length of the unbonding period */
  unbondPeriod: BN

  /** The total amount of virtual stake tokens that can receive rewards */
  sharesBonded: BN

  /** The total amount of virtual stake tokens that are ineligible for rewards
      because they are being unbonded for future withdrawal. */
  tokensUnbonding: BN

  /** The amount of tokens stored by the pool's vault */
  vaultAmount: BN

  /* A token to identify when unbond conversions are invalidated due to
     a withdraw of bonded tokens. */
  unbondChangeIndex: BN
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
  public static readonly CANONICAL_SEED = "amoose"

  /**
   * TODO:
   * @static
   * @param {Program} program
   * @param {string} seed
   * @returns {Promise<StakePool>}
   * @memberof StakePool
   */
  static async load(program: Program, seed: string): Promise<StakePool> {
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
   * @param {Program} program
   * @param {StakePoolAccounts} addresses
   * @param {StakePoolInfo} stakePool
   * @param {MintInfo} voteMint
   * @param {MintInfo} collateralMint
   * @param {JetTokenAccount} vault
   * @param {MintInfo} tokenMint
   * @memberof StakePool
   */
  constructor(
    public program: Program,
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
   * @param {Program} [stakeProgram]
   * @returns {*}  {(StakePool | undefined)}
   * @memberof StakePool
   */
  static use(stakeProgram: Program | undefined): StakePool | undefined {
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
   * @param {Program} program
   * @param {CreateStakePoolParams} params
   * @returns {Promise<string>}
   * @memberof StakePool
   */
  static async create(program: Program, params: CreateStakePoolParams): Promise<string> {
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
