/**
 * Utility methods
 *
 * @class layer.ClientUtils
 */

const LayerParser = require('layer-patch');
/* istanbul ignore next */
const cryptoLib = typeof window !== 'undefined' ? window.crypto || window.msCrypto : null;

let getRandomValues;
/* istanbul ignore next */
if (typeof window === 'undefined') {
  getRandomValues = require('get-random-values');
} else if (cryptoLib) {
  getRandomValues = cryptoLib.getRandomValues.bind(cryptoLib);
}

/*
 * Generate a random UUID for modern browsers and nodejs
 */
function cryptoUUID() {
  const buf = new Uint16Array(8);
  getRandomValues(buf);
  const s4 = (num) => {
    let ret = num.toString(16);
    while (ret.length < 4) {
      ret = '0' + ret;
    }
    return ret;
  };
  return (
    s4(buf[0]) + s4(buf[1]) + '-' + s4(buf[2]) + '-' +
    s4(buf[3]) + '-' + s4(buf[4]) + '-' + s4(buf[5]) +
    s4(buf[6]) + s4(buf[7]));
}

/*
 * Generate a random UUID in IE10
 */
function mathUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

/**
 * Generate a random UUID
 *
 * @method
 * @return {string}
 */
exports.generateUUID = getRandomValues ? cryptoUUID : mathUUID;


/**
 * Returns the 'type' portion of a Layer ID.
 *
 *         switch(typeFromID(id)) {
 *             case 'conversations':
 *                 ...
 *             case 'message':
 *                 ...
 *             case: 'queries':
 *                 ...
 *         }
 *
 * Does not currently handle Layer App IDs.
 *
 * @method
 * @param  {string} id
 * @return {string}
 */
exports.typeFromID = (id) => {
  const matches = id.match(/layer\:\/\/\/(.*?)\//);
  return matches ? matches[1] : '';
};

exports.isEmpty = (obj) => Object.prototype.toString.apply(obj) === '[object Object]' && Object.keys(obj).length === 0;

/**
 * Simplified sort method.
 *
 * Provides a function to return the value to compare rather than do the comparison.
 *
 *      sortBy([{v: 3}, {v: 1}, v: 33}], function(value) {
 *          return value.v;
 *      }, false);
 *
 * @method
 * @param  {Mixed[]}   inArray      Array to sort
 * @param  {Function} fn            Function that will return a value to compare
 * @param  {Function} fn.value      Current value from inArray we are comparing, and from which a value should be extracted
 * @param  {boolean}  [reverse=false] Sort ascending (false) or descending (true)
 */
exports.sortBy = (inArray, fn, reverse) => {
  reverse = reverse ? -1 : 1;
  inArray.sort((valueA, valueB) => {
    const aa = fn(valueA);
    const bb = fn(valueB);
    if (aa === undefined && bb === undefined) return 0;
    if (aa === undefined && bb !== undefined) return 1;
    if (aa !== undefined && bb === undefined) return -1;
    if (aa > bb) return 1 * reverse;
    if (aa < bb) return -1 * reverse;
    return 0;
  });
};

/**
 * Quick and easy clone method.
 *
 * Does not work on circular references; should not be used
 * on objects with event listeners.
 *
 *      var newObj = clone(oldObj);
 *
 * @method
 * @param  {Object}     Object to clone
 * @return {Object}     New Object
 */
exports.clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Execute this function asynchronously.
 *
 * Defer will use SOME technique to delay execution of your function.
 * Defer() is intended for anything that should be processed after current execution has
 * completed, even if that means 0ms delay.
 *
 *      defer(function() {alert('That wasn't very long now was it!');});
 *
 * TODO: Add a postMessage handler.
 *
 * @method
 * @param  {Function} f
 */
exports.defer = (func) => setTimeout(func, 0);


/**
 * Returns a delay in seconds needed to follow an exponential
 * backoff pattern of delays for retrying a connection.
 *
  * Algorithm has two motivations:
  * 1. Retry with increasingly long intervals up to some maximum interval
  * 2. Randomize the retry interval enough so that a thousand clients
  * all following the same algorithm at the same time will not hit the
  * server at the exact same times.
  *
  * The following are results before jitter for some values of counter:

      0: 0.1
      1: 0.2
      2: 0.4
      3: 0.8
      4: 1.6
      5: 3.2
      6: 6.4
      7: 12.8
      8: 25.6
      9: 51.2
      10: 102.4
      11. 204.8
      12. 409.6
      13. 819.2
      14 1638.4 (27 minutes)

  * @method getExponentialBackoffSeconds
  * @param  {number} maxSeconds - This is not the maximum seconds delay, but rather
  * the maximum seconds delay BEFORE adding a randomized value.
  * @param  {number} counter - Current counter to use for calculating the delay; should be incremented up to some reasonable maximum value for each use.
  * @return {number}     Delay in seconds/fractions of a second
  */
exports.getExponentialBackoffSeconds = function getExponentialBackoffSeconds(maxSeconds, counter) {
  let secondsWaitTime = Math.pow(2, counter) / 10,
    secondsOffset = Math.random(); // value between 0-1 seconds.
  if (counter < 2) secondsOffset = secondsOffset / 4; // values less than 0.2 should be offset by 0-0.25 seconds
  else if (counter < 6) secondsOffset = secondsOffset / 2; // values between 0.2 and 1.0 should be offset by 0-0.5 seconds

  if (secondsWaitTime >= maxSeconds) secondsWaitTime = maxSeconds;

  return secondsWaitTime + secondsOffset;
};

let parser;

/**
 * Creates a LayerParser
 *
 * @method
 * @private
 * @param  {Object} request
 * @param {layer.Client} client
 */
function createParser(request) {
  request.client.once('destroy', () => parser = null);

  parser = new LayerParser({
    camelCase: true,
    getObjectCallback: (id) => {
      return request.client._getObject(id);
    },
    propertyNameMap: {
      Conversation: {
        unreadMessageCount: 'unreadCount',
      },
    },
    changeCallbacks: {
      Message: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
      Conversation: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
    },
  });
}

/**
 * Run the Layer Parser on the request.  Parameters here
 * are the parameters specied in the layer-patch, plus
 * a client object.
 *
 *      Util.layerParse({
 *          object: conversation,
 *          type: 'Conversation',
 *          operations: layerPatchOperations,
 *          client: client
 *      });
 *
 * @method
 * @param {Object} request - layer-patch parameters
 * @param {Object} object - Object being updated  by the operations
 * @param {string} type - Type of object being updated
 * @param {Object[]} operations - Array of change operations to perform upon the object
 * @param {layer.Client} client
 */
exports.layerParse = (request) => {
  if (!parser) createParser(request);
  parser.parse(request);
};

/**
 * Object comparison.
 *
 * Does a recursive traversal of two objects verifying that they are the same.
 * Is able to make metadata-restricted assumptions such as that
 * all values are either plain Objects or strings.
 *
 *      if (doesObjectMatch(conv1.metadata, conv2.metadata)) {
 *          alert('These two metadata objects are the same');
 *      }
 *
 * @method
 * @param  {Object} requestedData
 * @param  {Object} actualData
 * @return {boolean}
 */
exports.doesObjectMatch = (requestedData, actualData) => {
  if (!requestedData && actualData || requestedData && !actualData) return false;
  const requestedKeys = Object.keys(requestedData).sort();
  const actualKeys = Object.keys(actualData).sort();

  // If there are a different number of keys, fail.
  if (requestedKeys.length !== actualKeys.length) return false;

  // Compare key name and value at each index
  for (let index = 0; index < requestedKeys.length; index++) {
    const k1 = requestedKeys[index];
    const k2 = actualKeys[index];
    const v1 = requestedData[k1];
    const v2 = actualData[k2];
    if (k1 !== k2) return false;
    if (v1 && typeof v1 === 'object') {
      // Array comparison is not used by the Web SDK at this time.
      if (Array.isArray(v1)) {
        throw new Error('Array comparison not handled yet');
      } else if (!exports.doesObjectMatch(v1, v2)) {
        return false;
      }
    } else if (v1 !== v2) {
      return false;
    }
  }
  return true;
};
