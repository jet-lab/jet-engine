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

import { BN, Program, Provider } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js"
import type {
  AcceptOfferAccounts,
  CancelOfferAccounts,
  EndLeaseAccounts,
  ForecloseAccounts,
  ListAssetAccounts,
  MakeOfferAccounts,
  MakeOfferBumps
} from "./types"

const JET_P2P_PROGRAM_ID = "" // FIXME:

enum StaticSeed {
  CollateralEscrow = "collateral_escrow",
  FeeEscrow = "fee_escrow",
  Lease = "lease",
  Listing = "listing",
  Offer = "offer"
}

export class Client {
  /**
   * Creates an instance of Client.
   * @param {Program} _program
   * @memberof Client
   */
  constructor(private _program: Program) {}

  /**
   * Instantiates a Client for the Jet P2P program using the
   * argued provider instance.
   * @static
   * @param {Provider} provider
   * @returns {Promise<Client>}
   * @memberof Client
   */
  static async connect(provider: Provider): Promise<Client> {
    const idl = await Program.fetchIdl(JET_P2P_PROGRAM_ID, provider)
    return new Client(new Program(idl as any, JET_P2P_PROGRAM_ID, provider))
  }

  /**
   * Creates the `acceptOffer` transaction and derives the
   * appropriate public key and bump nonce for the lease account.
   * @param {PublicKey} assetMint
   * @param {Omit<AcceptOfferAccounts, "lease">} accounts
   * @returns {Promise<Transaction>}
   * @memberof Client
   */
  async buildAcceptOfferTransaction(
    assetMint: PublicKey,
    accounts: Omit<AcceptOfferAccounts, "lease">
  ): Promise<Transaction> {
    const [leaseKey, leaseBump] = await PublicKey.findProgramAddress(
      [Buffer.from(StaticSeed.Lease), assetMint.toBytes()],
      this._program.programId
    )

    const tx = new Transaction()
    tx.add(
      this._buildAcceptOfferInstruction(leaseBump, {
        ...accounts,
        lease: leaseKey
      })
    )
    return tx
  }

  /**
   * Creates the `cancelOffer` transaction with the proper instructions.
   * @param {CancelOfferAccounts} accounts
   * @returns {Transaction}
   * @memberof Client
   */
  buildCancelOfferTransaction(accounts: CancelOfferAccounts): Transaction {
    const tx = new Transaction()
    tx.add(this._buildCancelOfferInstruction(accounts))
    return tx
  }

  /**
   * Creates the `endLease` transaction with the proper instructions.
   * @param {EndLeaseAccounts} accounts
   * @returns {Transaction}
   * @memberof Client
   */
  buildEndLeaseTransaction(accounts: EndLeaseAccounts): Transaction {
    const tx = new Transaction()
    tx.add(this._buildEndLeaseInstruction(accounts))
    return tx
  }

  /**
   * Creates the `foreclose` transaction with the proper instructions.
   * @param {ForecloseAccounts} accounts
   * @returns {Transaction}
   * @memberof Client
   */
  buildForecloseTransaction(accounts: ForecloseAccounts): Transaction {
    const tx = new Transaction()
    tx.add(this._buildForecloseInstruction(accounts))
    return tx
  }

  /**
   * Creates the `listAsset` transaction and the listing public key
   * and bump noncee and builds the transaction ready to be sent.
   * @param {BN} minFee
   * @param {BN} minCollateral
   * @param {BN} minTerm
   * @param {Omit<ListAssetAccounts, "listing">} accounts
   * @returns {Promise<Transaction>}
   * @memberof Client
   */
  async buildListAssetTransaction(
    minFee: BN,
    minCollateral: BN,
    minTerm: BN,
    accounts: Omit<ListAssetAccounts, "listing">
  ): Promise<Transaction> {
    const [listingKey, listingBump] = await PublicKey.findProgramAddress(
      [Buffer.from(StaticSeed.Listing), accounts.owner.toBytes(), accounts.asset_mint.toBytes()],
      this._program.programId
    )

    const tx = new Transaction()
    tx.add(
      this._buildListAssetInstruction(listingBump, minFee, minCollateral, minTerm, {
        ...accounts,
        listing: listingKey
      })
    )
    return tx
  }

  /**
   * Creates the `makeOffer` transaction along with deriving the keys and bumps
   * for the offer, collateral escrow and fee escrow accounts.
   * @param {BN} term
   * @param {BN} fee
   * @param {BN} collateral
   * @param {(Omit<MakeOfferAccounts, "collateralEscrow" | "feeEscrow" | "offer">)} accounts
   * @returns {Promise<Transaction>}
   * @memberof Client
   */
  async buildMakeOfferTransaction(
    term: BN,
    fee: BN,
    collateral: BN,
    accounts: Omit<MakeOfferAccounts, "collateralEscrow" | "feeEscrow" | "offer">
  ): Promise<Transaction> {
    const [offerKey, offerBump] = await this.deriveOfferAddress(accounts.listing, accounts.borrower)

    const [collatKey, collatBump] = await this.deriveCollateralEscrowAddress(
      accounts.listing,
      offerKey,
      accounts.collateralMint
    )

    const [feeKey, feeBump] = await this.deriveFeeEscrowAddress(
      accounts.listing,
      offerKey,
      accounts.feeMint
    )

    const tx = new Transaction()
    tx.add(
      this._buildMakeOfferInstruction(
        {
          collateralEscrow: collatBump,
          feeEscrow: feeBump,
          offer: offerBump
        },
        term,
        fee,
        collateral,
        { ...accounts, collateralEscrow: collatKey, feeEscrow: feeKey, offer: offerKey }
      )
    )
    return tx
  }

  /**
   * Derives the public key and bump nonce for a collateral escrow
   * token account that is associated with the argued `Listing`, `Offer`,
   * and token mint.
   * @param {PublicKey} listing
   * @param {PublicKey} offer
   * @param {PublicKey} collateralMint
   * @returns {Promise<[PublicKey, number]>}
   * @memberof Client
   */
  deriveCollateralEscrowAddress(
    listing: PublicKey,
    offer: PublicKey,
    collateralMint: PublicKey
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(StaticSeed.CollateralEscrow),
        listing.toBytes(),
        offer.toBytes(),
        collateralMint.toBytes()
      ],
      this._program.programId
    )
  }

  /**
   * Derives the public key and bump nonce for a fee escrow token
   * account that is associated with the argued `Listing`, `Offer`,
   * and token mint.
   * @param {PublicKey} listing
   * @param {PublicKey} offer
   * @param {PublicKey} feeMint
   * @returns {Promise<[PublicKey, number]>}
   * @memberof Client
   */
  deriveFeeEscrowAddress(
    listing: PublicKey,
    offer: PublicKey,
    feeMint: PublicKey
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from(StaticSeed.FeeEscrow), listing.toBytes(), offer.toBytes(), feeMint.toBytes()],
      this._program.programId
    )
  }

  /**
   * Derives the public key and bump nonce for an `Offer`
   * account owned by the program associated with the argued
   * `Listing` and borrower.
   * @param {PublicKey} listing
   * @param {PublicKey} borrower
   * @returns {Promise<[PublicKey, number]>}
   * @memberof Client
   */
  deriveOfferAddress(listing: PublicKey, borrower: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from(StaticSeed.Offer), listing.toBytes(), borrower.toBytes()],
      this._program.programId
    )
  }

  /**
   * Creates the populated transaction instruction for `acceptOffer`.
   * @private
   * @param {number} bump
   * @param {AcceptOfferAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildAcceptOfferInstruction(
    bump: number,
    accounts: AcceptOfferAccounts
  ): TransactionInstruction {
    return this._program.instruction.acceptOffer(bump, {
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * Creates the populated transaction instruction for `cancelOffer`.
   * @private
   * @param {CancelOfferAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildCancelOfferInstruction(accounts: CancelOfferAccounts): TransactionInstruction {
    return this._program.instruction.cancelOffer({
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * Creates the populated transaction instruction for `endLease`.
   * @private
   * @param {EndLeaseAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildEndLeaseInstruction(accounts: EndLeaseAccounts): TransactionInstruction {
    return this._program.instruction.endLease({
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * Creates the populated transaction instruction for `foreclose`.
   * @private
   * @param {ForecloseAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildForecloseInstruction(accounts: ForecloseAccounts): TransactionInstruction {
    return this._program.instruction.foreclose({
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * Creates the populated transaction instruction for `listAsset`.
   * @private
   * @param {number} bump
   * @param {BN} minFee
   * @param {BN} minCollateral
   * @param {BN} minTerm
   * @param {ListAssetAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildListAssetInstruction(
    bump: number,
    minFee: BN,
    minCollateral: BN,
    minTerm: BN,
    accounts: ListAssetAccounts
  ): TransactionInstruction {
    return this._program.instruction.listAsset(bump, minFee, minCollateral, minTerm, {
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * Creates the populated transaction instruction for `makeOffer`.
   * @private
   * @param {MakeOfferBumps} bumps
   * @param {BN} term
   * @param {BN} fee
   * @param {BN} collateral
   * @param {MakeOfferAccounts} accounts
   * @returns {TransactionInstruction}
   * @memberof Client
   */
  private _buildMakeOfferInstruction(
    bumps: MakeOfferBumps,
    term: BN,
    fee: BN,
    collateral: BN,
    accounts: MakeOfferAccounts
  ): TransactionInstruction {
    return this._program.instruction.makeOffer(bumps, term, fee, collateral, {
      accounts: {
        ...accounts,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }
}

export * from "./types"
