import { MintInfo, AccountInfo as TokenAccountInfo } from '@solana/spl-token';
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { MarginPoolAccountInfo } from './types'

export interface MarginPoolAccounts {
  marginPool: PublicKey
  vault: PublicKey
  depositNoteMint: PublicKey
  loanNoteMint: PublicKey
}

/*

create marginPool
load margin pool,
use margin pool,
derive accounts */

export class MarginPool {
  //FIXME
  static readonly CANONICAL_SEED = 'MAYBEJET'

  constructor(
    public program: Program,
    public poolAccounts: MarginPoolAccounts,
    public marginPool: MarginPoolAccountInfo,
    public vault: TokenAccountInfo,
    public depositNoteMint: MintInfo,
    public loanNoteMint: MintInfo,
    public poolTokenMint: MintInfo
  ) {}

  static async load(program: Program, seed: string): Promise<MarginPool> {
    const pubkeys = this.deriveAccounts(program.programId, seed);

    const marginPoolInfo = (await program.account.marginPool.fetch(pubkeys.marginPool)) as MarginPoolAccountInfo;

    const [ poolTokenMintInfo, vaultMintInfo, depositNoteMintInfo, loanNoteMintInfo ] = await program.provider.connection.getMultipleAccountsInfo([
      marginPoolInfo.tokenMint,
      pubkeys.vault,
      pubkeys.depositNoteMint,
      pubkeys.loanNoteMint,
    ])

    if(!poolTokenMintInfo || !vaultMintInfo || !depositNoteMintInfo || !loanNoteMintInfo) {
      throw new Error('Invalid mint')
    }

    const vault = parseTokenAccount(vaultMintInfo.data as Buffer, pubkeys.vault)
    const depositNoteMint = parseMintAccount(depositNoteMintInfo.data as Buffer)
    const loanNoteMint = parseMintAccount(loanNoteMintInfo.data as Buffer)
    const poolTokenMint = parseMintAccount(poolTokenMintInfo?.data as Buffer)

    return new MarginPool(
      program,
      pubkeys,
      marginPoolInfo,
      vault,
      depositNoteMint,
      loanNoteMint,
      poolTokenMint
      )
  }

  static use(program: Program | undefined): MarginPool | undefined {
    return Hooks.usePromise(async() => program && MarginPool.load(program, MarginPool.CANONICAL_SEED ), [program])
  }

  static deriveAccounts(programId: PublicKey, seed: string): MarginPoolAccounts {
    const marginPool = findDerivedAccount(programId, seed);
    const vault = findDerivedAccount(programId, seed, 'vault');
    const depositNoteMint = findDerivedAccount(programId, seed, 'deposit-note-mint')
    const loanNoteMint = findDerivedAccount(programId, seed, 'loan-note-mint')

    return {
      marginPool,
      vault,
      depositNoteMint,
      loanNoteMint,
    }
  }

   //FIXME: unclear on params setup
  // static create(program: Program, params: CreatePoolParams): Promise<string> {
  //   const derivedAccounts = this.deriveAccounts(program.programId, params.args.seed)

  //   return
  // }

}
