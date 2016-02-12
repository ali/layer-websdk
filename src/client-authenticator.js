/**
 * Layer Client.  Access the layer by calling create and receiving it
 * from the "ready" callback.

  var client = new layer.Client({
    appId: "layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff",
    userId: "Dref",
    challenge: function(evt) {
      myAuthenticator({
        nonce: evt.nonce,
        onSuccess: evt.callback
      });
    },
    ready: function(client) {
      alert("Yay, I finally got my client!");
    }
  });

 * The Layer Client/ClientAuthenticator classes have been divided into:
 *
 * 1. ClientAuthenticator: Manages all authentication and connectivity related issues
 * 2. Client: Manages access to Conversations, Queries, Messages, Events, etc...
 *
 * @class layer.ClientAuthenticator
 * @private
 * @extends layer.Root
 * @author Michael Kantor
 *
 */

const xhr = require('./xhr');
const Root = require('./root');
const SocketManager = require('./websockets/socket-manager');
const WebsocketChangeManager = require('./websockets/change-manager');
const WebsocketRequestManager = require('./websockets/request-manager');
const LayerError = require('./layer-error');
const OnlineManager = require('./online-state-manager');
const SyncManager = require('./sync-manager');
const { XHRSyncEvent, WebsocketSyncEvent } = require('./sync-event');
const { ACCEPT, LOCALSTORAGE_KEYS, LOG } = require('./const');
const atob = typeof window === 'undefined' ? require('atob') : window.atob;
const logger = require('./logger');

const MAX_XHR_RETRIES = 3;

class Client extends Root {

  /**
   * Create a new Client.
   *
   * While the appId is the only required parameter, the userId parameter
   * is strongly recommended.
   *
   *      var client = new Client({
   *          appId: "layer:///apps/staging/uuid",
   *          userId: "fred"
   *      });
   *
   * @method constructor
   * @param  {Object} options
   * @param  {string} options.appId           - "layer:///apps/production/uuid"; Identifies what
   *                                            application we are connecting to.
   * @param  {string} [options.url=https://api.layer.com] - URL to log into a different REST server
   * @param  {string} [options.userId='']       - If you provide a userId, we will
   *                                            compare the userId against the one in localStorage
   *                                            to validate use of the cached sessionToken.  This is
   *                                            useful for insuring a change in users in your app
   *                                            gets a change in Layer Sessions.  Failure to provide this
   *                                            parameter means that we will NOT restore the session token.
   * @param {number} [options.logLevel=ERROR] - Provide a log level that is one of layer.Constants.LOG.NONE, layer.Constants.LOG.ERROR,
   *                                            layer.Constants.LOG.WARN, layer.Constants.LOG.INFO, layer.Constants.LOG.DEBUG
   */
  constructor(options) {
    // Validate required parameters
    if (!options.appId) throw new Error(LayerError.dictionary.appIdMissing);

    // We won't copy in userId; thats set from the identity-token... or from cache.
    // the userId argument is a way to identify if there has been a change of users.
    const requestedUserId = options.userId;
    let cachedSessionData = '', cachedUserId = '';
    try {
      cachedSessionData = global.localStorage ? global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + options.appId] : null;
      cachedUserId = cachedSessionData ? JSON.parse(cachedSessionData).userId : '';
    } catch (error) {
      // Do nothing
    }

    delete options.userId;

    super(options);

    this.url = this.url.replace(/\/$/, '');

    // If we've been provided with a user id as a parameter, attempt to restore the session.
    if (requestedUserId) {
      this._restoreLastSession(options, requestedUserId, cachedUserId);
    }
  }

  /**
   * Handles cases where constructor is given a userId OR a userID + sessionToken.
   *
   * @method _restoreLastSession
   * @private
   */
  _restoreLastSession(options, requestedUserId, cachedUserId) {
    const sessionToken = options.sessionToken || this._getSessionToken();
    if (options.sessionToken) {
      this.userId = requestedUserId;
    } else if (sessionToken && cachedUserId === requestedUserId) {
      this.sessionToken = sessionToken;
      this.userId = requestedUserId;
    } else {
      this.sessionToken = '';
      this.userId = '';
    }
  }

  /**
   * Initialize the subcomponents of the ClientAuthenticator
   *
   * @method _initComponents
   * @private
   */
  _initComponents() {
    // Setup the websocket manager; won't connect until we trigger an authenticated event
    this.socketManager = new SocketManager({
      client: this,
    });

    this.socketChangeManager = new WebsocketChangeManager({
      client: this,
      socketManager: this.socketManager,
    });

    this.socketRequestManager = new WebsocketRequestManager({
      client: this,
      socketManager: this.socketManager,
    });

    this.onlineManager = new OnlineManager({
      socketManager: this.socketManager,
      testUrl: this.url + '/nonces?connection-test',
      connected: this._handleOnlineChange.bind(this),
      disconnected: this._handleOnlineChange.bind(this),
    });

    this.syncManager = new SyncManager({
      onlineManager: this.onlineManager,
      socketManager: this.socketManager,
      requestManager: this.socketRequestManager,
      client: this,
    });

    this._connect();
  }

  /**
   * Destroy the subcomponents of the ClientAuthenticator
   *
   * @method _destroyComponents
   * @private
   */
  _destroyComponents() {
    this.syncManager.destroy();
    this.onlineManager.destroy();
    this.socketManager.destroy();
    this.socketChangeManager.destroy();
    this.socketRequestManager.destroy();
  }

  /**
   * Gets/restores the sessionToken
   *
   * @private
   * @method _getSessionToken
   * @return {string}
   */
  _getSessionToken() {
    if (this.sessionToken) return this.sessionToken;
    const cachedSessionData = global.localStorage ? global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] : '{}';
    try {
      return JSON.parse(cachedSessionData).sessionToken;
    } catch (error) {
      return '';
    }
  }


  /* CONNECT METHODS BEGIN */

  /**
   * Initiates the connection.
   *
   * Called by constructor().
   *
   * Will either attempt to validate the cached sessionToken by getting converations,
   * or if no sessionToken, will call /nonces to start process of getting a new one.
   *
   * @private
   * @method _connect
   *
   * TODO: Need to be able to configure what the test request is.  A Query? A Message?  Should
   * not be hardcoded to create a Conversation
   */
  _connect() {
    if (this.sessionToken) {
      // This will return an error with a nonce if the token is not valid.
      this.xhr({
        url: '/messages/ffffffff-ffff-ffff-ffff-ffffffffffff',
        method: 'GET',
        sync: false,
        headers: {
          'content-type': 'application/json',
        },
      }, (result) => this._connectionWithSessionResponse(result));
    } else {
      this.xhr({
        url: '/nonces',
        method: 'POST',
        sync: false,
      }, (result) => this._connectionResponse(result));
    }
  }

  /**
   * Called when our test of our last sessionToken gets a response.
   *
   * If the response is an error, call _sessionTokenExpired with the new nonce
   * returned in the error.
   *
   * If the response is successful, then, well, we have Conversations, and can call _sessionTokenRestored
   * with those Conversations.
   *
   * @private
   * @method _connectionWithSessionResponse
   * @param  {Object} result
   */
  _connectionWithSessionResponse(result) {
    if (!result.success && result.data.getNonce()) {
      this._sessionTokenExpired(result.data.getNonce());
    } else {
      this._sessionTokenRestored(result.data);
    }
  }

  /**
   * Called when our request for a nonce gets a response.
   *
   * If there is an error, calls _connectionError.
   *
   * If there is nonce, calls _connectionComplete.
   *
   * @method _connectionResponse
   * @private
   * @param  {Object} result
   */
  _connectionResponse(result) {
    if (!result.success) {
      this._connectionError(result.data);
    } else {
      this._connectionComplete(result.data);
    }
  }

  /**
   * We are now connected (we have a nonce).
   *
   * If we have successfully retrieved a nonce, then
   * we have entered a "connected" but not "authenticated" state.
   * Set the state, trigger any events, and then start authentication.
   *
   * @method _connectionComplete
   * @private
   * @param  {Object} result
   * @param  {string} result.nonce - The nonce provided by the server
   *
   * @fires connected
   */
  _connectionComplete(result) {
    this.isConnected = true;
    this.trigger('connected');
    this._authenticate(result.nonce);
  }

  /**
   * Called when we fail to get a nonce.
   *
   * @method _connectionError
   * @private
   * @param  {layer.LayerError} err
   *
   * @fires connected-error
   */
  _connectionError(error) {
    this.trigger('connected-error', { error });
  }


  /* CONNECT METHODS END */

  /* AUTHENTICATE METHODS BEGIN */

  /**
   * Start the authentication step.
   *
   * We start authentication by triggering a "challenge" event that
   * tells the app to use the nonce to obtain an identity_token.
   *
   * @method _authenticate
   * @private
   * @param  {string} nonce - The nonce to provide your identity provider service
   *
   * @fires challenge
   */
  _authenticate(nonce) {
    if (nonce) {
      this.trigger('challenge', {
        nonce: nonce,
        callback: this.answerAuthenticationChallenge.bind(this),
      });
    }
  }

  /**
   * Accept an identityToken and use it to create a session.
   *
   * Typically, this method is called using the function pointer provided by
   * the challenge event, but it can also be called directly.
   *
   *      getIdentityToken(nonce, function(identityToken) {
   *          client.answerAuthenticationChallenge(identityToken);
   *      });
   *
   * @method answerAuthenticationChallenge
   * @param  {string} identityToken - Identity token provided by your identity provider service
   */
  answerAuthenticationChallenge(identityToken) {
    // Report an error if no identityToken provided
    if (!identityToken) {
      throw new Error(LayerError.dictionary.identityTokenMissing);
    } else {
      // Store the UserId and get a sessionToken; bypass the __adjustUserId connected test
      this.__userId = JSON.parse(atob(identityToken.split('.')[1])).prn;
      this.xhr({
        url: '/sessions',
        method: 'POST',
        sync: false,
        data: {
          'identity_token': identityToken,
          'app_id': this.appId,
        },
      }, (result) => this._authResponse(result, identityToken));
    }
  }

  /**
   * Called when our request for a sessionToken receives a response.
   *
   * @private
   * @method _authResponse
   * @param  {Object} result
   * @param  {string} identityToken
   */
  _authResponse(result, identityToken) {
    if (!result.success) {
      this._authError(result.data, identityToken);
    } else {
      this._authComplete(result.data);
    }
  }


  /**
   * Authentication is completed, update state and trigger events.
   *
   * @method _authComplete
   * @private
   * @param  {Object} result
   * @param  {string} result.session_token - Session token received from the server
   *
   * @fires authenticated
   */
  _authComplete(result) {
    if (!result || !result.session_token) {
      throw new Error(LayerError.dictionary.sessionTokenMissing);
    }
    this.sessionToken = result.session_token;

    // NOTE: We store both items of data in a single key because someone listening for storage
    // events is listening for an asynchronous change, and we need to gaurentee that both
    // userId and session are available.
    if (global.localStorage) {
      try {
        global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] = JSON.stringify({
          sessionToken: this.sessionToken || '',
          userId: this.userId || '',
        });
      } catch (e) {
        // Do nothing
      }
    }

    this.isAuthenticated = true;
    this.trigger('authenticated');
    this._clientReady();
  }

  /**
   * Authentication has failed.
   *
   * @method _authError
   * @private
   * @param  {layer.LayerError} result
   * @param  {string} identityToken Not currently used
   *
   * @fires authenticated-error
   */
  _authError(error, identityToken) {
    this.trigger('authenticated-error', { error });
  }

  /**
   * Sets state and triggers events for both connected and authenticated.
   *
   * If reusing a sessionToken cached in localStorage,
   * use this method rather than _authComplete.
   *
   * @method _sessionTokenRestored
   * @private
   *
   * @fires connected, authenticated
   */
  _sessionTokenRestored(result) {
    this.isConnected = true;
    this.trigger('connected');
    this.isAuthenticated = true;
    this.trigger('authenticated');
    this._clientReady();
  }

  /**
   * Tried to reuse a cached sessionToken but was rejected.
   *
   * On failing to restore a sessionToken stored in localStorage,
   * Start the connect() process anew.
   *
   * @method _sessionTokenExpired
   * @private
   */
  _sessionTokenExpired(nonce) {
    this.sessionToken = '';
    if (global.localStorage) {
      localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
    }
    this._authenticate(nonce);
  }

  /**
   * Called to flag the client as ready for action.
   *
   * This method is called after authenication AND
   * after initial conversations have been loaded.
   *
   * @method _clientReady
   * @private
   * @fires ready
   */
  _clientReady() {
    if (!this.isReady) {
      this.isReady = true;
      this.trigger('ready');
      this.onlineManager.start();
    }
  }


  /* CONNECT METHODS END */


  /* START SESSION MANAGEMENT METHODS */

  /**
   * Deletes your sessionToken from the server, and removes all user data from the Client.
   * Call `client.login()` to restart the authentication process.
   *
   * @method logout
   * @return {layer.Client} this
   */
  logout() {
    if (this.isAuthenticated) {
      this.xhr({
        method: 'DELETE',
        url: '/sessions/' + escape(this.sessionToken),
      });
    }

    // Clear data even if isAuthenticated is false
    // Session may have expired, but data still cached.
    this._resetSession();
    return this;
  }

  /**
   * This method is not needed under normal conditions.
   * However, if after calling `logout()` you want to
   * get a new nonce and trigger a new `challenge` event,
   * call `login()`.
   *
   * @method login
   * @return {layer.Client} this
   */
  login() {
    this._connect();
    return this;
  }

  /**
   * Log out/clear session information.
   *
   * Use this to clear the sessionToken and all information from this session.
   *
   * @method _resetSession
   * @private
   * @returns {layer.Client} this
   */
  _resetSession() {
    this.isReady = false;
    if (this.sessionToken) {
      this.sessionToken = '';
      if (global.localStorage) {
        localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
      }
    }
    this.isConnected = false;
    this.isAuthenticated = false;

    this.trigger('deauthenticated');
    this.onlineManager.stop();
  }

  /* SESSION MANAGEMENT METHODS END */


  /* ACCESSOR METHODS BEGIN */

  /**
   * __ Methods are automatically called by property setters.
   * Any attempt to execute `this.userAppId = 'xxx'` will cause an error to be thrown
   * if the client is already connected.
   *
   * @private
   * @method __adjustAppId
   * @param {string} value - New appId value
   */
  __adjustAppId(value) {
    if (this.isConnected) throw new Error(LayerError.dictionary.cantChangeIfConnected);
  }

  /**
   * __ Methods are automatically called by property setters.
   * Any attempt to execute `this.userId = 'xxx'` will cause an error to be thrown
   * if the client is already connected.
   *
   * @private
   * @method __adjustUserId
   * @param {string} value - New appId value
   */
  __adjustUserId(value) {
    if (this.isConnected) throw new Error(LayerError.dictionary.cantChangeIfConnected);
  }

  /* ACCESSOR METHODS END */


  /* COMMUNICATIONS METHODS BEGIN */
  sendSocketRequest(params, callback) {
    if (params.sync) {
      const target = params.sync.target;
      let depends = params.sync.depends;
      if (target && !depends) depends = [target];

      this.syncManager.request(new WebsocketSyncEvent({
        data: params.body,
        operation: params.method,
        target,
        depends,
        callback,
      }));
    } else {
      if (typeof params.data === 'function') params.data = params.data();
      this.socketRequestManager.sendRequest(params, callback);
    }
  }

  /**
   * This event handler receives events from the Online State Manager and generates an event for those subscribed
   * to client.on('online')
   *
   * @method _handleOnlineChange
   * @private
   * @param {layer.LayerEvent} evt
   */
  _handleOnlineChange(evt) {
    if (!this.isAuthenticated) return;
    const duration = evt.offlineDuration;
    const isOnline = evt.eventName === 'connected';
    const obj = { isOnline };
    if (isOnline) {
      obj.reset = duration > Client.ResetAfterOfflineDuration;
    }
    this.trigger('online', obj);
  }

  /**
   * Main entry point for sending xhr requests or for queing them in the syncManager.
   *
   * This call adjust arguments for our REST server.
   *
   * @method xhr
   * @protected
   * @param  {Object}   options
   * @param  {string}   options.url - URL relative client's url: "/conversations"
   * @param  {Function} callback
   * @param  {Object}   callback.result
   * @param  {Mixed}    callback.result.data - If an error occurred, this is a layer.LayerError;
   *                                          If the response was application/json, this will be an object
   *                                          If the response was text/empty, this will be text/empty
   * @param  {XMLHttpRequest} callback.result.xhr - Native xhr request object for detailed analysis
   * @param  {Object}         callback.result.Links - Hash of Link headers
   * @return {layer.ClientAuthenticator} this
   */
  xhr(options, callback) {
    if (typeof options.url === 'string') {
      options.url = this._xhrFixRelativeUrls(options.url);
    }

    options.withCredentials = true;
    if (!options.method) options.method = 'GET';
    if (!options.headers) options.headers = {};
    this._xhrFixHeaders(options.headers);
    this._xhrFixAuth(options.headers);


    // Note: this is not sync vs async; this is syncManager vs fire it now
    if (options.sync === false) {
      this._nonsyncXhr(options, callback, 0);
    } else {
      this._syncXhr(options, callback);
    }
    return this;
  }

  _syncXhr(options, callback) {
    if (!options.sync) options.sync = {};
    const innerCallback = (result) => {
      this._xhrResult(result, callback);
    };
    const target = options.sync.target;
    let depends = options.sync.depends;
    if (target && !depends) depends = [target];

    this.syncManager.request(new XHRSyncEvent({
      url: options.url,
      data: options.data,
      method: options.method,
      operation: options.sync.operation || options.method,
      headers: options.headers,
      callback: innerCallback,
      target,
      depends,
    }));
  }

  /**
   * For xhr calls that don't go through the sync manager,
   * fire the request, and if it fails, refire it up to 3 tries
   * before reporting an error.  1 second delay between requests
   * so whatever issue is occuring is a tiny bit more likely to resolve,
   * and so we don't hammer the server every time there's a problem.
   *
   * @method _nonsyncXhr
   * @param  {Object}   options
   * @param  {Function} callback
   * @param  {number}   retryCount
   */
  _nonsyncXhr(options, callback, retryCount) {
    xhr(options, result => {
      if ([502, 503, 504].indexOf(result.status) !== -1 && retryCount < MAX_XHR_RETRIES) {
        setTimeout(() => this._nonsyncXhr(options, callback, retryCount + 1), 1000);
      } else {
        this._xhrResult(result, callback);
      }
    });
  }

  /**
   * Fix authentication header for an xhr request
   *
   * @method _xhrFixAuth
   * @private
   * @param  {Object} headers
   */
  _xhrFixAuth(headers) {
    if (this.sessionToken && !headers.Authorization) {
      headers.authorization = 'Layer session-token="' +  this.sessionToken + '"'; // eslint-disable-line
    }
  }

  /**
   * Fix relative URLs to create absolute URLs needed for CORS requests.
   *
   * @method _xhrFixRelativeUrls
   * @private
   * @param  {string} relative or absolute url
   * @return {string} absolute url
   */
  _xhrFixRelativeUrls(url) {
    let result = url;
    if (url.indexOf('https://') === -1) {
      if (url[0] === '/') {
        result = this.url + url;
      } else {
        result = this.url + '/' + url;
      }
    }
    return result;
  }

  /**
   * Fixup all headers in preparation for an xhr call.
   *
   * 1. All headers use lower case names for standard/easy lookup
   * 2. Set the accept header
   * 3. If needed, set the content-type header
   *
   * @method _xhrFixHeaders
   * @private
   * @param  {Object} headers
   */
  _xhrFixHeaders(headers) {
    // Replace all headers in arbitrary case with all lower case
    // for easy matching.
    const headerNameList = Object.keys(headers);
    headerNameList.forEach(headerName => {
      if (headerName !== headerName.toLowerCase()) {
        headers[headerName.toLowerCase()] = headers[headerName];
        delete headers[headerName];
      }
    });

    if (!headers.accept) headers.accept = ACCEPT;

    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }

  /**
   * Handle the result of an xhr call
   *
   * @method _xhrResult
   * @private
   * @param  {Object}   result     Standard xhr response object from the xhr lib
   * @param  {Function} [callback] Callback on completion
   */
  _xhrResult(result, callback) {
    if (this.isDestroyed) return;

    if (!result.success) {
      // Replace the response with a LayerError instance
      if (result.data && typeof result.data === 'object') {
        this._generateError(result);
      }

      // If its an authentication error, reauthenticate
      // don't call _resetSession as that wipes all data and screws with UIs, and the user
      // is still authenticated on the customer's app even if not on Layer.
      if (result.status === 401 && this.isAuthenticated) {
        logger.warn('SESSION EXPIRED!');
        this.isAuthenticated = false;
        this.trigger('deauthenticated');
        this._authenticate(result.data.getNonce());
      }
    }
    if (callback) callback(result);
  }

  /**
   * Transforms xhr error response into a layer.LayerError instance.
   *
   * Adds additional information to the result object including
   *
   * * url
   * * data
   *
   * @method _generateError
   * @private
   * @param  {Object} result - Result of the xhr call
   */
  _generateError(result) {
    result.data = new LayerError(result.data);
    if (!result.data.httpStatus) result.data.httpStatus = result.status;
    result.data.log();
  }

  /* END COMMUNICATIONS METHODS */

}

/**
 * State variable; indicates that client is currently authenticated by the server.
 * Should never be true if isConnected is false.
 * @type {Boolean}
 */
Client.prototype.isAuthenticated = false;

/**
 * State variable; indicates that client is currently connected to server
 * (may not be authenticated yet)
 * @type {Boolean}
 */
Client.prototype.isConnected = false;

/**
 * State variable; indicates that client is ready for the app to use.
 * Use the 'ready' event to be notified when this value changes to true.
 *
 * @type {boolean}
 */
Client.prototype.isReady = false;

/**
 * Your Layer Application ID. This value can not be changed once connected.
 * To find your Layer Application ID, see your Layer Developer Dashboard.
 * @type {String}
 */
Client.prototype.appId = '';

/**
 * You can use this to find the userId you are logged in as.
 * You can set this in the constructor to verify that the client
 * will only restore a session if that session belonged to that same userId.
 * @type {String}
 */
Client.prototype.userId = '';

/**
 * Your current session token that authenticates your requests.
 * @type {String}
 */
Client.prototype.sessionToken = '';

/**
 * URL to Layer's Web API server.
 * @type {String}
 */
Client.prototype.url = 'https://api.layer.com';

/**
 * Web Socket Manager
 * @type {layer.Websockets.SocketManager}
 */
Client.prototype.socketManager = null;

/**
 * Web Socket Request Manager
* @type {layer.Websockets.RequestManager}
 */
Client.prototype.socketRequestManager = null;

/**
 * Web Socket Manager
 * @type {layer.Websockets.ChangeManager}
 */
Client.prototype.socketChangeManager = null;

/**
 * Service for managing online as well as offline server requests
 * @type {layer.SyncManager}
 */
Client.prototype.syncManager = null;

/**
 * Service for managing online/offline state and events
 * @type {layer.OnlineStateManager}
 */
Client.prototype.onlineManager = null;

/**
 * Is true if the client is authenticated and connected to the server;
 *
 * Typically used to determine if there is a connection to the server.
 *
 * Typically used in conjunction with the `online` event.
 *
 * @type {boolean}
 */
Object.defineProperty(Client.prototype, 'isOnline', {
  enumerable: true,
  get: function get() {
    return this.onlineManager && this.onlineManager.isOnline;
  },
});

/**
 * Log levels; one of:
 *
 *    * layer.Constants.LOG.NONE
 *    * layer.Constants.LOG.ERROR
 *    * layer.Constants.LOG.WARN
 *    * layer.Constants.LOG.INFO
 *    * layer.Constants.LOG.DEBUG
 *
 * @type {number}
 */
Object.defineProperty(Client.prototype, 'logLevel', {
  enumerable: false,
  get: function get() { return logger.level; },
  set: function set(value) { logger.level = value; },
});

/**
 * Time to be offline after which we don't do a WebSocket Events.replay,
 * but instead just refresh all our Query data.  Defaults to 30 hours.
 *
 * @type {number}
 * @static
 */
Client.ResetAfterOfflineDuration = 1000 * 60 * 60 * 30;
/**
 * List of events supported by this class
 * @static
 * @protected
 * @type {string[]}
 */
Client._supportedEvents = [
  /**
   * The client is ready for action
   *
   *      client.on('ready', function(evt) {
   *          renderMyUI();
   *      });
   *
   * @event
   */
  'ready',

  /**
   * Fired when connected to the server.
   * Currently just means we have a nonce.
   * Not recommended for typical applications.
   * @event connected
   */
  'connected',

  /**
   * Fired when unsuccessful in obtaining a nonce
   * Not recommended for typical applications.
   * @event connected-error
   * @param {Object} event
   * @param {layer.LayerError} event.error
   */
  'connected-error',

  /**
   * We now have a session and any requests we send aught to work.
   * Typically you should use the ready event instead of the authenticated event.
   * @event authenticated
   */
  'authenticated',

  /**
   * Failed to authenticate your client.
   *
   * Either your identity-token was invalid, or something went wrong
   * using your identity-token.
   *
   * @event authenticated-error
   * @param {Object} event
   * @param {layer.LayerError} event.error
   */
  'authenticated-error',

  /**
   * This event fires when a session has expired or when `layer.Client.logout` is called.
   * Typically, it is enough to subscribe to the challenge event
   * which will let you reauthenticate; typical applications do not need
   * to subscribe to this.
   *
   * @event deauthenticated
   */
  'deauthenticated',

  /**
   * @event challenge
   * Verify the user's identity.
   *
   * This event is where you verify that the user is who we all think the user is,
   * and provide an identity token to validate that.
   *
   * @param {Object} event
   * @param {string} event.nonce - A nonce for you to provide to your identity provider
   * @param {Function} event.callback - Call this once you have an identity-token
   * @param {string} event.callback.identityToken - Identity token provided by your identity provider service
   */
  'challenge',

  /**
   * @event session-terminated
   * If your session has been terminated in such a way as to prevent automatic reconnect,
   *
   * this event will fire.  Common scenario: user has two tabs open;
   * one tab the user logs out (or you call client.logout()).
   * The other tab will detect that the sessionToken has been removed,
   * and will terminate its session as well.  In this scenario we do not want
   * to automatically trigger a challenge and restart the login process.
   */
  'session-terminated',

  /**
   * @event online
   *
   * This event is used to detect when the client is online (connected to the server)
   * or offline (still able to accept API calls but no longer able to sync to the server).
   *
   *      client.on('online', function(evt) {
   *         if (evt.isOnline) {
   *             statusDiv.style.backgroundColor = 'green';
   *         } else {
   *             statusDiv.style.backgroundColor = 'red';
   *         }
   *      });
   *
   * @param {Object} event
   * @param {boolean} event.isOnline
   */
  'online',
].concat(Root._supportedEvents);

Root.initClass.apply(Client, [Client, 'Client']);

module.exports = Client;
