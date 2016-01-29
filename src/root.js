const Utils = require('./client-utils');
const LayerEvent = require('./layer-event');
const LayerError = require('./layer-error');
const Events = require('backbone-events-standalone/backbone-events-standalone');
const Logger = require('./logger');

/**
 * Provides a system bus that can be accessed by all components of the system.
 * Currently used to listen to messages sent via postMessage, but envisioned to
 * do far more.
 *
 * @class {layer.EventClass}
 * @private
 */
function EventClass() { }
EventClass.prototype = Events;

const SystemBus = new EventClass();
if (typeof postMessage === 'function') {
  addEventListener('message', function (event) {
    if (event.data.type === 'layer-delayed-event') {
      SystemBus.trigger(event.data.internalId + '-delayed-event');
    }
  });
}

// Used to generate a unique internalId for every Root instance
const uniqueIds = {};

// Regex for splitting an event string such as obj.on('evtName1 evtName2 evtName3')
const eventSplitter = /\s+/;

/**
 * The root class of all layer objects. Provides the following utilities
 *
 * 1. Mixes in the Backbone event model
 *
 *        var person = new Person();
 *        person.on('destroy', function() {
 *            console.log('I have been destroyed!');
 *        });
 *
 *        // Fire the console log handler:
 *        person.trigger('destroy');
 *
 *        // Unsubscribe
 *        person.off('destroy');
 *
 * 2. Adds a subscriptions object so that any event handlers on an object can be quickly found and removed
 *
 *        var person1 = new Person();
 *        var person2 = new Person();
 *        person2.on('destroy', function() {
 *            console.log('I have been destroyed!');
 *        }, person1);
 *
 *        // Pointers to person1 held onto by person2 are removed
 *        person1.destroy();
 *
 * 3. Adds support for event listeners in the constructor
 *    Any event handler can be passed into the constructor
 *    just as though it were a property.
 *
 *        var person = new Person({
 *            age: 150,
 *            destroy: function() {
 *                console.log('I have been destroyed!');
 *            }
 *        });
 *
 * 4. A _disableEvents property
 *
 *        myMethod() {
 *          if (this.isInitializing) {
 *              this._disableEvents = true;
 *
 *              // Event only received if _disableEvents = false
 *              this.trigger('destroy');
 *              this._disableEvents = false;
 *          }
 *        }
 *
 * 5. A _supportedEvents static property for each class
 *
 *     This property defines which events can be triggered.
 *
 *     * Any attempt to trigger
 *       an event not in _supportedEvents will log an error.
 *     * Any attempt to register a listener for an event not in _supportedEvents will
 *     *throw* an error.
 *
 *     This allows us to insure developers only subscribe to valid events.
 *
 *     This allows us to control what events can be fired and which ones blocked.
 *
 * 6. Adds an internalId property
 *
 *        var person = new Person();
 *        console.log(person.internalId); // -> 'Person1'
 *
 * 7. Adds a toObject method to create a simplified Plain Old Javacript Object from your object
 *
 *        var person = new Person();
 *        var simplePerson = person.toObject();
 *
 * 8. Provides __adjustProperty method support
 *
 *     For any property of a class, an `__adjustProperty` method can be defined.  If its defined,
 *     it will be called prior to setting that property, allowing:
 *
 *     A. Modification of the value that is actually set
 *     B. Validation of the value; throwing errors if invalid.
 *
 * 9. Provides __udpateProperty method support
 *
 *     After setting any property for which there is an `__updateProperty` method defined,
 *     the method will be called, allowing the new property to be applied.
 *
 *     Typically used for
 *
 *     A. Triggering events
 *     B. Firing XHR requests
 *     C. Updating the UI to match the new property value
 *
 *
 * @class layer.Root
 * @author Michael Kantor
 */
/*
 * TODO: Remove _inObjectIgnore;
 *       May require update to layer.User
 */
class Root extends EventClass {

  /**
   * Superclass constructor handles copying in properties and registering event handlers
   *
   * @method constructor
   * @param  {Object} options - a hash of properties and event handlers
   * @return {layer.Root}
   */
  constructor(options = {}) {
    super();
    this._subscriptions = [];
    this._delayedTriggers = [];
    this._lastDelayedTrigger = Date.now();
    this._events = {};

    // Generate an internalId
    const name = this.constructor.name;
    if (!uniqueIds[name]) uniqueIds[name] = 0;
    this.internalId = name + uniqueIds[name]++;

    // Every component listens to the SystemBus for postMessage (triggerAsync) events
    SystemBus.on(this.internalId + '-delayed-event', this._processDelayedTriggers, this);

    // Generate a temporary id if there isn't an id
    if (!this.id && !options.id && this.constructor.prefixUUID) this.id = 'temp_' + this.constructor.prefixUUID + Utils.generateUUID();

    // Copy in all properties; setup all event handlers
    let key;
    for (key in options) {
      if (this.constructor._supportedEvents.indexOf(key) !== -1) {
        this.on(key, options[key]);
      } else if (key in this && typeof this[key] !== 'function') {
        this[key] = options[key];
      }
    }
    this.isInitializing = false;
  }


  /**
   * Takes as input an id, returns boolean reporting on whether its a valid id for this class.
   *
   * @method _validateId
   * @protected
   * @return {boolean}
   */
  _validateId() {
    const id = String(this.id);
    const prefix = this.constructor.prefixUUID;
    if (id.indexOf(prefix) !== 0 && id.indexOf('temp_' + prefix) !== 0) return false;
    if (!id.substring(prefix.length).match(/.{8}-.{4}-.{4}-.{4}-.{12}$/)) return false;
    return true;
  }

  /**
   * Destroys the object.
   *
   * Cleans up all events / subscriptions
   * and marks the object as isDestroyed.
   *
   * @method destroy
   */
  destroy() {
    if (this.isDestroyed) throw new Error(LayerError.dictionary.alreadyDestroyed);

    // If anyone is listening, notify them
    this.trigger('destroy');

    // Cleanup pointers to SystemBus. Failure to call destroy
    // will have very serious consequences...
    SystemBus.off(null, null, this);

    // Remove all events, and all pointers passed to this object by other objects
    this.off();

    // Find all of the objects that this object has passed itself to in the form
    // of event handlers and remove all references to itself.
    this._subscriptions.forEach(item => item.off(null, null, this));

    this._subscriptions = null;
    this._delayedTriggers = null;
    this.isDestroyed = true;
  }

  /**
   * Convert class instance to Plain Javascript Object.
   *
   * Strips out all private members, and insures no datastructure loops.
   * Recursively converting all subobjects using calls to toObject.
   *
   *      console.dir(myobj.toObject());
   *
   * Note: While it would be tempting to have noChildren default to true,
   * this would result in Message.toObject() not outputing its MessageParts.
   *
   * Private data (_ prefixed properties) will not be output.
   *
   * @method toObject
   * @param  {boolean} [noChildren=false] Don't output sub-components
   * @return {Object}
   */
  toObject(noChildren = false) {
    this.__inToObject = true;
    const obj = {};

    // Iterate over all formally defined properties
    try {
      const keys = Object.keys(this.constructor.prototype);
      keys.forEach(key => {
        // Skip any properties defined in the class's _inObjectIgnore array
        if (this.constructor._inObjectIgnore.indexOf(key) !== -1) return;
        const v = this[key];

        // Ignore private/protected properties and functions
        if (key.indexOf('_') === 0) return;
        if (typeof v === 'function') return;

        // Generate arrays...
        if (Array.isArray(v)) {
          obj[key] = [];
          v.forEach(item => {
            if (item instanceof Root) {
              if (noChildren) {
                delete obj[key];
              } else if (!item.__inToObject) {
                obj[key].push(item.toObject());
              }
            } else {
              obj[key].push(item);
            }
          });
        }

        // Generate subcomponents
        else if (v instanceof Root) {
          if (!v.__inToObject && !noChildren) {
            obj[key] = v.toObject();
          }
        }

        // Generate dates (creates a copy to separate it from the source object)
        else if (v instanceof Date) {
          obj[key] = new Date(v);
        }

        // Generate simple properties
        else {
          obj[key] = v;
        }
      });
    } catch (e) { }
    this.__inToObject = false;
    return obj;
  }

  _prepareOn(name, handler, context) {
    if (context instanceof Root) {
      if (context.isDestroyed) {
        throw new Error(LayerError.dictionary.isDestroyed);
      }
      context._subscriptions.push(this);
    }
    if (typeof name === 'string' && name !== 'all') {
      if (eventSplitter.test(name)) {
        const names = name.split(eventSplitter);
        names.forEach(n => {
          if (this.constructor._supportedEvents.indexOf(n) === -1) throw new Error('Event ' + n + ' not defined for ' + this.toString());
        });
      } else {
        if (this.constructor._supportedEvents.indexOf(name) === -1) throw new Error('Event ' + name + ' not defined for ' + this.toString());
      }
    } else if (name && typeof name === 'object') {
      let keyName;
      for (keyName in name) {
        if (name.hasOwnProperty(keyName)) {
          if (this.constructor._supportedEvents.indexOf(keyName) === -1) throw new Error('Event ' + keyName + ' not defined for ' + this.toString());
        }
      }
    }
  }

  /**
   * Subscribe to events.  Note that the context parameter serves double importance here:
   *
   * 1. It determines the context in which to execute the event handler
   * 2. Create a backlink so that if either subscriber or subscribee is destroyed,
   *    all pointers between them can be found and removed.
   *
   *      obj.on('someEventName someOtherEventName', mycallback, mycontext);
   *
   *      obj.on({
   *          eventName1: callback1,
   *          eventName2: callback2
   *      }, mycontext);
   *
   * @method on
   * @param  {String} name - Name of the event
   * @param  {Function} handler - Event handler
   * @param  {layer.LayerEvent} handler.event - Event object delivered to the handler
   * @param  {Object} context - This pointer AND link to help with cleanup
   * @return {layer.Root} this
   */
  on(name, handler, context) {
    this._prepareOn(name, handler, context);
    Events.on.apply(this, arguments);
    return this;
  }

  once(name, handler, context) {
    this._prepareOn(name, handler, context);
    Events.once.apply(this, arguments);
    return this;
  }

  /**
   * Unsubscribe to events.
   *
   *      // Removes all event handlers for this event:
   *      obj.off('someEventName');
   *
   *      // Removes all event handlers using this function pointer as callback
   *      obj.off(null, f, null);
   *
   *      // Removes all event handlers that `this` has subscribed to; requires
   *      // obj.on to be called with `this` as its `context` parameter.
   *      obj.off(null, null, this);
   *
   * @method off
   * @param  {String} name - Name of the event; null for all event names
   * @param  {Function} handler - Event handler; null for all functions
   * @param  {Object} context - The context from the `on()` call to search for; null for all contexts
   */


  /**
   * Trigger an event for any event listeners; see Root.on()
   *
   * Events triggered this way will be blocked if _disableEvents = true
   *
   * @method trigger
   * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
   * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
   * @return {layer.Root} this
   */
  trigger() {
    if (this._disableEvents) return this;
    return this._trigger(...arguments);
  }

  /**
   * Triggers an event. Supports a single parameter.
   *
   * @method trigger
   * @private
   * @param {string} eventName - Name of the event
   * @return {Object} Return *this* for chaining
   */
  _trigger() {
    if (this.constructor._supportedEvents.indexOf(arguments[0]) === -1) {
      Logger.error(this.toString() + ' ignored ' + arguments[0]);
      return;
    }

    const args = this._getTriggerArgs(...arguments);

    Events.trigger.apply(this, args);

    const parentProp = this.constructor.bubbleEventParent;
    if (parentProp) {
      let parentValue = this[parentProp];
      parentValue = (typeof parentValue === 'function') ? parentValue.apply(this) : parentValue;
      if (parentValue) parentValue.trigger(...args);
    }
  }

  /**
   * Generates a layer.LayerEvent from a trigger call's arguments.
   *
   * * If parameter is already a layer.LayerEvent, we're done.
   * * If parameter is an object, a `target` property is added to that object and its delivered to all subscribers
   * * If the parameter is non-object value, it is added to an object with a `target` property, and the value is put in
   *   the `data` property.
   *
   * @method _getTriggerArgs
   * @private
   * @return {Mixed[]} - First element of array is eventName, second element is layer.LayerEvent.
   */
  _getTriggerArgs() {
    const args = Array.prototype.slice.call(arguments);

    if (args[1]) {
      let newArg = { target: this };

      if (args[1] instanceof LayerEvent) {
        // A LayerEvent will be an argument when bubbling events up; these args can be used as-is
      } else {
        if (typeof args[1] === 'object') {
          // Occasionally someone may want to explicitly pass in a target
          // if ('target' in args[1]) {
          //   newArg = args[1];
          // } else {
            let name;
            for (name in args[1]) {
              if (args[1].hasOwnProperty(name)) {
                newArg[name] = args[1][name];
              }
            }
          //}
        } else {
          newArg.data = args[1];
        }
        args[1] = new LayerEvent(newArg, args[0]);
      }
    } else {
      args[1] = new LayerEvent({ target: this }, args[0]);
    }

    return args;
  }

  /**
   * Same as _trigger() method, but delays briefly before firing.
   * When would you want to delay an event?
   *
   * 1. There is an event rollup that may be needed for the event;
   *    this requires the framework to be able to see ALL events that have been
   *    generated, roll them up, and THEN fire them.
   * 2. The event is intended for UI rendering... which should not hold up the rest of
   *    this framework's execution.
   *
   * When NOT to delay an event?
   *
   * 1. Lifecycle events frequently require response at the time the event has fired
   *
   * @method _triggerAsync
   * @private
   * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
   * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
   * @return {layer.Root} this
   */
  _triggerAsync() {
    const args = this._getTriggerArgs(...arguments);
    this._delayedTriggers.push(args);

    // NOTE: It is unclear at this time how it happens, but on very rare occasions, we see processDelayedTriggers
    // fail to get called when length = 1, and after that length just continuously grows.  So we add
    // the _lastDelayedTrigger test to insure that it will still run.
    if (this._delayedTriggers.length === 1 || this._delayedTriggers.length && this._lastDelayedTrigger + 500 < Date.now()) {
      this._lastDelayedTrigger = Date.now();
      if (typeof postMessage === 'function' && typeof jasmine === 'undefined') {
        window.postMessage({
          type: 'layer-delayed-event',
          internalId: this.internalId,
        }, '*');
      } else {
        setTimeout(() => this._processDelayedTriggers(), 0);
      }
    }
  }

  /**
   * Given an event structure of
   *
   *      {
   *          customName: [value1]
   *      }
   *      {
   *          customName: [value2]
   *      }
   *      {
   *          customName: [value3]
   *      }
   *
   * Merge them into
   *
   *      {
   *          customName: [value1, value2, value3]
   *      }
   *
   * @method _foldEvents
   * @private
   * @param  {layer.LayerEvent[]} events
   * @param  {string} name      Name of the property (i.e. 'customName')
   * @param  {layer.Root}    newTarget Value of the target for the folded resulting event
   */
  _foldEvents(events, name, newTarget) {
    const firstEvt = events.length ? events[0][1] : null;
    const firstEvtProp = firstEvt ? firstEvt[name] : null;
    events.forEach(function (evt, i) {
      if (i > 0) {
        firstEvtProp.push(evt[1][name][0]);
        this._delayedTriggers.splice(this._delayedTriggers.indexOf(evt), 1);
      }
    }, this);
    if (events.length && newTarget) events[0][1].target = newTarget;
  }

  /**
   * Given a set change events on this component,
   * fold all change events into a single event via
   * the layer.LayerEvent's changes array.
   *
   * @method _foldChangeEvents
   * @private
   */
  _foldChangeEvents() {
    const events = this._delayedTriggers.filter(function (evt) {
      return evt[1].isChange;
    });
    events.forEach((evt, i) => {
      if (i > 0) {
        events[0][1]._mergeChanges(evt[1]);
        this._delayedTriggers.splice(this._delayedTriggers.indexOf(evt), 1);
      }
    });
  }

  /**
   * Execute all delayed events
   *
   * @method _processDelayedTriggers
   * @private
   */
  _processDelayedTriggers() {
    if (this.isDestroyed) return;
    this._foldChangeEvents();

    this._delayedTriggers.forEach(function (evt) {
      this.trigger(...evt);
    }, this);
    this._delayedTriggers = [];
  }



  /**
   * Returns a string representation of the class that is nicer than [Object]
   *
   * @method toString
   * @return {String}
   */
  toString() {
    return this.internalId;
  }
}

function defineProperty(newClass, propertyName) {
  const pKey = '__' + propertyName;
  const camel = propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);

  if (newClass.prototype['__adjust' + camel] || newClass.prototype['__update' + camel]) {
    // set default value
    newClass.prototype[pKey] = newClass.prototype[propertyName];

    Object.defineProperty(newClass.prototype, propertyName, {
      enumerable: true,
      get: function get() {
        return this[pKey];
      },
      set: function set(inValue) {
        if (this.isDestroyed) return;
        const initial = this[pKey];
        if (inValue !== initial) {
          if (this['__adjust' + camel]) {
            const result = this['__adjust' + camel](inValue);
            if (result !== undefined) inValue = result;
          }
          this[pKey] = inValue;
        }
        if (inValue !== initial) {
          if (!this.isInitializing && this['__update' + camel]) {
            this['__update' + camel](inValue, initial);
          }
        }
      },
    });
  }
}

function initClass(newClass, className) {
  // Make sure our new class has a name property
  if (!newClass.name) newClass.name = className;

  // Make sure our new class has a _supportedEvents _inObjectIgnore and EVENTS properties
  if (!newClass._supportedEvents) newClass._supportedEvents = Root._supportedEvents;
  if (!newClass._inObjectIgnore) newClass._inObjectIgnore = Root._inObjectIgnore;

  // Generate a list of properties for this class; we don't include any
  // properties from layer.Root
  const keys = Object.keys(newClass.prototype).filter(key =>
    newClass.prototype.hasOwnProperty(key) && !Root.prototype.hasOwnProperty(key) && typeof newClass.prototype[key] !== 'function');

  // Define getters/setters for any property that has __adjust or __update methods defined
  keys.forEach(name => defineProperty(newClass, name));
}

Root.prototype.isDestroyed = false;
Root.prototype.internalId = '';
Root.prototype.isInitializing = true;
Root.prototype._subscriptions = null;
Root.prototype._disableEvents = false;
Root._inObjectIgnore = ['BackboneEvents', 'events', 'isInitializing'];
Root._supportedEvents = ['destroy', 'all'];
module.exports = Root;
module.exports.initClass = initClass;
