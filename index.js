var Web3 = require('web3')
var qr = require('qr-image')
let base64url = require('base64url')
var fs = require('fs')
var path = require('path')
var pdf = require('html-pdf')
var program = require('commander')

program
  .version('0.0.1', '-v', '--version')
  .description('Generate printable paper wallets')
  .option('-n <total>', 'Total number of paper wallets to generate')
  .option('--url <url>', 'Base URL where the wallet dApp is deployed. (Default: https://burnerwallet.io)')
  .option('-t --template <template>', 'Template file to be use as background. (Default: cspaperwallet.jpg)')
  .option('-p, --print', 'Generate unique PDF from generated paper wallets')
  .option('--width <width>', 'Paper wallet width')
  .option('--height <height>', 'Paper wallet height')
  .parse(process.argv)

const TO_PRINT = program.N || 1
const WALLET = 'burn'
const URL = program.url || 'https://burnerwallet.io'
const BACKGROUND = program.template || 'cspaperwallet.jpg'
const COMPRESS = true
const AUTOPRINT = false
const MINEFOR = false// "feeddeadbeef"
var web3 = new Web3()

function generatePaperWallet (id, publicAddress) {
  fs.readFile('template.html', 'utf8', (err, data) => {
    if (err) {
      return console.log(err)
    }
    let result = data.replace(/\*\*PUBLIC\*\*/g, publicAddress)
    result = result.replace(/\*\*ID\*\*/g, id)
    result = result.replace(/\*\*BACKGROUND\*\*/g, BACKGROUND)
    fs.writeFile(`${WALLET}/generated-${id}.html`, result, 'utf8', (err) => {
      if (err) return console.log(err)
      fs.appendFile(`addresses.txt`, publicAddress + '\n', (err) => {
        if (err) throw err
      })
    })
  })
}

function pkToUrl (pk) {
  return base64url(web3.utils.hexToBytes(pk))
}

if (!fs.existsSync(WALLET)) {
  fs.mkdirSync(WALLET)
  // fs.copyFile(BACKGROUND).pipe(fs.createWriteStream(`${WALLET}/${BACKGROUND}`))
  fs.copyFile(BACKGROUND, `${WALLET}/${BACKGROUND}`, (err) => {
    if (err) throw err
  })
}

if (program.print) {
  const PRINTER_OPTIONS = {
    base: `file://${path.join(__dirname, WALLET)}/`
  }

  if (program.width) PRINTER_OPTIONS.width = program.width
  if (program.height) PRINTER_OPTIONS.height = program.height

  let files = fs.readdirSync(WALLET).filter(el => /\.html$/.test(el))
  if (files.length === 0) {
    console.log('No paper wallets have been found')
    process.exit(0)
  }

  console.log('\nGenerating printer-ready PDFs...\n')
  files.forEach(file => {
    let html = fs.readFileSync(`${WALLET}/${file}`, 'utf8')

    pdf.create(html, PRINTER_OPTIONS).toStream((err, stream) => {
      if (err) throw err
      else {
        stream.pipe(fs.createWriteStream(`${WALLET}/${file.replace('html', 'pdf')}`))
      }
    })
  })

  var thread
  thread = setInterval(() => {
    let pdfs = fs.readdirSync(WALLET).filter(el => /\.pdf$/.test(el))
    if (pdfs.length < files.length) {
      console.log('Generating PDF files...')
    } else {
      clearInterval(thread)
      var pdfmerge = require('easy-pdf-merge')
      let pdfs = fs.readdirSync(WALLET).filter(el => /\.pdf$/.test(el)).map(el => `${WALLET}/${el}`)
      pdfmerge(pdfs, `${WALLET}/printer-ready.pdf`, (err) => {
        if (err) throw err
        console.log(`Find printer-ready PDF file at ${WALLET}/printer-ready.pdf\nDone.`)
      })
    }
  }, 1000)
} else {
  for (var i = 0; i < TO_PRINT; i++) {
    let result = ''
    if (MINEFOR) {
      while (!result.address || result.address.toLowerCase().indexOf('0x' + MINEFOR) !== 0) {
        result = web3.eth.accounts.create()
        // console.log(result.address)
      }
    } else {
      result = web3.eth.accounts.create()
    }

    let PK = result.privateKey
    let pkLink
    if (COMPRESS) {
      let encoded = pkToUrl(PK)
      pkLink = URL + '/pk#' + encoded
    } else {
      pkLink = URL + '/pk#' + PK.replace('0x', '')
    }

    let privateKeyQR = qr.image(pkLink, { type: 'svg' })
    privateKeyQR.pipe(fs.createWriteStream(`${WALLET}/private-${i}.svg`))

    let publicAddress = result.address

    let publicKeyQR = qr.image(URL + '/' + publicAddress, { type: 'svg' })
    publicKeyQR.pipe(fs.createWriteStream(`${WALLET}/public-${i}.svg`))
    // console.log("public.svg"+URL+"/"+publicAddress)

    console.log(i, publicAddress)
    try {
      generatePaperWallet(i, publicAddress)
    } catch (err) {
      console.log(err)
    }
  }
}
