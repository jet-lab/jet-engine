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

import { BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { JetClient, JetMarket, JetMarketData, JetReserve, JetUser, ReserveData } from "."
import { JetUserData } from "./user"
import { TokenAmount } from ".."
import { Hooks } from "../common"

export type Position = {
  reserve: ReserveData
  depositNotes?: TokenAmount
  depositBalance: TokenAmount
  collateralNotes?: TokenAmount
  collateralBalance: TokenAmount
  loanNotes?: TokenAmount
  loanBalance: TokenAmount
  // FIXME: calculate these fields
  maxDepositAmount: TokenAmount
  maxWithdrawAmount: TokenAmount
  maxBorrowAmount: TokenAmount
  maxRepayAmount: TokenAmount
}

export interface Obligation {
  positions: Record<number, Position>
  depositedValue: number
  collateralValue: number
  loanedValue: number
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

  /**
   * @static
   * @param {JetClient} client
   * @param {PublicKey} marketAddress
   * @param {JetReserve[]} jetReserves
   * @param {PublicKey} userAddress
   * @returns {(JetObligation | undefined)} JetObligation | undefined
   * @memberof JetObligation
   */
  static use(
    client: JetClient,
    marketAddress: PublicKey,
    jetReserves: JetReserve[],
    userAddress: PublicKey
  ): JetObligation | undefined {
    return Hooks.usePromise(
      async () =>
        client &&
        marketAddress &&
        jetReserves &&
        userAddress &&
        JetObligation.load(client, marketAddress, jetReserves, userAddress),
      [client, marketAddress, jetReserves, userAddress]
    )
  }

  /**
   *
   * @param {JetClient} client
   * @param {PublicKey} marketAddress
   * @param {JetReserve[]} jetReserves
   * @param {PublicKey} userAddress
   * @returns {Promise<JetObligation>}
   */
  static async load(
    client: JetClient,
    marketAddress: PublicKey,
    jetReserves: JetReserve[],
    userAddress: PublicKey
  ): Promise<JetObligation> {
    const market = await JetMarket.load(client, marketAddress)
    const user = await JetUser.load(client, market, jetReserves, userAddress)
    const reserves = await JetReserve.loadMultiple(client, market)

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

    const balances: Position[] = []

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

      const balance: Position = {
        reserve: reserve,
        depositNotes,
        depositBalance:
          depositNotes?.mulb(reserveCache.depositNoteExchangeRate).divb(new BN(1e15)) ??
          TokenAmount.zero(0, reserve.depositNoteMint),
        collateralNotes: collateralNotes,
        collateralBalance:
          collateralNotes?.mulb(reserveCache.depositNoteExchangeRate).divb(new BN(1e15)) ??
          TokenAmount.zero(0, reserve.depositNoteMint),
        loanNotes: loanNotes,
        loanBalance:
          loanNotes?.mulb(reserveCache.loanNoteExchangeRate).divb(new BN(1e15)) ??
          TokenAmount.zero(0, reserve.loanNoteMint),
        //todo fixme
        maxDepositAmount: undefined as any as TokenAmount,
        maxWithdrawAmount: undefined as any as TokenAmount,
        maxBorrowAmount: undefined as any as TokenAmount,
        maxRepayAmount: undefined as any as TokenAmount
      }

      const price = reserve.priceData.price
      if (price != undefined) {
        if (balance.depositBalance) {
          depositedValue += balance.depositBalance.muln(price).tokens
        }
        if (balance.collateralBalance) {
          collateralValue += balance.collateralBalance.muln(price).tokens
        }
        if (balance.loanBalance) {
          loanedValue += balance.loanBalance.muln(price).tokens
        }
      }

      balances[i] = balance
    }

    // calculate collateral ratio
    const collateralRatio = loanedValue === 0 ? 0 : collateralValue / loanedValue
    //calculate utilization ratio
    const utilizationRate = collateralValue === 0 ? 0 : loanedValue / collateralValue

    return new JetObligation(balances, depositedValue, collateralValue, loanedValue, collateralRatio, utilizationRate)
  }
}
