'use strict'

import * as common from './common'

/**
 */
export function txListPending () {
  const myHash = common.getMe()

  const myLinks = getLinks(myHash, 'notify', { Load: true })

  const initMap = {
    alpha: {},
    beta: {}
  }

  for (let item of myLinks) {
    switch (item.EntryType) {
      case 'alphaRecipientInit':
        initMap.alpha[item.Hash] = item.Entry
        break
      case 'alphaSpenderAccept':
        delete initMap.alpha[item.Entry.initRef]
        break
      case 'alphaSpenderReject':
        delete initMap.alpha[item.Entry.initRef]
        break
      case 'betaSpenderInit':
        initMap.beta[item.Hash] = item.Entry
        break
      case 'betaRecipientAccept':
        delete initMap.beta[item.Entry.initRef]
        break
      case 'betaRecipientReject':
        delete initMap.beta[item.Entry.initRef]
        break
      case 'betaSpenderWithdraw':
        delete initMap.beta[item.Entry.initRef]
        break
    }
  }

  common.trace('txListPending', initMap)
  return initMap
}

/**
 * return this agent's hash
 * @return {string} this agent's hash
 */
export function getSystemInfo () {
  const maxTxAmount = common.getMaxTransactionAmount()
  const maxTxFee = common.getMaxTransactionFee()
  const out = {
    selfHash: common.getMe(),
    maxTransactionAmount: maxTxAmount.toRepr(),
    maxTransactionFee: maxTxFee.toRepr(),
    transactionFeeFactor: common.getTransactionFeeFactor()
  }
  common.trace('getSystemInfo', out)
  return out
}

/**
 * calculate balance from history
 * @return {float} the node's balance
 */
export function getLedgerState () {
  const ls = common.getLedgerState()
  const out = {
    balance: ls.balance.toRepr(),
    txFeeOwed: ls.txFeeOwed.toRepr()
  }
  common.trace('getLedgerState', out)
  return out
}
