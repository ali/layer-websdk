/**
 * This class represents a Layer Error.
 *
 * At this point, a LayerError is only used in response to an error from the server.
 * It may be extended to report on internal errors... but typically internal errors
 * are reported via `throw new Error(...);`
 *
 * Layer Error is passed as part of the layer.LayerEvent's data property.
 *
 *     object.trigger('xxx-error', new LayerEvent({data: new LayerError()}));
 *
 * @class layer.LayerError
 */
const Logger = require('./logger');
class LayerError {
  constructor(options) {
    if (options instanceof LayerError) {
      options = {
        errType: options.errType,
        httpStatus: options.httpStatus,
        message: options.message,
        code: options.code,
        url: options.url,
        data: options.data,
      };
    } else if (options && typeof options === 'object') {
      options.errType = options.id;
    } else {
      options = {
        message: options,
      };
    }

    let name;
    for (name in options) {
      /* istanbul ignore else */
      if (options.hasOwnProperty(name)) {
        this[name] = options[name];
      }
    }

    if (!this.data) this.data = {};
  }

  /**
   * Returns either '' or a nonce.
   *
   * If a nonce has been returned
   * by the server as part of a session-expiration error,
   * then a nonce will be returned.
   *
   * @method getNonce
   * @return {string} nonce
   */
  getNonce() {
    return (this.data && this.data.nonce) ? this.data.nonce : '';
  }

  /**
   * String representation of the error
   *
   * @method toString
   * @return {string}
   */
  toString() {
    return this.code + ' (' + this.id + '): ' + this.message + '; (see ' + this.url + ')';
  }

  /**
   * Log the errors
   *
   * @method log
   * @deprecated see layer.Logger
   */
  log() {
    Logger.error('Layer-Error: ' + this.toString());
  }

}

/**
 * A string name for the event; these names are paired with codes, and can be
 * looked up at https://github.com/layerhq/docs/blob/web-api/specs/rest-api.md#client-errors
 * @type {String}
 */
LayerError.prototype.errType = '';

/**
 * Numerical error code.
 *
 * https://developer.layer.com/docs/client/rest#full-list
 * @type {Number}
 */
LayerError.prototype.code = 0;

/**
 * URL to go to for more information on this error.
 * @type {String}
 */
LayerError.prototype.url = '';

/**
 * Detailed description of the error.
 * @type {String}
 */
LayerError.prototype.message = '';

/**
 * Http error code. No value if its a websocket response.
 * @type {Number}
 */
LayerError.prototype.httpStatus = 0;

/**
 * Contains data from the xhr request object.
 *
 *  * url: the url to the service endpoint
 *  * data: xhr.data,
 *  * xhr: xhr object
 *
 * @type {Object}
 */
LayerError.prototype.request = null;

/**
 * Any additional details about the error sent as additional properties.
 * @type {Object}
 */
LayerError.prototype.data = null;

/**
 * Pointer to the xhr object that fired the actual request and contains the response.
 * @type {XMLHttpRequest}
 */
LayerError.prototype.xhr = null;

/**
 * Dictionary of error messages
 * @type {Object}
 */
LayerError.dictionary = {
  appIdMissing: 'Property missing: appId is required',
  identityTokenMissing: 'Identity Token missing: answerAuthenticationChallenge requires an identity token',
  sessionTokenMissing: 'Session Token missing: _authComplete requires a {session_token: value} input',
  clientMissing: 'Property missing: client is required',
  conversationMissing: 'Property missing: conversation is required',
  partsMissing: 'Property missing: parts is required',
  moreParticipantsRequired: 'Conversation needs participants other than the current user',
  isDestroyed: 'Object is destroyed',
  urlRequired: 'Object needs a url property',
  invalidUrl: 'URL is invalid',
  invalidId: 'Identifier is invalid',
  idParamRequired: 'The ID Parameter is required',
  wrongClass: 'Parameter class error; should be: ',
  inProgress: 'Operation already in progress',
  cantChangeIfConnected: 'You can not change value after connecting',
  alreadySent: 'Already sent or sending',
  contentRequired: 'MessagePart requires rich content for this call',
  alreadyDestroyed: 'This object has already been destroyed',
};

module.exports = LayerError;
