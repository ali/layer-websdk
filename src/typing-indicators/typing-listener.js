const TypingPublisher = require('./typing-publisher');
const {STARTED, PAUSED, FINISHED} = require('./typing-indicators');

/**
 * The Typing Listener Class listens to keyboard events on
 * your text field, and uses the layer.TypingPublisher to
 * send state based on keyboard behavior.
 *
 *      // Shorthand:
 *      var typingListener = client.createTypingListener(document.getElementById('mytextarea'));
 *
 *      // Full form
 *      var typingListener = new layer.TypingIndicators.TypingListener({
 *          websocket: client.socketManager,
 *          input: document.getElementById('mytextarea')
 *      });
 *
 *  In Either form, you change what Conversation
 *  the typing indicator reports your user to be typing
 *  in by calling:
 *
 *      typingListener.setConversation(mySelectedConversation);
 *
 * TODO: This class assumes that the textbox lasts for the full
 * lifespan of your app and does not unsubscribe from its events.
 * This needs to be cleaned up for a broader class of apps.
 *
 * @class  layer.TypingIndicators.TypingListener
 */
class TypingListener {

  /**
   * Note that this class accepts both WebSocket and WebsocketManager.
   * The manager however is better as every time the websocket connection is lost,
   * it creates a new one without requiring you to update the TypingListener and TypingPublisher.
   *
   * @method constructor
   * @param  {Object} args
   * @param {HTMLElement} input - A Text editor dom node that will have typing indicators
   * @param {Object} conversation - The Conversation Object or Instance that the input will send messages to
   * @param {layer.WebsocketManager} websocket - The connection to use for sending typing indicators
   */
  constructor(args) {
    this.input = args.input;
    this.websocket = args.websocket;
    this.conversation = args.conversation;
    this.publisher = new TypingPublisher({
      websocket: this.websocket,
      conversation: this.conversation,
    });

    this.intervalId = 0;
    this.lastKeyId = 0;

    // Use keypress rather than keydown because the user hitting alt-tab to change
    // windows, and other meta keys should not result in typing indicators
    this._handleKeyPress = this._handleKeyPress.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this.input.addEventListener('keypress', this._handleKeyPress);
    this.input.addEventListener('keydown', this._handleKeyDown);
  }

  destroy() {
    if (this.input) {
      this.input.removeEventListener('keypress', this._handleKeyPress);
      this.input.removeEventListener('keydown', this._handleKeyDown);
    }
    this.publisher.destroy();
    this.input = null;
  }

  /**
   * Change the Conversation; this should set the state of the old Conversation to "finished".
   * Use this when the user has changed Conversations and you want to report on typing to a new
   * Conversation.
   *
   * @method setConversation
   * @param  {Object} conv - The new Conversation Object or Instance
   */
  setConversation(conv) {
    if (conv !== this.conversation) {
      this.conversation = conv;
      this.publisher.setConversation(conv);
    }
  }


  /**
   * Whenever the key is pressed, send a "started" or "finished" event.
   * If its a "start" event, schedule a pause-test that will send
   * a "pause" event if typing stops.
   *
   * @method _handleKeyPress
   * @private
   * @param  {KeyboardEvent} evt
   */
  _handleKeyPress(evt) {
    if (this.lastKeyId) window.clearTimeout(this.lastKeyId);
    this.lastKeyId = window.setTimeout(() => {
      this.lastKeyId = 0;
      const isEmpty = !Boolean(this.input.value);
      this.send(isEmpty ? FINISHED : STARTED);
    }, 50);
  }

  /**
   * Some keyboard keys are not reported by keypress events
   * so we capture them with keyDown events. The ones
   * currently handled here are backspace, delete and enter.
   * We may add more later.
   *
   * @method _handleKeyDown
   * @private
   * @param  {KeyboardEvent} evt
   */
  _handleKeyDown(evt) {
    if ([8, 46, 13].indexOf(evt.keyCode) !== -1) this._handleKeyPress();
  }

  /**
   * Send the state to the publisher.  If your application requires
   * you to directly control the state, you can call this method;
   * however, as long as you use this TypingListener, keyboard
   * events will overwrite any state changes you send.
   *
   * Common use case for this: After a message is sent, you want to clear any typing indicators:
   *
   *      function send() {
   *        message.send();
   *        typingIndicators.send(layer.TypingIndicators.FINISHED);
   *      }
   *
   * @method send
   * @param  {string} state - One of "started", "paused", "finished"
   */
  send(state) {
    this.publisher.setState(state);
  }
}

module.exports = TypingListener;
