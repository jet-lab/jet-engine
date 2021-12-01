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

import { Provider, Wallet } from "@project-serum/anchor"
import { clusterApiUrl, Connection, Keypair, MemcmpFilter, PublicKey } from "@solana/web3.js"
import { JetMarket, JetReserve, JetClient } from "../src"

describe("JetClient", () => {
  let client: JetClient

  beforeAll(async () => {
    const wallet = Keypair.generate()
    const provider = new Provider(new Connection(clusterApiUrl("devnet")), new Wallet(wallet), {})
    client = await JetClient.connect(provider, true)
  })

  describe("can calculate derived account addresses and bump nonces", () => {
    test("using buffer seeds", async () => {
      const derived = await client.findDerivedAccount([Buffer.from("test")])
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using string seeds", async () => {
      const derived = await client.findDerivedAccount(["test"])
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using public key seeds", async () => {
      const derived = await client.findDerivedAccount([new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")])
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using keypair seeds", async () => {
      const derived = await client.findDerivedAccount([Keypair.generate()])
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })
  })

  test("can fetch all markets", async () => {
    const markets = await JetMarket.allMarkets(client)
    expect(markets.length).toBeGreaterThan(0)
  })

  test("can fetch all obligations using filter", async () => {
    const ownerFilter: MemcmpFilter = {
      memcmp: {
        bytes: new PublicKey("Ayr9Kuhw32F4VB5JhqX3C6dfWwHrsKzBoyEGhjDvXtn2").toBase58(),
        // The 'owner' field
        offset: 8 + 4 + 4 + 32
      }
    }
    const obligations = await client.allObligations([ownerFilter])
    expect(obligations.length).toBeGreaterThan(0)
  })

  test("can fetch all reserves", async () => {
    const reserves = await JetReserve.allReserves(client)
    expect(reserves.length).toBeGreaterThan(0)
  })
})
