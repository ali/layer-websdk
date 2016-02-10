/**
 * The TypingIndicatorListener receives Typing Indicator state
 * for other users via a websocket, and notifies
 * the client of the updated state.  Typical applications
 * do not access this component directly, but DO subscribe
 * to events produced by this component:
 *
 *      client.on('typing-indicator-change', function(evt) {
 *        if (evt.conversationId == conversationICareAbout) {
 *          console.log('The following users are typing: ' + evt.typing.join(', '));
 *          console.log('The following users are paused: ' + evt.paused.join(', '));
 *        }
 *      });
 *
 * @class layer.TypingIndicators.TypingIndicatorListener
 * @extends {layer.Root}
 */

const Root = require('../root');
const ClientRegistry = require('../client-registry');

const {STARTED, PAUSED, FINISHED} = require('./typing-indicators');
class TypingIndicatorListener extends Root {

  /**
   * Creates a Typing Indicator Listener for this Client.
   *
   * @method constructor
   * @protected
   * @param  {Object} args
   * @param {string} args.clientId - ID of the client this belongs to
   */
  constructor(args) {
    super(args);

    /**
     * Stores the state of all Conversations, indicating who is
     * typing and who is paused; people who are stopped are removed
     * from this state.
     * @property {Object}
     */
    this.state = {};
    this._pollId = 0;
    const client = this._getClient();
    client.on('ready', () => this._clientReady());
  }

  /**
   * Called when the client is ready
   *
   * @method _clientReady
   * @private
   */
  _clientReady() {
    const client = this._getClient();
    this.userId = client.userId;
    this._websocket = client.socketManager;
    this._websocket.on('message', this._handleSocketEvent, this);
    this._startPolling();
  }

  /**
   * Determines if this event is relevant to report on.
   * Must be a typing indicator signal that is reporting on
   * someone other than this user.
   *
   * @method _isRelevantEvent
   * @private
   * @param  {Object}  Websocket event data
   * @return {Boolean}
   */
  _isRelevantEvent(evt) {
    return evt.type === 'signal' &&
      evt.body.type === 'typing_indicator' &&
      evt.body.data.user_id !== this.userId;
  }

  /**
   * This method receives websocket events and
   * if they are typing indicator events, updates its state.
   *
   * @method _handleSocketEvent
   * @private
   * @param {layer.LayerEvent} evtIn - All websocket events
   */
  _handleSocketEvent(evtIn) {
    const evt = evtIn.data;

    if (this._isRelevantEvent(evt)) {
      const userId = evt.body.data.user_id;
      const state = evt.body.data.action;
      const conversationId = evt.body.object.id;
      let stateEntry = this.state[conversationId];
      if (!stateEntry ) {
        stateEntry = this.state[conversationId] = {
          users: {},
          typing: [],
          paused: [],
        };
      }
      stateEntry.users[userId] = {
        startTime: Date.now(),
        state: state,
      };
      if (stateEntry.users[userId].state === FINISHED) {
        delete stateEntry.users[userId];
      }

      this._updateState(stateEntry, state, userId);

      this.trigger('typing-indicator-change', {
        conversationId,
        typing: stateEntry.typing,
        paused: stateEntry.paused,
      });
    }
  }

  /**
   * Updates the state of a single stateEntry; a stateEntry
   * represents a single Conversation's typing indicator data.
   *
   * Updates typing and paused arrays following immutable strategies
   * in hope that this will help Flex based architectures.
   *
   * @method _updateState
   * @private
   * @param  {Object} stateEntry - A Conversation's typing indicator state
   * @param  {string} newState   - started, paused or finished
   * @param  {string} userId     - ID of the user whose state has changed
   */
  _updateState(stateEntry, newState, userId) {
    const typingIndex = stateEntry.typing.indexOf(userId);
    if (newState !== STARTED && typingIndex !== -1) {
      stateEntry.typing = [
        ...stateEntry.typing.slice(0, typingIndex),
        ...stateEntry.typing.slice(typingIndex + 1),
      ];
    }
    const pausedIndex = stateEntry.paused.indexOf(userId);
    if (newState !== PAUSED && pausedIndex !== -1) {
      stateEntry.paused = [
        ...stateEntry.paused.slice(0, pausedIndex),
        ...stateEntry.paused.slice(pausedIndex + 1),
      ];
    }


    if (newState === STARTED && typingIndex === -1) {
      stateEntry.typing = [...stateEntry.typing, userId];
    } else if (newState === PAUSED && pausedIndex === -1) {
      stateEntry.paused = [...stateEntry.paused, userId];
    }
  }

  /**
   * Any time a state change becomes more than 6 seconds stale,
   * assume that the user is 'finished'.  In theory, we should
   * receive a new event every 2.5 seconds.  If the current user
   * has gone offline, lack of this code would cause the people
   * currently flagged as typing as still typing hours from now.
   *
   * For this first pass, we just mark the user as 'finished'
   * but a future pass may move from 'started' to 'paused'
   * and 'paused to 'finished'
   *
   * @method _startPolling
   * @private
   */
  _startPolling() {
    if (this._pollId) return;
    this._pollId = setInterval(() => this._poll(), 5000);
  }

  _poll() {
    const conversationIds = Object.keys(this.state);

    conversationIds.forEach(id => {
      const state = this.state[id];
      Object.keys(this.state[id].users)
        .forEach((userId) => {
          if (Date.now() >= state.users[userId].startTime + 6000) {
            this._updateState(state, FINISHED, userId);
            delete state.users[userId];
            this.trigger('typing-indicator-change', {
              conversationId: id,
              typing: state.typing,
              paused: state.paused,
            });
          }
        });
    });
  }

  /**
   * Get the Client associated with this class.  Uses the clientId
   * property.
   *
   * @method _getClient
   * @protected
   * @return {layer.Client}
   */
  _getClient() {
    return ClientRegistry.get(this.clientId);
  }
}

/**
 * setTimeout ID for polling for states to transition
 * @type {Number}
 * @private
 */
TypingIndicatorListener.prototype._pollId = 0;

/**
 * A websocket connection that will receive remote user typing indicators
 * @property {layer.Websockets.SocketManager}
 * @private
 */
TypingIndicatorListener.prototype._websocket = null;

/**
 * ID of the client this instance is associated with
 * @type {String}
 */
TypingIndicatorListener.prototype.clientId = '';

TypingIndicatorListener.bubbleEventParent = '_getClient';


TypingIndicatorListener._supportedEvents = [
  /**
   * There has been a change in typing indicator state of other users.
   * @event change
   * @param {layer.LayerEvent} evt
   * @param {string[]} evt.typing - Array of userIds of people who are typing
   * @param {string[]} evt.paused - Array of userIds of people who are paused
   * @param {string} evt.conversationId - ID of the Converation that has changed typing indicator state
   */
  'typing-indicator-change',
].concat(Root._supportedEvents);

Root.initClass.apply(TypingIndicatorListener, [TypingIndicatorListener, 'TypingIndicatorListener']);
module.exports = TypingIndicatorListener;
