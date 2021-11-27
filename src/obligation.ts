import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"
import { JetMarketData, JetMarketReserveInfo, ReserveData } from "."
import { TokenAmount, JetUserData } from "./user"

interface Balances {
  depositNotes: TokenAmount
  depositBalance: TokenAmount
  collateralBalance: TokenAmount
  collateralNotes: TokenAmount
  loanNotes: TokenAmount
  loanBalance: TokenAmount
}

export type Position = {
  depositNotes: TokenAmount
  depositBalance: TokenAmount
  collateralBalance: TokenAmount
  collateralNotes: TokenAmount
  loanNotes: TokenAmount
  loanBalance: TokenAmount
  maxDepositAmount: TokenAmount
  maxWithdrawAmount: TokenAmount
  maxBorrowAmount: TokenAmount
  maxRepayAmount: TokenAmount
}

export interface Obligation {
  positions: Record<number, Position>
  depositedValue: BN
  collateralValue: BN
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
    public depositedValue: BN,
    public collateralValue: BN,
    public loanedValue: BN,
    public collateralRatio: number,
    public utilizationRate: number
  ) {}

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
    const collateral = user.deposits()
    const loans = user.loans()

    const positions: Balances[] = []

    // Sum of Deposited and borrowed
    const depositedValue = new BN(0)
    const collateralValue = new BN(0)
    const loanedValue = new BN(0)

    // Token balances
    for (let i = 0; i < market.reserves.length; i++) {
      const reserveCache = market.reserves[i]
      const reserve = reserveData[i]

      if (reserveCache.address.equals(PublicKey.default)) {
        continue
      }
      if (!reserveCache.address.equals(reserve.address)) {
        throw new Error("market reserves do not match reserve list.")
      }

      const position = this.toTokens(deposits[i], collateral[i], loans[i], reserve, reserveCache)
      const price = reserve.priceData.price
      if (price != undefined) {
        depositedValue.iadd(positions[i].depositBalance.amount.muln(price))
        collateralValue.iadd(positions[i].collateralBalance.amount.muln(price))
        loanedValue.iadd(positions[i].loanBalance.amount.muln(price))
      }

      positions[i] = position
    }

    // Utilization Rate
    const collateralRatio = loanedValue.isZero() ? 0 : parseFloat(depositedValue.div(loanedValue).toString()) / 1e15
    const utilizationRate = depositedValue.isZero() ? 0 : parseFloat(loanedValue.div(depositedValue).toString()) / 1e15

    return new JetObligation(
      positions as Position[],
      depositedValue,
      collateralValue,
      loanedValue,
      collateralRatio,
      utilizationRate
    )
  }

  /**
   * TODO:
   * @private
   * @static
   * @param {TokenAmount} noteAmount
   * @param {ReserveData} reserveData
   * @param {BN} exchangeRate
   * @returns
   * @memberof JetObligation
   */
  private static toToken(noteAmount: TokenAmount, reserveData: ReserveData, exchangeRate: BN) {
    return new TokenAmount(reserveData.tokenMint, noteAmount.amount.mul(exchangeRate))
  }

  /**
   * TODO:
   * @private
   * @static
   * @param {TokenAmount} deposit
   * @param {TokenAmount} collateral
   * @param {TokenAmount} loan
   * @param {ReserveData} reserve
   * @param {JetMarketReserveInfo} reserveCache
   * @returns {Balances}
   * @memberof JetObligation
   */
  private static toTokens(
    deposit: TokenAmount,
    collateral: TokenAmount,
    loan: TokenAmount,
    reserve: ReserveData,
    reserveCache: JetMarketReserveInfo
  ): Balances {
    return {
      depositNotes: deposit,
      depositBalance: this.toToken(deposit, reserve, reserveCache.depositNoteExchangeRate),
      collateralNotes: collateral,
      collateralBalance: this.toToken(collateral, reserve, reserveCache.depositNoteExchangeRate),
      loanNotes: loan,
      loanBalance: this.toToken(loan, reserve, reserveCache.loanNoteExchangeRate)
    }
  }
}
