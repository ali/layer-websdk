/**
 * @class  layer.Websockets.RequestManager
 * @private
 *
 * This class allows one to send requests to the websocket server, and provide a callback,
 * And have that callback either called by the correct websocket server response, or
 * be called with a timeout.
 */
const Utils = require('../client-utils');
const logger = require('../logger');
const LayerError = require('../layer-error');

// Wait 15 seconds for a response and then give up
const DELAY_UNTIL_TIMEOUT = 15 * 1000;

class WebsocketRequestManager {
  /**
   * Create a new websocket change manager
   *
   *      var websocketRequestManager = new layer.Websockets.RequestManager({
   *          client: client,
   *          socketManager: client.Websockets.SocketManager
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @param {layer.Websockets.SocketManager} socketManager
   * @returns {layer.Websockets.RequestManager}
   */
  constructor(options) {
    this.client = options.client;
    this.socketManager = options.socketManager;
    this.socketManager.on({
      'message': this._handleResponse,
      'disconnected': this._reset,
    }, this);

    this._requestCallbacks = {};
  }

  _reset() {
    this._requestCallbacks = {};
  }

  /**
   * Handle a response to a request.
   *
   * @method _handleResponse
   * @private
   * @param  {layer.LayerEvent} evt
   */
  _handleResponse(evt) {
    if (evt.data.type === 'response') {
      const msg = evt.data.body;
      const requestId = msg.request_id;
      const data = msg.success ? msg.data : new LayerError(msg.data);
      logger.debug(`Websocket response ${requestId} ${msg.success ? 'Successful' : 'Failed'}`);
      if (requestId && this._requestCallbacks[requestId]) {
        this._requestCallbacks[requestId].callback({
          success: msg.success,
          data: data,
          fullData: evt.data,
        });
        delete this._requestCallbacks[requestId];
      }
    }
  }

  /**
   * Shortcut for sending a request; builds in handling for callbacks
   *
   *    manager.sendRequest({
   *      operation: "delete",
   *      object: {id: "layer:///conversations/uuid"},
   *      data: {deletion_mode: "all_participants"}
   *    }, function(result) {
   *        alert(result.success ? "Yay" : "Boo");
   *    });
   *
   * @method sendRequest
   * @param  {Object} data - Data to send to the server
   * @param  {Function} callback - Handler for success/failure callback
   */
  sendRequest(data, callback) {
    if (!this._isOpen()) {
      return callback ? callback(new LayerError({ success: false, data: { id: 'not_connected', code: 0, message: 'WebSocket not connected' } })) : undefined;
    }
    const body = Utils.clone(data);
    body.request_id = 'r' + this._nextRequestId++;
    logger.debug(`Request ${body.request_id} is sending`);
    if (callback) {
      this._requestCallbacks[body.request_id] = {
        date: Date.now(),
        callback: callback,
      };
    }

    this.socketManager.send({
      type: 'request',
      body: body,
    });
    this._scheduleCallbackCleanup();
  }

  /**
   * Flags a request as having failed if no response within 2 minutes
   *
   * @method _scheduleCallbackCleanup
   * @private
   */
  _scheduleCallbackCleanup() {
    if (!this._callbackCleanupId) {
      this._callbackCleanupId = setTimeout(this._runCallbackCleanup.bind(this), DELAY_UNTIL_TIMEOUT + 50);
    }
  }

  /**
   * Calls callback with an error.
   *
   * NOTE: Because we call requests that expect responses serially instead of in parallel,
   * currently there should only ever be a single entry in _requestCallbacks.  This may change in the future.
   *
   * @method _runCallbackCleanup
   * @private
   */
  _runCallbackCleanup() {
    this._callbackCleanupId = 0;
    // If the websocket is closed, ignore all callbacks.  The Sync Manager will reissue these requests as soon as it gets
    // a 'connected' event... they have not failed.  May need to rethink this for cases where third parties are directly
    // calling the websocket manager bypassing the sync manager.
    if (this.isDestroyed || !this._isOpen()) return;
    let requestId, count = 0;
    const now = Date.now();
    for (requestId in this._requestCallbacks) {
      if (this._requestCallbacks.hasOwnProperty(requestId)) {
        // If the request hasn't expired, we'll need to reschedule callback cleanup; else if its expired...
        if (now < this._requestCallbacks[requestId].date + DELAY_UNTIL_TIMEOUT) {
          count++;
        } else {
          // If there has been no data from the server, there's probably a problem with the websocket; reconnect.
          if (now > this.socketManager._lastDataFromServerTimestamp.getTime() + DELAY_UNTIL_TIMEOUT) {
            this.socketManager._reconnect(false);
            this._scheduleCallbackCleanup();
            return;
          } else {
            // The request isn't responding and the socket is good; fail the request.
            this._timeoutRequest(requestId);
          }
        }
      }
    }
    if (count) this._scheduleCallbackCleanup();
  }

  _timeoutRequest(requestId) {
    try {
      logger.warn('Websocket request timeout');
      this._requestCallbacks[requestId].callback({
        success: false,
        data: new LayerError({
          id: 'request_timeout',
          message: 'The server is not responding. We know how much that sucks.',
          url: 'https:/developer.layer.com/docs/websdk',
          code: 0,
          status: 408,
          httpStatus: 408,
        }),
      });
    } catch (err) {
      // Do nothing
    }
    delete this._requestCallbacks[requestId];
  }

  _isOpen() {
    return this.socketManager._isOpen();
  }

  destroy() {
    this.isDestroyed = true;
    if (this._callbackCleanupId) clearTimeout(this._callbackCleanupId);
    this._requestCallbacks = null;
  }
}

WebsocketRequestManager.prototype._nextRequestId = 1;

/**
 * The Client that owns this.
 * @type {layer.Client}
 */
WebsocketRequestManager.prototype.client = null;

WebsocketRequestManager.prototype._requestCallbacks = null;

WebsocketRequestManager.prototype._callbackCleanupId = 0;

WebsocketRequestManager.prototype.socketManager = null;

module.exports = WebsocketRequestManager;

