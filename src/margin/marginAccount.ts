import { PublicKey, SystemProgram } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { MarginAccountInfo } from "./state"
import { checkNull } from "../common/index"

export class MarginAccount {
  constructor(public marginProgram: Program, public address: PublicKey, public marginAccount: MarginAccountInfo) {}

  /**
   *
   * @param {Program} marginProgram
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns {Promise<MarginAccount>}
   */
  static async load(marginProgram: Program, marginPoolAddress: PublicKey, owner: PublicKey): Promise<MarginAccount> {
    const address = this.derive(marginProgram.programId, marginPoolAddress, owner)
    const marginAccount = (await marginProgram.account.MarginPool.fetch(address)) as MarginAccountInfo

    checkNull(marginAccount)

    return new MarginAccount(marginProgram, address, marginAccount)
  }

  /**
   *
   * @param {Program | undefined} program
   * @param {PublicKey | undefined} marginPoolAddress
   * @param {PublicKey | undefined} owner
   * @returns {MarginAccount}
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
   * @param {PublicKey} marginProgramId
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns {PublicKey} Derive a margin account
   */
  private static derive(marginProgramId: PublicKey, marginPoolAddress: PublicKey, owner: PublicKey): PublicKey {
    return findDerivedAccount(marginProgramId, marginPoolAddress, owner)
  }

  /**
   * Build instruction for Create Margin Account
   * @param {Program} program
   * @param {PublicKey} marginPool
   * @param {PublicKey} owner
   * @param {number} seed
   * @returns {TransactionInstruction} create margin account IX
   */
  static withCreate(program: Program, marginPool: PublicKey, owner: PublicKey, seed: number) {
    const marginAccount = this.derive(program.programId, marginPool, owner)

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

    return program.instruction.createAccount(seed, createInfo)
  }
}
