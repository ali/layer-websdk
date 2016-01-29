/**
 * Static properties here only needed if your directly using
 * the layer.TypingIndicators.TypingPublisher (not needed if
 * you are using the layer.TypingIndicators.TypingListener).
 *
 *      typingPublisher.setState(layer.TypingIndicators.STARTED);
 *
 * @class  layer.TypingIndicators
 * @static
 */
module.exports = {
  /**
   * Typing has started/resumed
   * @type {String}
   * @static
   */
  STARTED: 'started',

  /**
   * Typing has paused
   * @type {String}
   * @static
   */
  PAUSED: 'paused',

  /**
   * Typing has finished
   * @type {String}
   * @static
   */
  FINISHED: 'finished',
};
