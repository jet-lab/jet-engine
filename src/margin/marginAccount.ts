import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { Address, translateAddress } from "@project-serum/anchor"
import { findDerivedAccount } from "../common"
import { AccountPositionList, AccountPositionListLayout, MarginAccountData } from "./state"
import { JetPrograms } from "./client"

export class MarginAccount {
  static SEED_MAX_VALUE = 65535
  constructor(
    public programs: JetPrograms,
    public address: PublicKey,
    public info: MarginAccountData,
    public positions: AccountPositionList
  ) {}

  /**
   *
   * @param {Program<JetMarginIdl>} marginProgram
   * @param {Address} owner
   * @param {number} seed
   * @returns {Promise<MarginAccount>}
   */
  static async load(programs: JetPrograms, owner: Address, seed: number): Promise<MarginAccount> {
    const ownerPubkey = translateAddress(owner)
    const address = this.derive(programs.margin.programId, ownerPubkey, seed)
    const marginAccount = await programs.margin.account.marginAccount.fetch(address)

    const positions = AccountPositionListLayout.decode(new Uint8Array(marginAccount.positions))

    return new MarginAccount(programs, address, marginAccount, positions)
  }

  static async exists(programs: JetPrograms, owner: Address, seed: number): Promise<boolean> {
    const ownerPubkey = translateAddress(owner)
    const address = this.derive(programs.margin.programId, ownerPubkey, seed)
    const info = await programs.margin.provider.connection.getAccountInfo(address)
    return !!info
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

  static async create(programs: JetPrograms, owner: Address, seed: number) {
    const ix: TransactionInstruction[] = []
    await this.withCreate(ix, programs, owner, seed)
    return ix
  }

  /**
   * Build instruction for Create Margin Account
   *
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Program<JetMarginIdl>} program
   * @param {Address} owner
   * @param {number} seed
   * @memberof MarginAccount
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    programs: JetPrograms,
    owner: Address,
    seed: number
  ): Promise<void> {
    if (await this.exists(programs, owner, seed)) {
      return
    }

    const ownerAddress = translateAddress(owner)
    const marginAccount = this.derive(programs.margin.programId, ownerAddress, seed)

    const accounts = {
      owner: owner,
      payer: programs.margin.provider.wallet.publicKey,
      marginAccount,
      systemProgram: SystemProgram.programId
    }
    const ix = await programs.margin.methods.createAccount(seed).accounts(accounts).instruction()

    instructions.push(ix)
  }
}
