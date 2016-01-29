/**
 * Basic XHR Library with some notions hardcoded in
 * of what the Layer server expects/returns.
 *
 * @class layer.xhr
 */

/**
 * Send a Request.
 *
 *
  layer.xhr({
    url: 'http://my.com/mydata',
    data: {hey: 'ho', there: 'folk'},
    method: 'GET',
    format: 'json',
    headers: {'fred': 'Joe'},
    timeout: 50000
  }, function(result) {
    if (!result.success) {
      errorHandler(result.data, result.headers, result.status);
    } else {
      successHandler(result.data, result.headers, result.xhr);
    }
  });
 *
 *
 * @method  xhr
 * @param {Object} options
 * @param {string} options.url
 * @param {Mixed} [options.data=null]
 * @param {string} [options.format=''] - set to 'json' to get result parsed as json (in case there is no obvious Content-Type in the response)
 * @param {Object} [options.headers={}] - Name value pairs for  headers and their values
 * @param {number} [options.timeout=0] - When does the request expire/timeout in miliseconds.
 * @param {Function} callback
 * @param {Object} callback.result
 * @param {number} callback.result.status - http status code
 * @param {boolean} callback.result.success - true if it was a successful response
 * @param {XMLHttpRequest} callback.result.xhr - The XHR object used for the request
 * @param {Object} callback.result.data -  The parsed response body
 *
 * TODO:
 *
 * 1. Make this a subclass of Root and make it a singleton so it can inherit a proper event system
 * 2. Result should be a layer.ServerResponse instance
 * 3. Babelify this
 * 4. Should only access link headers if requested; annoying having it throw errors every other time.
 */

// Don't set xhr to window.XMLHttpRequest as it will bypass jasmine's
// ajax library
const Xhr = (typeof window === 'undefined') ? require('xhr2') : null;

function parseLinkHeaders(linkHeader) {
  if (!linkHeader) return {};

  // Split parts by comma
  const parts = linkHeader.split(',');
  const links = {};

  // Parse each part into a named link
  parts.forEach(part => {
    const section = part.split(';');
    if (section.length !== 2) return;
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const name = section[1].replace(/rel='?(.*)'?/, '$1').trim();
    links[name] = url;
  });

  return links;
}

module.exports = (request, callback) => {
  const req = Xhr ? new Xhr() : new XMLHttpRequest();
  const method = (request.method || 'GET').toUpperCase();

  const onload = function() {
    //console.log('RESPONSE:' + this.status);
    //console.log(this.responseText);
    const headers = {'content-type': this.getResponseHeader('content-type')};

    const result = {
      status: this.status,
      success: this.status && this.status < 300,
      xhr: this,
    };
    const isJSON = (String(headers['content-type']).split(/;/)[0].match(/^application\/json/) ||
           request.format === 'json');

    if (this.responseType === 'blob' || this.responseType === 'arraybuffer') {
      // Damnit, this.response is a function if using jasmine test framework.
      result.data = typeof this.response === 'function' ? this.responseText : this.response;
    } else {
      if (isJSON && this.responseText) {
        try {
          result.data = JSON.parse(this.responseText);
        } catch (err) {
          result.data = {
            code: 999,
            message: 'Invalid JSON from server',
            response: this.responseText,
          };
          result.status = 999;
        }
      } else {
        result.data = this.responseText;
      }


      module.exports.trigger({
        target: this,
        status: !this.responseText && !this.status ? 'connection:error' : 'connection:success'
      });

      if (!this.responseText && !this.status) {
        result.status = 408;
        result.data = {
          id: 'request_timeout',
          message: 'The server is not responding and maybe has a marshmallow melting in the hard drive',
          url: 'https://www.google.com/#q=marshmallow+melting+in+hard+drive',
          code: 0,
          status: 408,
          httpStatus: 408,
        };
      } else if (this.status === 404 && typeof result.data !== 'object') {
        result.data = {
          id: 'operation_not_found',
          message: 'Endpoint ' + (request.method || 'GET') + ' ' + request.url + ' does not exist',
          status: this.status,
          httpStatus: 404,
          code: 106,
          url: 'https://developer.layer.com',
        };
      } else if (typeof result.data === 'string' && this.status >= 400) {
        result.data = {
          id: 'unknown_error',
          message: result.data,
          status: this.status,
          httpStatus: this.status,
          code: 0,
          url: 'https://developer.layer.com',
        };
      }
    }

    if (request.headers && (request.headers.accept || '').match(/application\/vnd.layer\+json/)) {
      const links = this.getResponseHeader('link');
      if (links) result.Links = parseLinkHeaders(links);
    }
    result.xhr = this;

    if (callback) callback(result);
  };

  req.onload = onload;

  // UNTESTED!!!
  req.onerror = req.ontimeout = onload;

  // Replace all headers in arbitrary case with all lower case
  // for easy matching.
  const headersList = Object.keys(request.headers || {});
  const headers = {};
  headersList.forEach(header => {
    if (header.toLowerCase() === 'content-type') {
      headers['content-type'] = request.headers[header];
    } else {
      headers[header.toLowerCase()] = request.headers[header];
    }
  });
  request.headers = headers;

  let data = '';
  if (request.data) {
    if (typeof Blob !== 'undefined' && request.data instanceof Blob) {
      data = request.data;
    } else if (request.headers && (
        String(request.headers['content-type']).match(/^application\/json/) ||
        String(request.headers['content-type']) === 'application/vnd.layer-patch+json')
    ) {
      data = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);
    } else if (request.data && typeof request.data === 'object') {
      for (let name in request.data) {
        if (request.data.hasOwnProperty(name)) {
          if (data) data += '&';
          data += name + '=' + request.data[name];
        }
      }
    } else {
      data = request.data; // Some form of raw string/data
    }
  }
  if (data) {
    if (method === 'GET') {
      request.url += '?' + data;
    }
  }

  req.open(method, request.url, true);
  if (request.timeout) req.timeout = request.timeout;
  if (request.withCredentials) req.withCredentials = true;
  if (request.responseType) req.responseType = request.responseType;

  if (request.headers) {
    for (let headerName in request.headers) {
      if (request.headers.hasOwnProperty(headerName)) {
        req.setRequestHeader(headerName, request.headers[headerName]);
      }
    }
  }
  //console.trace('SENDING');
  //console.dir(request);
  if (method === 'GET') {
    req.send();
  } else {
    req.send(data);
  }
};

const listeners = [];
module.exports.addConnectionListener = func => listeners.push(func);

module.exports.trigger = (evt) => {
  listeners.forEach(func => {
    func(evt);
  });
};
