/**
 * The MessagePart class represents an element of a message.
 *
 *      // Create a Message Part with any mimeType
 *      var part = new layer.MessagePart({
 *          body: "hello",
 *          mimeType: "text/plain"
 *      });
 *
 *      // Create a text/plain only Message Part
 *      var part = new layer.MessagePart("Hello I am text/plain");
 *
 * You can also create a Message Part from a File Input dom node:
 *
 *      var fileInputNode = document.getElementById("myFileInput");
 *      var part = new layer.MessagePart(fileInputNode.files[0]);
 *
 * You can also create Message Parts from a file drag and drop operation:
 *
 *      onFileDrop: function(evt) {
 *           var files = evt.dataTransfer.files;
 *           var m = conversation.createMessage({
 *               parts: files.map(function(file) {
 *                  return new layer.MessagePart({body: file, mimeType: file.type});
 *               }
 *           });
 *      });
 *
 * You can also use base64 encoded data:
 *
 *      var part = new layer.MessagePart({
 *          encoding: 'base64',
 *          mimeType: 'image/png',
 *          body: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAECElEQVR4Xu2ZO44TURREa0SAWBASKST8xCdDQMAq+OyAzw4ISfmLDBASISERi2ADEICEWrKlkYWny6+77fuqalJfz0zVOXNfv/ER8mXdwJF1+oRHBDCXIAJEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8waWjX8OwHcAv5f9Me3fPRugvbuxd14C8B7AVwA3q0oQAcYwtr2+hn969faPVSWIAG2AT3rXJvz17CcAN6ptgggwrwDb4JeVIALMJ8AY/JISRIB5BGDhr3/aZwDXKxwHEWC6AJcBvAOwfuBjvuNfABcBfGGGl5yJANPabYV/B8DLaT96nndHgPYeu4c/RI8AbQJIwO9FgDMAfrVxWuRdMvB7EOA+gHsALgD4uQjO3b6pFPzqAjwA8HTF5weA8weWQA5+ZQGOw1//jR5SAkn4VQV4CODJls18CAmuAHjbcM8vc9U76ZSrdgt4BODxyLG8Twla4P8BcLfKPX/sEaeSAAz8fR4H8vArHQHXAHwYs3Xj9SU3gQX8SgKcAvBitTp38WAJCWzgVxJg+F0qSGAFv5oAh5bADn5FAQ4lwVUAb3a86nX1tL/tXK10Czj+O+7zOLCFX3UDrEXYhwTW8KsLsPRx0Ap/+A/fq12uKpVnqx4BSx8Hgb9quAcB5t4EgX/sz6sXAeaSIPA3zqOeBJgqwTMAzxuuelJn/ubzSG8CTJFg12ex4Z4vDb+HW8A2aK1XRFYCC/g9C7DkJrCB37sAS0hgBV9BgDklGODfBvCaPScU5np8CPxf71OfCSzhq2yAqZ8d2MJXE6DlOLCGryjALhLYw1cVgJEg8Dv7MKjlgXvbg2Hgd/ph0BwSBH7nHwZNkeCW4z1/rDCV/wOM5RyOg7MAvo0Nur3uIoAbVzpvBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hz8BzIXtYE3VcPnAAAAAElFTkSuQmCC'
 *      });
 *
 * ### Accesing Rich Content
 *
 * There are two ways of accessing external content
 * 1. Access the data directly: `part.fetchContent(function(data) {myRenderData(data);})`. This approach downloads the data,
 *    writes it to the the `body` property, writes a Data URI to the part's `url` property, and then calls your callback.
 *    By downloading the data and storing it in `body`, the data does not expire.
 * 2. Access the URL rather than the data: `part.fetchStream(callback)`.  URLs are needed for streaming, and for content that doesn't
 *    yet need to be rendered (hyperlinks to data that will render when clicked).  These URLs expire.  The url property will return a
 *    string if the url is valid, or '' if its expired and fetchStream must be called to update the url.
 *    The following pattern is recommended:
 *
 *    if (!part.url) {
 *      part.fetchStream(function(url) {myRenderUrl(url)});
 *    } else {
 *      myRenderUrl(part.url);
 *    }
 *
 * NOTE: `part.url` should have a value when the message is first received, and will only fail `if (!part.url)` once the url has expired.
 *
 * @class  layer.MessagePart
 * @extends layer.Root
 * @author Michael Kantor
 */

const Root = require('./root');
const Content = require('./content');
const xhr = require('./xhr');
const ClientRegistry = require('./client-registry');
const LayerError = require('./layer-error');
const HasBlob = typeof Blob !== 'undefined';

/* istanbul ignore next */
let fileReader = typeof window === 'undefined' ? require('filereader') : FileReader;


class MessagePart extends Root {

  /**
   * Constructor
   *
   * @method constructor
   * @param  {Object} options - Can be an object with body and mimeType, or it can be a string, or a Blob/File
   * @param  {string} options.body - To send binary, use base64 encoded string
   * @param  {string} [options.mimeType=text/plain] - Mime type; can be anything; if your client doesn't have a renderer for it, it will be ignored.
   * @param  {number} [options.size=0] - Size of your part. Will be calculated for you if not provided.
   *
   * @return {layer.MessagePart}
   */
  constructor(options) {
    let newOptions = options;
    if (typeof options === 'string') {
      newOptions = {body: options};
      if (arguments.length > 1) {
        newOptions.mimeType = arguments[1];
      } else {
        newOptions.mimeType = 'text/plain';
      }
    } else if (HasBlob && (options instanceof Blob || options.body instanceof Blob)) {
      const bodyBlob = options instanceof Blob ? options : options.body;
      newOptions = {
        mimeType: bodyBlob.type,
        body: bodyBlob,
        size: bodyBlob.size,
        hasContent: true,
      };
    }
    super(newOptions);
    if (!this.size && this.body) this.size = this.body.length;
    if (HasBlob && this.body instanceof Blob) {
      this.url = URL.createObjectURL(this.body);
    }
  }

  destroy() {
    if (this.__url) {
      URL.revokeObjectURL(this.__url);
      this.__url = null;
    }
    this.body = null;
    super.destroy();
  }

  /**
   * Get the Client associated with this layer.MessagePart.
   *
   * Uses the clientId property.
   *
   * @method _getClient
   * @private
   * @return {layer.Client}
   */
  _getClient() {
    return ClientRegistry.get(this.clientId);
  }

  /**
   * Get the Message associated with this layer.MessagePart.
   *
   * NOTE: This only works if the MessagePart has an id (synced to server)
   *
   * @method _getMessage
   * @private
   * @return {layer.Message}
   */
  _getMessage() {
    return this._getClient().getMessage(this.id.replace(/\/parts.*$/, ''));
  }

  /**
   * Download Rich Content from cloud server.
   *
   * For MessageParts with external content, will load the data from google's cloud storage.
   * The body property of this MessagePart is set to the result.
   *
   *      messagepart.fetchContent()
   *      .on("content-loaded", function() {
   *          render(messagepart.body);
   *      });
   *
   * @method fetchContent
   * @param {Function} [callback]
   * @param {Mixed} callback.data - Either a string (mimeType=text/plain) or a Blob (all others)
   */
  fetchContent(callback) {
    if (this._content && !this.isFiring) {
      this.isFiring = true;
      const type = this.mimeType === 'image/jpeg+preview' ? 'image/jpeg' : this.mimeType;
      this._content.loadContent(type, result => this._fetchContentCallback(result, callback));
    }
    return this;
  }

  _fetchContentCallback(result, callback) {
    this.url = URL.createObjectURL(result);
    this.isFiring = false;
    if (this.mimeType === 'text/plain') {
      const reader = new fileReader();
      reader.addEventListener('loadend', () => {
        this._fetchContentComplete(reader.result, callback);
      });
      reader.readAsText(result);
    } else {
      this._fetchContentComplete(result, callback);
    }
  }

  _fetchContentComplete(body, callback) {
    const message = this._getMessage();

    this.body = body;

    this.trigger('content-loaded');
    message._triggerAsync('messages:change', {
      oldValue: message.parts,
      newValue: message.parts,
      property: 'parts',
    });
    if (callback) callback(this.body);
  }


  /**
   * Access the URL to the remote resource.
   *
   * For MessageParts with Rich Content, will lookup a URL to your Rich Content.
   * Useful for streaming and content so that you don't have to download the entire file before rendering it.
   *
   *      messagepart.fetchStream(function(url) {
   *          render(url);
   *      });
   *
   * @method fetchStream
   * @param {Function} [callback]
   * @param {Mixed} callback.url
   */
  fetchStream(callback) {
    if (!this._content) throw new Error(LayerError.dictionary.contentRequired);
    if (this._content.isExpired()) {
      this._content.refreshContent(this._getClient(), url => this._fetchStreamComplete(url, callback));

    } else {
      this._fetchStreamComplete(this._content.downloadUrl, callback);
    }
  }

  // Does not set this.url; instead relies on fact that this._content.downloadUrl has been updated
  _fetchStreamComplete(url, callback) {
    const message = this._getMessage();

    this.trigger('url-loaded');
    message._triggerAsync('messages:change', {
      oldValue: message.parts,
      newValue: message.parts,
      property: 'parts',
    });
    if (callback) callback(url);
  }

  /**
   * Preps a MessagePart for sending.  Normally that is trivial.
   * But if there is external content, then the content must be uploaded
   * and then we can trigger a "parts:send" event indicating that
   * the part is ready to send.
   *
   * @method _send
   * @protected
   * @param  {layer.Client} client
   * @fires parts:send
   */
  _send(client) {
    // There is already a Content object, presumably the developer
    // already took care of this step for us.
    if (this._content) {
      this._sendWithContent();
    }

    // If the size is large, Create and upload the Content
    if (this.size > 2048) {
      this._generateContentAndSend(client);
    }

    // If the body is a blob either base64 encode it
    else if (typeof Blob !== 'undefined' && this.body instanceof Blob) {
      this._sendBlob(client);
    }

    // Else the message part can be sent as is.
    else {
      this._sendBody();
    }
  }

  _sendBody() {
    const obj = {
      mime_type: this.mimeType,
      body: this.body,
    };
    if (this.encoding) obj.encoding = this.encoding;
    this.trigger('parts:send', obj);
  }

  _sendWithContent() {
    this.trigger('parts:send', {
      mime_type: this.mimeType,
      content: {
        size: this.size,
        id: this._content.id,
      },
    });
  }

  _sendBlob(client) {
    /* istanbul ignore else */
    if (window.isPhantomJS) fileReader = FileReader; // Assumes test script has replaced FileReader with a new object
    const reader = new fileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      if (base64data.length < 2048) {
        this.body = base64data;
        this.body = this.body.substring(this.body.indexOf(',') + 1);
        this.encoding = 'base64';
        this._sendBody(client);
      } else {
        this._generateContentAndSend(client);
      }
    };
    reader.readAsDataURL(this.body); // encodes to base64
  }

  /**
   * Create an External Content object on the server
   * and then call _processContentResponse
   *
   * @method _generateContentAndSend
   * @private
   * @param  {layer.Client} client
   */
  _generateContentAndSend(client) {
    this.hasContent = true;
    client.xhr({
      url: '/content',
      method: 'POST',
      headers: {
        'Upload-Content-Type': this.mimeType,
        'Upload-Content-Length': this.size,
        'Upload-Origin': typeof location !== 'undefined' ? location.origin : '',
      },
      sync: {},
    }, result => {
      this._processContentResponse(result.data, client);
    });
  }

  /**
   * Creates a Content object from the server's
   * Content object, and then uploads the data to google cloud storage.
   *
   * @method _processContentResponse
   * @private
   * @param  {Object} response
   * @param  {layer.Client} client
   */
  _processContentResponse(response, client) {
    this._content = new Content(response.id);
    this.hasContent = true;
    xhr({
      url: response.upload_url,
      method: 'PUT',
      data: this.body,
      headers: {
        'Upload-Content-Length': this.size,
        'Upload-Content-Type': this.mimeType,
      },
    }, result => this._processContentUploadResponse(result, response, client));
  }

  _processContentUploadResponse(uploadResult, contentResponse, client) {
    if (!uploadResult.success) {
      if (!client.onlineManager.isOnline) {
        client.onlineManager.once('connected', this._processContentResponse.bind(this, contentResponse, client), this);
      } else {
        console.error('We don\'t yet handle this!');
      }
    } else {
      this.trigger('parts:send', {
        mime_type: this.mimeType,
        content: {
          size: this.size,
          id: this._content.id,
        },
      });
    }
  }

  /**
   * Returns the text for any text/plain part.
   *
   * @method getText
   * @return {string}
   */
  getText() {
    if (this.mimeType === 'text/plain') {
      return this.body;
    } else {
      return '';
    }
  }

  // At this time, Parts do not change on the server so no update needed
  _populateFromServer(part) {
    // Do nothing
  }

  /**
   * Creates a MessagePart from a server representation of the part
   *
   * @method _createFromServer
   * @private
   * @static
   * @param  {Object} part - Server representation of a part
   */
  static _createFromServer(part) {
    const content = (part.content) ? Content._createFromServer(part.content) : null;

    return new MessagePart({
      id: part.id,
      mimeType: part.mime_type,
      body: part.body || '',
      _content: content,
      hasContent: Boolean(content),
      size: part.size || 0,
      encoding: part.encoding || '',
    });
  }
}

/**
 * Client that the conversation belongs to.
 *
 * Actual value of this string matches the appId.
 * @type {string}
 */
MessagePart.prototype.clientId = '';

/**
 * Server generated identifier for the part
 * @type {string}
 */
MessagePart.prototype.id = '';

/**
 * Body of your message part.
 *
 * This is the core data of your part.
 * @type {string}
 */
MessagePart.prototype.body = null;

/**
 * External content object.
 *
 * This will be automatically created for you if your body
 * is large.
 * @type {layer.Content}
 * @private
 */
MessagePart.prototype._content = null;

/**
 * The Part has rich content
 * @type {Boolean}
 */
MessagePart.prototype.hasContent = false;

/**
 * URL to external content object.
 *
 * Parts with rich content will be initialized with this property set.  But it will expire.
 *
 * Will contain an expiring url at initialization time and be refreshed with calls to `fetchStream()`.
 * Will contain a non-expiring url to a local resource if `fetchContent()` is called.
 *
 * @type {layer.Content}
 */
Object.defineProperty(MessagePart.prototype, 'url', {
  enumerable: true,
  get: function get() {
    // Its possible to have a url and no content if it has been instantiated but not yet sent.
    // If there is a __url then its a local url generated from the body property and does not expire.
    if (this.__url) return this.__url;
    if (this._content) return this._content.isExpired() ? '' : this._content.downloadUrl;
    return '';
  },
  set: function set(inValue) {
    this.__url = inValue;
  },
});

/**
 * Mime Type for the data in body.
 *
 * @type {String}
 */
MessagePart.prototype.mimeType = 'text/plain';

/**
 * Encoding used for the body of this part.
 *
 * No value is the default encoding.
 * @type {String}
 */
MessagePart.prototype.encoding = '';

/**
 * Size of the body.
 *
 * Will be set for you if not provided.
 * Only needed for use with layer.Content.
 *
 * @type {number}
 */
MessagePart.prototype.size = 0;

MessagePart._supportedEvents = ['parts:send', 'content-loaded', 'url-loaded'].concat(Root._supportedEvents);
Root.initClass.apply(MessagePart, [MessagePart, 'MessagePart']);

module.exports = MessagePart;
