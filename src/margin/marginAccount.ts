// import { MintInfo, AccountInfo as TokenAccountInfo } from "@solana/spl-token"
// import { AccountInfo } from "@solana/web3.js"
// import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { PublicKey } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { MarginAccountInfo } from "./types"
// import { MarginPool } from '../marginPool/marginPool';

//derive accounts
//load
//constructor
//decode btw load and constructor - call by the load mthod -return object of all the calculated fields.
//create
//with method for every instruction
//use

// export interface MarginAccountAddresses {
//   payer: PublicKey
//   marginAccount: MarginAccount
// }

export class MarginAccount {
  constructor(
    public marginProgram: Program,
    public address: PublicKey,
    public owner: PublicKey,
    public marginAccount: MarginAccountInfo
  ) {}

  /**
   *
   * @param {Program} marginProgram
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns Promise<MarginAccount>
   */
  static async load(marginProgram: Program, marginPoolAddress: PublicKey, owner: PublicKey): Promise<MarginAccount> {
    const address = this.deriveMarginAccount(marginProgram.programId, marginPoolAddress, owner)
    const marginAccount = (await marginProgram.account.MarginPool.fetch(address)) as MarginAccountInfo

    if (!marginAccount) {
      throw Error(`Can't fetch Margin Account`)
    }
    return new MarginAccount(marginProgram, address, owner, marginAccount)
  }

  /**
   *
   * @param {Program | undefined} program
   * @param {PublicKey | undefined} marginPoolAddress
   * @param {PublicKey | undefined} owner
   * @returns MarginAccount
   */
  static use(
    program: Program | undefined,
    marginPoolAddress: PublicKey | undefined,
    owner: PublicKey | undefined
  ): MarginAccount | undefined {
    return Hooks.usePromise(
      async () => program && marginPoolAddress && owner && MarginAccount.load(program, marginPoolAddress, owner),
      [program, marginPoolAddress, owner]
    )
  }

  /**
   * derive PDA from pool address and owner address
   * @param marginProgramId
   * @param marginPoolAddress
   * @param owner
   * @returns PublicKey
   */
  private static deriveMarginAccount(
    marginProgramId: PublicKey,
    marginPoolAddress: PublicKey,
    owner: PublicKey
  ): PublicKey {
    return findDerivedAccount(marginProgramId, marginPoolAddress, owner)
  }
}
