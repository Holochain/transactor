/**
 */
export function genesis () {
  return true
}

/**
 */
export function validateCommit (entryName, entry, header, pkg, sources) {
  return true
}

/**
 */
export function validateLink (linkEntryType, baseHash, links, pkg, sources) {
  return true
}

/**
 */
export function validatePut (entryName, entry, header, pkg, sources) {
  return true
}

/**
 */
export function validateMod (entryName, entry, header, replaces, pkg, sources) {
  return false
}

/**
 */
export function validateDel (entryName, hash, pkg, sources) {
  return false
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
export function validatePutPkg (entryName) {
  var req = {}
  req[HC.PkgReq.Chain] = HC.PkgReq.ChainOpt.Full
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
