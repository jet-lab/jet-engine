import { MintInfo, AccountInfo as TokenAccountInfo, NATIVE_MINT } from "@solana/spl-token"
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { MarginPoolAccountInfo } from "./types"

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

    //make sure we know which ones gives error
    if (!poolTokenMintInfo || !vaultMintInfo || !depositNoteMintInfo || !loanNoteMintInfo) {
      throw new Error("Invalid mint")
    }

    const vault = parseTokenAccount(vaultMintInfo.data as Buffer, addresses.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo.data as Buffer)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo.data as Buffer)
    const poolTokenMint = parseMintAccount(poolTokenMintInfo?.data as Buffer)

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

  //FIXME: unclear on params setup
  // static create(program: Program, tokenMint: PublicKey, params: CreatePoolParams): Promise<string> {
  //   const derivedAccounts = this.deriveAccounts(program.programId, tokenMint)

  //   return
  // }
}
