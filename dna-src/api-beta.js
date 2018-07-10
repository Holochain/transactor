'use strict'

import * as common from './common'

/**
 */
export function txBetaSpenderInit (params) {
  const spenderHash = common.getMe()
  const recipientHash = params.recipient

  const entry = {
    spender: spenderHash,
    recipient: recipientHash,
    amount: common.validateHexAmount(params.amount)
  }

  if (params.notes) {
    entry.notes = params.notes
  }

  const initHash = commit('betaSpenderInit', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: initHash, Tag: 'notify' },
      { Base: recipientHash, Link: initHash, Tag: 'notify' }
    ]
  })

  common.trace('txBetaSpenderInit', entry, initHash)

  return initHash
}

/**
 */
export function txBetaRecipientAccept (params) {
  const initRef = params.initRef
  const recipientHash = common.getMe()

  const initData = get(initRef)

  if (recipientHash !== initData.recipient) {
    throw new Error('This agent is not the recipient on this tx. This agent: ' + recipientHash + ', tx recipient: ' + initData.recipient)
  }

  const spenderHash = initData.spender

  const entry = {
    spender: spenderHash,
    recipient: recipientHash,
    amount: common.validateHexAmount(initData.amount),
    initRef: initRef
  }

  if (initData.notes) {
    entry.notes = initData.notes
  }

  const acceptHash = commit('betaRecipientAccept', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: acceptHash, Tag: 'notify' },
      { Base: recipientHash, Link: acceptHash, Tag: 'notify' },
      { Base: initRef, Link: acceptHash, Tag: 'notify' }
    ]
  })

  common.trace('txBetaRecipientAccept', entry, acceptHash)

  return acceptHash
}

/**
 */
export function txBetaRecipientReject (params) {
  const initRef = params.initRef
  const recipientHash = common.getMe()

  const initData = get(initRef)

  if (recipientHash !== initData.recipient) {
    throw new Error('This agent is not the recipient on this tx. This agent: ' + recipientHash + ', tx recipient: ' + initData.recipient)
  }

  const spenderHash = initData.spender

  const entry = {
    initRef: initRef
  }

  const rejectHash = commit('betaRecipientReject', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: rejectHash, Tag: 'notify' },
      { Base: recipientHash, Link: rejectHash, Tag: 'notify' },
      { Base: initRef, Link: rejectHash, Tag: 'notify' }
    ]
  })

  common.trace('txBetaRecipientReject', entry, rejectHash)

  return rejectHash
}

/**
 */
export function txBetaSpenderWithdraw (params) {
  const initRef = params.initRef
  const spenderHash = common.getMe()

  const initData = get(initRef)

  if (spenderHash !== initData.spender) {
    throw new Error('This agent is not the spender on this tx. This agent: ' + spenderHash + ', tx spender: ' + initData.spender)
  }

  const recipientHash = initData.recipient

  const entry = {
    initRef: initRef
  }

  const withdrawHash = commit('betaSpenderWithdraw', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: withdrawHash, Tag: 'notify' },
      { Base: recipientHash, Link: withdrawHash, Tag: 'notify' },
      { Base: initRef, Link: withdrawHash, Tag: 'notify' }
    ]
  })

  common.trace('txBetaSpenderWithdraw', entry, withdrawHash)

  return withdrawHash
}
