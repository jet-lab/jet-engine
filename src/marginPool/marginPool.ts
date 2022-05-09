import { Account, Mint, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { CreatePoolParams, MarginPoolAccountInfo, MarginPoolConfig } from "./state"
import { TokenMetadataInfo } from "../marginMetadata"

export interface MarginPoolAddresses {
  /** The pool's token mint i.e. BTC or SOL mint address*/
  tokenMint: PublicKey
  marginPool: PublicKey
  vault: PublicKey
  depositNoteMint: PublicKey
  loanNoteMint: PublicKey
}

export class MarginPool {
  constructor(
    public program: Program,
    public addresses: MarginPoolAddresses,
    public marginPool: MarginPoolAccountInfo,
    public vault: Account,
    public depositNoteMint: Mint,
    public loanNoteMint: Mint,
    public poolTokenMint: Mint
  ) {}

  /**
   * Load a Margin Pool Program Account
   * @param {Program} program
   * @param {PublicKey} tokenMint
   * @returns {Promise<MarginPool>}
   */
  static async load(program: Program, tokenMint: PublicKey): Promise<MarginPool> {
    const addresses = this.derive(program.programId, tokenMint)

    const marginPool = (await program.account.marginPool.fetch(addresses.marginPool)) as MarginPoolAccountInfo

    const [poolTokenMintInfo, vaultMintInfo, depositNoteMintInfo, loanNoteMintInfo] =
      await program.provider.connection.getMultipleAccountsInfo([
        marginPool.tokenMint,
        addresses.vault,
        addresses.depositNoteMint,
        addresses.loanNoteMint
      ])

    if (!poolTokenMintInfo || !vaultMintInfo || !depositNoteMintInfo || !loanNoteMintInfo) {
      throw new Error("Invalid margin pool")
    }

    const poolTokenMint = parseMintAccount(poolTokenMintInfo, tokenMint)
    const vault = parseTokenAccount(vaultMintInfo, addresses.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo, addresses.depositNoteMint)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo, addresses.loanNoteMint)

    return new MarginPool(program, addresses, marginPool, vault, depositNoteMint, loanNoteMint, poolTokenMint)
  }

  static use(program: Program | undefined, tokenMint: PublicKey): MarginPool | undefined {
    return Hooks.usePromise(async () => program && MarginPool.load(program, tokenMint), [program])
  }

  /**
   * Derive accounts from tokenMint
   * @param {PublicKey} programId
   * @param {PublicKey} tokenMint
   * @returns {PublicKey} Margin Pool Address
   */
  private static derive(programId: PublicKey, tokenMint: PublicKey): MarginPoolAddresses {
    //add
    const marginPool = findDerivedAccount(programId, tokenMint)
    const vault = findDerivedAccount(programId, tokenMint, "vault")
    const depositNoteMint = findDerivedAccount(programId, tokenMint, "deposit-note-mint")
    const loanNoteMint = findDerivedAccount(programId, tokenMint, "loan-note-mint")

    return {
      tokenMint,
      marginPool,
      vault,
      depositNoteMint,
      loanNoteMint
    }
  }

  /**
   * Create a margin pool
   * @param {Program} program
   * @param {TokenMetaDataInfo} tokenMetaDataInfo
   * @param {PublicKey} authority
   * @param {CreatePoolParams} params
   * @param {PublicKey} feeDestination
   * @param {MarginPoolConfig} marginPoolConfig
   * @returns {Promise<string>}
   */
  static create(
    program: Program,
    tokenMetaDataInfo: TokenMetadataInfo,
    authority: PublicKey,
    params: CreatePoolParams,
    feeDestination: PublicKey,
    marginPoolConfig: MarginPoolConfig
  ): Promise<string> {
    //derive pool accounts
    const addresses = this.derive(program.programId, tokenMetaDataInfo.tokenMint)

    //info to pass into createPool
    const createPoolInfo = {
      accounts: {
        marginPool: addresses.marginPool,
        vault: addresses.vault,
        depositNoteMint: addresses.depositNoteMint,
        loanNoteMint: addresses.loanNoteMint,
        tokenMint: addresses.tokenMint,
        pythProduct: tokenMetaDataInfo.pythProduct,
        pythPrice: tokenMetaDataInfo.pythPrice,
        authority: authority,
        payer: program.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      },
      args: {
        params: params
      }
    }
    return program.rpc.createPool(feeDestination, marginPoolConfig, createPoolInfo)
  }
}
