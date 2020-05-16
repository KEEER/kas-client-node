const fetch = require('node-fetch')
const assert = require('assert')

const TOKEN_COOKIE_NAME = 'kas-account-token'
const notLoggedIn = () => {
  const err = new Error('Not logged in.')
  err.code = 'ENOT_LOGGED_IN'
  throw err
}
const panic = res => {
  const err = new Error(res && res.message || res)
  err.response = res
  if (res && res.code) err.code = res.code
  throw err
}
const jsonHeader = { 'Content-Type': 'application/json' }

/** Client class */
module.exports = class KASClient {
  /**
   * Create a client object.
   * @param {string} base Base URL
   * @param {string} [token] Service token
   */
  constructor (base) {
    if (typeof base === 'object') {
      ;({ base, token: this.token } = base)
    }
    assert(typeof base === 'string', 'Client base not a string')
    const baseurl = new URL(base)
    assert(baseurl.protocol && baseurl.host, 'Base not a valid URL')
    this.base = base
  }

  /**
   * Check if a token is valid.
   * @private
   * @param {string} token token to check
   * @param {string} [what] what is that
   */
  _processToken (token, what = 'Token') {
    if (typeof token !== 'string') throw new TypeError(`${what} not a string.`)
  }

  /**
   * Gets token cookie header object.
   * @private
   * @param {string} token account token
   */
  _tokenCookieHeader (token) {
    return { 'Cookie': `${TOKEN_COOKIE_NAME}=${token}` }
  }

  /**
   * Gets service authorization header.
   * @private
   */
  _serviceAuthHeader () {
    if (!this.token) {
      const err = new Error('Service token required')
      err.code = 'EUNAUTHORIZED'
      throw err
    }
    return { 'Authorization': `Bearer ${this.token}` }
  }

  /**
   * Validates a KAS token.
   * @param {string} token KAS token
   * @deprecated
   * @returns {boolean} whether the token is OK.
   */
  async validateToken (token) {
    try {
      await this.getInformation(token)
      return true
    } catch (e) {
      if (e && e.code === 'ENOT_LOGGED_IN') return false
      throw e
    }
  }

  /**
   * Queries information of designated user.
   * @param {string} token KAS token
   */
  async getInformation (token) {
    this._processToken(token)
    const res = await fetch(new URL('/api/user-information', this.base), {
      headers: this._tokenCookieHeader(token),
    }).then(res => res.json())
    if (res.status === -2) throw notLoggedIn()
    if (res.status !== 0) panic(res)
    return res.result
  }

  /**
   * Queries KIUID from token.
   * @param {string} token KAS Token
   * @returns {string} kiuid
   */
  async getKiuid (token) {
    this._processToken(token)
    const res = await fetch(new URL(`/api/${token}/kiuid`, this.base), {
      headers: this._serviceAuthHeader()
    }).then(res => res.json())
    if (res.status !== 0) panic(res)
    return res.result
  }

  /**
   * Check if an amount is valid to pay or recharge.
   * @private
   * @param {number} amount the amount to be checked.
   * @throws {AssertionError}
   */
  _processAmount (amount) {
    const panic = msg => {
      const err = new TypeError(msg)
      err.code = 'EINVALID_AMOUNT'
      throw err
    }
    if (typeof amount !== 'number') panic('Amount not a number')
    if (amount !== parseInt(amount)) panic('Amount not an integer')
    if (amount <= 0) panic('Amount not positive')
  }

  /**
   * Consumes an account an certain amount of Kredit by token.
   * @param {string} type identity type
   * @param {string} identity identity
   * @param {number} amount cents to pay
   */
  async pay (type, identity, amount) {
    this._processToken(token)
    this._processAmount(amount)
    const res = await fetch(new URL('/api/pay', this.base), {
      method: 'post',
      headers: { ...this._serviceAuthHeader(), ...jsonHeader },
      body: JSON.stringify({ type, identity, amount })
    }).then(res => res.json())
    if (res.status !== 0) panic(res)
    return res
  }

  /**
   * Queries balance by token.
   * @param {string} token KAS token
   * @deprecated use `getInformation().kredit` instead
   * @returns {number} Kredit amount
   */
  async getBalance (token) {
    return (await this.getInformation(token)).kredit
  }
}
