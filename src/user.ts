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
  TransactionInstruction
} from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'
import { Amount, DEX_ID, DEX_ID_DEVNET } from '.'
import { DerivedAccount, JetClient } from './client'
import { JetMarket, JetMarketReserveInfo } from './market'
import {
  AccountLayout as TokenAccountLayout,
  AccountInfo as TokenAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { JetReserve } from './reserve'

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
    const obligationAccount = await client.findDerivedAccount([
      'obligation',
      market.address,
      address
    ])
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
   * TODO:
   * @param {JetReserve} loanReserve
   * @param {JetReserve} collateralReserve
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeLiquidateDexTx(
    loanReserve: JetReserve,
    collateralReserve: JetReserve
  ): Promise<Transaction> {
    const loanDexAccounts = await loanReserve.loadDexMarketAccounts()
    const collateralDexAccounts = await collateralReserve.loadDexMarketAccounts()
    const loanAccounts = await this.findReserveAccounts(loanReserve)
    const collateralAccounts = await this.findReserveAccounts(collateralReserve)

    const tx = new Transaction()

    tx.add(loanReserve.makeRefreshIx())
    tx.add(collateralReserve.makeRefreshIx())

    tx.add(
      // Turning off type checks here, because liquidateDex does not exist in
      // the IDL, because liquidateDex is handled in a special way here: 
      // https://github.com/jet-lab/jet-v1/blob/65a19e49fb27bc95a5b543f9fec49b43d799a8cd/programs/jet/src/lib.rs
      // And if it were a normal instruction, then a bug in rust would blow
      // the stack while validating anchor constraints.
      // 
      // If liquidateDex ever appears in the IDL then please remove this 'as any' hack
      (this.client.program.instruction as any).liquidateDex({
        accounts: {
          sourceMarket: collateralDexAccounts,
          targetMarket: loanDexAccounts,

          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          obligation: this.obligation.address,

          loanReserve: loanReserve.address,
          loanReserveVault: loanReserve.data.vault,
          loanNoteMint: loanReserve.data.loanNoteMint,
          loanAccount: loanAccounts.loan.address,

          collateralReserve: collateralReserve.address,
          collateralReserveVault: collateralReserve.data.vault,
          depositNoteMint: collateralReserve.data.depositNoteMint,
          collateralAccount: collateralAccounts.collateral.address,

          dexSwapTokens: loanReserve.data.dexSwapTokens,
          dexProgram: this.client.devnet ? DEX_ID_DEVNET : DEX_ID,

          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY
        }
      })
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
   * @returns {Promise<string>}
   * @memberof JetUser
   */
  async liquidate(
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount
  ): Promise<string> {
    const tx = await this.makeLiquidateTx(
      loanReserve,
      collateralReserve,
      payerAccount,
      receiverAccount,
      amount
    )
    return await this.client.program.provider.send(tx)
  }

  /**
   * TODO:
   * @param {JetReserve} _loanReserve
   * @param {JetReserve} _collateralReserve
   * @param {PublicKey} _payerAccount
   * @param {PublicKey} _receiverAccount
   * @param {Amount} _amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeLiquidateTx(
    _loanReserve: JetReserve,
    _collateralReserve: JetReserve,
    _payerAccount: PublicKey,
    _receiverAccount: PublicKey,
    _amount: Amount
  ): Promise<Transaction> {
    throw new Error('not yet implemented')
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
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeRepayTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const tx = new Transaction()

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.repay(amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          payer: this.address,

          reserve: reserve.address,
          vault: reserve.data.vault,
          obligation: this.obligation.address,
          loanNoteMint: reserve.data.loanNoteMint,
          loanAccount: accounts.loan.address,
          payerAccount: tokenAccount,

          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
    )

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
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeWithdrawCollateralTx(reserve: JetReserve, amount: Amount): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const bumpSeeds = {
      collateralAccount: accounts.collateral.bumpSeed,
      depositAccount: accounts.deposits.bumpSeed
    }
    const tx = new Transaction()

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.withdrawCollateral(bumpSeeds, amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          owner: this.address,
          obligation: this.obligation.address,

          reserve: reserve.address,
          collateralAccount: accounts.collateral.address,
          depositAccount: accounts.deposits.address,

          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
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
  async withdraw(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeWithdrawTx(reserve, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeWithdrawTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const tx = new Transaction()

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.withdraw(accounts.deposits.bumpSeed, amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          withdrawAccount: tokenAccount,
          depositAccount: accounts.deposits.address,
          depositor: this.address,

          reserve: reserve.address,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
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
  async deposit(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<string> {
    const tx = await this.makeDepositTx(reserve, tokenAccount, amount)
    return await this.client.program.provider.send(tx)
  }

  /**
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} tokenAccount
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeDepositTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const depositAccountInfo = await this.conn.getAccountInfo(accounts.deposits.address)

    const tx = new Transaction()

    if (depositAccountInfo == null) {
      tx.add(this.makeInitDepositAccountIx(reserve, accounts.deposits))
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.deposit(accounts.deposits.bumpSeed, amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          depositSource: tokenAccount,
          depositAccount: accounts.deposits.address,
          depositor: this.address,

          reserve: reserve.address,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
    )

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
   * TODO:
   * @param {JetReserve} reserve
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeDepositCollateralTx(reserve: JetReserve, amount: Amount): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const obligationAccountInfo = await this.conn.getAccountInfo(this.obligation.address)
    const collateralAccountInfo = await this.conn.getAccountInfo(accounts.collateral.address)

    const tx = new Transaction()

    if (obligationAccountInfo == null) {
      tx.add(this.makeInitObligationAccountIx())
    }
    if (collateralAccountInfo == null) {
      tx.add(this.makeInitCollateralAccountIx(reserve, accounts.collateral))
    }

    const bumpSeeds = {
      depositAccount: accounts.deposits.bumpSeed,
      collateralAccount: accounts.collateral.bumpSeed
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.depositCollateral(bumpSeeds, amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          obligation: this.obligation.address,
          depositAccount: accounts.deposits.address,
          collateralAccount: accounts.collateral.address,
          owner: this.address,
          reserve: reserve.address,

          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
    )

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
   * TODO:
   * @param {JetReserve} reserve
   * @param {PublicKey} receiver
   * @param {Amount} amount
   * @returns {Promise<Transaction>}
   * @memberof JetUser
   */
  async makeBorrowTx(
    reserve: JetReserve,
    receiver: PublicKey,
    amount: Amount
  ): Promise<Transaction> {
    const accounts = await this.findReserveAccounts(reserve)
    const loanAccountInfo = await this.conn.getAccountInfo(accounts.loan.address)

    const tx = new Transaction()

    if (loanAccountInfo == null) {
      tx.add(this.makeInitLoanAccountIx(reserve, accounts.loan))
    }

    tx.add(reserve.makeRefreshIx())
    tx.add(
      this.client.program.instruction.borrow(accounts.loan.bumpSeed, amount.toRpcArg(), {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          reserve: reserve.address,
          obligation: this.obligation.address,
          vault: reserve.data.vault,
          loanNoteMint: reserve.data.loanNoteMint,
          borrower: this.address,
          loanAccount: accounts.loan.address,

          receiverAccount: receiver,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
    )

    return tx
  }

  /**
   * TODO:
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitDepositAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initDepositAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
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
   * TODO:
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitCollateralAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initCollateralAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
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
   * TODO:
   * @private
   * @param {JetReserve} reserve
   * @param {DerivedAccount} account
   * @returns {TransactionInstruction}
   * @memberof JetUser
   */
  private makeInitLoanAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initLoanAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
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
   * TODO:
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
      if (reserve.address.equals(PublicKey.default)) {
        continue;
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
        return;
      }

      const tokenAccount: TokenAccount = TokenAccountLayout.decode(info.data)

      appendTo.push({
        mint: new PublicKey(tokenAccount.mint),
        amount: new anchor.BN(tokenAccount.amount, undefined, "le"),
      })
    } catch (e) {
      console.log(`error getting user account: ${e}`);
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
  private async findReserveAccounts(
    reserve: JetMarketReserveInfo | JetReserve
  ): Promise<UserReserveAccounts> {
    const deposits = await this.client.findDerivedAccount([
      'deposits',
      reserve.address,
      this.address
    ])
    const loan = await this.client.findDerivedAccount([
      'loan',
      reserve.address,
      this.obligation.address,
      this.address
    ])
    const collateral = await this.client.findDerivedAccount([
      'collateral',
      reserve.address,
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
