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

import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"
import { JetClient, JetMarket, JetMarketData, JetReserve, JetUser, ReserveData } from "."
import { TokenAmount, JetUserData } from "./user"

interface Balances {
  reserve: ReserveData
  depositNotes?: TokenAmount
  depositBalance: BN
  collateralNotes?: TokenAmount
  collateralBalance: BN
  loanNotes?: TokenAmount
  loanBalance: BN
}

export type Position = {
  reserve: ReserveData
  depositNotes?: TokenAmount
  depositBalance: BN
  collateralNotes?: TokenAmount
  collateralBalance: BN
  loanNotes?: TokenAmount
  loanBalance: BN
  // FIXME: calculate these fields
  // maxDepositAmount: TokenAmount
  // maxWithdrawAmount: TokenAmount
  // maxBorrowAmount: TokenAmount
  // maxRepayAmount: TokenAmount
}

export interface Obligation {
  positions: Record<number, Position>
  depositedValue: number
  collateralValue: number
  collateralRatio: number
  utilizationRate: number
}

/**
 * TODO:
 * @export
 * @class JetObligation
 * @implements {Obligation}
 */
export class JetObligation implements Obligation {
  /**
   * Creates an instance of JetObligation.
   * @param {Position[]} positions
   * @param {BN} depositedValue
   * @param {BN} collateralValue
   * @param {BN} loanedValue
   * @param {number} collateralRatio
   * @param {number} utilizationRate
   * @memberof JetObligation
   */
  constructor(
    public positions: Position[],
    public depositedValue: number,
    public collateralValue: number,
    public loanedValue: number,
    public collateralRatio: number,
    public utilizationRate: number
  ) {}

  static async load(client: JetClient, marketAddress: PublicKey, userAddress: PublicKey) {
    const market = await JetMarket.load(client, marketAddress)
    const [user, reserves] = await Promise.all([
      JetUser.load(client, market, userAddress),
      JetReserve.loadMultiple(client, market)
    ])
    return this.create(
      market,
      user,
      reserves.map(reserve => reserve.data)
    )
  }

  /**
   * TODO:
   * @static
   * @param {JetMarketData} market
   * @param {JetUserData} user
   * @param {ReserveData[]} reserveData
   * @param {number[]} prices
   * @returns
   * @memberof JetObligation
   */
  static create(market: JetMarketData, user: JetUserData, reserveData: ReserveData[]) {
    const deposits = user.deposits()
    const collateral = user.collateral()
    const loans = user.loans()

    const balances: Balances[] = []

    // Sum of Deposited and borrowed
    let depositedValue = 0
    let collateralValue = 0
    let loanedValue = 0

    // Token balances
    for (let i = 0; i < market.reserves.length; i++) {
      const reserveCache = market.reserves[i]
      const reserve = reserveData[i]

      if (reserveCache.reserve.equals(PublicKey.default)) {
        continue
      }
      if (!reserveCache.reserve.equals(reserve.address)) {
        throw new Error("market reserves do not match reserve list.")
      }
      const depositNotes = deposits.find(deposit => deposit.mint.equals(reserve.depositNoteMint))
      const collateralNotes = collateral.find(collateral => collateral.mint.equals(reserve.depositNoteMint))
      const loanNotes = loans.find(loan => loan.mint.equals(reserve.loanNoteMint))

      const balance: Balances = {
        reserve: reserve,
        depositNotes,
        depositBalance: depositNotes?.amount.mul(reserveCache.depositNoteExchangeRate).div(new BN(1e15)) ?? new BN(0),
        collateralNotes: collateralNotes,
        collateralBalance:
          collateralNotes?.amount.mul(reserveCache.depositNoteExchangeRate).div(new BN(1e15)) ?? new BN(0),
        loanNotes: loanNotes,
        loanBalance: loanNotes?.amount.mul(reserveCache.loanNoteExchangeRate).div(new BN(1e15)) ?? new BN(0)
      }

      const price = reserve.priceData.price
      if (price != undefined) {
        if (balance.depositBalance) {
          depositedValue += parseFloat(balance.depositBalance.muln(price).toString())
        }
        if (balance.collateralBalance) {
          collateralValue += parseFloat(balance.collateralBalance.muln(price).toString())
        }
        if (balance.loanBalance) {
          loanedValue += parseFloat(balance.loanBalance.muln(price).toString())
        }
      }

      balances[i] = balance
    }

    // Utilization Rate
    const collateralRatio = loanedValue === 0 ? 0 : depositedValue / loanedValue
    const utilizationRate = depositedValue === 0 ? 0 : loanedValue / depositedValue

    return new JetObligation(balances, depositedValue, collateralValue, loanedValue, collateralRatio, utilizationRate)
  }
}
