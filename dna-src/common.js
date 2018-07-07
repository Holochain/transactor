'use strict'

/**
 * helper for printing debugging during development
 */
export function trace (...args) {
  debug('@@ [trace] ' + args.map((i) => JSON.stringify(i)).join(' '))
}

/**
 * Keep track of unit values (amounts)
 * We are going to store these on the chain as hex strings.
 * We will display these to users as decimal / 10^8
 */
export class UnitValue {
  /**
   * Make sure the hex string values of this amount is in the proper range
   */
  static validateStr (hexStr) {
    return /^-?[a-f0-9]{1,12}$/.test(hexStr)
  }

  /**
   * Build a new unit value with a default (or zero)
   */
  constructor (val) {
    if (val) {
      this._intval = UnitValue._getInt(val)
    } else {
      this._intval = 0
    }
  }

  /**
   * Set this unit value to a different value
   */
  set (oth) {
    this._intval = UnitValue._getInt(oth)
  }

  /**
   * Return the hex string representation of this amount
   */
  toString () {
    return this._intval.toString(16)
  }

  /**
   * Return a human-denominated decimal string (_intval / 10^8)
   */
  toDisplay () {
    return (this._intval / 100000000).toString()
  }

  /**
   * Return the javascript number value of this amount
   */
  toNumber () {
    return this._intval
  }

  /**
   * Return an api output representation of this unit value
   * Includes a string hex value ('system')
   * and a user unit denominated ('display')
   */
  toRepr () {
    return {
      system: this.toString(),
      display: this.toDisplay()
    }
  }

  /**
   * Add a value to this unitValue, return the result
   */
  add (oth) {
    return new UnitValue(this._intval + UnitValue._getInt(oth))
  }

  /**
   * Subtract a value from this unitValue, return the result
   */
  sub (oth) {
    return new UnitValue(this._intval - UnitValue._getInt(oth))
  }

  /**
   * Multiply a value with this unitValue, return the result
   */
  mul (oth) {
    return new UnitValue(parseInt(this._intval * UnitValue._getNumRaw(oth)))
  }

  /**
   * Divide this unitValue by a value, return the result
   */
  div (oth) {
    return new UnitValue(parseInt(this._intval / UnitValue._getNumRaw(oth)))
  }

  /**
   * Return the absolute value of this unit value
   */
  abs () {
    return new UnitValue(Math.abs(this._intval))
  }

  /**
   * Returns `true` if this UnitValue is > oth
   */
  gt (oth) {
    return this._intval > UnitValue._getInt(oth)
  }

  /**
   * Returns `true` if this UnitValue is < oth
   */
  lt (oth) {
    return this._intval < UnitValue._getInt(oth)
  }

  // -- "private" -- //

  /**
   * parse various types into a javascript number
   */
  static _getInt (oth) {
    if (oth instanceof UnitValue) {
      return oth._intval
    } else if (typeof oth === 'string') {
      if (!UnitValue.validateStr(oth)) {
        throw new Error('bad hex unit-value representation')
      }
      return parseInt(oth, 16)
    } else if (typeof oth === 'number') {
      const numInt = parseInt(oth)
      if (numInt !== oth) {
        throw new Error('number has sub-integer component')
      }
      const tmp = numInt.toString(16)
      if (!UnitValue.validateStr(tmp)) {
        throw new Error('bad hex unit-value representation')
      }
      return numInt
    } else {
      throw new Error('bad type for arithmetic')
    }
  }

  /**
   * parse various types into a javascript number - don't validate
   */
  static _getNumRaw (oth) {
    if (oth instanceof UnitValue) {
      return oth._intval
    } else if (typeof oth === 'string') {
      return parseInt(oth, 16)
    } else if (typeof oth === 'number') {
      return parseFloat(oth)
    } else {
      throw new Error('bad type for arithmetic')
    }
  }
}

/**
 * Get the hash of the current identity
 */
export function getMe () {
  return App.Key.Hash
}

/**
 * For exported functions that take an amount as input
 */
export function validateHexAmount (amount) {
  if (typeof amount !== 'string') {
    throw new Error('"amount" must be a hexidecimal string')
  }
  return (new UnitValue(amount)).toString()
}

/*
export function getCreditLimit () {
  // TODO - algorithm based on usage
  return new UnitValue(500)
}
*/

/**
 * The maximum amount that can be moved in a single transaction
 */
export function getMaxTransactionAmount () {
  return new UnitValue(property('maxTransactionAmount'))
}

/**
 * The maximum transaction fee the user can build up before
 * having to remit to the holo organization.
 */
export function getMaxTransactionFee () {
  return new UnitValue(property('maxTransactionFee'))
}

/**
 * The factor for calculating owed transaction fee.
 */
export function getTransactionFeeFactor () {
  return parseFloat(property('transactionFeeFactor'))
}

/**
 * was the result an error?
 */
export function isErr (result) {
  return ((typeof result === 'object') && result.name === 'HolochainError')
}

/**
 * Apparently, holochain-proto returns various time formats : /
 * worse... not all of them are parse-able by javascript.
 * Convert the non-parsable one into something that parses.
 */
export function fixTime (t) {
  let out = null

  const m = t.match(/(\d{4})-(\d{2})-(\d{2})\s*(\d{2}):(\d{2}):(\d{2})(?:\.\d+)*\s*([+-])(\d{2})(\d{2})/)
  if (m && m.length === 10) {
    out = (new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}${m[8]}:${m[9]}`)).getTime()
  }
  if (!out) {
    out = (new Date(t)).getTime()
  }
  if (!out) {
    throw new Error('could not parse time value: ' + t)
  }
  return out
}

/**
 */
export function listLocal () {
  const thisHash = getMe()
  const txList = []

  for (let entry of query({
    Constrain: {
      EntryTypes: [
        'alphaRecipientInit',
        'alphaSpenderAccept',
        'betaSpenderInit',
        'betaRecipientAccept'
      ]
    },
    Return: {
      Hashes: true,
      Entries: true,
      Headers: true
    }
  })) {
    switch (entry.Header.Type) {
      case 'alphaRecipientInit':
      {
        if (entry.Entry.recipient !== thisHash) {
          continue
        }

        const links = getLinks(entry.Hash, 'notify', { Load: true })

        for (let item of links) {
          switch (item.EntryType) {
            case 'alphaSpenderAccept':
              const tx = {
                type: 'recipient',
                time: fixTime(entry.Header.Time),
                amount: new UnitValue(entry.Entry.amount),
                spender: entry.Entry.spender
              }
              if (entry.Entry.notes) {
                tx.notes = entry.Entry.notes
              }
              txList.push(tx)
          }
        }

        break
      }
      case 'alphaSpenderAccept':
      {
        if (entry.Entry.spender !== thisHash) {
          continue
        }

        const tx = {
          type: 'spender',
          time: fixTime(entry.Header.Time),
          amount: new UnitValue(entry.Entry.amount),
          recipient: entry.Entry.recipient
        }
        if (entry.Entry.notes) {
          tx.notes = entry.Entry.notes
        }
        txList.push(tx)
        break
      }
      case 'betaSpenderInit':
      {
        if (entry.Entry.spender !== thisHash) {
          continue
        }

        const links = getLinks(entry.Hash, 'notify', { Load: true })

        for (let item of links) {
          switch (item.EntryType) {
            case 'betaRecipientReject':
              continue
            case 'betaSpenderWithdraw':
              continue
          }
        }

        const tx = {
          type: 'spender',
          time: fixTime(entry.Header.Time),
          amount: new UnitValue(entry.Entry.amount),
          recipient: entry.Entry.recipient
        }
        if (entry.Entry.notes) {
          tx.notes = entry.Entry.notes
        }
        txList.push(tx)

        break
      }
      case 'betaRecipientAccept':
      {
        if (entry.Entry.recipient !== thisHash) {
          continue
        }

        const tx = {
          type: 'recipient',
          time: fixTime(entry.Header.Time),
          amount: new UnitValue(entry.Entry.amount),
          spender: entry.Entry.spender
        }
        if (entry.Entry.notes) {
          tx.notes = entry.Entry.notes
        }
        txList.push(tx)
        break
      }
    }
  }

  return txList
}

/**
 */
export function validateLedgerState (txList) {
  trace('validateLedgerState', txList)
  let balance = new UnitValue(0)
  let txFeeOwed = new UnitValue(0)

  let curCreditLimit = new UnitValue('ba43b7400')
  const maxTx = getMaxTransactionAmount()
  // const maxFee = getMaxTransactionFee()
  const txFeeFactor = getTransactionFeeFactor()

  const validateNow = () => {
    if (balance.gt(curCreditLimit)) {
      throw new Error('over credit limit')
    }
    // TODO - see if we are over the transaction fee limit
    //      - ... once we can actually pay transaction fees
  }

  const checkDelta = (tx) => {
    if (tx.amount.abs().gt(maxTx)) {
      throw new Error('over max transaction amount')
    }

    // TODO - set the credit limit for this point in history
    curCreditLimit = new UnitValue('ba43b7400')

    switch (tx.type) {
      case 'spender':
        balance = balance.sub(tx.amount)
        txFeeOwed = txFeeOwed.add(tx.amount.mul(txFeeFactor))
        break
      case 'recipient':
        balance = balance.add(tx.amount)
        break
      default:
        throw new Error('unrecognized tx.type: ' + tx.type)
    }

    validateNow()
  }

  txList.map(checkDelta)

  return {
    balance,
    txFeeOwed
  }
}

/**
 * Get the current balance of the local identity
 */
export function getLedgerState () {
  return validateLedgerState(listLocal())
}
