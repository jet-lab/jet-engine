<div align="center">
  <h1>@jet-lab/jet-engine</h1>

  [![Version](https://img.shields.io/npm/v/@jet-lab/jet-engine?color=red)](https://www.npmjs.com/package/@jet-lab/jet-engine)
  [![Docs](https://img.shields.io/badge/doc-typedocs-success)](https://jet-lab.github.io/jet-engine/)
  [![Discord](https://img.shields.io/discord/833805114602291200?color=blueviolet)](https://discord.gg/RW2hsqwfej)
  [![License](https://img.shields.io/github/license/jet-lab/jet-engine?color=blue)](./LICENSE)
</div>

## Install

Add the package as a dependency to your project:

```bash
$ npm i @jet-lab/jet-engine
```

...or with `yarn`

```bash
$ yarn add @jet-lab/jet-engine
```

## Usage

> View the [typedocs](https://jet-lab.github.io/jet-engine/) for the full package documentation and available API.

### Instantiate the Client

```ts
import { JetClient } from '@jet-lab/jet-engine'
import { Provider, Wallet } from '@project-serum/anchor'
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js'

const provider = new Provider(new Connection(clusterApiUrl('devnet')), new Wallet(Keypair.generate()), {})
const client = await JetClient.connect(provider, true)
```
## Examples

> [Fetching a position](https://github.com/jet-lab/jet-engine/blob/master/examples/user_position.ts)

## Contributors ❤️

<div align="center">
  <a href="https://github.com/jet-lab/jet-engine/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=jet-lab/jet-engine" />
  </a>
</div>

