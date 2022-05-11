import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { Address, Program, translateAddress } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { MarginAccountData } from "./state"
import { MarginIdl } from "./idl"

export class MarginAccount {
  static SEED_MAX_VALUE = 65535
  constructor(public marginProgram: Program<MarginIdl>, public address: PublicKey, public info: MarginAccountData) {}

  /**
   *
   * @param {Program<MarginIdl>} marginProgram
   * @param {Address} owner
   * @param {number} seed
   * @returns {Promise<MarginAccount>}
   */
  static async load(marginProgram: Program<MarginIdl>, owner: Address, seed: number): Promise<MarginAccount> {
    const ownerPubkey = translateAddress(owner)
    const address = this.derive(marginProgram.programId, ownerPubkey, seed)
    const marginAccount = await marginProgram.account.marginAccount.fetch(address)
    return new MarginAccount(marginProgram, address, marginAccount)
  }

  /**
   * Derive PDA from pool address and owner address
   *
   * @private
   * @static
   * @param {Address} marginProgramId
   * @param {Address} owner
   * @param {number} seed
   * @return {*}  {PublicKey}
   * @memberof MarginAccount
   */
  static derive(marginProgramId: Address, owner: Address, seed: number): PublicKey {
    if (seed > this.SEED_MAX_VALUE || seed < 0) {
      console.log(`Seed is not within the range: 0 <= seed <= ${this.SEED_MAX_VALUE}.`)
    }
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16LE(seed)
    return findDerivedAccount(marginProgramId, owner, buffer)
  }

  /**
   * Build instruction for Create Margin Account
   *
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Program<MarginIdl>} program
   * @param {Address} owner
   * @param {number} seed
   * @memberof MarginAccount
   */
  static withCreate(
    instructions: TransactionInstruction[],
    program: Program<MarginIdl>,
    owner: Address,
    seed: number
  ): void {
    const ownerAddress = translateAddress(owner)
    const marginAccount = this.derive(program.programId, ownerAddress, seed)

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
  }
}
