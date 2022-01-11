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

import { Provider } from "@project-serum/anchor"
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { clusterApiUrl, Connection, Keypair, MemcmpFilter, PublicKey } from "@solana/web3.js"
import { JetMarket, JetReserve, JetClient, JET_MARKET_ADDRESS_DEVNET } from "../src"
import { findDerivedAccount } from "../src/common"

describe("JetClient", () => {
  let client: JetClient

  beforeAll(async () => {
    const wallet = Keypair.generate()
    const provider = new Provider(new Connection(clusterApiUrl("devnet")), new NodeWallet(wallet), {})
    client = await JetClient.connect(provider, true)
  })

  describe("can calculate derived account addresses and bump nonces", () => {
    test("using buffer seeds", async () => {
      const derived = await findDerivedAccount(client.program.programId, Buffer.from("test"))
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using string seeds", async () => {
      const derived = await findDerivedAccount(client.program.programId, "test")
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using public key seeds", async () => {
      const derived = await findDerivedAccount(
        client.program.programId,
        new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
      )
      expect(derived.address.toBytes()).toHaveLength(32)
      expect(derived.bumpSeed).toBeLessThan(256)
    })

    test("using keypair seeds", async () => {
      const derived = await findDerivedAccount(client.program.programId, Keypair.generate())
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

  test("can fetch all reserves of a market", async () => {
    const market = await JetMarket.load(client, JET_MARKET_ADDRESS_DEVNET)
    const reserves = await JetReserve.loadMultiple(client, market)
    expect(reserves.length).toBeGreaterThan(0)
  })
})
