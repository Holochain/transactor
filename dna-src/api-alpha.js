'use strict'

import * as common from './common'

/**
 */
export function txAlphaRecipientInit (params) {
  const spenderHash = params.spender
  const recipientHash = common.getMe()

  const entry = {
    spender: spenderHash,
    recipient: recipientHash,
    amount: common.validateHexAmount(params.amount)
  }

  if (params.notes) {
    entry.notes = params.notes
  }

  const initHash = commit('alphaRecipientInit', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: initHash, Tag: 'notify' },
      { Base: recipientHash, Link: initHash, Tag: 'notify' }
    ]
  })

  common.trace('txAlphaRecipientInit', entry, initHash)

  return initHash
}

/**
 */
export function txAlphaSpenderAccept (params) {
  const initRef = params.initRef
  const spenderHash = common.getMe()

  const initData = get(initRef)

  if (spenderHash !== initData.spender) {
    throw new Error('This agent is not the spender on this tx. This agent: ' + spenderHash + ', tx spender: ' + initData.spender)
  }

  const recipientHash = initData.recipient

  const entry = {
    spender: spenderHash,
    recipient: recipientHash,
    amount: common.validateHexAmount(initData.amount),
    initRef: initRef
  }

  if (initData.notes) {
    entry.notes = initData.notes
  }

  const acceptHash = commit('alphaSpenderAccept', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: acceptHash, Tag: 'notify' },
      { Base: recipientHash, Link: acceptHash, Tag: 'notify' },
      { Base: initRef, Link: acceptHash, Tag: 'notify' }
    ]
  })

  common.trace('txAlphaSpenderAccept', entry, acceptHash)

  return acceptHash
}

/**
 */
export function txAlphaSpenderReject (params) {
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

  const rejectHash = commit('alphaSpenderReject', entry)

  commit('notify', {
    Links: [
      { Base: spenderHash, Link: rejectHash, Tag: 'notify' },
      { Base: recipientHash, Link: rejectHash, Tag: 'notify' },
      { Base: initRef, Link: rejectHash, Tag: 'notify' }
    ]
  })

  common.trace('txAlphaSpenderReject', entry, rejectHash)

  return rejectHash
}
