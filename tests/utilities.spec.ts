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

import { BN, web3 } from '@project-serum/anchor'
import { TokenAmount } from '../src/user'
import { DerivedAccount } from '../src/client'

describe('TokenAmount', () => {
  let t: TokenAmount

  test('properly instantiates', () => {
    t = new TokenAmount(web3.PublicKey.default, new BN(10))
  })

  test('sets the proper mint address', () => {
    expect(t.mint.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test('sets the correct token amount', () => {
    expect(t.amount.toNumber()).toStrictEqual(10)
  })
})

describe('DerivedAccount', () => {
  let d: DerivedAccount

  test('properly instantiates', () => {
    d = new DerivedAccount(web3.PublicKey.default, 200)
  })

  test('sets the proper public key', () => {
    expect(d.address.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test('sets the correct bump seed', () => {
    expect(d.bumpSeed).toStrictEqual(200)
  })
})
