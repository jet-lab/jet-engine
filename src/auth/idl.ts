export type AuthIdl = {
  version: "1.0.0"
  name: "jet_auth"
  instructions: [
    {
      name: "createUserAuth"
      accounts: [
        {
          name: "user"
          isMut: false
          isSigner: true
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "auth"
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
      name: "authenticate"
      accounts: [
        {
          name: "auth"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "authority"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "userAuthentication"
      type: {
        kind: "struct"
        fields: [
          {
            name: "owner"
            type: "publicKey"
          },
          {
            name: "complete"
            type: "bool"
          },
          {
            name: "allowed"
            type: "bool"
          }
        ]
      }
    }
  ]
  events: [
    {
      name: "AuthAccountCreated"
      fields: [
        {
          name: "user"
          type: "publicKey"
          index: false
        }
      ]
    },
    {
      name: "Authenticated"
      fields: [
        {
          name: "user"
          type: "publicKey"
          index: false
        }
      ]
    }
  ]
}

export const IDL: AuthIdl = {
  version: "1.0.0",
  name: "jet_auth",
  instructions: [
    {
      name: "createUserAuth",
      accounts: [
        {
          name: "user",
          isMut: false,
          isSigner: true
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true
        },
        {
          name: "auth",
          isMut: true,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "authenticate",
      accounts: [
        {
          name: "auth",
          isMut: true,
          isSigner: false
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true
        },
        {
          name: "authority",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "userAuthentication",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "complete",
            type: "bool"
          },
          {
            name: "allowed",
            type: "bool"
          }
        ]
      }
    }
  ],
  events: [
    {
      name: "AuthAccountCreated",
      fields: [
        {
          name: "user",
          type: "publicKey",
          index: false
        }
      ]
    },
    {
      name: "Authenticated",
      fields: [
        {
          name: "user",
          type: "publicKey",
          index: false
        }
      ]
    }
  ]
}
