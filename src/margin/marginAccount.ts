import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { Program } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { Hooks } from "../common/hooks"
import { MarginAccountInfo } from "./state"

export class MarginAccount {
  constructor(public marginProgram: Program, public address: PublicKey, public marginAccount: MarginAccountInfo) {}

  /**
   *
   * @param {Program} marginProgram
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns {Promise<MarginAccount>}
   */
  static async load(marginProgram: Program, owner: PublicKey, seed: number): Promise<MarginAccount> {
    const address = this.derive(marginProgram.programId, owner, seed)
    const marginAccountInfo = (await marginProgram.account.MarginPool.fetch(address)) as MarginAccountInfo

    if (!marginAccountInfo) {
      throw new Error("Invalid margin account")
    }

    return new MarginAccount(marginProgram, address, marginAccountInfo)
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
    owner: PublicKey | undefined,
    seed: number | undefined
  ): MarginAccount | undefined {
    return Hooks.usePromise(async () => {
      if (seed !== undefined && program && owner) {
        return await MarginAccount.load(program, owner, seed)
      }
    }, [program, owner, seed])
  }

  /**
   * derive PDA from pool address and owner address
   * @param {PublicKey} marginProgramId
   * @param {PublicKey} marginPoolAddress
   * @param {PublicKey} owner
   * @returns {PublicKey} Derive a margin account
   */
  private static derive(marginProgramId: PublicKey, owner: PublicKey, seed: number): PublicKey {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16LE(seed)
    return findDerivedAccount(marginProgramId, owner, buffer)
  }

  /**
   * Build instruction for Create Margin Account
   * @param {Program} program
   * @param {PublicKey} marginPool
   * @param {PublicKey} owner
   * @param {number} seed
   * @returns {TransactionInstruction} create margin account IX
   */
  static withCreate(instructions: TransactionInstruction[], program: Program, owner: PublicKey, seed: number) {
    const marginAccount = this.derive(program.programId, owner, seed)

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
