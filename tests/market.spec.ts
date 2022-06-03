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

import { AnchorProvider } from "@project-serum/anchor"
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { Connection, Keypair } from "@solana/web3.js"
import { JetClient, JetMarket, JET_MARKET_ADDRESS_DEVNET } from "../src/pools"

describe("JetMarket", () => {
  let client: JetClient
  let market: JetMarket

  beforeAll(async () => {
    const wallet = Keypair.generate()
    const provider = new AnchorProvider(new Connection("https://mango.devnet.rpcpool.com"), new NodeWallet(wallet), {})
    client = await JetClient.connect(provider, true)
  })

  test("properly loads from an address", async () => {
    market = await JetMarket.load(client, JET_MARKET_ADDRESS_DEVNET)
    expect(market).toBeTruthy()
  })

  test("can be refreshed", async () => {
    await market.refresh()
  })
})
