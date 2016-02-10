/**
 * This class manages a state variable for whether we are online/offline, triggers events
 * when the state changes, and determines when to perform tests to validate our online status.
 *
 * It performs the following tasks:
 *
 * 1. Any time we go more than this.pingFrequency (100 seconds) without any data from the server, flag us as being offline.
 *    Rationale: The websocket manager is calling `getCounter` every 30 seconds; so it would have had to fail to get any response
 *    3 times before we give up.
 * 2. While we are offline, ping the server until we determine we are in fact able to connect to the server
 * 3. Trigger events `connected` and `disconnected` to let the rest of the system know when we are/are not connected.
 *    NOTE: The Websocket manager will use that to reconnect its websocket, and resume its `getCounter` call every 30 seconds.
 *
 * NOTE: Apps that want to be notified of changes to online/offline state should see layer.Client's `online` event.
 *
 * TODO: the testUrl needs an accompanying testMethod and testData; currently presumed
 * to be a nonces call
 *
 * NOTE: One iteration of this class treated navigator.onLine = false as fact.  If onLine is false, then we don't need to test
 * anything.  If its true, then this class verifies it can reach layer's servers.  However, https://code.google.com/p/chromium/issues/detail?id=277372 has replicated multiple times in chrome; this bug causes one tab of chrome to have navigator.onLine=false while all other tabs
 * correctly report navigator.onLine=true.  As a result, we can't rely on this value and this class must continue to poll the server while
 * offline and to ignore values from navigator.onLine.  Future Work: Allow non-chrome browsers to use navigator.onLine.
 *
 * @class  layer.OnlineStateManager
 * @private
 * @extends layer.Root
 *
 */
const Root = require('./root');
const xhr = require('./xhr');
const logger = require('./logger');
const Utils = require('./client-utils');

class OnlineStateManager extends Root {
  /**
   * Creates a new OnlineStateManager.  An Application is expected to only have one of these.
   *
   *      var onlineStateManager = new layer.OnlineStateManager({
   *          socketManager: socketManager,
   *          testUrl: 'https://api.layer.com/nonces'
   *      });
   *
   * @method constructor
   * @param  {Object} options
   * @param  {layer.Websockets.SocketManager} options.socketManager - A websocket manager to monitor for messages
   * @param  {string} options.testUrl - A url to send requests to when testing if we are online
   */
  constructor(options) {
    super(options);

    // Listen to all xhr events and websocket messages for online-status info
    xhr.addConnectionListener(evt => this._connectionListener(evt));
    this.socketManager.on('message', () => this._connectionListener({ status: 'connection:success' }), this);

    // Any change in online status reported by the browser should result in
    // an immediate update to our online/offline state
    /* istanbul ignore else */
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnlineEvent.bind(this));
      window.addEventListener('offline', this._handleOnlineEvent.bind(this));
    }
  }

  /**
   * We don't actually start managing our online state until after the client has authenticated.
   * Call start() when we are ready for the client to start managing our state.
   *
   * The client won't call start() without first validating that we have a valid session, so by definition,
   * calling start means we are online.
   *
   * @method start
   */
  start() {
    logger.info('OnlineStateManager: start');
    this.isClientReady = true;
    this.isOnline = true;
    if (!this._firstStart) {
      this.trigger('connected', { offlineDuration: 0 });
    }
    this._firstStart = false;
    this._scheduleNextOnlineCheck();
  }

  /**
   * If the client becomes unauthenticated, stop checking if we are online, and announce that we are offline.
   *
   * @method stop
   */
  stop() {
    logger.info('OnlineStateManager: stop');
    this.isClientReady = false;
    this._clearCheck();
    this._changeToOffline();
  }


  /**
   * Schedules our next call to _onlineExpired if online or checkOnlineStatus if offline.
   *
   * @method _scheduleNextOnlineCheck
   * @private
   */
  _scheduleNextOnlineCheck() {
    logger.debug('OnlineStateManager: skip schedule');
    if (this.isDestroyed || !this.isClientReady) return;

    // Replace any scheduled calls with the newly scheduled call:
    this._clearCheck();

    // If this is called while we are online, then we are using this to detect when we've gone without data for more than pingFrequency.
    // Call this._onlineExpired after pingFrequency of no server responses.
    if (this.isOnline) {
      logger.debug('OnlineStateManager: Scheduled onlineExpired');
      this.onlineCheckId = setTimeout(this._onlineExpired.bind(this), this.pingFrequency);
    }

    // If this is called while we are offline, we're doing exponential backoff pinging the server to see if we've come back online.
    else {
      logger.info('OnlineStateManager: Scheduled checkOnlineStatus');
      const duration = Utils.getExponentialBackoffSeconds(this.maxOfflineWait, Math.min(10, this.offlineCounter++));
      this.onlineCheckId = setTimeout(this.checkOnlineStatus.bind(this), Math.floor(duration * 1000));
    }
  }

  /**
   * Cancels any upcoming calls to checkOnlineStatus
   *
   * @method _clearCheck
   * @private
   */
  _clearCheck() {
    if (this.onlineCheckId) {
      clearTimeout(this.onlineCheckId);
      this.onlineCheckId = 0;
    }
  }

  /**
   * Respond to the browser's online/offline events.
   * Our response is not to trust them, but to use them as
   * a trigger to indicate we should immediately do our own
   * validation.
   *
   * @method _handleOnlineEvent
   * @private
   * @param  {Event} evt - Browser online/offline event object
   */
  _handleOnlineEvent(evt) {
    // Reset the counter because our first request may fail as they may not be
    // fully connected yet
    this.offlineCounter = 0;
    this.checkOnlineStatus();
  }

  /**
   * If this method gets called, it means that our connection has gone too long without any data
   * and is now considered to be disconnected.
   *
   * @method _onlineExpired
   * @private
   */
  _onlineExpired() {
    this._clearCheck();
    this._changeToOffline();
    this._scheduleNextOnlineCheck();
  }

  /**
   * Get a nonce to see if we can reach the server.  We don't care about the result,
   * we just care about triggering a 'connection:success' or 'connection:error' event
   * which connectionListener will respond to.
   *
   *      client.onlineManager.checkOnlineStatus(function(result) {
   *          alert(result ? 'We're online!' : 'Doh!');
   *      });
   *
   * @method checkOnlineStatus
   * @param {Function} callback
   * @param {boolean} callback.isOnline - Callback is called with true if online, false if not
   */
  checkOnlineStatus(callback) {
    this._clearCheck();

    logger.info('OnlineStateManager: Firing XHR for online check');
    this._lastCheckOnlineStatus = new Date();
    // Ping the server and see if we're connected.
    xhr({
      url: this.testUrl,
      method: 'POST',
      headers: {
        accept: 'application/vnd.layer+json; version=1.0',
      },
    }, () => {
      // this.isOnline will be updated via _connectionListener prior to this line executing
      if (callback) callback(this.isOnline);
    });
  }


  /**
   * On determining that we are offline, handles the state transition and logging.
   *
   * @method _changeToOffline
   * @private
   */
  _changeToOffline() {
    if (this.isOnline) {
      this.isOnline = false;
      this.trigger('disconnected');
      logger.info('OnlineStateManager: Connection lost');
    }
  }

  /**
   * Called whenever a websocket event arrives, or an xhr call completes; updates our isOnline state.
   *
   * Any call to this method will reschedule our next is-online test
   *
   * @method _connectionListener
   * @private
   * @param  {string} evt - Name of the event; either 'connection:success' or 'connection:error'
   */
  _connectionListener(evt) {
    // If event is a success, change us to online
    if (evt.status === 'connection:success') {
      const lastTime = this.lastMessageTime;
      this.lastMessageTime = new Date();
      if (!this.isOnline) {
        this.isOnline = true;
        this.offlineCounter = 0;
        this.trigger('connected', { offlineDuration: lastTime ? Date.now() - lastTime : 0 });
        if (this.connectedCounter === undefined) this.connectedCounter = 0;
        this.connectedCounter++;
        logger.info('OnlineStateManager: Connected restored');
      }
    }

    // If event is NOT success, change us to offline.
    else {
      this._changeToOffline();
    }

    this._scheduleNextOnlineCheck();
  }

  /**
   * Cleanup/shutdown
   *
   * @method destroy
   */
  destroy() {
    this._clearCheck();
    this.socketManager = null;
    super.destroy();
  }
}

OnlineStateManager.prototype.isClientReady = false;

/**
 * URL To fire when testing to see if we are online
 * @type {String}
 */
OnlineStateManager.prototype.testUrl = '';

/**
 * A Websocket manager whose 'message' event we will listen to
 * in order to know that we are still online.
 * @type {layer.Websockets.SocketManager}
 */
OnlineStateManager.prototype.socketManager = null;

/**
 * Number of testUrl requests we've been offline for.  Will stop growing
 * once the number is suitably large (10-20).
 * @type {Number}
 */
OnlineStateManager.prototype.offlineCounter = 0;

/**
 * While offline, exponential backoff is used to calculate how long to wait between checking with the server
 * to see if we are online again. This value determines the maximum wait; any higher value returned by exponential backoff
 * are ignored and this value used instead.
 * Value is measured in seconds.
 * @type {Number}
 */
OnlineStateManager.prototype.maxOfflineWait = 5 * 60;

/**
 * Minimum wait between tries in ms
 * @type {Number}
 */
OnlineStateManager.prototype.minBackoffWait = 100;

/**
 * Time that the last successful message was observed.
 * @type {Date}
 */
OnlineStateManager.prototype.lastMessageTime = null;

/**
 * For debugging, tracks the last time we checked if we are online
 * @type {Date}
 */
OnlineStateManager.prototype._lastCheckOnlineStatus = null;

/**
 * Are we currently online?
 * @type {Boolean}
 */
OnlineStateManager.prototype.isOnline = false;

/**
 * setTimeoutId for the next checkOnlineStatus() call
 * @type {Number}
 */
OnlineStateManager.prototype.onlineCheckId = 0;

/**
 * True until the first time start() is called.
 * @type {boolean}
 */
OnlineStateManager.prototype._firstStart = true;

/**
 * If we are online, how often do we need to ping to verify we are still online.
 * Value is reset any time we observe any messages from the server.
 * Measured in miliseconds. NOTE: Websocket has a separate ping which mostly makes
 * this one unnecessary.  May end up removing this one... though we'd keep the
 * ping for when our state is offline.
 * @type {Number}
 */
OnlineStateManager.prototype.pingFrequency = 100 * 1000;

OnlineStateManager._supportedEvents = [
  /**
   * We appear to be online and able to send and receive
   * @event connected
   * @param {number} onlineDuration - Number of miliseconds since we were last known to be online
   */
  'connected',

  /**
   * We appear to be offline and unable to send or receive
   * @event disconnected
   */
  'disconnected',
].concat(Root._supportedEvents);
Root.initClass.apply(OnlineStateManager, [OnlineStateManager, 'OnlineStateManager']);
module.exports = OnlineStateManager;
