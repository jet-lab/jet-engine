import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
// import { Hooks } from "../common/hooks"
import { MarginAccountInfo } from "./types"
// import { MarginPool } from '../marginPool/marginPool';
import { checkNull } from "../common/index"

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

  //load multiple accounts?`
  /**
   *
   * @param {Program} marginProgram
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns Promise<MarginAccount>
   */
  static async load(marginProgram: Program, owner: PublicKey, seed: string): Promise<MarginAccount> {
    // find the PDA address
    const address = this.derive(marginProgram.programId, owner, seed)
    //fetch account info
    // why no try and catch?
    const marginAccountInfo = (await marginProgram.account.MarginPool.fetch(address)) as MarginAccountInfo

    checkNull(marginAccountInfo)

    //return a Margin Account
    return new MarginAccount(marginProgram, address, owner, marginAccountInfo)
  }

  // /**
  //  *
  //  * @param {Program | undefined} program
  //  * @param {PublicKey | undefined} marginPoolAddress
  //  * @param {PublicKey | undefined} owner
  //  * @returns {MarginAccount | undefined}
  //  */
  // static use(
  //   program: Program | undefined,
  //   owner: PublicKey | undefined,
  //   seed: string | undefined,
  // ): MarginAccount | undefined {
  //   return Hooks.usePromise(
  //     async () => program && owner && seed.length && MarginAccount.load(program, owner, seed),
  //     [program, owner, seed]
  //   )
  // }

  /**
   * derive PDA from pool address, owner address, and a seed string
   * @param {PublicKey} marginProgramId
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns {PublicKey} Derive a margin account
   */
  private static derive(marginProgramId: PublicKey, owner: PublicKey, seed: string): PublicKey {
    return findDerivedAccount(marginProgramId, owner, seed)
  }

  /**
   * Add Create Margin Account instruction
   * @param {Program} program
   * @param {PublicKey} marginPool
   * @param {PublicKey} owner
   * @param {number} seed
   * @returns {TransactionInstruction} create margin account IX
   */
  static withCreate(instructions: TransactionInstruction[], program: Program, owner: PublicKey, seed: string) {
    const marginAccount = this.derive(program.programId, owner, seed)
    // I think owner needs to be a Signer type?
    const createInfo = {
      accounts: {
        owner: owner,
        payer: program.provider.wallet.publicKey,
        marginAccount: marginAccount,
        systemProgram: SystemProgram.programId
      },
      args: {
        seed: seed
      }
    }

    instructions.push(program.instruction.createAccount(seed, createInfo))

    return instructions
  }
}
