import { MintInfo, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { AccountInfo as TokenAccountInfo } from "@solana/spl-token"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { BN, Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { DerivedAccount } from "../common/associatedToken"
import { useEffect, useState } from "react"

export interface StakePoolAccounts {
  accounts: {
    stakePool: PublicKey
    stakeVoteMint: PublicKey
    stakeCollateralMint: PublicKey
    stakePoolVault: PublicKey
  }
  bumps: {
    stakePool: number
    stakeVoteMint: number
    stakeCollateralMint: number
    stakePoolVault: number
  }
  stakePool: DerivedAccount
  stakeVoteMint: DerivedAccount
  stakeCollateralMint: DerivedAccount
  stakePoolVault: DerivedAccount
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
  /** because they are being unbonded for future withdrawal. */
  sharesUnbonded: BN
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
  public static readonly CANONICAL_SEED = "JPLock" // FIXME!

  static async load(program: Program, seed: string) {
    const addresses = await this.deriveAccounts(program.programId, seed)

    const stakePool = (await program.account.StakePool.fetch(addresses.stakePool.address)) as StakePoolInfo

    const [voteMintInfo, collateralMintInfo, vaultInfo, tokenMintInfo] =
      await program.provider.connection.getMultipleAccountsInfo([
        addresses.stakeVoteMint.address,
        addresses.stakeCollateralMint.address,
        addresses.stakePoolVault.address,
        stakePool.tokenMint
      ])

    if (!voteMintInfo || !collateralMintInfo || !vaultInfo || !tokenMintInfo) {
      throw new Error("Invalid mint")
    }

    const voteMint = parseMintAccount(voteMintInfo.data as Buffer)
    const collateralMint = parseMintAccount(collateralMintInfo.data as Buffer)
    const vault = parseTokenAccount(vaultInfo.data as Buffer, addresses.stakePoolVault.address)
    const tokenMint = parseMintAccount(tokenMintInfo?.data as Buffer)

    return new StakePool(program, addresses, stakePool, voteMint, collateralMint, vault, tokenMint)
  }

  constructor(
    public program: Program,
    public addresses: StakePoolAccounts,
    public stakePool: StakePoolInfo,
    public voteMint: MintInfo,
    public collateralMint: MintInfo,
    public vault: TokenAccountInfo,
    public tokenMint: MintInfo
  ) {}

  static use(stakeProgram: Program | undefined) {
    const [pool, setPool] = useState<StakePool | undefined>()
    useEffect(() => {
      let abort = false
      if (stakeProgram) {
        StakePool.load(stakeProgram, StakePool.CANONICAL_SEED)
          .then(newPool => !abort && setPool(newPool))
          .catch(console.error)
      } else {
        setPool(undefined)
      }

      return () => {
        abort = true
      }
    }, [stakeProgram])

    return pool
  }

  static async deriveAccounts(programId: PublicKey, seed: string): Promise<StakePoolAccounts> {
    const stakePool = await findDerivedAccount(programId, seed)
    const stakeVoteMint = await findDerivedAccount(programId, seed, "vote-mint")
    const stakeCollateralMint = await findDerivedAccount(programId, seed, "collateral-mint")
    const stakePoolVault = await findDerivedAccount(programId, seed, "vault")
    return {
      accounts: {
        stakePool: stakePool.address,
        stakeVoteMint: stakeVoteMint.address,
        stakeCollateralMint: stakeCollateralMint.address,
        stakePoolVault: stakePoolVault.address
      },
      bumps: {
        stakePool: stakePool.bump,
        stakeVoteMint: stakeVoteMint.bump,
        stakeCollateralMint: stakeCollateralMint.bump,
        stakePoolVault: stakePoolVault.bump
      },
      stakePool,
      stakeVoteMint,
      stakeCollateralMint,
      stakePoolVault
    }
  }

  static async create(program: Program, params: CreateStakePoolParams) {
    const derivedAccounts = await this.deriveAccounts(program.programId, params.args.seed)
    const accounts = {
      ...params.accounts,
      ...derivedAccounts.accounts,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    }

    return await program.rpc.initPool(
      params.args.seed,
      derivedAccounts.bumps,
      { unbondPeriod: params.args.unbondPeriod },
      { accounts }
    )
  }
}
