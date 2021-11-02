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
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js"
import { JetMarket, JetReserve } from "../src"
import { JetClient } from "../src/client"

describe("JetClient", () => {
  let client: JetClient

  beforeAll(async () => {
    const wallet = Keypair.generate()
    const provider = new Provider(new Connection(clusterApiUrl("devnet")), new Wallet(wallet), {})
    client = await JetClient.connect(provider, true)
  })

  test("can fetch all markets", async () => {
    const markets = await JetMarket.allMarkets(client)
    expect(markets.length).toBeGreaterThan(0)
  })

  test("can fetch all obligations", async () => {
    const obligations = await client.allObligations()
    expect(obligations.length).toBeGreaterThan(0)
  })

  test("can fetch all reserves", async () => {
    const reserves = await JetReserve.allReserves(client)
    expect(reserves.length).toBeGreaterThan(0)
  })
})
