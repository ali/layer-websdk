/**
 * The Layer Client; this is the top level component for any Layer based application.

  var client = new layer.Client({
    appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
    userId: 'Fred',
    challenge: function(evt) {
      myAuthenticator({
        nonce: evt.nonce,
        onSuccess: evt.callback
      });
    },
    ready: function(client) {
      alert('I am Client, Server: Serve me!');
    }
  });
 *
 * You can also initialize this as

  var client = new layer.Client({
    appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
    userId: 'Fred'
  });

  client.on('challenge', function(evt) {
    myAuthenticator({
      nonce: evt.nonce,
      onSuccess: evt.callback
    });
  });

  client.on('ready', function(client) {
    alert('I am Client, Server: Serve me!');
  });
 *
 * Key Properties:
 *
 * * userId: User ID of the authenticated user
 * * appId: The ID for your application, insures that the Client connects to the right application on the server
 *
 *
 * Methods:
 *
 * * `createConversation()`: Create a new layer.Conversation.
 * * `createQuery()`: Create a new layer.Query.
 * * `getMessage()`: Input a Message ID, and output a Message from cache.
 * * `getConversation()`: Input a Conversation ID, and output a Conversation from cache.
 * * `getQuery()`: Input a Query ID, and output a Query from cache.
 * * `on()` and `off()`: event listeners
 * * `destroy()`: Cleanup all resources used by this client, including all Messages and Conversations.
 *
 * Events:
 *
 * * `challenge`: Provides a nonce and a callback; you call the callback once you have an Identity Token.
 * * `ready`: Your application can now start using the Layer services
 * * `conversations:add`, `conversations:delete`, `conversations:change`:
 *   used to notify of changes that may affect your Conversations.
 * * `messages:add`, `messages:delete`, `messages:change`:
 *   used to notify of changes that may affect your Messages.
 * * `messages:notify`: Used to notify your application of new messages for which a local notification may be suitable.
 *
 * Logging:
 *
 * There are two ways to change the log level for Layer's logger:
 *
 *     layer.Client.prototype.logLevel = layer.Constants.LOG.INFO;
 *
 * or
 *
 *     var client = new layer.Client({
 *        appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
 *        userId: 'Fred',
 *        logLevel: layer.Constants.LOG.INFO
 *     });
 *
 * @class  layer.Client
 * @extends layer.ClientAuthenticator
 *
 */

const ClientAuth = require('./client-authenticator');
const Conversation = require('./conversation');
const Query = require('./query');
const LayerError = require('./layer-error');
const Message = require('./message');
const User = require('./user');
const TypingIndicatorListener = require('./typing-indicators/typing-indicator-listener');
const Util = require('./client-utils');
const Root = require('./root');
const ClientRegistry = require('./client-registry');
const logger = require('./logger');

class Client extends ClientAuth {

  /*
   * Adds conversations, messages and websockets on top of the authentication client.
   * jsdocs on parent class constructor.
   */
  constructor(options) {
    super(options);
    ClientRegistry.register(this);

    // Initialize Properties
    this._conversationsHash = {};
    this._messagesHash = {};
    this._queriesHash = {};

    if (!options.users) {
      this.users = [];
    } else {
      this.__updateUsers(this.users);
    }

    this._initComponents();

    this.on('online', this._connectionRestored.bind(this));
  }

  /* See parent method docs */
  _initComponents() {
    super._initComponents();

    this._typingIndicators = new TypingIndicatorListener({
      clientId: this.appId,
    });

    // Instantiate Plugins
    for (let propertyName in Client.plugins) {
      /* istanbul ignore else */
      if (Client.plugins.hasOwnProperty(propertyName)) {
        this[propertyName] = new Client.plugins[propertyName](this);
      }
    }
  }

  /**
   * Cleanup all resources (Conversations, Messages, etc...) prior to destroy or reauthentication
   *
   * NOTE: Doing cleanup on objects that have recently changed IDs and have
   * multiple IDs registered gets a bit messy.
   *
   * @method _cleanup
   * @private
   */
  _cleanup() {
    if (this.isDestroyed) return;
    this._inCleanup = true;

    Object.keys(this._conversationsHash).forEach(id => {
      const c = this._conversationsHash[id];
      if (c && !c.isDestroyed) {
        c.destroy();
      }
    });
    this._conversationsHash = null;

    Object.keys(this._messagesHash).forEach(id => {
      const m = this._messagesHash[id];
      if (m && !m.isDestroyed) {
        m.destroy();
      }
    });
    this._messagesHash = null;

    Object.keys(this._queriesHash).forEach(id => {
      this._queriesHash[id].destroy();
    });
    this._queriesHash = null;
    if (this.users) [].concat(this.users).forEach(user => user.destroy ? user.destroy() : null);

    // Ideally we'd set it to null, but _adjustUsers would make it []
    this.users = [];

    if (this.socketManager) this.socketManager.close();
  }

  destroy() {
    // Cleanup all plugins
    for (let propertyName in Client.plugins) {
      /* istanbul ignore else */
      if (Client.plugins.hasOwnProperty(propertyName)) {
        if (this[propertyName]) {
          this[propertyName].destroy();
          delete this[propertyName];
        }
      }
    }

    // Cleanup all resources (Conversations, Messages, etc...)
    this._cleanup();

    this._destroyComponents();

    ClientRegistry.unregister(this);

    super.destroy();
    this._inCleanup = false;
  }

  /**
   * Retrieve a conversation by Identifier.
   *
   *
   * Retrives the conversation by Identifier.
   *
   *      var c = client.getConversation('layer:///conversations/uuid');
   *
   * If there is not a conversation with that id,
   * it will try to load one from the server.  The method will return
   * a layer.Conversation instance that has no data; the loaded/loaded-error events
   * will let you know when the conversation has finished/failed loading from the server.
   *
   *      var c = client.getConversation('layer:///conversations/123', true)
   *      .on('conversations:loaded', function() {
   *          // Render the Conversation with all of its details loaded
   *          myrerender(c);
   *      });
   *      // Render a placeholder for c until the details of c have loaded
   *      myrender(c);
   *
   * @method getConversation
   * @param  {string} id
   * @param  {boolean} [canLoad=false] - Pass true to allow loading a conversation from
   *                                    the server if not found
   * @return {layer.Conversation}
   */
  getConversation(id, canLoad) {
    if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);
    if (this._conversationsHash[id]) {
      return this._conversationsHash[id];
    } else if (canLoad) {
      return Conversation.load(id, this);
    }
  }

  /**
   * Adds a conversation to the client.
   *
   * Typically, you do not need to call this; the following code
   * automatically calls _addConversation for you:
   *
   *      var conv = new layer.Conversation({
   *          client: myclient,
   *          participants: ['a', 'b']
   *      });
   *
   *      var conv = myclient.createConversation(['a', 'b']);
   *
   * @method _addConversation
   * @protected
   * @param  {layer.Conversation} c
   * @returns {layer.Client} this
   */
  _addConversation(conversation) {
    const id = conversation.id;
    if (!this._conversationsHash[id]) {
      // Register the Conversation
      this._conversationsHash[id] = conversation;

      // Make sure the client is set so that the next event bubbles up
      if (conversation.clientId !== this.appId) conversation.clientId = this.appId;
      this._triggerAsync('conversations:add', { conversations: [conversation] });
    }
    return this;
  }

  /**
   * Removes a conversation from the client.
   *
   * Typically, you do not need to call this; the following code
   * automatically calls _removeConversation for you:
   *
   *      converation.destroy();
   *
   * @method _removeConversation
   * @protected
   * @param  {layer.Conversation} c
   * @returns {layer.Client} this
   */
  _removeConversation(conversation) {
    // Insure we do not get any events, such as message:remove
    conversation.off(null, null, this);

    if (this._conversationsHash[conversation.id]) {
      delete this._conversationsHash[conversation.id];
      this._triggerAsync('conversations:remove', { conversations: [conversation] });
    }

    for (let id in this._messagesHash) {
      /* istanbul ignore else */
      if (this._messagesHash.hasOwnProperty(id)) {
        if (this._messagesHash[id].conversationId === conversation.id) {
          this._removeMessage(id);
        }
      }
    }

    return this;
  }

  /**
   * If the Conversation ID changes, we need to reregister the Conversation
   *
   * @method _updateConversationId
   * @protected
   * @param  {layer.Conversation} conversation - Conversation whose ID has changed
   * @param  {string} oldId - Previous ID
   */
  _updateConversationId(conversation, oldId) {
    if (this._conversationsHash[oldId]) {
      this._conversationsHash[conversation.id] = conversation;

      // This is a nasty way to work... but need to find and update all
      // conversationId properties of all Messages or the Query's won't
      // see these as matching the query.
      for (let id in this._messagesHash) {
        /* istanbul ignore else */
        if (this._messagesHash.hasOwnProperty(id)) {
          if (this._messagesHash[id].conversationId === oldId) {
            this._messagesHash[id].conversationId = conversation.id;
          }
        }
      }
      // That old id may still be needed for a little while...
      setTimeout(() => {
        if (!this.isDestroyed) delete this._conversationsHash[oldId];
      }, 60000);
    }
  }


  /**
   * Retrieve the message by message id.
   *
   * Useful for finding a message when you have only the ID
   *
   * If the message is not found,
   * it will try to load one from the server.  The method will return
   * a layer.Message instance that has no data; the loaded/loaded-error events
   * will let you know when the message has finished/failed loading from the server.
   *
   *      var m = client.getMessage('layer:///messages/123', true)
   *      .on('messages:loaded', function() {
   *          // Render the Message with all of its details loaded
   *          myrerender(m);
   *      });
   *      // Render a placeholder for m until the details of m have loaded
   *      myrender(m);
   *
   *
   * @method getMessage
   * @param  {string} id              - layer:///messages/uuid
   * @param  {boolean} [canLoad=false] - Pass true to allow loading a message from the server if not found
   * @return {layer.Message}
   */
  getMessage(id, canLoad) {
    if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

    if (this._messagesHash[id]) {
      return this._messagesHash[id];
    } else if (canLoad) {
      return Message.load(id, this);
    }
  }

  /**
   * Get a MessagePart by ID
   * @method getMessagePart
   * @param {String} id -- ID of the Message Part
   */
  getMessagePart(id) {
    if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

    const messageId = id.replace(/\/parts.*$/, '');
    const message = this.getMessage(messageId);
    if (message) return message.getPartById(id);
  }

  /**
   * Registers an array of messages in _messagesHash
   *
   * @method _addMessage
   * @protected
   * @param  {layer.Message} message
   */
  _addMessage(message) {
    if (!this._messagesHash[message.id]) {
      this._messagesHash[message.id] = message;
      this._triggerAsync('messages:add', { messages: [message] });
      if (message._notify) {
        this._triggerAsync('messages:notify', { message });
        message._notify = false;
      }
      const conversation = message.getConversation();
      if (conversation && (!conversation.lastMessage || conversation.lastMessage.position < message.position)) {
        conversation.lastMessage = message;
      }
    }
  }

  /**
   * Removes message from _messagesHash
   * Accepts IDs as input so that we can take a 'temp_' id
   * as input and delete it rather than the object's Current ID
   * which no longer uses 'temp_'.
   *
   * @method _removeMessage
   * @private
   * @param  {layer.Message|string} message or Message ID
   */
  _removeMessage(message) {
    const id = (typeof message === 'string') ? message : message.id;
    message = this._messagesHash[id];
    if (message) {
      delete this._messagesHash[id];
      if (!this._inCleanup) {
        this._triggerAsync('messages:remove', { messages: [message] });
        const conv = message.getConversation();
        if (conv && conv.lastMessage === message) conv.lastMessage = null;
      }
    }
  }


  /**
   * If the Message ID changes, we need to reregister the message
   *
   * @method _updateMessageId
   * @protected
   * @param  {layer.Message} message - message whose ID has changed
   * @param  {string} oldId - Previous ID
   */
  _updateMessageId(message, oldId) {
    this._messagesHash[message.id] = message;

    // That old id may still be needed for a little while...
    setTimeout(() => {
      if (!this.isDestroyed) {
        delete this._messagesHash[oldId];
      }
    }, 60000);
  }

  /**
   * Takes as input an object id, and either calls getConversation() or getMessage()
   * as needed.  Will only get cached objects, will not get objects from the server.
   *
   * This is not a public method mostly so there's no ambiguity over using getXXX
   * or getObject.  getXXX typically has an option to load the resource, which this
   * does not.
   *
   * @method _getObject
   * @protected
   * @param  {string} id - Message or Conversation id
   * @return {layer.Message|layer.Conversation}
   */
  _getObject(id) {
    switch (Util.typeFromID(id)) {
      case 'messages':
        return this.getMessage(id);
      case 'conversations':
        return this.getConversation(id);
      case 'queries':
        return this.getQuery(id);
    }
  }


  /**
   * Takes an object description from the server and either updates it (if cached)
   * or creates and caches it .
   *
   * @method _createObject
   * @protected
   * @param  {Object} obj - Plain javascript object representing a Message or Conversation
   */
  _createObject(obj) {
    switch (Util.typeFromID(obj.id)) {
      case 'messages':
        const conversation = this.getConversation(obj.conversation.id, true);
        return Message._createFromServer(obj, conversation);
      case 'conversations':
        return Conversation._createFromServer(obj, this);
    }
  }

  /**
   * Before any delayed triggers are fired, fold together all of the addConversation
   * and removeConversation events so that 100 addConversation events can be fired as
   * a single event.
   *
   * @method _processDelayedTriggers
   * @private
   */
  _processDelayedTriggers() {
    if (this.isDestroyed) return;

    const addConversations = this._delayedTriggers.filter((evt) => evt[0] === 'conversations:add');
    const removeConversations = this._delayedTriggers.filter((evt) => evt[0] === 'conversations:remove');
    this._foldEvents(addConversations,      'conversations', this);
    this._foldEvents(removeConversations,   'conversations', this);

    const addMessages     = this._delayedTriggers.filter((evt) => evt[0] === 'messages:add');
    const removeMessages  = this._delayedTriggers.filter((evt) => evt[0] === 'messages:remove');

    this._foldEvents(addMessages, 'messages', this);
    this._foldEvents(removeMessages, 'messages', this);

    super._processDelayedTriggers();
  }

  trigger(eventName, evt) {
    this._triggerLogger(eventName, evt);
    super.trigger(...arguments);
  }

  /**
   * Does logging on all triggered events
   *
   * @method _triggerLogger
   * @private
   */
  _triggerLogger(eventName, evt) {
    if (['conversations:add', 'conversations:remove', 'conversations:change', 'messages:add', 'messages:remove', 'messages:change', 'challenge', 'ready'].indexOf(eventName) !== -1) {
      if (evt && evt.isChange) {
        logger.info(`Client Event: ${eventName} ${evt.changes.map(change => change.property).join(', ')}`);
      } else {
        let text = '';
        if (evt) {
          if (evt.message) text = evt.message.id;
          if (evt.messages) text = evt.messages.length + ' messages';
          if (evt.conversation) text = evt.conversation.id;
          if (evt.conversations) text = evt.conversations.length + ' conversations';
        }
        logger.info(`Client Event: ${eventName} ${text}`);
      }
      if (evt) logger.debug(evt);
    } else {
      logger.debug(eventName, evt);
    }
  }

  /**
   * Searches locally cached conversations for a matching conversation.
   *
   * Iterates over conversations calling a matching function until
   * the conversation is found or all conversations tested.
   *
   *      var c = client.findConversation(function(conversation) {
   *          if (conversation.participants.indexOf('a') != -1) return true;
   *      });
   *
   * @method findCachedConversation
   * @param  {Function} f - Function to call until we find a match
   * @param  {layer.Conversation} f.conversation - A conversation to test
   * @param  {boolean} f.return - Return true if the conversation is a match
   * @param  {Object} [context] - Optional context for the *this* object
   * @return {layer.Conversation}
   *
   * @deprecated
   * This should be replaced by the Query API.
   */
  findCachedConversation(func, context) {
    const test = context ? func.bind(context) : func;
    const list = Object.keys(this._conversationsHash);
    const len = list.length;
    for (let index = 0; index < len; index++) {
      const key = list[index];
      const conversation = this._conversationsHash[key];
      if (test(conversation, index)) return conversation;
    }
  }

  /**
   * If the session has been reset, dump all data.
   *
   * @method _resetSession
   * @private
   */
  _resetSession() {
    this._cleanup();
    this.users = [];
    this._conversationsHash = {};
    this._messagesHash = {};
    this._queriesHash = {};
    return super._resetSession();
  }

  /**
   * Add a user to the users array.
   *
   * By doing this instead of just directly `this.client.users.push(user)`
   * the user will get its conversations property setup correctly.
   *
   * @method addUser
   * @param  {layer.User} user [description]
   * @returns {layer.Client} this
   */
  addUser(user) {
    this.users.push(user);
    user.setClient(this);
    this.trigger('users:change');
    return this;
  }

  /**
   * Searches `client.users` array for the specified id.
   *
   * Use of the `client.users` array is optional.
   *
   *      function getSenderDisplayName(message) {
   *          var user = client.findUser(message.sender.userId);
   *          return user ? user.displayName : 'Unknown User';
   *      }
   *
   * @method findUser
   * @param  {string} id
   * @return {layer.User}
   */
  findUser(id) {
    const l = this.users.length;
    for (let i = 0; i < l; i++) {
      const u = this.users[i];
      if (u.id === id) return u;
    }
  }

  /**
   * __ Methods are automatically called by property setters.
   * Insure that any attempt to set the `users` property sets it to an array.
   *
   * @method __adjustUsers
   * @private
   */
  __adjustUsers(users) {
    if (!users) return [];
    if (!Array.isArray(users)) return [users];
  }

  /**
   * __ Methods are automatically called by property setters.
   * Insure that each user in the users array gets its client property setup.
   *
   * @method __adjustUsers
   * @private
   */
  __updateUsers(users) {
    users.forEach(u => {
      if (u instanceof User) u.setClient(this);
    });
    this.trigger('users:change');
  }

  /**
   * This method is a shortcut to the layer.Conversation#constructor method
   *
   * It adds some conveniences:
   *
   * 1. Automatically adds in the client parameter, which is required by the
   *     layer.Conversation#constructor.
   * 2. Allows for an array of participants as the sole argument
   *
   *         client.createConversation(['a', 'b']);
   *
   *         client.createConversation({participants: ['a', 'b']});
   *
   *         client.createConversation({
   *             participants: ['a', 'b'],
   *             distinct: false
   *         });
   *
   *         client.createConversation({
   *             participants: ['a', 'b'],
   *             metadata: {
   *                 title: 'I am a title'
   *             }
   *         });
   *
   * If you try to create a distinct conversation that already exists,
   * you will get back an existing Conversation, and any requested metadata
   * will NOT be set; you will get whatever metadata the matching Conversation
   * already had.
   *
   * The default value for distinct is `true`.
   *
   * Whether the Conversation already exists or not, a 'conversations:sent' event
   * will be triggered asynchronously and the Conversation object will be ready
   * at that time.  Further, the event will provide details on the result:
   *
   *       var conversation = client.createConversation(['a', 'b']);
   *       conversation.on('conversations:sent', function(evt) {
   *           switch(evt.result) {
   *               case Conversation.CREATED:
   *                   alert(conversation.id + ' was created');
   *                   break;
   *               case Conversation.FOUND:
   *                   alert(conversation.id + ' was found');
   *                   break;
   *               case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
   *                   alert(conversation.id + ' was found but it already has a title so your requested title was not set');
   *                   break;
   *            }
   *       });
   *
   * @method createConversation
   * @param  {Object/string[]} options Either an array of participants,
   *                                  or an object with parameters to pass to
   *                                  Conversation's constructor
   * @param {Boolean} [options.distinct=true] Is this a distinct Converation?
   * @param {Object} [options.metadata={}] Metadata for your Conversation
   * @return {layer.Conversation}
   */
  createConversation(options) {
    let opts;
    if (Array.isArray(options)) {
      opts = {
        participants: options,
      };
    } else {
      opts = options;
    }
    if (!('distinct' in opts)) opts.distinct = true;
    opts.client = this;
    return Conversation.create(opts);
  }

  /**
   * Retrieve the query by query id.
   *
   * Useful for finding a Query when you only have the ID
   *
   * @method getQuery
   * @param  {string} id              - layer:///messages/uuid
   * @return {layer.Query}
   */
  getQuery(id) {
    if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

    if (this._queriesHash[id]) {
      return this._queriesHash[id];
    }
  }

  /**
   * There are two options to create a new layer.Query instance.
   *
   * The direct way:
   *
   *     var query = client.createQuery({
   *         model: layer.Query.Message,
   *         predicate: 'conversation.id = '' + conv.id + ''',
   *         paginationWindow: 50
   *     });
   *
   * A Builder approach that allows for a simpler syntax:
   *
   *     var qBuilder = QueryBuilder
   *      .messages()
   *      .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
   *      .paginationWindow(100);
   *     var query = client.createQuery(qBuilder);
   *
   * @method createQuery
   * @param  {layer.QueryBuilder|Object} options - Either a layer.QueryBuilder instance, or parameters for the layer.Query constructor
   * @return {layer.Query}
   */
  createQuery(options) {
    let query;
    if (typeof options.build === 'function') {
      query = new Query(this, options);
    } else {
      options.client = this;
      query = new Query(options);
    }
    this._addQuery(query);
    return query;
  }

  /**
   * Register the layer.Query.
   *
   * @method _addQuery
   * @private
   * @param  {layer.Query} query
   */
  _addQuery(query) {
    this._queriesHash[query.id] = query;
  }

  /**
   * Deregister the layer.Query.
   *
   * @method _removeQuery
   * @private
   * @param  {layer.Query} query [description]
   */
  _removeQuery(query) {
    if (query) {
      this._checkCache(query.data);
      this.off(null, null, query);
      delete this._queriesHash[query.id];
    }
  }

  /**
   * Check to see if the specified objects can safely be removed from cache.
   * Removes from cache if an object is not part of any Query's result set.
   *
   * @method _checkCache
   * @private
   * @param  {layer.Root[]|Object[]} objects - Array of Objects or Instances representing Messages or Conversations
   */
  _checkCache(objects) {
    objects.forEach(obj => {
      if (!this._isCachedObject(obj)) {
        this._removeObject(obj);
        if (obj.lastMessage && !this._isCachedObject(obj.lastMessage)) {
          this._removeObject(obj.lastMessage);
        }
      }
    });
  }

  /**
   * Returns true if the specified object should continue to be part of the cache.
   * Result is based on whether the object is part of the data for a Query.
   *
   * @method _isCachedObject
   * @private
   * @param  {layer.Root|Object}  obj - A Message or Conversation Instance or Object
   * @return {Boolean}
   */
  _isCachedObject(obj) {
    for (let id in this._queriesHash) {
      /* istanbul ignore else */
      if (this._queriesHash.hasOwnProperty(id)) {
        const query = this._queriesHash[id];
        if (query._getItem(obj.id)) return true;
      }
    }
  }

  /**
   * On restoring a connection, determine what steps need to be taken to
   * update our data.
   *
   * @method _connectionRestored
   * @private
   * @param {number} offlineDuration - Number of miliseconds that the client was offline
   *
   * TODO: Determine a threshold for refreshing data vs websocket catchup
   */
  _connectionRestored(evt) {
    if (evt.reset) {
      for (let id in this._queriesHash) {
        /* istanbul ignore else */
        if (this._queriesHash.hasOwnProperty(id)) {
          const query = this._queriesHash[id];
          query.reset();
        }
      }
    }
    //this._clientReady();
  }

  /**
   * Remove the specified object from cache
   *
   * @method _removeObject
   * @private
   * @param  {layer.Root|Object}  obj - A Message or Conversation Instance or Object
   */
  _removeObject(obj) {
    if (obj instanceof Root === false) obj = this._getObject(obj.id);
    if (obj) {
      return obj.destroy();
    }
  }

  /**
   * Creates a layer.TypingIndicators.TypingListener instance
   * bound to the specified dom node
   *
   *      var typingListener = client.createTypingListener(document.getElementById('myTextBox'));
   *      typingListener.setConversation(mySelectedConversation);
   *
   * Use this method to instantiate a listener, and call
   * `setConversation` every time you want to change which Conversation
   * it should report your user is typing into.
   *
   * @method createTypingListener
   * @param  {HTMLElement} inputNode - Text input to watch for keystrokes
   * @return {layer.TypingIndicators.TypingListener}
   */
  createTypingListener(inputNode) {
    const TypingListener = require('./typing-indicators/typing-listener');
    return new TypingListener({
      websocket: this.socketManager,
      input: inputNode,
    });
  }

  /**
   * Creates a layer.TypingIndicators.TypingPublisher
   * so you can manage your Typing Indicators without using
   * the layer.TypingIndicators.TypingListener.
   *
   *      var typingPublisher = client.createTypingPublisher();
   *      typingPublisher.setConversation(mySelectedConversation);
   *      typingPublisher.setState(layer.TypingIndicators.STARTED);
   *
   * Use this method to instantiate a listener, and call
   * `setConversation` every time you want to change which Conversation
   * it should report your user is typing into.
   * Use `setState` to inform other users of your current state.
   * Note that the `STARTED` state only lasts for 2.5 seconds, so you
   * must repeatedly call setState for as long as this state should continue.
   * This is typically done by simply calling it every time a user hits
   * a key.
   * @method createTypingPublisher
   * @return {layer.TypingIndicators.TypingPublisher}
   */
  createTypingPublisher() {
    const TypingPublisher = require('./typing-indicators/typing-publisher');
    return new TypingPublisher({
      websocket: this.socketManager,
    });
  }

  /**
   * Accessor for getting a Client by appId.
   *
   * Most apps will only have one client,
   * and will not need this method.
   *
   * @method getClient
   * @static
   * @param  {string} appId
   * @return {layer.Client}
   */
  static getClient(appId) {
    return ClientRegistry.get(appId);
  }

  static destroyAllClients() {
    ClientRegistry.getAll().forEach(client => client.destroy());
  }

  /**
   * Registers a plugin which can add capabilities to the Client.
   *
   * Capabilities must be triggered by Events/Event Listeners.
   *
   * This concept is a bit premature and unused/untested...
   * As implemented, it provides for a plugin that will be
   * instantiated by the Client and passed the Client as its parameter.
   * This allows for a library of plugins that can be shared among
   * different companies/projects but that are outside of the core
   * app logic.
   *
   *      // Define the plugin
   *      function MyPlugin(client) {
   *          this.client = client;
   *          client.on('messages:add', this.onMessagesAdd, this);
   *      }
   *
   *      MyPlugin.prototype.onMessagesAdd = function(event) {
   *          var messages = event.messages;
   *          alert('You now have ' + messages.length  + ' messages');
   *      }
   *
   *      // Register the Plugin
   *      Client.registerPlugin('myPlugin34', MyPlugin);
   *
   *      var client = new Client({appId: 'layer:///apps/staging/uuid'});
   *
   *      // Trigger the plugin's behavior
   *      client.myPlugin34.addMessages({messages:[]});
   *
   * @method registerPlugin
   * @static
   * @param  {string} name     [description]
   * @param  {Function} classDef [description]
   */
  static registerPlugin(name, classDef) {
    Client.plugins[name] = classDef;
  }

}

/**
 * Hash of layer.Conversation objects for quick lookup by id
 *
 * @private
 * @property _conversationsHash {Object}
 */
Client.prototype._conversationsHash = null;

/**
 * Hash of layer.Message objects for quick lookup by id
 *
 * @private
 * @type {Object}
 */
Client.prototype._messagesHash = null;


/**
 * Hash of layer.Query objects for quick lookup by id
 *
 * @private
 * @type {Object}
 */
Client.prototype._queriesHash = null;

/**
 * Array of layer.User objects.
 *
 * Use of this property is optional; but by storing
 * an array of layer.User objects in this array, you can
 * then use the `client.findUser(userId)` method to lookup
 * users; and you can use the layer.User objects to find
 * suitable Conversations so you can associate a Direct
 * Message conversation with each user.
 *
 * @type {layer.User[]}
 */
Client.prototype.users = null;

Client._supportedEvents = [

  /**
   * One or more layer.Conversation objects have been added to the client.
   *
   * They may have been added via the websocket, or via the user creating
   * a new Conversation locally.
   *
   *      client.on('conversations:add', function(evt) {
   *          evt.conversations.forEach(function(conversation) {
   *              myView.addConversation(conversation);
   *          });
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Conversation[]} evt.conversations - Array of conversations added
   */
  'conversations:add',

  /**
   * One or more layer.Conversation objects have been removed.
   *
   * A removed Conversation is not necessarily deleted, its just
   * no longer being held in local memory.
   *
   * Note that typically you will want the conversations:delete event
   * rather than conversations:remove.
   *
   *      client.on('conversations:remove', function(evt) {
   *          evt.conversations.forEach(function(conversation) {
   *              myView.removeConversation(conversation);
   *          });
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Conversation[]} evt.conversations - Array of conversations removed
   */
  'conversations:remove',

  /**
   * The conversation is now on the server.
   *
   * Called after creating the conversation
   * on the server.  The Result property is one of:
   *
   * * Conversation.CREATED: A new Conversation has been created
   * * Conversation.FOUND: A matching Distinct Conversation has been found
   * * Conversation.FOUND_WITHOUT_REQUESTED_METADATA: A matching Distinct Conversation has been found
   *                       but note that the metadata is NOT what you requested.
   *
   * All of these results will also mean that the updated property values have been
   * copied into your Conversation object.  That means your metadata property may no
   * longer be its initial value; it will be the value found on the server.
   *
   *      client.on('conversations:sent', function(evt) {
   *          switch(evt.result) {
   *              case Conversation.CREATED:
   *                  alert(evt.target.id + ' Created!');
   *                  break;
   *              case Conversation.FOUND:
   *                  alert(evt.target.id + ' Found!');
   *                  break;
   *              case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
   *                  alert(evt.target.id + ' Found, but does not have the requested metadata!');
   *                  break;
   *          }
   *      });
   *
   * @event
   * @param {layer.LayerEvent} event
   * @param {string} event.result
   * @param {layer.Conversation} target
   */
  'conversations:sent',

  /**
   * A conversation failed to load or create on the server.
   *
   *      client.on('conversations:sent-error', function(evt) {
   *          alert(evt.data.message);
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.LayerError} evt.data
   * @param {layer.Conversation} target
   */
  'conversations:sent-error',

  /**
   * A conversation had a change in its properties.
   *
   * This change may have been delivered from a remote user
   * or as a result of a local operation.
   *
   *      client.on('conversations:change', function(evt) {
   *          var metadataChanges = evt.getChangesFor('metadata');
   *          var participantChanges = evt.getChangesFor('participants');
   *          if (metadataChanges.length) {
   *              myView.renderTitle(evt.target.metadata.title);
   *          }
   *          if (participantChanges.length) {
   *              myView.renderParticipants(evt.target.participants);
   *          }
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Conversation} evt.target
   * @param {Object[]} evt.changes
   * @param {Mixed} evt.changes.newValue
   * @param {Mixed} evt.changes.oldValue
   * @param {string} evt.changes.property - Name of the property that has changed
   */
  'conversations:change',

  /**
   * A new message has been received for which a notification may be suitable.
   * This event is triggered for messages that are:
   *
   * 1. Added via websocket rather than other IO
   * 2. Not yet been marked as read
   * 3. Not sent by this user
   *
          client.on('messages:notify', function(evt) {
              myNotify(evt.message);
          })
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.Message
   */
  'messages:notify',

  /**
   * Messages have been added to a conversation.
   *
   * This event is triggered on
   *
   * * creating/sending a new message
   * * Receiving a new Message via websocket
   * * Querying/downloading a set of Messages
   *
   *      client.on('messages:add', function(evt) {
   *          evt.messages.forEach(function(message) {
   *              myView.addMessage(message);
   *          });
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message[]} evt.messages
   */
  'messages:add',

  /**
   * A message has been removed from a conversation.
   *
   * A removed Message is not necessarily deleted,
   * just no longer being held in memory.
   *
   * Note that typically you will want the messages:delete event
   * rather than messages:remove.
   *
   *      client.on('messages:remove', function(evt) {
   *          evt.messages.forEach(function(message) {
   *              myView.removeMessage(message);
   *          });
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.message
   */
  'messages:remove',

  /**
   * A message has been sent.
   *
   *      client.on('messages:sent', function(evt) {
   *          alert(evt.target.getText() + ' has been sent');
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.target
   */
  'messages:sent',

  /**
   * A message is about to be sent.
   *
   * Useful if you want to
   * add parts to the message before it goes out.
   *
   *      client.on('messages:sending', function(evt) {
   *          evt.target.addPart({
   *              mimeType: 'text/plain',
   *              body: 'this is just a test'
   *          });
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.target
   */
  'messages:sending',

  /**
   * A message has had a change in its properties.
   *
   * This change may have been delivered from a remote user
   * or as a result of a local operation.
   *
   *      client.on('messages:change', function(evt) {
   *          var recpientStatusChanges = evt.getChangesFor('recipientStatus');
   *          if (recpientStatusChanges.length) {
   *              myView.renderStatus(evt.target);
   *          }
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.target
   * @param {Object[]} evt.changes
   * @param {Mixed} evt.changes.newValue
   * @param {Mixed} evt.changes.oldValue
   * @param {string} evt.changes.property - Name of the property that has changed
   */
  'messages:change',

  /**
   * A message has been marked as read.
   *
   * This is a local event not a change recieved from
   * a remote user.
   *
   *      client.on('messages:read', function(evt) {
   *          myView.renderUnreadStatus(evt.target);
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.target
   */
  'messages:read',

  /**
   * A Conversation has been deleted from the server.
   *
   * Caused by either a successful call to delete() on the Conversation
   * or by a remote user.
   *
   *      client.on('conversations:delete', function(evt) {
   *          myView.removeConversation(evt.target);
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Conversation} evt.target
   */
  'conversations:delete',

  /**
   * A Message has been deleted from the server.
   *
   * Caused by either a successful call to delete() on the Message
   * or by a remote user.
   *
   *      client.on('messages:delete', function(evt) {
   *          myView.removeMessage(evt.target);
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {layer.Message} evt.target
   */
  'messages:delete',

  /**
   * A User has been added or changed in the users array.
   *
   * This event is not yet well supported.
   * @event
   */
  'users:change',

  /**
   * A Typing Indicator state has changed.
   *
   * Either a change has been received
   * from the server, or a typing indicator state has expired.
   *
   *      client.on('typing-indicator-change', function(evt) {
   *          if (evt.conversationId === myConversationId) {
   *              alert(evt.typing.join(', ') + ' are typing');
   *              alert(evt.paused.join(', ') + ' are paused');
   *          }
   *      });
   *
   * @event
   * @param {layer.LayerEvent} evt
   * @param {string} conversationId - ID of the Conversation users are typing into
   * @param {string[]} typing - Array of user IDs who are currently typing
   * @param {string[]} paused - Array of user IDs who are currently paused;
   *                            A paused user still has text in their text box.
   */
  'typing-indicator-change',


].concat(ClientAuth._supportedEvents);

Client.plugins = {};


Root.initClass.apply(Client, [Client, 'Client']);
module.exports = Client;
