import { Account, Mint } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey } from "@solana/web3.js"
import { Address, Program, translateAddress } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { MarginPoolData } from "./state"
import { MarginPoolIdl } from "./idl"

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
    public program: Program<MarginPoolIdl>,
    public addresses: MarginPoolAddresses,
    public marginPool: MarginPoolData,
    public vault: Account,
    public depositNoteMint: Mint,
    public loanNoteMint: Mint,
    public poolTokenMint: Mint
  ) {}

  /**
   * Load a Margin Pool Program Account
   * @param {Program<MarginPoolIdl>} program
   * @param {Address} tokenMint
   * @returns {Promise<MarginPool>}
   */
  static async load(program: Program<MarginPoolIdl>, tokenMint: Address): Promise<MarginPool> {
    const tokenMintAddress = translateAddress(tokenMint)
    const addresses = this.derive(program.programId, tokenMintAddress)

    const marginPool = await program.account.marginPool.fetch(addresses.marginPool)

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

    const poolTokenMint = parseMintAccount(poolTokenMintInfo, tokenMintAddress)
    const vault = parseTokenAccount(vaultMintInfo, addresses.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo, addresses.depositNoteMint)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo, addresses.loanNoteMint)

    return new MarginPool(program, addresses, marginPool, vault, depositNoteMint, loanNoteMint, poolTokenMint)
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
  //  * @param {Program<MarginPoolIdl>} program
  //  * @param {TokenMetaDataInfo} tokenMetaDataInfo
  //  * @param {PublicKey} authority
  //  * @param {CreatePoolParams} params
  //  * @param {PublicKey} _feeDestination
  //  * @param {MarginPoolConfig} _marginPoolConfig
  //  * @returns {Promise<string>}
  //  */
  // static async create(
  //   program: Program<MarginPoolIdl>,
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
