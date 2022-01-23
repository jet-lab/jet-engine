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
   *
   * @param mint Token mint account
   * @param owner Owner of the new account
   * @return Public key of the associated token account
   */
  static async derive(mint: PublicKey, owner: PublicKey) {
    const [address] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    return address
  }

  static async load(provider: Provider, mint: PublicKey, owner: PublicKey) {
    const tokenAccount = await this.derive(mint, owner)
    const account = await provider.connection.getAccountInfo(tokenAccount)
    if (!account) {
      return undefined
    }
    const info = parseTokenAccount(account.data, tokenAccount)
    return new AssociatedToken(tokenAccount, account, info)
  }

  static async loadMint(provider: Provider, mint: PublicKey) {
    const mintInfo = await provider.connection.getAccountInfo(mint)
    if (!mintInfo) {
      return undefined
    }
    return parseMintAccount(mintInfo.data)
  }

  constructor(public address: PublicKey, public account: AccountInfo<Buffer>, public info: TokenAccountInfo) {
    return
  }

  /** Use an associated token account address */
  static useAddress(mint: PublicKey | undefined, owner: PublicKey | undefined | null) {
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

  /** Use an aux token account by address. Aux token accounts are not associated account PDA */
  static useAux(provider: Provider | undefined, tokenAddress: PublicKey | undefined) {
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

  /** Use an associated token account */
  static use(provider: Provider | undefined, mint: PublicKey | undefined, owner: PublicKey | undefined | null) {
    const tokenAddress = this.useAddress(mint, owner)
    const tokenAccount = this.useAux(provider, tokenAddress)
    return tokenAccount
  }

  static useMint(provider: Provider | undefined, address: PublicKey | undefined) {
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

  static async withCreate(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey
  ) {
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
