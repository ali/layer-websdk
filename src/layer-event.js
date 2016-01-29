/**
 * This class represents a Layer Event, and is used as the parameter for all event handlers.
 *
 * Calls to
 *
 *      obj.trigger('eventName2', {hey: 'ho'});
 *
 * results in:
 *
 *      obj.on('eventName2', function(layerEvent) {
 *          alert(layerEvent.target.toString() + ' has fired a value of ' + layerEvent.hey);
 *      });
 *
 * Change events (events ending in ':change') get special handling:
 *
 *      obj.trigger('obj:change', {
 *          newValue: 55,
 *          oldValue: 25,
 *          property: 'hey'
 *      });
 *
 * results in:
 *
 *      obj.on('obj:change', function(layerEvent) {
 *          layerEvent.changes.forEach(function(change) {
 *              alert(layerEvent.target.toString() + ' changed ' +
 *                    change.property + ' from ' + change.oldValue +
 *                    ' to ' + change.newValue);
 *          });
 *      });
 *
 * The `getChangesFor()` and `hasProperty()` methods
 * simplify working with xxx:change events so you don't need
 * to iterate over the `changes` array.
 *
 * @class layer.LayerEvent
 */

class LayerEvent {
  /**
   * Constructor for LayerEvent.
   *
   * @method
   * @param  {Object} args - Properties to mixin to the event
   * @param  {string} eventName - Name of the event that generated this LayerEvent.
   * @return {layer.LayerEvent}
   */
  constructor(args, eventName) {
    let ptr = this;

    // Is it a change event?  if so, setup the change properties.
    if (eventName.match(/:change$/)) {
      this.changes = [{}];
      // All args get copied into the changes object instead of this
      ptr = this.changes[0];
      this.isChange = true;
    } else {
      this.isChange = false;
    }

    // Copy the args into either this Event object... or into the change object.
    // Wouldn't be needed if this inherited from Root.
    for (let name in args) {
      /* istanbul ignore else */
      if (args.hasOwnProperty(name)) {
        // Even if we are copying properties into the change object, target remains
        // a property of LayerEvent.
        if (ptr !== this && name === 'target') {
          this.target = args.target;
        } else {
          ptr[name] = args[name];
        }
      }
    }
    this.eventName = eventName;
  }

  /**
   * Returns true if the specified property was changed.
   *
   * Returns false if this is not a change event.
   *
   *      if (layerEvent.hasProperty('age')) {
   *          handleAgeChange(obj.age);
   *      }
   *
   * @method hasProperty
   * @param  {string}  name - Name of the property
   * @return {Boolean}
   */
  hasProperty(name) {
    if (!this.isChange) return false;
    return Boolean(this.changes.filter(change => change.property === name).length);
  }

  /**
   * Get all changes to the property.
   *
   * Returns an array of changes.
   * If this is not a change event, will return []
   * Changes are typically of the form:
   *
   *      layerEvent.getChangesFor('age');
   *      > [{
   *          oldValue: 10,
   *          newValue: 5,
   *          property: 'age'
   *      }]
   *
   * @method getChangesFor
   * @param  {string} name - Name of the property whose changes are of interest
   * @return {Object[]}
   */
  getChangesFor(name) {
    if (!this.isChange) return [];
    return this.changes.filter(change => change.property === name);
  }

  /**
   * Merge changes into a single changes array.
   *
   * The other event will need to be deleted.
   *
   * @method _mergeChanges
   * @protected
   * @param  {layer.LayerEvent} evt
   */
  _mergeChanges(evt) {
    this.changes = this.changes.concat(evt.changes);
  }
}

/**
 * Indicates that this is a change event.
 *
 * If the event name ends with ':change' then
 * it is treated as a change event;  such
 * events are assumed to come with `newValue`, `oldValue` and `property`.
 * @type {Boolean}
 */
LayerEvent.prototype.isChange = false;

/**
 * Array of changes (Change Events only).
 *
 * If its a Change Event, then the changes property contains an array of change
 * description which each contain:
 *
 * * oldValue
 * * newValue
 * * property
 *
 * @type {Object[]}
 */
LayerEvent.prototype.changes = null;

/**
 * Component that was the source of the change.
 *
 * If one calls
 *
 *      obj.trigger('event');
 *
 * then obj will be the target.
 * @type {layer.Root}
 */
LayerEvent.prototype.target = null;

/**
 * The name of the event that created this instance.
 *
 * If one calls
 *
 *      obj.trigger('myevent');
 *
 * then eventName = 'myevent'
 *
 * @type {String}
 */
LayerEvent.prototype.eventName = '';

module.exports = LayerEvent;