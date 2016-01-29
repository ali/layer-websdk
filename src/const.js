/**
 * @class layer.Constants
 * @singleton
 */
module.exports = {
  /**
   * Is the object synchronized with the server?
   * @property {Object} [SYNC_STATE=null]
   * @property {string} SYNC_STATE.NEW
   * @property {string} SYNC_STATE.SAVING
   * @property {string} SYNC_STATE.SYNCING
   * @property {string} SYNC_STATE.SYNCED
   * @property {string} SYNC_STATE.LOADING
   */
  SYNC_STATE: {
    NEW: 'NEW',
    SAVING: 'SAVING',
    SYNCING: 'SYNCING',
    SYNCED: 'SYNCED',
    LOADING: 'LOADING',
  },

  /**
   * Values for readStatus/deliveryStatus
   * @property {Object} [RECIPIENT_STATE=]
   * @property {string} RECIPIENT_STATE.NONE
   * @property {string} RECIPIENT_STATE.SOME
   * @property {string} RECIPIENT_STATE.ALL
   */
  RECIPIENT_STATE: {
    NONE: 'NONE',
    SOME: 'SOME',
    ALL: 'ALL',
  },

  /**
   * Values for recipientStatus
   * @property {Object} [RECEIPT_STATE=]
   * @property {string} RECEIPT_STATE.SENT
   * @property {string} RECEIPT_STATE.DELIVERED
   * @property {string} RECEIPT_STATE.READ
   */
  RECEIPT_STATE: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
  },
  LOCALSTORAGE_KEYS: {
    SESSIONDATA: 'layer-session-data-',
  },
  ACCEPT: 'application/vnd.layer+json; version=1.0',

  /**
   * Log levels
   * @property {Object} [LOG=]
   * @property {number} LOG.DEBUG     Log detailed information about requests, responses, events, state changes, etc...
   * @property {number} LOG.INFO      Log sparse information about requests, responses and events
   * @property {number} LOG.WARN      Log failures that are expected, normal, handled, but suggests that an operation didn't complete as intended
   * @property {number} LOG.ERROR     Log failures that are not expected or could not be handled
   * @property {number} LOG.NONE      Logs? Who needs em?
   */
  LOG: {
    DEBUG: 4,
    INFO: 3,
    WARN: 2,
    ERROR: 1,
    NONE: 0,
  }
};