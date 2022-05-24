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

import { BN, web3 } from "@project-serum/anchor"
import { DerivedAccount, TokenAmount } from "../src"
import { Amount } from "../src"
import { pubkeyField, u64Field } from "../src/common/accountParser"

describe("Amount", () => {
  test("properly instantiates", () => {
    const a = new Amount({ tokens: {} }, new BN(1))
    expect(a.units).toEqual({ tokens: {} })
    expect(a.value.toNumber()).toEqual(1)
  })

  test("can be transformed into an RPC call argument", () => {
    const a = new Amount({ tokens: {} }, new BN(1)).toRpcArg()
    expect(a.units).toEqual({ tokens: {} })
    expect(a.value.toNumber()).toEqual(1)
  })

  test("can be instantiated used the static tokens function", () => {
    const a = Amount.tokens(1)
    expect(a.units).toEqual({ tokens: {} })
    expect(a.value.toNumber()).toEqual(1)
  })

  test("can be instantiated used the static depositNotes function", () => {
    const a = Amount.depositNotes(1)
    expect(a.units).toEqual({ depositNotes: {} })
    expect(a.value.toNumber()).toEqual(1)
  })

  test("can be instantiated used the static loanNotes function", () => {
    const a = Amount.loanNotes(1)
    expect(a.units).toEqual({ loanNotes: {} })
    expect(a.value.toNumber()).toEqual(1)
  })
})

describe("TokenAmount", () => {
  let t: TokenAmount

  test("properly instantiates", () => {
    t = new TokenAmount(new BN(10), 6, web3.PublicKey.default)
  })

  test("sets the proper mint address", () => {
    expect(t.mint.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test("sets the correct token amount", () => {
    // 6 decimals
    expect(t.tokens).toStrictEqual(10 / 1e6)
  })
})

describe("DerivedAccount", () => {
  let d: DerivedAccount

  test("properly instantiates", () => {
    d = { address: web3.PublicKey.default, bump: 200 }
  })

  test("sets the proper public key", () => {
    expect(d.address.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test("sets the correct bump seed", () => {
    expect(d.bump).toStrictEqual(200)
  })
})

describe("NumberField BL.Layout", () => {
  test("initializes correct span and property name", () => {
    const num = u64Field("testU64")
    expect(num.getSpan()).toStrictEqual(8)
    expect(num.property).toStrictEqual("testU64")
  })

  test("u64Field abstraction produces a NumberField with span of 8", () => {
    const num = u64Field("testU64")
    expect(num.span).toStrictEqual(8)
    expect(num.property).toStrictEqual("testU64")
  })

  test("properly decodes Uint8Array into BN", () => {
    const num = u64Field("test")
    const bn = new BN(5000)
    const newBN = num.decode(new Uint8Array(bn.toBuffer("le")))
    expect(newBN.toNumber()).toStrictEqual(bn.toNumber())
  })

  test("properly encodes BN into a Uint8Array", () => {
    const num = u64Field("test")
    const bn = new BN(5000)
    const arr = new Uint8Array(bn.byteLength())
    const x = num.encode(bn, arr)
    expect(x).toStrictEqual(8)
    expect(new BN(arr, undefined, "le").toNumber()).toStrictEqual(bn.toNumber())
  })
})

describe("PubkeyField BL.Layout", () => {
  test("initializes correct span and property name", () => {
    const pub = pubkeyField("testKey")
    expect(pub.getSpan()).toStrictEqual(32)
    expect(pub.property).toStrictEqual("testKey")
  })

  test("pubkeyField abstraction produces an identical layout", () => {
    const pub = pubkeyField("testKey")
    expect(pub.getSpan()).toStrictEqual(32)
    expect(pub.property).toStrictEqual("testKey")
  })

  test("properly decodes Uint8Array into PublicKey", () => {
    const pub = pubkeyField("test")
    const key = web3.PublicKey.default
    const newKey = pub.decode(key.toBytes())
    expect(newKey.equals(key)).toBeTruthy()
  })

  test("properly encodes a PublicKey into Uint8Array", () => {
    const pub = pubkeyField("test")
    const key = web3.PublicKey.default
    const arr = new Uint8Array(key.toBuffer().byteLength)
    const x = pub.encode(key, arr)
    expect(x).toStrictEqual(32)
    expect(new web3.PublicKey(arr).equals(key)).toBeTruthy()
  })
})
