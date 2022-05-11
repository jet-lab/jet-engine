export type MarginIdl = {
  version: "0.1.0"
  name: "jet_margin"
  constants: [
    {
      name: "MIN_COLLATERAL_RATIO"
      type: "u16"
      value: "125_00"
    },
    {
      name: "IDEAL_LIQUIDATION_COLLATERAL_RATIO"
      type: "u16"
      value: "130_00"
    },
    {
      name: "MAX_LIQUIDATION_COLLATERAL_RATIO"
      type: "u16"
      value: "150_00"
    },
    {
      name: "MAX_ORACLE_CONFIDENCE"
      type: "u16"
      value: "5_00"
    },
    {
      name: "MAX_PRICE_QUOTE_AGE"
      type: "u64"
      value: "10"
    },
    {
      name: "MAX_LIQUIDATION_VALUE_SLIPPAGE"
      type: "u16"
      value: "5_00"
    },
    {
      name: "MAX_LIQUIDATION_C_RATIO_SLIPPAGE"
      type: "u16"
      value: "5_00"
    },
    {
      name: "LIQUIDATION_TIMEOUT"
      type: {
        defined: "UnixTimestamp"
      }
      value: "60"
    }
  ]
  instructions: [
    {
      name: "createAccount"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "seed"
          type: "u16"
        }
      ]
    },
    {
      name: "closeAccount"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "registerPosition"
      accounts: [
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
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "positionTokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "updatePositionBalance"
      accounts: [
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "closePosition"
      accounts: [
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenAccount"
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
      name: "verifyHealthy"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "adapterInvoke"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "adapterProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterMetadata"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "accountMetas"
          type: {
            vec: {
              defined: "CompactAccountMeta"
            }
          }
        },
        {
          name: "data"
          type: "bytes"
        }
      ]
    },
    {
      name: "liquidateBegin"
      accounts: [
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "liquidator"
          isMut: false
          isSigner: true
        },
        {
          name: "liquidatorMetadata"
          isMut: false
          isSigner: false
        },
        {
          name: "liquidation"
          isMut: true
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "liquidateEnd"
      accounts: [
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "liquidation"
          isMut: true
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "liquidatorInvoke"
      accounts: [
        {
          name: "liquidator"
          isMut: false
          isSigner: true
        },
        {
          name: "liquidation"
          isMut: true
          isSigner: false
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "adapterProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterMetadata"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "accountMetas"
          type: {
            vec: {
              defined: "CompactAccountMeta"
            }
          }
        },
        {
          name: "data"
          type: "bytes"
        }
      ]
    }
  ]
  accounts: [
    {
      name: "marginAccount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "version"
            type: "u8"
          },
          {
            name: "bumpSeed"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "userSeed"
            type: {
              array: ["u8", 2]
            }
          },
          {
            name: "reserved0"
            type: {
              array: ["u8", 4]
            }
          },
          {
            name: "owner"
            type: "publicKey"
          },
          {
            name: "liquidation"
            type: "publicKey"
          },
          {
            name: "liquidator"
            type: "publicKey"
          },
          {
            name: "positions"
            type: {
              array: ["u8", 7432]
            }
          }
        ]
      }
    },
    {
      name: "liquidation"
      type: {
        kind: "struct"
        fields: [
          {
            name: "startTime"
            type: {
              defined: "UnixTimestamp"
            }
          },
          {
            name: "valueChange"
            type: {
              defined: "Number128"
            }
          },
          {
            name: "cRatioChange"
            type: {
              defined: "Number128"
            }
          },
          {
            name: "minValueChange"
            type: {
              defined: "Number128"
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "CompactAccountMeta"
      type: {
        kind: "struct"
        fields: [
          {
            name: "isSigner"
            type: "u8"
          },
          {
            name: "isWritable"
            type: "u8"
          }
        ]
      }
    },
    {
      name: "PriceChangeInfo"
      type: {
        kind: "struct"
        fields: [
          {
            name: "mint"
            type: "publicKey"
          },
          {
            name: "value"
            type: "i64"
          },
          {
            name: "confidence"
            type: "u64"
          },
          {
            name: "twap"
            type: "i64"
          },
          {
            name: "slot"
            type: "u64"
          },
          {
            name: "exponent"
            type: "i32"
          }
        ]
      }
    },
    {
      name: "PriceInfo"
      type: {
        kind: "struct"
        fields: [
          {
            name: "value"
            type: "i64"
          },
          {
            name: "timestamp"
            type: "u64"
          },
          {
            name: "exponent"
            type: "i32"
          },
          {
            name: "isValid"
            type: "u8"
          },
          {
            name: "reserved"
            type: {
              array: ["u8", 3]
            }
          }
        ]
      }
    },
    {
      name: "AdapterResult"
      type: {
        kind: "enum"
        variants: [
          {
            name: "BalanceChange"
            fields: [
              {
                vec: "publicKey"
              }
            ]
          },
          {
            name: "PriceChange"
            fields: [
              {
                vec: {
                  defined: "PriceChangeInfo"
                }
              }
            ]
          }
        ]
      }
    },
    {
      name: "PositionKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "NoValue"
          },
          {
            name: "Deposit"
          },
          {
            name: "Claim"
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 141000
      name: "NoAdapterResult"
    },
    {
      code: 141001
      name: "WrongProgramAdapterResult"
    },
    {
      code: 141010
      name: "MaxPositions"
      msg: "account cannot record any additional positions"
    },
    {
      code: 141011
      name: "UnknownPosition"
      msg: "account has no record of the position"
    },
    {
      code: 141012
      name: "CloseNonZeroPosition"
      msg: "attempting to close a position that has a balance"
    },
    {
      code: 141013
      name: "PositionAlreadyRegistered"
      msg: "attempting to register an existing position"
    },
    {
      code: 141014
      name: "AccountNotEmpty"
      msg: "attempting to close non-empty margin account"
    },
    {
      code: 141015
      name: "PositionNotOwned"
      msg: "attempting to use un-owned position"
    },
    {
      code: 141020
      name: "InvalidPriceAdapter"
      msg: "wrong adapter to provide the price"
    },
    {
      code: 141021
      name: "OutdatedPrice"
      msg: "a position price is outdated"
    },
    {
      code: 141022
      name: "InvalidPrice"
      msg: "an asset price is currently invalid"
    },
    {
      code: 141023
      name: "OutdatedBalance"
      msg: "a position balance is outdated"
    },
    {
      code: 141030
      name: "Unhealthy"
      msg: "the account is not healthy"
    },
    {
      code: 141031
      name: "Healthy"
      msg: "the account is already healthy"
    },
    {
      code: 141032
      name: "Liquidating"
      msg: "the account is being liquidated"
    },
    {
      code: 141033
      name: "NotLiquidating"
      msg: "the account is not being liquidated"
    },
    {
      code: 141034
      name: "StalePositions"
    },
    {
      code: 141035
      name: "UnauthorizedLiquidator"
      msg: "the liquidator does not have permission to do this"
    },
    {
      code: 141036
      name: "LiquidationLostValue"
      msg: "attempted to extract too much value during liquidation"
    },
    {
      code: 141037
      name: "LiquidationUnhealthy"
      msg: "reduced the c-ratio too far during liquidation"
    },
    {
      code: 141038
      name: "LiquidationTooHealthy"
      msg: "increased the c-ratio too high during liquidation"
    }
  ]
}
