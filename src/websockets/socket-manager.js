/**
 * This component manages
 *
 * 1. recieving websocket events
 * 2. Processing them
 * 3. Triggering events on completing them
 * 4. Sending them
 *
 * Applications typically do not interact with this component, but may subscribe
 * to the `message` event if they want richer event information than is available
 * through the layer.Client class.
 *
 * @class  layer.Websockets.SocketManager
 * @extends layer.Root
 * @private
 *
 * TODO: Need to make better use of info from the layer.OnlineStateManager.
 */
const Root = require('../root');
const Utils = require('../client-utils');
const logger = require('../logger');

class SocketManager extends Root {
  /**
   * Create a new websocket manager
   *
   *      var socketManager = new layer.Websockets.SocketManager({
   *          client: client,
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @return {layer.Websockets.SocketManager}
   */
  constructor(options) {
    super(options);
    if (!this.client) throw new Error('SocketManager requires a client');

    // Insure that on/off methods don't need to call bind, therefore making it easy
    // to add/remove functions as event listeners.
    this._onMessage = this._onMessage.bind(this);
    this._onOpen = this._onOpen.bind(this);
    this._onSocketClose = this._onSocketClose.bind(this);
    this._onError = this._onError.bind(this);

    // If the client is authenticated, start it up.
    if (this.client.isAuthenticated && this.client.onlineManager.isOnline) {
      this.connect();
    }

    this.client.on('online', this._onlineStateChange, this);

    // Any time the Client triggers a ready event we need to reconnect.
    this.client.on('authenticated', this.connect, this);

    this._lastTimestamp = new Date();
  }

  /**
   * Call this when we want to reset all websocket state; this would be done after a lengthy period
   * of being disconnected.  This prevents Event.replay from being called on reconnecting.
   *
   * @method _reset
   * @private
   */
  _reset() {
    this._lastTimestamp = null;
    this._lastDataFromServerTimestamp = null;
    this._lastCounter = null;
    this._hasCounter = false;

    this._inReplay = false;
    this._needsReplayFrom = null;
  }

  /**
   * Event handler is triggered any time the client's online state changes.
   * If going online we need to reconnect (i.e. will close any existing websocket connections and then open a new connection)
   * If going offline, close the websocket as its no longer useful/relevant.
   * @method _onlineStateChange
   * @private
   * @param {layer.LayerEvent} evt
   */
  _onlineStateChange(evt) {
    if (!this.client.isAuthenticated) return;
    if (evt.isOnline) {
      this._reconnect(evt.reset);
    } else {
      this.close();
    }
  }

  /**
   * Reconnect to the server, optionally resetting all data if needed.
   * @method _reconnect
   * @private
   * @param {boolean} reset
   */
  _reconnect(reset) {
    // The sync manager will reissue any requests once it receives a 'connect' event from the websocket manager.
    // There is no need to have an error callback at this time.
    // Note that calls that come from sources other than the sync manager may suffer from this.
    // Once the websocket implements retry rather than the sync manager, we may need to enable it
    // to trigger a callback after sufficient time.  Just delete all callbacks.
    this.close();
    if (reset) this._reset();
    this.connect();
  }

  /**
   * Connect to the websocket server
   *
   * @method connect
   * @param  {layer.SyncEvent} evt - Ignored parameter
   */
  connect(evt) {
    if (this.client.isDestroyed || !this.client.isOnline) return;

    this._closing = false;

    this._lastCounter = -1;

    // Load up our websocket component or shim
    /* istanbul ignore next */
    const WS = typeof WebSocket === 'undefined' ? require('websocket').w3cwebsocket : WebSocket;

    // Get the URL and connect to it
    const url = this.client.url.replace(/^http/, 'ws') +
      '/websocket?session_token=' +
      this.client.sessionToken;
    this._socket = new WS(url, 'layer-1.0');

    // If its the shim, set the event hanlers
    /* istanbul ignore if */
    if (typeof WebSocket === 'undefined') {
      this._socket.onmessage = this._onMessage;
      this._socket.onclose = this._onSocketClose;
      this._socket.onopen = this._onOpen;
      this._socket.onerror = this._onError;
    }

    // If its a real websocket, add the event handlers
    else {
      this._socket.addEventListener('message', this._onMessage);
      this._socket.addEventListener('close', this._onSocketClose);
      this._socket.addEventListener('open', this._onOpen);
      this._socket.addEventListener('error', this._onError);
    }

    // Trigger a failure if it takes >= 5 seconds to establish a connection
    this._connectionFailedId = setTimeout(this._connectionFailed.bind(this), 5000);
  }

  /**
   * Clears the scheduled call to _connectionFailed that is used to insure the websocket does not get stuck
   * in CONNECTING state. This call is used after the call has completed or failed.
   *
   * @method _clearConnectionFailed
   * @private
   */
  _clearConnectionFailed() {
    if (this._connectionFailedId) {
      clearTimeout(this._connectionFailedId);
      this._connectionFailedId = 0;
    }
  }

  /**
   * Called after 5 seconds of entering CONNECTING state without getting an error or a connection.
   * Calls _onError which will cause this attempt to be stopped and another connection attempt to be scheduled.
   *
   * @method _connectionFailed
   * @private
   */
  _connectionFailed() {
    this._connectionFailedId = 0;
    const msg = 'Websocket failed to connect to server';
    logger.warn(msg);

    // TODO: At this time there is little information on what happens when closing a websocket connection that is stuck in
    // readyState=CONNECTING.  Does it throw an error?  Does it call the onClose or onError event handlers?
    // Remove all event handlers so that calling close won't trigger any calls.
    try {
      this._removeSocketEvents();
      this._socket.close();
      this._socket = null;
    } catch(e) {
      // No-op
    }

    // Now we can call our error handler.
    this._onError(new Error(msg));
  }

  /**
   * The websocket connection is reporting that its now open.
   *
   * @method _onOpen
   * @private
   */
  _onOpen() {
    this._clearConnectionFailed();
    if (this._isOpen()) {
      this._lostConnectionCount = 0;
      this.isOpen = true;
      this.trigger('connected');
      logger.debug('Websocket Connected');
      if (this._hasCounter) {
        this.replayEvents(this._lastTimestamp, true);
      } else {
        this._reschedulePing();
      }
    }
  }

  /**
   * Tests to see if the websocket connection is open.  Use the isOpen property
   * for external tests.
   * @method _isOpen
   * @private
   * @returns {Boolean}
   */
  _isOpen() {
    if (!this._socket) return false;
    /* istanbul ignore if */
    if (typeof WebSocket === 'undefined') return true;
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  /**
   * If not isOpen, presumably failed to connect
   * Any other error can be ignored... if the connection has
   * failed, onClose will handle it.
   *
   * @method _onError
   * @private
   * @param  {Error} err - Websocket error
   */
  _onError(err) {
    if (this._closing) return;
    this._clearConnectionFailed();
    logger.debug('Websocket Error causing websocket to close');
    if (!this.isOpen) {
      this._lostConnectionCount++;
      this._scheduleReconnect();
    } else {
      this._onSocketClose();
      this._socket.close();
      this._socket = null;
    }
  }

  /**
   * Shortcut method for sending a signal
   *
   *    manager.sendSignal({
          'type': 'typing_indicator',
          'object': {
            'id': this.conversation.id
          },
          'data': {
            'action': state
          }
        });
   *
   * @method sendSignal
   * @param  {Object} body - Signal body
   */
  sendSignal(body) {
    this._socket.send(JSON.stringify({
      type: 'signal',
      body: body,
    }));
  }



  /**
   * Shortcut to sending a Counter.read request
   *
   * @method getCounter
   * @param  {Function} callback
   * @param {boolean} callback.success
   * @param {number} callback.lastCounter
   * @param {number} callback.newCounter
   */
  getCounter(callback) {
    logger.debug('Websocket request: getCounter');
    this.client.socketRequestManager.sendRequest({
      method: 'Counter.read',
    }, (result) => {
      logger.debug('Websocket response: getCounter ' + result.data.counter);
      if (callback) {
        if (result.success) {
          callback(true, result.data.counter, result.fullData.counter);
        } else {
          callback(false);
        }
      }
    });
  }

  /**
   * Replays all missed change packets since the specified timestamp
   *
   * @method replayEvents
   * @param  {string}   timestamp - Iso formatted date string
   * @param  {boolean} [force=false] - if true, cancel any in progress replayEvents and start a new one
   * @param  {Function} [callback] - Optional callback for completion
   */
  replayEvents(timestamp, force, callback) {
    if (!timestamp) return;
    if (force) this._inReplay = false;

    // If we are already waiting for a replay to complete, record the timestamp from which we
    // need to replay on our next replay request
    // If we are simply unable to replay because we're disconnected, capture the _needsReplayFrom
    if (this._inReplay || !this._isOpen()) {
      if (!this._needsReplayFrom) {
        logger.debug('Websocket request: replayEvents updating _needsReplayFrom');
        this._needsReplayFrom = timestamp;
      }
    } else {
      this._inReplay = true;
      logger.info('Websocket request: replayEvents');
      this.client.socketRequestManager.sendRequest({
        method: 'Event.replay',
        data: {
          from_timestamp: timestamp,
        },
      }, result => this._replayEventsComplete(timestamp, callback, result.success));
    }
  }

  /**
   * Callback for handling completion of replay.
   *
   * @method _replayEventsComplete
   * @private
   * @param  {Date}     timestamp
   * @param  {Function} callback
   * @param  {Boolean}   success
   */
  _replayEventsComplete(timestamp, callback, success) {
    this._inReplay = false;

    // If replay was completed, and no other requests for replay, then trigger synced;
    // we're done.
    if (success && !this._needsReplayFrom) {
      logger.info('Websocket replay complete');
      this.trigger('synced');
      if (callback) callback();
    }

    // If replayEvents was called during a replay, then replay
    // from the given timestamp.  If request failed, then we need to retry from _lastTimestamp
    else if (success && this._needsReplayFrom) {
      logger.info('Websocket replay partially complete');
      const t = this._needsReplayFrom;
      this._needsReplayFrom = null;
      this.replayEvents(t);
    }

    // We never got a done event.  We also didn't miss any counters, so the last
    // message we received was valid; so lets just use that as our timestamp and
    // try again until we DO get a Event.Replay completion packet
    else {
      logger.info('Websocket replay retry');
      this.replayEvents(timestamp);
    }
  }

  /**
   * Handles a new websocket packet from the server
   *
   * @method _onMessage
   * @private
   * @param  {Object} evt - Message from the server
   */
  _onMessage(evt) {
    this._lostConnectionCount = 0;
    try {
      const msg = JSON.parse(evt.data);
      const skippedCounter = this._lastCounter + 1 !== msg.counter;
      this._hasCounter = true;
      this._lastCounter = msg.counter;
      this._lastDataFromServerTimestamp = new Date();

      // If we've missed a counter, replay to get; note that we had to update _lastCounter
      // for replayEvents to work correctly.
      if (skippedCounter) {
        this.replayEvents(this._lastTimestamp);
      } else {
        this._lastTimestamp = new Date(msg.timestamp);
      }

      this.trigger('message', {
        data: msg,
      });

      this._reschedulePing();
    } catch (err) {
      logger.error('Layer-Websocket: Failed to handle websocket message: ' + err + '\n', evt.data);
    }
  }

  /**
   * Reschedule a ping request which helps us verify that the connection is still alive,
   * and that we haven't missed any events.
   *
   * @method _reschedulePing
   * @private
   */
  _reschedulePing() {
    if (this._nextPingId) {
      clearTimeout(this._nextPingId);
    }
    this._nextPingId = setTimeout(this._ping.bind(this), this.pingFrequency);
  }

  /**
   * Send a counter request to the server to verify that we are still connected and
   * have not missed any events.
   *
   * @method _ping
   * @private
   */
  _ping() {
    logger.debug('Websocket ping');
    this._nextPingId = 0;
    if (this._isOpen()) {
      // NOTE: onMessage will already have called reschedulePing, but if there was no response, then the error handler would NOT have called it.
      this.getCounter(this._reschedulePing.bind(this));
    }
  }


  /**
   * Close the websocket.
   *
   * @method close
   */
  close() {
    logger.debug('Websocket close requested');
    this._closing = true;
    if (this._socket) {
      // Close all event handlers and set socket to null
      // without waiting for browser event to call
      // _onSocketClose as the next command after close
      // might require creating a new socket
      this._onSocketClose();
      this._socket.close();
      this._socket = null;
    }
  }

  /**
   * Send a packet across the websocket
   * @method send
   * @param {Object} obj
   */
  send(obj) {
    this._socket.send(JSON.stringify(obj));
  }

  destroy() {
    this.close();
    if (this._nextPingId) clearTimeout(this._nextPingId);
    super.destroy();
  }

  /**
   * If the socket has closed (or if the close method forces it closed)
   * Remove all event handlers and if appropriate, schedule a retry.
   *
   * @method _onSocketClose
   * @private
   */
  _onSocketClose() {
    logger.debug('Websocket closed');
    this.isOpen = false;
    if (!this._closing) {
      this._scheduleReconnect();
    }

    this._removeSocketEvents();
    this.trigger('disconnected');
  }

  /**
   * Removes all event handlers on the current socket.
   *
   * @method _removeSocketEvents
   * @private
   */
  _removeSocketEvents() {
    /* istanbul ignore if */
    if (typeof WebSocket !== 'undefined' && this._socket) {
      this._socket.removeEventListener('message', this._onMessage);
      this._socket.removeEventListener('close', this._onSocketClose);
      this._socket.removeEventListener('open', this._onOpen);
      this._socket.removeEventListener('error', this._onError);
    } else if (this._socket) {
      this._socket.onmessage = null;
      this._socket.onclose = null;
      this._socket.onopen = null;
      this._socket.onerror = null;
    }
  }

  /**
   * Schedule an attempt to reconnect to the server.  If the onlineManager
   * declares us to be offline, don't bother reconnecting.  A reconnect
   * attempt will be triggered as soon as the online manager reports we are online again.
   *
   * Note that the duration of our delay can not excede the onlineManager's ping frequency
   * or it will declare us to be offline while we attempt a reconnect.
   *
   * @method _scheduleReconnect
   * @private
   */
  _scheduleReconnect() {
    if (this.isDestroyed || !this.client.isOnline) return;

    const maxDelay = (this.client.onlineManager.pingFrequency - 1000) / 1000;
    const delay = Utils.getExponentialBackoffSeconds(maxDelay, Math.min(15, this._lostConnectionCount));
    logger.debug('Websocket Reconnect in ' + delay + ' seconds');
    this._reconnectId = setTimeout(this.connect.bind(this), delay);
  }
}

/**
 * Is the websocket connection currently open?
 * TODO: Integrate info from the layer.OnlineStateManager.
 * @type {Boolean}
 */
SocketManager.prototype.isOpen = false;

/**
 * setTimeout ID for calling connect()
 * @private
 * @type {Number}
 */
SocketManager.prototype._reconnectId = 0;

/**
 * setTimeout ID for calling _connectionFailed()
 * @private
 * @type {Number}
 */
SocketManager.prototype._connectionFailedId = 0;

SocketManager.prototype._lastTimestamp = null;
SocketManager.prototype._lastDataFromServerTimestamp = null;
SocketManager.prototype._lastCounter = null;
SocketManager.prototype._hasCounter = false;

SocketManager.prototype._inReplay = false;
SocketManager.prototype._needsReplayFrom = null;

/**
 * Frequency with which the websocket checks to see if any websocket notifications
 * have been missed.
 * @type {Number}
 */
SocketManager.prototype.pingFrequency = 30000;

/**
 * The Client that owns this.
 * @type {layer.Client}
 */
SocketManager.prototype.client = null;

/**
 * The Socket Connection instance
 * @type {Websocket}
 */
SocketManager.prototype._socket = null;

/**
 * Is the websocket connection being closed by a call to close()?
 * If so, we can ignore any errors that signal the socket as closing.
 * @type {Boolean}
 */
SocketManager.prototype._closing = false;

/**
 * Number of failed attempts to reconnect.
 * @type {Number}
 */
SocketManager.prototype._lostConnectionCount = 0;


SocketManager._supportedEvents = [
  /**
   * A data packet has been received from the server.
   * @event message
   * @param {layer.LayerEvent} layerEvent
   * @param {Object} layerEvent.data - The data that was received from the server
   */
  'message',

  /**
   * The websocket is now connected.
   * @event connected
   * @protected
   */
  'connected',

  /**
   * The websocket is no longer connected
   * @event disconnected
   * @protected
   */
  'disconnected',

  /**
   * Websocket events were missed; we are resyncing with the server
   * @event replay-begun
   */
  'syncing',

  /**
   * Websocket events were missed; we resynced with the server and are now done
   * @event replay-begun
   */
  'synced',
].concat(Root._supportedEvents);
Root.initClass.apply(SocketManager, [SocketManager, 'SocketManager']);
module.exports = SocketManager;
