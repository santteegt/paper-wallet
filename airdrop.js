//* **** WARNING *****//
// This code is pure garbage, and you will be sending potentially lots of cash with it.
// Use at your own risk and start with small verifying txs.
// TODO: Make this all better and incorporate clevis

const Web3 = require('web3')
const { BN, fromWei, toWei } = Web3.utils
require('dotenv').config()
const ethereumjsutil = require('ethereumjs-util')
const fs = require('fs')
const program = require('commander')

program
  .version('0.0.1', '-v', '--version')
  .description('Airdrop some xDAI and ERC20 tokens to wallet accounts listed on addresses.txt')
  .option('-c, --check', 'Check current wallet balances. (Default: false)')
  .option('-dr, --dry-run', 'Execute airdrop simulation. (Default: false)')
  .option('-t, --test', 'Sends small dust amounts instead of the real airdrop amount. (Default: false)')
  .option('-p, --provider <provider>', 'Network RPC URL. (Default: https://dai.poa.network)')
  .option('--xdai <xdai_amount>', 'Amount of xDAI to airdrop to each account. (Default: 0.01)')
  .option('--erc20 <erc20_amount>', 'Amount of ERC-20 tokens to airdrop to each account. (Default: 10)')
  .parse(process.argv)

const CONFIG = {
  justChecking: program.check || false, // True if you only want to check balances of all accounts
  dryRun: program.dryRun || false, // Tells you what it would do without actually sending any txs
  testRun: program.test || false, // Sends small dust amounts instead of the real airdrop amount
  provider: 'https://dai.poa.network',
  erc20ContractAddr: fs.readFileSync('./contracts/Burner.address').toString().trim(), // Contract addr for the ERC20 token. e.g. ERC20Vendable for the burner wallet
  erc20Abi: require('./contracts/Burner.abi'), // ERC20 contract ABI
  sendingPk: process.env.SENDING_PK,
  sendingAccount: '0x' + ethereumjsutil.privateToAddress(process.env.SENDING_PK).toString('hex'),
  erc20SendGas: 75034,
  xDaiSendGas: 21000,
  gasPrice: toWei('1', 'gwei')
}

// use this to debug CONFIG
// console.log(CONFIG)
// process.exit(1)

const AMOUNT_OF_BURN_TO_SEND = CONFIG.testRun ? toWei('1', 'wei') : toWei(program.xdai || '10', 'ether')
const AMOUNT_OF_XDAI_TO_SEND = CONFIG.testRun ? toWei('1', 'wei') : toWei(program.erc20 || '0.01', 'ether')

const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.provider))
let ERC20 = new web3.eth.Contract(CONFIG.erc20Abi, CONFIG.erc20ContractAddr)

function main () {
  let accounts = fs.readFileSync('./addresses.txt').toString().trim().split('\n')

  checkBalances(accounts)
  if (!CONFIG.justChecking) airDrop(accounts)
}

main()

async function airDrop (accounts) {
  if (CONFIG.sendingPk === undefined && CONFIG.dryRun === false) {
    console.log('Cannot airdrop without a PK. Please supply PK in env.SENDING_PK')
    process.exit(1)
  }

  if (CONFIG.testRun === true) {
    console.log('WARNING: You are in testRun=true mode. Only dust will be sent to accounts')
  }

  let hasFunds = await senderHasFunds(accounts.length)

  if (!hasFunds) {
    console.log('Sender did not have sufficient funds. Exiting')
    process.exit(1)
  }

  console.log(`Airdropping ${accounts.length} accounts`)

  let nonce = await web3.eth.getTransactionCount(CONFIG.sendingAccount)
  console.log('Nonce: ', nonce)

  for (let i = 0; i < accounts.length; i++) {
    console.log('AMOUNT_OF_BURN_TO_SEND: ', AMOUNT_OF_BURN_TO_SEND)
    console.log('AMOUNT_OF_XDAI_TO_SEND: ', AMOUNT_OF_XDAI_TO_SEND)

    await sendXDai(accounts[i], nonce++)
    await sendErc20(accounts[i], nonce++)
  }
}

function expectedGasCosts () {
  return new BN((CONFIG.xDaiSendGas + CONFIG.erc20SendGas) * CONFIG.gasPrice)
}

async function senderHasFunds (numAccounts) {
  let requiredXDai = (new BN(AMOUNT_OF_XDAI_TO_SEND).add(expectedGasCosts())) * numAccounts
  let requiredBurn = new BN(AMOUNT_OF_BURN_TO_SEND) * numAccounts

  console.log('requiredXDai: ', requiredXDai)
  console.log('requiredBurn: ', requiredBurn)

  let erc20Balance = await checkErc20Balance(CONFIG.sendingAccount)
  let balance = await web3.eth.getBalance(CONFIG.sendingAccount)

  console.log('erc20Balance: ', erc20Balance)
  console.log('balance: ', balance)

  return (balance >= requiredXDai && erc20Balance >= requiredBurn)
}

async function checkBalances (accounts) {
  console.log(`Checking balances of ${accounts.length} accounts`)

  for (let i = 0; i < accounts.length; i++) {
    let erc20Balance = await checkErc20Balance(accounts[i])
    let balance = await web3.eth.getBalance(accounts[i])

    // Enable this line if you only want to show those who don't have the correct amount air dropped on them.
    // if(fromWei(erc20Balance, 'ether') !== '10' || fromWei(balance, 'ether') !== '0.01') {
    if (true) {
      console.log(`${accounts[i]}:`)
      console.log(`  BURN: ${fromWei(erc20Balance, 'ether')}`)
      console.log(`  xDai: ${fromWei(balance, 'ether')}`)
    }
  }
}

function checkErc20Balance (account) {
  return ERC20.methods.balanceOf(account).call()
}

async function sendXDai (to, nonce) {
  let tx = {
    to: to,
    value: AMOUNT_OF_XDAI_TO_SEND,
    gas: CONFIG.xDaiSendGas,
    gasPrice: CONFIG.gasPrice,
    nonce: nonce
  }

  if (CONFIG.dryRun === false) {
    try {
      let signed = await web3.eth.accounts.signTransaction(tx, CONFIG.sendingPk)
      web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', console.log)
    } catch (e) {
      console.log(`Error trying to send xDAI to wallet {tx.to}`, e)
    }
  } else {
    console.log('Dry run enabled. Would have sent tx: ', tx)
  }
}

async function sendErc20 (to, nonce) {
  let data = ERC20.methods.transfer(to, AMOUNT_OF_BURN_TO_SEND).encodeABI()

  let tx = {
    to: CONFIG.erc20ContractAddr,
    gas: CONFIG.erc20SendGas,
    gasPrice: CONFIG.gasPrice,
    data: data,
    nonce: nonce
  }

  if (CONFIG.dryRun === false) {
    try {
      let signed = await web3.eth.accounts.signTransaction(tx, CONFIG.sendingPk)
      web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', console.log)
    } catch (e) {
      console.log(`Error trying to send ERC-20 tokens to wallet ${tx.to}`, e)
    }
  } else {
    console.log('Dry run enabled. Would have sent tx: ', tx)
  }
}
