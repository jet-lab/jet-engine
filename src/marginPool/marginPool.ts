import { MintInfo, AccountInfo as TokenAccountInfo, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount, checkNull } from "../common"
import { Hooks } from "../common/hooks"
import { CreatePoolParams, MarginPoolAccountInfo, MarginPoolConfig } from "./types"
import { TokenMetadataInfo } from "../marginMetadata"

export interface MarginPoolAddresses {
  /** The pool's token mint i.e. BTC or SOL mint address*/
  tokenMint: PublicKey
  marginPool: PublicKey
  vault: PublicKey
  depositNoteMint: PublicKey
  loanNoteMint: PublicKey
}

// create marginPool
// load margin pool,
// use margin pool,
// derive accounts
//decode
//instructions
//txns
export class MarginPool {
  //FIXME
  // add obj of addresses for seeds
  static readonly solTokenMint = NATIVE_MINT

  constructor(
    public program: Program,
    public addresses: MarginPoolAddresses,
    public marginPool: MarginPoolAccountInfo,
    public vault: TokenAccountInfo,
    public depositNoteMint: MintInfo,
    public loanNoteMint: MintInfo,
    public poolTokenMint: MintInfo,
    public payer: PublicKey
  ) {}

  //load multiple pools?

  //add load multiple pools method
  //change tokenMint to tokenMint
  /**
   * Load a Margin Pool Program Account
   * @param program
   * @param tokenMint
   * @returns
   */
  static async load(program: Program, tokenMint: PublicKey, payer: PublicKey): Promise<MarginPool> {
    //add toke
    const addresses = this.deriveAccounts(program.programId, tokenMint)

    const marginPool = (await program.account.marginPool.fetch(addresses.marginPool)) as MarginPoolAccountInfo

    const [poolTokenMintInfo, vaultMintInfo, depositNoteMintInfo, loanNoteMintInfo] =
      await program.provider.connection.getMultipleAccountsInfo([
        marginPool.tokenMint,
        addresses.vault,
        addresses.depositNoteMint,
        addresses.loanNoteMint
      ])

    checkNull(poolTokenMintInfo)
    checkNull(vaultMintInfo)
    checkNull(depositNoteMintInfo)
    checkNull(loanNoteMintInfo)

    const poolTokenMint = parseMintAccount(poolTokenMintInfo?.data as Buffer)
    const vault = parseTokenAccount(vaultMintInfo?.data as Buffer, addresses.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo?.data as Buffer)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo?.data as Buffer)

    return new MarginPool(program, addresses, marginPool, vault, depositNoteMint, loanNoteMint, poolTokenMint, payer)
  }

  static use(program: Program | undefined, tokenMint: PublicKey, payer: PublicKey): MarginPool | undefined {
    return Hooks.usePromise(async () => program && MarginPool.load(program, tokenMint, payer), [program])
  }

  /**
   * Derive accounts from tokenMint
   * @param programId
   * @param tokenMint
   * @returns
   */
  private static deriveAccounts(programId: PublicKey, tokenMint: PublicKey): MarginPoolAddresses {
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
   *
   * @param program
   * @param tokenMetaDataInfoTokenMetadataInfo
   * @param authority
   * @param params
   * @param feeDestination
   * @param marginPoolConfig
   * @returns
   */
  static create(
    program: Program,
    tokenMetaDataInfoTokenMetadataInfo: TokenMetadataInfo,
    authority: PublicKey,
    params: CreatePoolParams,
    feeDestination: PublicKey,
    marginPoolConfig: MarginPoolConfig
  ): Promise<string> {
    //derive pool accounts
    const addresses = this.deriveAccounts(program.programId, tokenMetaDataInfoTokenMetadataInfo.tokenMint)
    //metatdata.load

    // make an accounts object
    const createPoolInfo = {
      accounts: {
        marginPool: addresses.marginPool,
        vault: addresses.vault,
        depositNoteMint: addresses.depositNoteMint,
        loanNoteMint: addresses.loanNoteMint,
        tokenMint: addresses.tokenMint,
        pythProduct: tokenMetaDataInfoTokenMetadataInfo.pythProduct,
        pythPrice: tokenMetaDataInfoTokenMetadataInfo.pythPrice,
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

  // static deposit(program: Program, tokenMint: PublicKey,source: PublicKey, amount: BN) {
  //   const addresses = this.deriveAccounts(program.programId, tokenMint)
  //   // creat or load margin account to deposit depositNotes? so we gotta mint depositNotes as well. we need to create margin accounts

  //   const accounts: DepositInfo = {
  //     accounts: {
  //       marginPool: addresses.marginPool,
  //       vault: addresses.vault,
  //       depositNoteMint: addresses.depositNoteMint,
  //       source: source,
  //       destination: //token account from register
  //     },
  //     args: [
  //       { amount }
  //     ]

  //   }
  // }
}

// //need to know the position of the user
// // if not, create position
// //

// /*first deposit:

// register position - ix
// new token account to hold note
// deposit USDC to marginpool
// deposit USDC deposit note to new token account

// //update position balance in  margin program -
// // takes token account
