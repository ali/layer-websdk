/**
 * Represents resources that are syncable with the server; represents the state of the object's sync.
 *
 * @class layer.Syncable
 * @extends layer.Root
 */

const Root = require('./root');
const Constants = require('./const');

class Syncable extends Root {

  /**
   * Object is queued for syncing with the server.
   *
   * That means it is currently out of sync with the server.
   *
   * @method _setSyncing
   * @private
   */
  _setSyncing() {
    switch (this.syncState) {
      case Constants.SYNC_STATE.SYNCED:
        this.syncState = Constants.SYNC_STATE.SYNCING;
        break;
      case Constants.SYNC_STATE.NEW:
        this.syncState = Constants.SYNC_STATE.SAVING;
        break;
    }
    this._syncCounter++;
  }

  /**
   * Object is synced with the server and up to date.
   *
   * @method _setSynced
   * @private
   */
  _setSynced() {
    if (this._syncCounter > 0) this._syncCounter--;

    this.syncState = this._syncCounter === 0 ? Constants.SYNC_STATE.SYNCED :
                          Constants.SYNC_STATE.SYNCING;
    this.isSending = false;
  }

}


/**
 * The current sync state of this object.
 *
 * Possible values are:
 *
 *  * layer.Constants.SYNC_STATE.NEW: Newly created; local only.
 *  * layer.Constants.SYNC_STATE.SAVING: Newly created; being sent to the server
 *  * layer.Constants.SYNC_STATE.SYNCING: Exists on both client and server, but changes are being sent to server.
 *  * layer.Constants.SYNC_STATE.SYNCED: Exists on both client and server and is synced.
 *  * layer.Constants.SYNC_STATE.LOADING: Exists on server; loading it into client.
 *
 * NOTE: There is a special case where isSending is true and syncState !== layer.Constants.SYNC_STATE.SAVING,
 * which occurs after `send()` has been called, but while waiting for Rich Content to upload prior to actually
 * sending this to the server.
 *
 * @type {string}
 */
Syncable.prototype.syncState = Constants.SYNC_STATE.NEW;

/**
 * Number of sync requests that have been requested.
 *
 * Counts down to zero; once it reaches zero, all sync
 * requests have been completed.
 *
 * @type {Number}
 * @private
 */
Syncable.prototype._syncCounter = 0;

/**
 * Is the object loading from the server?
 *
 * @type {boolean}
 */
Object.defineProperty(Syncable.prototype, 'isLoading', {
  enumerable: true,
  get: function get() {
    return this.syncState === Constants.SYNC_STATE.LOADING;
  },
});

Syncable._supportedEvents = [].concat(Root._supportedEvents);
Syncable.inObjectIgnore = Root.inObjectIgnore;
module.exports = Syncable;
