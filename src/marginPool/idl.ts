export type JetMarginPoolIdl = {
  version: "0.1.0"
  name: "jet_margin_pool"
  instructions: [
    {
      name: "createPool"
      accounts: [
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "loanNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "pythProduct"
          isMut: false
          isSigner: false
        },
        {
          name: "pythPrice"
          isMut: false
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "params"
          type: {
            defined: "CreatePoolParams"
          }
        }
      ]
    },
    {
      name: "collect"
      accounts: [
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "feeDestination"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "deposit"
      accounts: [
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "depositor"
          isMut: false
          isSigner: true
        },
        {
          name: "source"
          isMut: true
          isSigner: false
        },
        {
          name: "destination"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw"
      accounts: [
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "depositor"
          isMut: false
          isSigner: true
        },
        {
          name: "source"
          isMut: true
          isSigner: false
        },
        {
          name: "destination"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            defined: "Amount"
          }
        }
      ]
    },
    {
      name: "marginBorrow"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: true
        },
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "loanNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "depositAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: "u64"
        }
      ]
    },
    {
      name: "marginRepay"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: true
        },
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "loanNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "depositAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            defined: "Amount"
          }
        }
      ]
    },
    {
      name: "marginWithdraw"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: true
        },
        {
          name: "marginPool"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "depositNoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "source"
          isMut: true
          isSigner: false
        },
        {
          name: "destination"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            defined: "Amount"
          }
        }
      ]
    },
    {
      name: "marginRefreshPosition"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: true
        },
        {
          name: "marginPool"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenPriceOracle"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "marginPool"
      type: {
        kind: "struct"
        fields: [
          {
            name: "version"
            type: "u8"
          },
          {
            name: "poolBump"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "vault"
            type: "publicKey"
          },
          {
            name: "feeDestination"
            type: "publicKey"
          },
          {
            name: "depositNoteMint"
            type: "publicKey"
          },
          {
            name: "loanNoteMint"
            type: "publicKey"
          },
          {
            name: "tokenMint"
            type: "publicKey"
          },
          {
            name: "tokenPriceOracle"
            type: "publicKey"
          },
          {
            name: "address"
            type: "publicKey"
          },
          {
            name: "config"
            type: {
              defined: "MarginPoolConfig"
            }
          },
          {
            name: "borrowedTokens"
            type: {
              array: ["u8", 24]
            }
          },
          {
            name: "uncollectedFees"
            type: {
              array: ["u8", 24]
            }
          },
          {
            name: "depositTokens"
            type: "u64"
          },
          {
            name: "depositNotes"
            type: "u64"
          },
          {
            name: "loanNotes"
            type: "u64"
          },
          {
            name: "accruedUntil"
            type: {
              defined: "UnixTimestamp"
            }
          }
        ]
      }
    },
    {
      name: "marginPoolOracle"
      type: {
        kind: "struct"
        fields: [
          {
            name: "tokenMint"
            type: "publicKey"
          },
          {
            name: "price"
            type: {
              array: ["u8", 24]
            }
          },
          {
            name: "priceLower"
            type: {
              array: ["u8", 24]
            }
          },
          {
            name: "priceUpper"
            type: {
              array: ["u8", 24]
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "Amount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "kind"
            type: {
              defined: "AmountKind"
            }
          },
          {
            name: "value"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "CreatePoolParams"
      type: {
        kind: "struct"
        fields: [
          {
            name: "feeDestination"
            type: "publicKey"
          },
          {
            name: "config"
            type: {
              defined: "MarginPoolConfig"
            }
          }
        ]
      }
    },
    {
      name: "MarginPoolConfig"
      type: {
        kind: "struct"
        fields: [
          {
            name: "flags"
            type: "u64"
          },
          {
            name: "utilizationRate1"
            type: "u16"
          },
          {
            name: "utilizationRate2"
            type: "u16"
          },
          {
            name: "borrowRate0"
            type: "u16"
          },
          {
            name: "borrowRate1"
            type: "u16"
          },
          {
            name: "borrowRate2"
            type: "u16"
          },
          {
            name: "borrowRate3"
            type: "u16"
          },
          {
            name: "managementFeeRate"
            type: "u16"
          },
          {
            name: "managementFeeCollectThreshold"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "AmountKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "Tokens"
          },
          {
            name: "Notes"
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 141100
      name: "Disabled"
      msg: "The pool is currently disabled"
    },
    {
      code: 141101
      name: "InterestAccrualBehind"
      msg: "Interest accrual is too far behind"
    },
    {
      code: 141102
      name: "DepositsOnly"
      msg: "The pool currently only allows deposits"
    },
    {
      code: 141103
      name: "InsufficientLiquidity"
      msg: "The pool does not have sufficient liquidity for the transaction"
    }
  ]
}
