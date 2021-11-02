import { PublicKey } from "@solana/web3.js"
import BN from "bn.js"
import { JetMarketData, JetMarketReserveInfo, ReserveData } from "."
import { TokenAmount, User } from "./user"

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

export class JetObligation implements Obligation {
  constructor(
    public positions: Position[],
    public depositedValue: BN,
    public collateralValue: BN,
    public loanedValue: BN,
    public collateralRatio: number,
    public utilizationRate: number
  ) {}

  static create(market: JetMarketData, user: User, reserveData: ReserveData[], prices: number[]) {
    const deposits = user.deposits()
    const collateral = user.deposits()
    const loans = user.loans()

    const positions: Balances[] = []

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

      positions[i] = this.toTokens(deposits[i], collateral[i], loans[i], reserve, reserveCache)
    }

    // Total Deposited and borrowed
    let depositedValue = new BN(0)
    let collateralValue = new BN(0)
    let loanedValue = new BN(0)
    for (const i in positions) {
      depositedValue = depositedValue.add(positions[i].depositBalance.amount.muln(prices[i]))
      collateralValue = collateralValue.add(positions[i].collateralBalance.amount.muln(prices[i]))
      loanedValue = loanedValue.add(positions[i].loanBalance.amount.muln(prices[i]))
    }
    
    // Utilization Rate
    const collateralRatio = loanedValue.isZero() ? 0 : parseFloat(depositedValue.div(loanedValue).toString()) / 1e15
    const utilizationRate = depositedValue.isZero() ? 0 : parseFloat(loanedValue.div(depositedValue).toString()) / 1e15

    return new JetObligation(positions as Position[], depositedValue, collateralValue, loanedValue, collateralRatio, utilizationRate);
  }

  private static toToken(noteAmount: TokenAmount, reserveData: ReserveData, exchangeRate: BN) {
    return new TokenAmount(reserveData.tokenMint, noteAmount.amount.mul(exchangeRate))
  }

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
