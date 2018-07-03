'use strict'

import 'babel-polyfill'
import * as common from './common'

/**
 * Called only once when the source chain is generated
 * @return {boolean} success
 */
export function genesis () {
  common.trace('transactor GENESIS')
  common.trace('maxTransactionAmount', common.getMaxTransactionAmount().toNumber())
  common.trace('maxTransactionFee', common.getMaxTransactionFee().toNumber())

  // any genesis code here
  return true
}

/**
 * Called to validate any changes to the DHT
 * @param {string} entryName - the name of entry being modified
 * @param {*} entry - the entry data to be set
 * @param {?} header - ?
 * @param {?} pkg - ?
 * @param {?} sources - ?
 * @return {boolean} is valid?
 */
export function validateCommit (entryName, entry, header, pkg, sources) {
  switch (entryName) {
    case 'transaction':
      const deltas = common.getLocalDeltas()
      const me = common.getMe()
      let amount = new common.UnitValue(entry.amount)
      if (me === entry.from) {
        amount = amount.mul(-1)
      }
      deltas.push({
        amount,
        time: common.fixTime(header.Time)
      })
      try {
        common.validateHistoryDeltas(deltas)
        common.trace('validateCommit', 'ok')
        return true
      } catch (e) {
        common.trace('validateCommit', 'FAIL!')
        return false
      }
    case 'preauth':
      // TODO - validate preauth entries!
      return true
    default:
      // invalid entry name!!
      return false
  }
}

/**
 * Called to validate any changes to the DHT
 * @pfaram {string} entryName - the name of entry being modified
 * @param {*} entry - the entry data to be set
 * @param {?} header - ?
 * @param {?} pkg - ?
 * @param {?} sources - ?
 * @return {boolean} is valid?
 */
export function validatePut (entryName, entry, header, pkg, sources) {
  const commiter = sources[0]
  const deltas = []

  for (let i = 0; i < pkg.Chain.Headers.length && i < pkg.Chain.Entries.length; ++i) {
    const type = pkg.Chain.Headers[i].Type
    const time = common.fixTime(pkg.Chain.Headers[i].Time)
    if (type !== 'transaction' && type !== 'preauth') {
      continue
    }
    const entry = JSON.parse(pkg.Chain.Entries[i].C)

    let amount = new common.UnitValue(entry.amount)
    if (entry.from === commiter) {
      amount = amount.mul(-1)
    }

    deltas.push({
      amount,
      time
    })
  }

  try {
    common.validateHistoryDeltas(deltas)
    common.trace('validatePut', 'ok')
    return true
  } catch (e) {
    common.trace('validatePut', 'FAIL!')
    return false
  }
}

/**
 * Called to validate any changes to the DHT
 * @param {string} entryName - the name of entry being modified
 * @param {*} entry - the entry data to be set
 * @param {?} header - ?
 * @param {*} replaces - the old entry data
 * @param {?} pkg - ?
 * @param {?} sources - ?
 * @return {boolean} is valid?
 */
export function validateMod (entryName, entry, header, replaces, pkg, sources) {
  switch (entryName) {
    case 'transaction':
      // validation code here
      return false
    default:
      // invalid entry name!!
      return false
  }
}

/**
 * Called to validate any changes to the DHT
 * @param {string} entryName - the name of entry being modified
 * @param {string} hash - the hash of the entry to remove
 * @param {?} pkg - ?
 * @param {?} sources - ?
 * @return {boolean} is valid?
 */
export function validateDel (entryName, hash, pkg, sources) {
  switch (entryName) {
    case 'transaction':
      // validation code here
      return false
    default:
      // invalid entry name!!
      return false
  }
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
export function validatePutPkg (entryName) {
  var req = {}
  req[HC.PkgReq.Chain] = HC.PkgReq.ChainOpt.Full
  // req["types"]=["xxx"];
  return req
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
export function validateModPkg (entryName) {
  return null
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
export function validateDelPkg (entryName) {
  return null
}

// exposed functions -----------------------------------------------

/**
 * commits a new transaction to the chain by communicating with
 * the node the
 * @param {object} parameters - An object with the following properties:
 *    {string} role - must be string 'spender' or 'receiver'
 *    {string} to - if role is 'spender' specifies address of funds receiver
 *    {float} amount - transaction amount
 *    {string} description - transaction notes/description
 *    {string} preauth - if role is 'receiver' preauth is the has of the preauth entry
 *    {string} from - if role is 'receiver' specifies address of funds spender
 * @return {string} the transaction hash
 */
export function transactionCreate (params) {
  var from, to
  // if the spender is creating the transaction
  // it gets confirmed by the receiver before commiting
  if (params.role === 'spender') {
    from = common.getMe()
    to = params.to
    if (typeof params.amount !== 'string') {
      throw new Error('"amount" must be a hexidecimal string')
    }

    var potentialEntry = {
      from: from,
      to: to,
      amount: (new common.UnitValue(params.amount)).toString(),
      description: params.description
    }

    // make sure we can afford this
    const deltas = common.getLocalDeltas()
    deltas.push({
      amount: new common.UnitValue(params.amount),
      time: Date.now()
    })

    // will throw if this transaction would be invalid
    common.validateHistoryDeltas(deltas)

    common.trace('initiate transaction', potentialEntry)

    var response = send(to, potentialEntry)
    if (response) {
      common.trace('commiting transaction')
      return commit('transaction', potentialEntry)
    }
  }

  // if the receiver is creating the transaction
  // there must have been a preauth, and it can be commited
  // directly
  if (params.role === 'receiver') {
    if (typeof params.amount !== 'string') {
      throw new Error('"amount" must be a hexidecimal string')
    }
    var entry = {
      from: params.from,
      to: common.getMe(),
      amount: (new common.UnitValue(params.amount)).toString(),
      description: params.description,
      preauth: params.preauth
    }
    return commit('transaction', entry)
  }
  return null
}

/**
 * this is the receive callback which commits the receivers half of the
 * transaction to their chain, and returns the the hash of that transaction
 * to the spender as confirmation.
*/
export function receive (from, msg) {
  if (msg.to !== common.getMe()) {
    return null
  }

  common.trace('received from remote node', common.getMe(), msg)

  return commit('transaction', msg)
}

/**
 * get a transaction from the DHT
 * @param {object} parameters - An object with the following properties:
 *    {string} transaction - hash of the transaction to read
 * @return {object} the transaction entry data
 */
export function transactionRead (params) {
  var data = get(params.transaction)

  var transaction = null
  if (typeof data === 'object') {
    transaction = data
  } else {
    try {
      transaction = JSON.parse(data)
    } catch (e) {
      debug(e)
    }
  }

  return transaction
}

/**
 * preauthorize spending on a particular proposal
 * @param {object} parameters - An object with the following properties:
 *    {string} proposal - hash of the proposal on which to preauth
 *    {float} amount - transaction amount
 * @return {string} the preauth entry hash
 */
export function preauthCreate (params) {
  var entry = {
    amount: params.amount,
    payload: {proposal: params.proposal}
  }
  return commit('preauth', entry)
}

/**
 * cancel preauthorize spending on a particular proposal
 * this function will only validate if the propoal has completed and didn't pass
 * @param {object} parameters - An object with the following properties:
 *    {string} preauth - hash of the previous preauth
 * @return {string} the preauth cancel etry hash
 */
export function preauthCancel (hash) {
  var preauth = get(hash, {Local: true})
  if (common.isErr(preauth)) return preauth
  preauth = JSON.parse(preauth)
  var entry = {
    amount: -preauth.amount,
    payload: {preauth: hash}
  }
  return commit('preauth', entry)
}

/**
 * return this agent's hash
 * @return {string} this agent's hash
 */
export function getSelfHash () {
  const selfHash = common.getMe()
  common.trace('selfHash', selfHash)
  return selfHash
}

/**
 * calculate balance from history
 * @return {float} the node's balance
 */
export function getBalance () {
  const balance = common.getBalance().toString()
  common.trace('balance', balance)
  return balance
}

//  balance calculation functions -----------------------------------

// update balance given a preauth or transaction entry from the chain
/*
function adjustBalance (balance, type, entry, commiter) {
  switch (type) {
    case 'transaction':
      var amount = entry.amount
      var from = entry.from
      if (entry.hasOwnProperty('preauth') && (from === entry.to)) {
        // special case for preauth funding ourselves
        balance += amount
      } else {
        if (from === commiter) balance -= amount
        else balance += amount
      }
      break
    case 'preauth':
      balance -= entry.amount
  }
  return balance
}
*/

/*
function _getBalance (creditLimit) {
  var balance = 0
  var commiter = common.getMe()
  var entries = query({Constrain: {'EntryTypes': ['transaction', 'preauth']}})
  for (var i = 1; i < entries.length; i++) {
    var entry = entries[i]
    var type = entry.hasOwnProperty('payload') ? 'preauth' : 'transaction'
    balance = adjustBalance(balance, type, entry, commiter)
    if (balance < creditLimit) {
      break
    }
  }
  return balance
}
*/
