import { BN, web3 } from '@project-serum/anchor'
import { TokenAmount } from '../src/user'
import { DerivedAccount } from '../src/client'

describe('TokenAmount', () => {
  let t: TokenAmount

  test('properly instantiates', () => {
    t = new TokenAmount(web3.PublicKey.default, new BN(10))
  })

  test('sets the proper mint address', () => {
    expect(t.mint.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test('sets the correct token amount', () => {
    expect(t.amount.toNumber()).toStrictEqual(10)
  })
})

describe('DerivedAccount', () => {
  let d: DerivedAccount

  test('properly instantiates', () => {
    d = new DerivedAccount(web3.PublicKey.default, 200)
  })

  test('sets the proper public key', () => {
    expect(d.address.equals(web3.PublicKey.default)).toBeTruthy()
  })

  test('sets the correct bump seed', () => {
    expect(d.bumpSeed).toStrictEqual(200)
  })
})
