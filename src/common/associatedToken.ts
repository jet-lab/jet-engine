import { Provider } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, AccountInfo as TokenAccountInfo, MintInfo } from "@solana/spl-token"
import { AccountInfo, PublicKey, Signer, TransactionInstruction } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { parseMintAccount, parseTokenAccount } from "./accountParser"
import { AccountInfo as TokenAccount } from "@solana/spl-token"

/**
 * Utility class to store a calculated PDA and
 * the bump nonce associated with it.
 * @export
 * @class DerivedAccount
 */
export class DerivedAccount {
  /**
   * Creates an instance of DerivedAccount.
   * @param {PublicKey} address
   * @param {number} bump
   * @memberof DerivedAccount
   */
  constructor(public address: PublicKey, public bump: number) {}
}

export class AssociatedToken {
  /**
   * Get the address for the associated token account
   * @static
   * @param {PublicKey} mint Token mint account
   * @param {PublicKey} owner Owner of the new account
   * @returns {Promise<PublicKey>} Public key of the associated token account
   * @memberof AssociatedToken
   */
  static async derive(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    return address
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {PublicKey} mint
   * @param {PublicKey} owner
   * @returns {(Promise<AssociatedToken | undefined>)}
   * @memberof AssociatedToken
   */
  static async load(provider: Provider, mint: PublicKey, owner: PublicKey): Promise<AssociatedToken | undefined> {
    const tokenAccount = await this.derive(mint, owner)
    const account = await provider.connection.getAccountInfo(tokenAccount)
    if (!account) {
      return undefined
    }
    const info = parseTokenAccount(account.data, tokenAccount)
    return new AssociatedToken(tokenAccount, account, info)
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {PublicKey} mint
   * @returns {(Promise<MintInfo | undefined>)}
   * @memberof AssociatedToken
   */
  static async loadMint(provider: Provider, mint: PublicKey): Promise<MintInfo | undefined> {
    const mintInfo = await provider.connection.getAccountInfo(mint)
    if (!mintInfo) {
      return undefined
    }
    return parseMintAccount(mintInfo.data)
  }

  /**
   * Creates an instance of AssociatedToken.
   * @param {PublicKey} address
   * @param {AccountInfo<Buffer>} account
   * @param {TokenAccountInfo} info
   * @memberof AssociatedToken
   */
  constructor(public address: PublicKey, public account: AccountInfo<Buffer>, public info: TokenAccountInfo) {
    return
  }

  /**
   * Use an associated token account address
   * @static
   * @param {PublicKey} [mint]
   * @param {(PublicKey | null)} [owner]
   * @returns {(PublicKey | undefined)}
   * @memberof AssociatedToken
   */
  static useAddress(mint?: PublicKey, owner?: PublicKey | null): PublicKey | undefined {
    const [tokenAddress, setTokenAddress] = useState<PublicKey | undefined>()

    useEffect(() => {
      let abort = false
      if (!owner || !mint) {
        setTokenAddress(undefined)
        return
      }

      this.derive(mint, owner).then(newTokenAddress => !abort && setTokenAddress(newTokenAddress))

      return () => {
        abort = true
      }
    }, [mint, owner])

    return tokenAddress
  }

  /**
   * Use an aux token account by address. Aux token accounts are not associated account PDA
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [tokenAddress]
   * @returns {(TokenAccountInfo | undefined)}
   * @memberof AssociatedToken
   */
  static useAux(provider?: Provider, tokenAddress?: PublicKey): TokenAccountInfo | undefined {
    const [tokenAccount, setTokenAccount] = useState<TokenAccount | undefined>()

    useEffect(() => {
      let abort = false

      if (!tokenAddress || !provider) {
        setTokenAccount(undefined)
        return
      }

      provider.connection.getAccountInfo(tokenAddress).then(info => {
        if (abort) {
          return
        }
        if (!info) {
          setTokenAccount(undefined)
          return
        }
        const tokenAccount = parseTokenAccount(info.data, tokenAddress)
        setTokenAccount(tokenAccount)
      })

      return () => {
        abort = true
      }
    }, [tokenAddress, provider?.connection])

    return tokenAccount
  }

  /**
   * Use an associated token account
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [mint]
   * @param {(PublicKey | null)} [owner]
   * @returns {(TokenAccountInfo | undefined)}
   * @memberof AssociatedToken
   */
  static use(provider?: Provider, mint?: PublicKey, owner?: PublicKey | null): TokenAccountInfo | undefined {
    const tokenAddress = this.useAddress(mint, owner)
    const tokenAccount = this.useAux(provider, tokenAddress)
    return tokenAccount
  }

  /**
   * Use a specified token mint.
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [address]
   * @returns {(MintInfo | undefined)}
   * @memberof AssociatedToken
   */
  static useMint(provider?: Provider, address?: PublicKey): MintInfo | undefined {
    const [mint, setMint] = useState<MintInfo | undefined>()

    useEffect(() => {
      let abort = false

      if (!address || !provider) {
        setMint(undefined)
        return
      }

      AssociatedToken.loadMint(provider, address).then(newMint => !abort && setMint(newMint))

      return () => {
        abort = true
      }
    })

    return mint
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Provider} provider
   * @param {PublicKey} owner
   * @param {PublicKey} mint
   * @returns {Promise<PublicKey>}
   * @memberof AssociatedToken
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    const tokenAddress = await this.derive(mint, owner)
    const tokenAccount = await this.load(provider, mint, owner)
    if (!tokenAccount) {
      const ix = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        tokenAddress,
        owner,
        provider.wallet.publicKey
      )
      instructions.push(ix)
    }
    return tokenAddress
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {PublicKey} owner
   * @param {PublicKey} mint
   * @param {PublicKey} rentDestination
   * @param {Signer[]} [multiSigner=[]]
   * @memberof AssociatedToken
   */
  static async withClose(
    instructions: TransactionInstruction[],
    owner: PublicKey,
    mint: PublicKey,
    rentDestination: PublicKey,
    multiSigner: Signer[] = []
  ) {
    const tokenAddress = await this.derive(mint, owner)
    const ix = Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, tokenAddress, rentDestination, owner, multiSigner)
    instructions.push(ix)
  }
}
