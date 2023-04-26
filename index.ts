import * as crypto from 'node:crypto'

class Transaction {
  constructor(
    public amount: number,
    public payer: string, // public key
    public payee: string // public key
  ) {}

  toString() {
    return JSON.stringify(this)
  }
}

class Block {
  public nonce = Math.round(Math.random() * 999999999)

  constructor(
    public prevHash: string, // Previous block hash
    public transaction: Transaction,
    public ts = Date.now()
  ) {}

  get hash() {
    const str = JSON.stringify(this)

    const hash = crypto.createHash('sha256')
    hash.update(str).end()

    return hash.digest('hex')
  }
}

class Chain {
  static instance = new Chain()

  private chain: Block[]

  private constructor() {
    this.chain = [new Block('', new Transaction(100, 'genesis', 'satoshi'))]
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1]
  }

  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const verifier = crypto.createVerify('sha256')
    verifier.update(transaction.toString())

    const isVerified = verifier.verify(senderPublicKey, signature)

    if (isVerified) {
      const newBlock = new Block(this.lastBlock.hash, transaction)
      this.mine(newBlock.nonce)
      this.chain.push(newBlock)
    }
  }

  mine(nonce: number) {
    let solution = 1

    console.log('⛏️ mining...')

    while (true) {
      const hash = crypto.createHash('md5')
      hash.update((nonce + solution).toString()).end()

      const attempt = hash.digest('hex')

      if (attempt.substring(0, 4) === '0000') {
        console.log(`Solved: ${solution}`)
        return solution
      }

      solution += 1
    }
  }
}

class Wallet {
  publicKey: string
  privateKey: string

  constructor() {
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      }
    })

    this.privateKey = keypair.privateKey
    this.publicKey = keypair.publicKey
  }

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey)

    const signer = crypto.createSign('sha256')
    signer.update(transaction.toString()).end()

    const signature = signer.sign(this.privateKey)

    Chain.instance.addBlock(transaction, this.publicKey, signature)
  }
}

const satoshi = new Wallet()
const bob = new Wallet()
const alice = new Wallet()

satoshi.sendMoney(50, bob.publicKey)
bob.sendMoney(23, alice.publicKey)
alice.sendMoney(5, satoshi.publicKey)

console.log(JSON.stringify(Chain.instance, null, 2))