import { Account, Mint } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey } from "@solana/web3.js"
import { Address, Program, translateAddress } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { MarginPoolData } from "./state"
import { JetMarginPoolIdl } from ".."
import { JetPrograms } from "../margin/client"
import { JetTokens } from "../margin/config"

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
    public program: Program<JetMarginPoolIdl>,
    public addresses: MarginPoolAddresses,
    public marginPool: MarginPoolData,
    public vault: Account,
    public depositNoteMint: Mint,
    public loanNoteMint: Mint,
    public poolTokenMint: Mint
  ) {}

  /**
   * Load a Margin Pool Account
   * @param {JetPrograms} programs
   * @param {Address} tokenMint
   * @returns {Promise<MarginPool>}
   */
  static async load(programs: JetPrograms, tokenMint: Address): Promise<MarginPool> {
    const poolProgram = programs.marginPool
    const tokenMintAddress = translateAddress(tokenMint)
    const addresses = this.derive(poolProgram.programId, tokenMintAddress)

    const [marginPoolInfo, poolTokenMintInfo, vaultMintInfo, depositNoteMintInfo, loanNoteMintInfo] =
      await poolProgram.provider.connection.getMultipleAccountsInfo([
        addresses.marginPool,
        addresses.tokenMint,
        addresses.vault,
        addresses.depositNoteMint,
        addresses.loanNoteMint
      ])

    if (!marginPoolInfo || !poolTokenMintInfo || !vaultMintInfo || !depositNoteMintInfo || !loanNoteMintInfo) {
      throw new Error("Invalid margin pool")
    }

    const marginPool = poolProgram.coder.accounts.decode<MarginPoolData>("marginPool", marginPoolInfo.data)
    const poolTokenMint = parseMintAccount(poolTokenMintInfo, tokenMintAddress)
    const vault = parseTokenAccount(vaultMintInfo, addresses.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo, addresses.depositNoteMint)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo, addresses.loanNoteMint)

    return new MarginPool(poolProgram, addresses, marginPool, vault, depositNoteMint, loanNoteMint, poolTokenMint)
  }

  /**
   * Load every Margin Pool in the config.
   * @param programs
   * @returns
   */
  static async loadAll(programs: JetPrograms): Promise<Record<JetTokens, MarginPool>> {
    // FIXME: This could be faster with fewer round trips to rpc
    const pools: Record<string, MarginPool> = {}
    for (const token of Object.values(programs.config.tokens)) {
      const pool = await this.load(programs, token.mint)
      pools[token.symbol.toString()] = pool
    }
    return pools
  }

  /**
   * Derive accounts from tokenMint
   * @param {Address} programId
   * @param {Address} tokenMint
   * @returns {PublicKey} Margin Pool Address
   */
  static derive(programId: Address, tokenMint: Address): MarginPoolAddresses {
    const tokenMintAddress = translateAddress(tokenMint)
    const marginPool = findDerivedAccount(programId, tokenMintAddress)
    const vault = findDerivedAccount(programId, tokenMint, "vault")
    const depositNoteMint = findDerivedAccount(programId, tokenMint, "deposit-note-mint")
    const loanNoteMint = findDerivedAccount(programId, tokenMint, "loan-note-mint")

    return {
      tokenMint: tokenMintAddress,
      marginPool,
      vault,
      depositNoteMint,
      loanNoteMint
    }
  }

  // FIXME:
  // /**
  //  * Create a margin pool
  //  * @param {Program<JetMarginPoolIdl>} program
  //  * @param {TokenMetaDataInfo} tokenMetaDataInfo
  //  * @param {PublicKey} authority
  //  * @param {CreatePoolParams} params
  //  * @param {PublicKey} _feeDestination
  //  * @param {MarginPoolConfig} _marginPoolConfig
  //  * @returns {Promise<string>}
  //  */
  // static async create(
  //   program: Program<JetMarginPoolIdl>,
  //   tokenMetaDataInfo: TokenMetadata,
  //   authority: PublicKey,
  //   params: CreatePoolParams,
  //   _feeDestination: PublicKey,
  //   _marginPoolConfig: MarginPoolConfigData
  // ): Promise<void> {
  //   //derive pool accounts
  //   const addresses = this.derive(program.programId, tokenMetaDataInfo.tokenMint)

  //   //info to pass into createPool
  //   const _createPoolInfo = {
  //     accounts: {
  //       marginPool: addresses.marginPool,
  //       vault: addresses.vault,
  //       depositNoteMint: addresses.depositNoteMint,
  //       loanNoteMint: addresses.loanNoteMint,
  //       tokenMint: addresses.tokenMint,
  //       pythProduct: tokenMetaDataInfo.pythProduct,
  //       pythPrice: tokenMetaDataInfo.pythPrice,
  //       authority: authority,
  //       payer: program.provider.wallet.publicKey,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //       rent: SYSVAR_RENT_PUBKEY
  //     },
  //     args: {
  //       params: params
  //     }
  //   }
  //   return program.rpc.createPool(feeDestination, marginPoolConfig, createPoolInfo)
  // }
}
