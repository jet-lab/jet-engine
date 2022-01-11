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

import { Program, Provider } from "@project-serum/anchor"
import { JET_STAKE_ID } from "."

/**
 * TODO:
 * @export
 * @class JetClient
 */
export class StakeClient {
  /**
   * Creates an instance of JetClient.
   * @param {Program<Jet>} program
   * @param {boolean} [devnet]
   * @memberof JetClient
   */
  private constructor(public program: Program) {}

  /**
   * Create a new client for interacting with the Jet lending program.
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
   * @param {boolean} [devnet] Flag to determine if the connection is for devnet
   * @returns {Promise<JetClient>} The client
   * @memberof JetClient
   */
  static async connect(provider: Provider): Promise<Program> {
    const idl = await Program.fetchIdl(JET_STAKE_ID, provider)

    if (!idl) {
      throw new Error("Program lacks an IDL account.")
    }
    const program = new Program(idl, JET_STAKE_ID, provider)

    // FIXME! this is a workaround for bad types
    const acc = program.account
    acc.StakePool = (acc as any).stakePool
    acc.StakeAccount = (acc as any).stakeAccount
    acc.UnbondingAccount = (acc as any).unbondingAccount

    return program
  }
}