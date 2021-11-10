/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  Commitment
} from "@solana/web3.js"
import * as anchor from "@project-serum/anchor"
import { AccountLayout as TokenAccountLayout, AccountInfo as TokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import EventEmitter from "eventemitter3"
import { DerivedAccount, JetClient } from "./client"
import { JetMarket, JetMarketReserveInfo } from "./market"
import { JetReserve } from "./reserve"
import { Amount, DEX_ID, DEX_ID_DEVNET, ReserveDexMarketAccounts } from "."

/**
 * TODO:
 * @export
 * @class TokenAmount
 */
export class TokenAmount {
  /**
   * Creates an instance of TokenAmount.
   * @param {PublicKey} mint
   * @param {anchor.BN} amount
   * @memberof TokenAmount
   */
  constructor(public mint: PublicKey, public amount: anchor.BN) {}
}

export interface User {
  address: PublicKey

  deposits(): TokenAmount[]

  collateral(): TokenAmount[]

  /**
   * Get the loans held by the user
   */
  loans(): TokenAmount[]
}

/**
 * TODO:
 * @export
 * @class JetUser
 * @implements {User}
 */
export class JetUser implements User {
  private _deposits: TokenAmount[] = []
  private _collateral: TokenAmount[] = []
  private _loans: TokenAmount[] = []
  private conn: Connection

  /**
   * Creates an instance of JetUser.
   * @param {JetClient} client
   * @param {JetMarket} market
   * @param {PublicKey} address
   * @param {DerivedAccount} obligation
   * @memberof JetUser
   */
  private constructor(
    private client: JetClient,
    public market: JetMarket,
    public address: PublicKey,
    private obligation: DerivedAccount
  ) {
    this.conn = this.client.program.provider.connection
  }

  /**
   * TODO:
   * @static
   * @param {JetClient} client
   * @param {JetMarket} market
   * @param {PublicKey} address
   * @returns {Promise<JetUser>}
   * @memberof JetUser
   */
  static async load(client: JetClient, market: JetMarket, address: PublicKey): Promise<JetUser> {
    const obligationAccount = await market.getAssociatedObligationAddress(address)
    const user = new JetUser(client, market, address, obligationAccount)

    await user.refresh()
    return user
  }

  /**
   * TODO:
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async liquidateDex(loanReserve: JetReserve, collateralReserve: JetReserve): Promise<string> {
    const tx = await this.makeLiquidateDexTx(loanReserve, collateralReserve)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `liquidateDex`.
   * @param {ReserveDexMarketAccounts} collateralDexAccounts
   * @param {ReserveDexMarketAccounts} loanDexAccounts
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @param {DerivedAccount} loan
   * @param {DerivedAccount} collateral
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeLiquidateDexIx(
    collateralDexAccounts: ReserveDexMarketAccounts,
    loanDexAccounts: ReserveDexMarketAccounts,
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    loan: DerivedAccount,
    collateral: DerivedAccount
  ): TransactionInstruction {
    // Turning off type checks here, because liquidateDex does not exist in
    // the IDL, because liquidateDex is handled in a special way here:
    // https://github.com/jet-lab/jet-v1/blob/65a19e49fb27bc95a5b543f9fec49b43d799a8cd/programs/jet/src/lib.rs
    // And if it were a normal instruction, then a bug in rust would blow
    // the stack while validating anchor constraints.
    //
    // If liquidateDex ever appears in the IDL then please remove this 'as any' hack
    return (this.client.program.instruction as any).liquidateDex({
      accounts: {
        sourceMarket: collateralDexAccounts,
        targetMarket: loanDexAccounts,
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: this.obligation.address,
        loanReserve: loanReserve.data.address,
        loanReserveVault: loanReserve.data.vault,
        loanNoteMint: loanReserve.data.loanNoteMint,
        loanAccount: loan.address,
        collateralReserve: collateralReserve.data.address,
        collateralReserveVault: collateralReserve.data.vault,
        depositNoteMint: collateralReserve.data.depositNoteMint,
        collateralAccount: collateral.address,
        dexSwapTokens: loanReserve.data.dexSwapTokens,
        dexProgram: this.client.devnet ? DEX_ID_DEVNET : DEX_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeLiquidateDexTx(loanReserve: JetReserve, collateralReserve: JetReserve): Promise<Transaction> {
    const loanDexAccounts = await loanReserve.loadDexMarketAccounts()
    const collateralDexAccounts = await collateralReserve.loadDexMarketAccounts()
    const loanAccounts = await this.findReserveAccounts(loanReserve)
    const collateralAccounts = await this.findReserveAccounts(collateralReserve)

    const tx = new Transaction()
    tx.add(loanReserve.makeRefreshIx())
    tx.add(collateralReserve.makeRefreshIx())
    tx.add(
      this.makeLiquidateDexIx(
        collateralDexAccounts,
        loanDexAccounts,
        loanReserve,
        collateralReserve,
        loanAccounts.loan,
        collateralAccounts.collateral
      )
    )
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @param {PublicKey} payerAccount
   * @param {PublicKey} receiverAccount
   * @param {Amount} amount
   * @param {anchor.BN} minCollateral
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async liquidate(
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount,
    minCollateral: anchor.BN
  ): Promise<string> {
    const tx = await this.makeLiquidateTx(
      loanReserve,
      collateralReserve,
      payerAccount,
      receiverAccount,
      amount,
      minCollateral
    )
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `liquidate`.
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @param {DerivedAccount} loan
   * @param {DerivedAccount} collateral
   * @param {PublicKey} payer
   * @param {PublicKey} receiver
   * @param {anchor.BN} minCollateral
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeLiquidateIx(
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    loan: DerivedAccount,
    collateral: DerivedAccount,
    payer: PublicKey,
    receiver: PublicKey,
    minCollateral: anchor.BN,
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.liquidate(amount.toRpcArg(), minCollateral, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: this.obligation,
        reserve: loanReserve.data.address,
        collateralReserve: collateralReserve.data.address,
        vault: loanReserve.data.vault,
        loanNoteMint: loanReserve.data.loanNoteMint,
        loanAccount: loan.address,
        collateralAccount: collateral.address,
        payerAccount: payer,
        receiverAccount: receiver,
        payer: payer,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @param {PublicKey} payerAccount
   * @param {PublicKey} receiverAccount
   * @param {Amount} amount
   * @param {anchor.BN} minCollateral
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeLiquidateTx(
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount,
    minCollateral: anchor.BN
  ): Promise<Transaction> {
    const { loan } = await this.findReserveAccounts(loanReserve)
    const { collateral } = await this.findReserveAccounts(collateralReserve)

    const tx = new Transaction()
    tx.add(loanReserve.makeRefreshIx())
    tx.add(collateralReserve.makeRefreshIx())
    tx.add(
      this.makeLiquidateIx(
        loanReserve,
        collateralReserve,
        loan,
        collateral,
        payerAccount,
        receiverAccount,
        minCollateral,
        amount
      )
    )
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async repay(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeRepayTx(reserve, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `repay`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} loan
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeRepayIx(
    reserve: JetReserve,
    loan: DerivedAccount,
    tokenAccount: PublicKey,
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.repay(amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        payer: this.address,
        reserve: reserve.data.address,
        vault: reserve.data.vault,
        obligation: this.obligation.address,
        loanNoteMint: reserve.data.loanNoteMint,
        loanAccount: loan.address,
        payerAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeRepayTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<Transaction> {
    const { loan } = await this.findReserveAccounts(reserve)
    const tx = new Transaction()
    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeRepayIx(reserve, loan, tokenAccount, amount))
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async withdrawCollateral(reserve: JetReserve, amount: Amount): Promise<string> {
    const tx = await this.makeWithdrawCollateralTx(reserve, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instructions for `withdrawCollateral`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} collateral
   * @param {DerivedAccount} deposits
   * @param {{ collateralAccount: number; depositAccount: number }} bumpSeeds
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeWithdrawCollateralIx(
    reserve: JetReserve,
    collateral: DerivedAccount,
    deposits: DerivedAccount,
    bumpSeeds: { collateralAccount: number; depositAccount: number },
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.withdrawCollateral(bumpSeeds, amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        owner: this.address,
        obligation: this.obligation.address,
        reserve: reserve.data.address,
        collateralAccount: collateral.address,
        depositAccount: deposits.address,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeWithdrawCollateralTx(reserve: JetReserve, amount: Amount): Promise<Transaction> {
    const { collateral, deposits } = await this.findReserveAccounts(reserve)
    const bumpSeeds = {
      collateralAccount: collateral.bumpSeed,
      depositAccount: deposits.bumpSeed
    }

    const tx = new Transaction()
    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeWithdrawCollateralIx(reserve, collateral, deposits, bumpSeeds, amount))
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async withdraw(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeWithdrawTx(reserve, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `withdraw`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} deposits
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeWithdrawIx(
    reserve: JetReserve,
    deposits: DerivedAccount,
    tokenAccount: PublicKey,
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.withdraw(deposits.bumpSeed, amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        withdrawAccount: tokenAccount,
        depositAccount: deposits.address,
        depositor: this.address,
        reserve: reserve.data.address,
        vault: reserve.data.vault,
        depositNoteMint: reserve.data.depositNoteMint,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeWithdrawTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const tx = new Transaction()
    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeWithdrawIx(reserve, accounts.deposits, tokenAccount, amount))
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async deposit(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeDepositTx(reserve, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `deposit`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} deposits
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeDepositIx(
    reserve: JetReserve,
    deposits: DerivedAccount,
    tokenAccount: PublicKey,
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.deposit(deposits.bumpSeed, amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        depositSource: tokenAccount,
        depositAccount: deposits.address,
        depositor: this.address,
        reserve: reserve.data.address,
        vault: reserve.data.vault,
        depositNoteMint: reserve.data.depositNoteMint,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeDepositTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<Transaction> {
    const { deposits } = await this.findReserveAccounts(reserve)
    const depositAccountInfo = await this.conn.getAccountInfo(deposits.address)

    const tx = new Transaction()

    if (depositAccountInfo == null) {
      tx.add(this.makeInitDepositAccountIx(reserve, deposits))
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeDepositIx(reserve, deposits, tokenAccount, amount))

    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async depositCollateral(reserve: JetReserve, amount: Amount): Promise<string> {
    const tx = await this.makeDepositCollateralTx(reserve, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Create the populated transaction instruction for `depositCollateral`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} deposits
   * @param {DerivedAccount} collateral
   * @param {{ collateralAccount: number; depositAccount: number }} bumpSeeds
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeDepositCollateralIx(
    reserve: JetReserve,
    deposits: DerivedAccount,
    collateral: DerivedAccount,
    bumpSeeds: { collateralAccount: number; depositAccount: number },
    amount: Amount
  ): TransactionInstruction {
    return this.client.program.instruction.depositCollateral(bumpSeeds, amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: this.obligation.address,
        depositAccount: deposits.address,
        collateralAccount: collateral.address,
        owner: this.address,
        reserve: reserve.data.address,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeDepositCollateralTx(reserve: JetReserve, amount: Amount): Promise<Transaction> {
    const { collateral, deposits } = await this.findReserveAccounts(reserve)
    const obligationAccountInfo = await this.conn.getAccountInfo(this.obligation.address)
    const collateralAccountInfo = await this.conn.getAccountInfo(collateral.address)

    const tx = new Transaction()

    if (obligationAccountInfo == null) {
      tx.add(this.makeInitObligationAccountIx())
    }
    if (collateralAccountInfo == null) {
      tx.add(this.makeInitCollateralAccountIx(reserve, collateral))
    }

    const bumpSeeds = {
      depositAccount: deposits.bumpSeed,
      collateralAccount: collateral.bumpSeed
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeDepositCollateralIx(reserve, deposits, collateral, bumpSeeds, amount))
    return tx
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} receiver
   * @param {Amount} amount
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async borrow(reserve: JetReserve, receiver: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeBorrowTx(reserve, receiver, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * Creates the populated transaction instruction for a `borrow`.
   * @param {JetReserve} reserve
   * @param {DerivedAccount} loan
   * @param {PublicKey} receiver
   * @param {Amount} amount
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  makeBorrowIx(reserve: JetReserve, loan: DerivedAccount, receiver: PublicKey, amount: Amount): TransactionInstruction {
    return this.client.program.instruction.borrow(loan.bumpSeed, amount.toRpcArg(), {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        reserve: reserve.data.address,
        obligation: this.obligation.address,
        vault: reserve.data.vault,
        loanNoteMint: reserve.data.loanNoteMint,
        borrower: this.address,
        loanAccount: loan.address,
        receiverAccount: receiver,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} receiver
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeBorrowTx(reserve: JetReserve, receiver: PublicKey, amount: Amount): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const loanAccountInfo = await this.conn.getAccountInfo(accounts.loan.address)

    const tx = new Transaction()

    if (loanAccountInfo == null) {
      tx.add(this.makeInitLoanAccountIx(reserve, accounts.loan))
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(this.makeBorrowIx(reserve, accounts.loan, receiver, amount))
    return tx
  }

  /**
   * Establish an event emitter subscription to the argued `Obligation`
   * account on-chain which listens for the "change" event from the publisher.
   * If no obligation address is provided, it defaults to the user instance's
   * obligation that was set at instantiation.
   * @param {anchor.Address} [address]
   * @param {web3.Commitment} [commitment]
   * @returns {(EventEmitter<string | symbol, any>)}
   * @memberof JetClient
   */
  subscribeToObligation(address?: anchor.Address, commitment?: Commitment): EventEmitter<string | symbol, any> {
    return this.client.program.account.obligation.subscribe(address ?? this.obligation.address, commitment)
  }

  /**
   * Unsubscribes from the argued `Obligation` account
   * address on-chain. If no obligation address is provided,
   * it defaults to the user instance's obligation that was
   * set at instantiation.
   * @param {anchor.Address} [address]
   * @returns {Promise<void>}
   * @memberof JetClient
   */
  async unsubscribeFromObligation(address?: anchor.Address): Promise<void> {
    return this.client.program.account.obligation.unsubscribe(address ?? this.obligation.address)
  }

  /**
   * Create the populated transaction instruction for `initDepositAccount`.
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitDepositAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initDepositAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        reserve: reserve.data.address,
        depositNoteMint: reserve.data.depositNoteMint,
        depositor: this.address,
        depositAccount: account.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }

  /**
   * Create the populated transaction instruction for `initCollateralAccount`.
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitCollateralAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initCollateralAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.data.address,
        depositNoteMint: reserve.data.depositNoteMint,
        owner: this.address,
        obligation: this.obligation.address,
        collateralAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }

  /**
   * Create the populated transaction instruction for `initLoanAccount`.
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitLoanAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initLoanAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.data.address,
        loanNoteMint: reserve.data.loanNoteMint,
        owner: this.address,
        obligation: this.obligation.address,
        loanAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }

  /**
   * Create the populated transaction instruction for `initObligation`.
   * @private
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitObligationAccountIx(): TransactionInstruction {
    return this.client.program.instruction.initObligation(this.obligation.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        obligation: this.obligation.address,
        borrower: this.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * TODO:
   * @memberof JetUser
   */
  async refresh() {
    this._loans = []
    this._deposits = []
    this._collateral = []

    for (const reserve of this.market.reserves) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue
      }

      await this.refreshReserve(reserve)
    }
  }

  /**
   * TODO:
   * @private
   * @param {JetMarketReserveInfo} reserve
   * @memberof JetUser
   */
  private async refreshReserve(reserve: JetMarketReserveInfo) {
    const accounts = await this.findReserveAccounts(reserve)

    await this.refreshAccount(this._deposits, accounts.deposits)
    await this.refreshAccount(this._loans, accounts.loan)
    await this.refreshAccount(this._collateral, accounts.collateral)
  }

  /**
   * TODO:
   * @private
   * @param {TokenAmount[]} appendTo
   * @param {DerivedAccount} account
   * @memberof JetUser
   */
  private async refreshAccount(appendTo: TokenAmount[], account: DerivedAccount) {
    try {
      const info = await this.conn.getAccountInfo(account.address)

      if (info == null) {
        return
      }

      const tokenAccount: TokenAccount = TokenAccountLayout.decode(info.data)

      appendTo.push({
        mint: new PublicKey(tokenAccount.mint),
        amount: new anchor.BN(tokenAccount.amount, undefined, "le")
      })
    } catch (e) {
      console.log(`error getting user account: ${e}`)
      // ignore error, which should mean it's an invalid/uninitialized account
    }
  }

  /**
   * TODO:
   * @private
   * @param {(JetMarketReserveInfo | JetReserve)} reserve
   * @returns {Promise<UserReserveAccounts>}
   * @memberof JetUser
   */
  private async findReserveAccounts(reserve: JetMarketReserveInfo | JetReserve): Promise<UserReserveAccounts> {
    const reserveAddress = (reserve as any).reserve ?? (reserve as any).data?.address

    const deposits = await this.client.findDerivedAccount(["deposits", (reserve as any).address, this.address])
    const loan = await this.client.findDerivedAccount(["loan", reserveAddress, this.obligation.address, this.address])
    const collateral = await this.client.findDerivedAccount([
      "collateral",
      reserveAddress,
      this.obligation.address,
      this.address
    ])

    return {
      deposits,
      loan,
      collateral
    }
  }

  /**
   * Get all the deposits held by the user, excluding those amounts being
   * used as collateral for a loan.
   * @returns {TokenAmount[]}
   * @memberof JetUser
   */
  deposits(): TokenAmount[] {
    return this._deposits
  }

  /**
   * Get all the collateral deposits held by the user.
   * @returns {TokenAmount[]}
   * @memberof JetUser
   */
  collateral(): TokenAmount[] {
    return this._collateral
  }

  /**
   * Get the loans held by the user
   * @returns {TokenAmount[]}
   * @memberof JetUser
   */
  loans(): TokenAmount[] {
    return this._loans
  }
}

/**
 * The set of accounts that can be derived for a user, for each reserve in a market.
 */
interface UserReserveAccounts {
  deposits: DerivedAccount
  loan: DerivedAccount
  collateral: DerivedAccount
}
