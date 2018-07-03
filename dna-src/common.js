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
   * Return the javascript number value of this amount
   */
  toNumber () {
    return this._intval
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
    return new UnitValue(parseInt(this._intval * UnitValue._getInt(oth)))
  }

  /**
   * Divide this unitValue by a value, return the result
   */
  div (oth) {
    return new UnitValue(parseInt(this._intval / UnitValue._getInt(oth)))
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
}

/**
 * Get the hash of the current identity
 */
export function getMe () {
  return App.Key.Hash
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
 * was the result an error?
 */
export function isErr (result) {
  return ((typeof result === 'object') && result.name === 'HolochainError')
}

/**
 * Check through a full history of amount deltas,
 * checking validation rules along the way.
 *
 * @param {array<object>} deltas - the "deltas"
 *        - these should include {
 *          amount: UnitValue,
 *          time: utc-epoch-millis, time of transaction
 *        }
 *
 * Throws an error if validation rules are not satisfied
 * otherwise
 * @return {UnitValue} the current balance of the account
 */
export function validateHistoryDeltas (deltas) {
  trace('validateHistoryDeltas', deltas)
  let balance = new UnitValue(0)

  let curCreditLimit = new UnitValue(500)
  const maxTx = getMaxTransactionAmount()
  // const maxFee = getMaxTransactionFee()

  const validateNow = () => {
    if (balance.gt(curCreditLimit)) {
      throw new Error('over credit limit')
    }
    // TODO - see if we are over the transaction fee limit
    //      - ... once we can actually pay transaction fees
  }

  const checkDelta = (delta) => {
    if (delta.amount.abs().gt(maxTx)) {
      throw new Error('over max transaction amount')
    }

    // TODO - set the credit limit for this point in history
    curCreditLimit = new UnitValue(500)

    balance = balance.add(delta.amount)

    validateNow()
  }

  for (let delta of deltas) {
    checkDelta(delta)
  }

  return balance
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
 * load up an array of in-s and out-s suitible for passing to validateHistoryDeltas
 */
export function getLocalDeltas () {
  const me = getMe()
  const deltas = []

  for (let entry of query({
    Constrain: {
      EntryTypes: [
        'transaction',
        'preauth'
      ]
    },
    Return: {
      Hashes: true,
      Entries: true,
      Headers: true
    }
  })) {
    let amount = new UnitValue(entry.Entry.amount)

    if (entry.Entry.to !== me) {
      amount = amount.mul(-1)
    }

    deltas.push({
      amount,
      time: fixTime(entry.Header.Time)
    })
  }

  return deltas
}

/**
 * Get the current balance of the local identity
 */
export function getBalance () {
  return validateHistoryDeltas(getLocalDeltas())
}
