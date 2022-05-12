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

//import { Provider } from "@project-serum/anchor"
//import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
//import { clusterApiUrl, Connection, Keypair, MemcmpFilter, PublicKey } from "@solana/web3.js"
import { MarginAccount } from "../src/margin"
//import { findDerivedAccount } from "../src/common"

describe("MarginAccount", () => {
  beforeAll(async () => {})

  describe("Test Margin Program Functionality", () => {
    test("check seed max value", async () => {
      expect(MarginAccount.SEED_MAX_VALUE).toEqual(65535)
    })
  })
})
