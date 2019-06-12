# paperwallet
Paper wallets to seed the [Burner Wallet](https://github.com/austintgriffith/burner-wallet) with private keys.

![paperwallets](https://user-images.githubusercontent.com/2653167/51704894-6c7be780-1fd7-11e9-8bf9-09d9a55f6943.jpg)

# install
```javascript
git clone https://github.com/austintgriffith/paper-wallet
cd paper-wallet
npm i
```

# run
```javascript
node index.js
```

```
Usage: index [options]

Generate printable paper wallets

Options:
  -v                        output the version number
  -n <total>                Total number of paper wallets to generate
  --url <url>               Base URL where the wallet dApp is deployed. (Default: https://burnerwallet.io)
  -t --template <template>  Template file to be use as background. (Default: cspaperwallet.jpg)
  -p, --print               Generate a unique print-ready PDF from generated paper wallets
  --width <width>           Paper wallet width
  --height <height>         Paper wallet height
  -h, --help                output usage information
```

This will generate a directory with files called `generated-{i}.html` that can be printed. Wallet addresses are appended into `addresses-*.txt`

You could also just print out `private-{i}.svg` if you are in a pinch.

## Example

1. Generate five paper wallets

```javascript
node index.js -n 5
```

2. Get a printer-ready PDF

```javascript
node index.js -p
```

If you would like me to generate you a special wallet design `cspaperwallet.jpg` hit me up on Twitter or Telegram @austingriffith

![walletsinfold](https://user-images.githubusercontent.com/2653167/51705218-3ab75080-1fd8-11e9-9495-66458938d9f9.jpg)

# air dropping

You will need a distribution account. I would suggest using a mnemonic you can remember in the Burner Wallet and then copy the private key the wallet generates.

You will then pass this private key into the airdrop script within the command you run it with or in a `.env` file:

```
echo "SENDING_PK=0xdeadbeef" > .env
```

In case a custom token is deployed, you may also need to update the ERC20 token contract ABI and deployed address in `contracts/Burner.abi` and `contracts/Burner.address` respectively.

Then, you can execute the airdrop command:

```javascript
node airdrop.js
```

```
Usage: airdrop [options]

Airdrop some xDAI and ERC20 tokens to wallet accounts listed on addresses.txt

Options:
  -v                         output the version number
  -c, --check                Check current wallet balances. (Default: false)
  -dr, --dry-run             Execute airdrop simulation. (Default: false)
  -t, --test                 Sends small dust amounts instead of the real airdrop amount. (Default: false)
  -p, --provider <provider>  Network RPC URL. (Default: https://dai.poa.network)
  --xdai <xdai_amount>       Amount of xDAI to airdrop to each account. (Default: 0.01)
  --erc20 <erc20_amount>     Amount of ERC-20 tokens to airdrop to each account. (Default: 10)
  -h, --help                 output usage information
```

If this account has the necessary funds, it will drop whatever you specify in the `--erc20` and `--xdai` to all `accounts` listed in your `addresses.txt` file

Use the config options like `--check`, `--dry-run`, `--test` for more control and testing.

![walletcutting](https://user-images.githubusercontent.com/2653167/51705234-4440b880-1fd8-11e9-93ed-93338376cfdc.jpg)
