/*eslint-disable */
describe("The Root Class", function() {
  beforeEach(function() {
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });

  describe("The initClass() static method", function() {
    it("Should return a class with a name", function() {
      function A() { layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      layer.Root.initClass(A, "A");
      expect(A.name).toEqual("A");

    });

    it("Should define a getter and setter if there is an adjuster", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {};
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").get).toEqual(jasmine.any(Function));
      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").set).toEqual(jasmine.any(Function));
    });

    it("Should define a getter and setter if there is an updater", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__updateX = function(newValue, oldValue) {};
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").get).toEqual(jasmine.any(Function));
      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").set).toEqual(jasmine.any(Function));
    });

    it("Should define an enumerable property if there is an adjuster", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {};
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").enumerable).toBe(true);
    });

    it("Should not define a getter and setter if there is no adjuster or updater", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").get).toBe(undefined);
      expect(Object.getOwnPropertyDescriptor(A.prototype, "x").set).toBe(undefined);
    });

    it("Should not define a getter and setter for private properties", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {};
      A.prototype.___adjustX = function(newValue) {};
      A.prototype._x = 5;
      layer.Root.initClass(A, "A");

      expect(Object.getOwnPropertyDescriptor(A.prototype, "x")).toBe(undefined);
    });

    it("Should not define a getter and setter for Root properties", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustInternalId = jasmine.createSpy('adjuster');
      layer.Root.initClass(A, "A");

      var a = new A();
      a.internalId = "fred";
      expect(a.__adjustInternalId).not.toHaveBeenCalled();
    });

    it("Should call the adjuster with a correct inValue", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {};
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      var a = new A();
      spyOn(a, "__adjustX");
      a.x = 10;
      expect(a.__adjustX).toHaveBeenCalledWith(10);
    });

    it("Should call the adjuster and use its value", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {
        return 20;
      };
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      var a = new A();
      a.x = 10;
      expect(a.x).toEqual(20);
    });


    it("Should call the adjuster and ignore undefined", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__adjustX = function(newValue) {
        return undefined;
      }
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      var a = new A();
      a.x = 10;
      expect(a.x).toEqual(10);
    });

    it("Should not call adjuster or updater while initializing", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__updateX = jasmine.createSpy('updater');
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      var a = new A({
        x: 10
      });
      expect(A.prototype.__updateX).not.toHaveBeenCalled();
    });

    it("Should call the updater with oldValue and newValue", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.__updateX = function(newValue) {}
      A.prototype.x = 5;
      layer.Root.initClass(A, "A");

      var a = new A();
      spyOn(a, "__updateX");
      a.x = 10;
      expect(a.__updateX).toHaveBeenCalledWith(10, 5);
    });

    it("Should get default _supportedEvents", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      layer.Root.initClass(A, "A");

      expect(A._supportedEvents).toEqual(layer.Root._supportedEvents);
    })

    it("Should get default _inObjectIgnore", function() {
      function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      layer.Root.initClass(A, "A");

      expect(A._inObjectIgnore).toEqual(layer.Root._inObjectIgnore);
    });
  });

  describe("Root instances", function() {
    var A;
    beforeEach(function() {
      A = function A(){ layer.Root.call(this, arguments[0]); };
      A.prototype = Object.create(layer.Root.prototype);
      A.prototype.constructor = A;

      A.prototype.id = "";
      A.prototype.x = 5;
      A._supportedEvents = ["doh", "ray", "me", "fah"].concat(layer.Root._supportedEvents);
    });
    describe("The constructor() method", function() {
      beforeEach(function() {
        layer.Root.initClass(A, "A");
      });

      it("Should initialize _subscriptions", function() {
        var a = new A();
        expect(a._subscriptions).toEqual([]);
      });

      it("Should initialize _events", function() {
        var a = new A();
        expect(a._events).toEqual({});
      });

      it("Should initialize _delayedTriggers", function() {
        var a = new A();
        expect(a._delayedTriggers).toEqual([]);
      });

      it("Should assign unique and appropriate internalIds", function() {
        var a = new A();
        var b = new A();
        expect(a.internalId).toMatch(/A\d+/)
        expect(b.internalId).toMatch(/A\d+/)
        expect(a.internalId).not.toEqual(b.internalId);
      });

      xit("Should call _processDelayedTriggers on postMessage", function() {


      });

      it("Should treat _supportedEvents as event handlers and set them up", function() {
        var spy = jasmine.createSpy('doh');
        var a = new A({
          doh: spy
        });
        a.trigger('doh');
        expect(spy).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));
      });

      it("Should copy in properties", function() {
        var a = new A({
          x: 20
        });
        expect(a.x).toEqual(20);
      });

      it("Should allow default property values", function() {
        var a = new A({});
        expect(a.x).toEqual(5);
      });

      it("Should ignore events and properties not in schema", function() {
        var spy = jasmine.createSpy('doh');
        var a = new A({
          doh1: spy,
          x1: 50
        });

        expect(a.x1).toBe(undefined);
        a.trigger('doh1');
        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe("The destroy() method", function() {
      beforeEach(function() {
        layer.Root.initClass(A, "A");
      });

      it("Should trigger destroy", function() {
        var spy = jasmine.createSpy('destroy');
        var a = new A({
          destroy: spy
        });
        a.destroy();
        expect(spy).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));
      });

      it("Should not fire twice", function() {
        var spy = jasmine.createSpy('destroy');
        var a = new A({
          destroy: spy
        });
        a.destroy();
        expect(function() {
          a.destroy();
        }).toThrowError(layer.LayerError.dictionary.alreadyDestroyed);
        expect(layer.LayerError.dictionary.alreadyDestroyed.length > 0).toBe(true);
      });

      it("Should unsubscribe from all events", function() {
        var spy = jasmine.createSpy('doh');
        var a = new A({
          doh: spy
        });
        a.destroy();
        a.trigger('doh');
        expect(spy).not.toHaveBeenCalled();
      });

      it("Should null subscriptions and delayed triggers", function() {
        var a = new A();
        a.destroy();
        expect(a._subscriptions).toBe(null);
        expect(a._delayedTriggers).toBe(null);
      });

      it("Should set isDestroyed", function() {
        var a = new A();
        expect(a.isDestroyed).toEqual(false);
        a.destroy();
        expect(a.isDestroyed).toEqual(true);
      });
    });

    describe("The _validateId() method", function() {
      beforeEach(function() {
        A.prefixUUID = "fred:///a/";
        layer.Root.initClass(A, "A");
      });

      it("Should fail if prefix does not match", function() {
        var a = new A({id: "fred:///b/"});
        expect(a._validateId()).toBe(false);
      });

      it("Should fail if not a UUID", function() {
        var a = new A({ id: "fred:///a/fred" });
        expect(a._validateId()).toBe(false);
      });

      it("Should pass a correct id", function() {
        var a = new A({ id: "fred:///a/ffffffff-ffff-ffff-ffff-ffffffffffff" });
        expect(a._validateId()).toBe(true);
      });
    });

    describe("The toObject() method", function() {
      beforeEach(function() {
        A.prototype.y = 12;
        A.prototype.z = 20;
        A.prototype._p = 30;
        A.prototype.arrNumb = null;
        A.prototype.now = new Date();

        A.prototype.nextA = null;
        A.prototype.childAs = null;

        A._inObjectIgnore = ['z'].concat(layer.Root._inObjectIgnore);
        layer.Root.initClass(A);
      });

      it("Should output all properties", function() {
        var a = new A();
        var aObj = a.toObject();
        expect(aObj.x).toEqual(5);
        expect(aObj.y).toEqual(12);
      });

      it("Should ignore ignored properties", function() {
        var a = new A();
        var aObj = a.toObject();
        expect(aObj.z).toBe(undefined);
      });

      it("Should ignore private properties", function() {
        var a = new A();
        var aObj = a.toObject();
        expect(aObj._p).toBe(undefined);
      });

      it("Should ignore undeclared properties", function() {
        var a = new A();
        a.aaa = 50;
        var aObj = a.toObject();
        expect(aObj.aaa).toBe(undefined);
      });

      // It should do this but not yet needed.
      // This would insure that something like recipient_status would be a copy of
      // rather than a pointer to an existing object.  Pointer lets app manipulate
      // the instance using the output object.
      xit("Should output sub-objects", function() {

      });

      it("Should output arrays as a distinct array from the source instance", function() {
        var a = new A({arrNumb: [1,3,5]});
        var aObj = a.toObject();
        expect(aObj.arrNumb).toEqual([1,3,5]);
        expect(aObj.arrNumb).not.toBe(a.arrNumb);
      });

      // It should do this but not yet needed.
      // This would insure that something like recipient_status would be a copy of
      // rather than a pointer to an existing object.  Pointer lets app manipulate
      // the instance using the output object.
      xit("Should output arrays of sub-objects", function() {


      });

      it("Should recursively call toObject on subcomponents", function() {
        var a = new A({nextA: new A()});
        expect(a.nextA).toEqual(jasmine.any(A));
        spyOn(a.nextA, "toObject").and.callThrough();

        // Run
        var aObj = a.toObject();

        // Posttest
        expect(a.nextA.toObject).toHaveBeenCalled();
        expect(aObj.nextA.x).toEqual(5);
      });

      it("Should recursively call toObject on arrays of subcomponents", function() {
        var a = new A({childAs: [new A({x: 100}), new A({x: 200})]});
        expect(a.childAs).toEqual([jasmine.any(A), jasmine.any(A)]);
        spyOn(a.childAs[1], "toObject").and.callThrough();

        // Run
        var aObj = a.toObject();

        // Posttest
        expect(a.childAs[1].toObject).toHaveBeenCalled();
        expect(aObj.childAs[1].x).toEqual(200);
      });

      it("Should ignore subcomponents if noChildren", function() {
        var a = new A({nextA: new A()});
        spyOn(a.nextA, "toObject").and.callThrough();

        // Run
        var aObj = a.toObject(true);

        // Posttest
        expect(a.nextA.toObject).not.toHaveBeenCalled();
        expect(aObj.nextA).toBe(undefined);
      });

      it("Should ignore arrays of subcomponents if noChildren", function() {
        var a = new A({childAs: [new A({x: 100}), new A({x: 200})]});
        expect(a.childAs).toEqual([jasmine.any(A), jasmine.any(A)]);
        spyOn(a.childAs[1], "toObject").and.callThrough();

        // Run
        var aObj = a.toObject(true);

        // Posttest
        expect(a.childAs[1].toObject).not.toHaveBeenCalled();
        expect(aObj.childAs).toBe(undefined);
      });

      it("Should output copies of dates instead of actual dates", function() {
        var a = new A();
        expect(a.now).toEqual(jasmine.any(Date));

        // Run
        var aObj = a.toObject();

        // Posttest
        expect(aObj.now).toEqual(jasmine.any(Date));
        expect(aObj.now).not.toBe(a.now);
      });
    });

    describe("The _prepareOn() method", function() {
      var a;
      beforeEach(function() {
        layer.Root.initClass(A);
        a = new A();
      });

      it("Should fail if context is an instance of Root and isDestroyed", function() {
        var b = new A();
        b.destroy();
        expect(function() {
          a._prepareOn("destroy", function() {}, b);
        }).toThrowError(layer.LayerError.dictionary.isDestroyed);
        expect(layer.LayerError.dictionary.isDestroyed.length > 0).toBe(true);
      });

      it("Should throw an error if a single name isn't supported", function() {
        expect(function() {
          a._prepareOn("eatMyShorts", function() {});
        }).toThrowError("Event eatMyShorts not defined for " + a.toString());
      });

      it("Should throw an error if a name in a list of names isn't supported", function() {
        expect(function() {
          a._prepareOn("destroy eatMyShorts", function() {});
        }).toThrowError("Event eatMyShorts not defined for " + a.toString());
      });

      it("Should throw an error if a single name in a hash isn't supported", function() {
        expect(function() {
          a._prepareOn({
            "eatMyShorts": function() {}
          });
        }).toThrowError("Event eatMyShorts not defined for " + a.toString());
      });

      it("Should register the context in the _subscriptions array if its an instance of Root", function() {
        var b = new A();
        a.on("destroy", function() {}, b);
        expect(a._subscriptions).toEqual([]);
        expect(b._subscriptions).toEqual([a]);
      });

      it("Should not register the context in the _subscriptions array if its not an instance of Root", function() {
        var b = {};
        a.on("destroy", function() {}, b);
        expect(a._subscriptions).toEqual([]);
        expect(b._subscriptions).toEqual(undefined);
      });
    });

    describe("The on() method", function() {
      var a, spy;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
      });

      it("Should call _prepareOn", function() {
        spyOn(a, "_prepareOn");
        a.on("doh", spy);
        expect(a._prepareOn).toHaveBeenCalledWith("doh", spy, undefined);
      });

      it("Should accept a single string event name", function() {
        a.on("ray", spy);
        a.trigger("ray");
        expect(spy).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));
      });

      it("Should accept a list of strings as event names", function() {
        a.on("doh ray me fah", spy);
        a.trigger("doh");
        a.trigger("ray");

        expect(spy.calls.count()).toEqual(2);
      });

      it("Should accept a hash of event names and callbacks", function() {
        var spy2 = jasmine.createSpy('fah');
        a.on({
          "doh": spy,
          "ray": spy,
           "fah": spy2
        });
        a.trigger("doh");
        a.trigger("ray");
        a.trigger("fah");
        a.trigger("fah");
        a.trigger("fah");
        a.trigger("fah");

        expect(spy.calls.count()).toEqual(2);
        expect(spy2.calls.count()).toEqual(4);
      });
    });

    describe("The once() method", function() {
      var a, spy;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
      });

      it("Should call _prepareOn", function() {
        spyOn(a, "_prepareOn");
        a.on("doh", spy);
        expect(a._prepareOn).toHaveBeenCalledWith("doh", spy, undefined);
      });

      it("Should only call once", function() {
        a.once("ray", spy);
        a.trigger("ray");
        a.trigger("ray");
        a.trigger("ray");
        a.trigger("ray");
        expect(spy.calls.count()).toEqual(1);
      });
    });


    describe("The trigger() method", function() {
      var a, spy;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
      });

      it("Should call _trigger", function() {
        spyOn(a, "_trigger");
        a.trigger("doh", "hey");
        expect(a._trigger).toHaveBeenCalledWith("doh", "hey");
      });

      it("Should not call _trigger if events are disabled", function() {
        spyOn(a, "_trigger");
        a._disableEvents = true;
        a.trigger("doh", "hey");
        expect(a._trigger).not.toHaveBeenCalled();
      });
    });

    describe("The _trigger() method", function() {
      var a, spy;
      beforeEach(function() {
        spy = jasmine.createSpy('test');
      });

      it("Should trigger the event with args from _getTriggerArgs", function() {
        layer.Root.initClass(A, "A");
        a = new A();
        spyOn(a, "_getTriggerArgs").and.returnValue(["doh", "Ardvark!"]);
        a.on("doh", spy);

        // Run
        a._trigger("doh", "is an elephant?");

        // Posttest
        expect(a._getTriggerArgs).toHaveBeenCalledWith("doh", "is an elephant?");
        expect(spy).toHaveBeenCalledWith("Ardvark!");
      });

      it("Should not trigger unsupported events", function() {
        layer.Root.initClass(A, "A");
        a = new A();
        spyOn(a, "_getTriggerArgs")

        // Run
        a._trigger("doh!");

        // Posttest
        expect(a._getTriggerArgs).not.toHaveBeenCalled();
      });

      it("Should bubble up events via parent property", function() {
        A.bubbleEventParent = "myParent";
        A.prototype.myParent = null;
        layer.Root.initClass(A, "A");
        var b = new A();
        a = new A({myParent: b});
        b.on("doh", spy);

        // Run
        a._trigger("doh");  // Calls b.trigger("doh")

        // Posttest
        expect(spy).toHaveBeenCalled();
      });

      it("Should bubble up events via parent function", function() {
        A.bubbleEventParent = "getMyParent";
        A.prototype.getMyParent = function() {return b;};
        layer.Root.initClass(A, "A");
        var b = new A();
        b.getMyParent = null;
        a = new A();
        b.on("doh", spy);

        // Run
        a._trigger("doh");  // Calls b.trigger("doh")

        // Posttest
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("The _getTriggerArgs() method", function() {
      var a, spy;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
      });

      it("Should handle one argument by creating a LayerEvent with no extra properties", function() {
        var args = a._getTriggerArgs("doh");
        expect(args[0]).toEqual("doh");
        expect(args[1]).toEqual(jasmine.any(layer.LayerEvent));
        expect(args[1].target).toBe(a);
        expect(args[1].changes).toBe(null);
        expect(args[1].isChange).toBe(false);
        for (var key in args[1]) {
          expect(["target", "changes", "isChange", "eventName"].indexOf(key)).not.toEqual(-1);
        }
      });

      it("Should return LayerEvent arguments as-is", function() {
        var evt = new layer.LayerEvent({}, "doh");
        var args = a._getTriggerArgs("doh", evt);
        expect(args[0]).toEqual("doh");
        expect(args[1]).toBe(evt);
      });

      it("Should pass literal arguments into data property", function() {
        var args = a._getTriggerArgs("doh", 555);
        expect(args[0]).toEqual("doh");
        expect(args[1]).toEqual(jasmine.any(layer.LayerEvent));
        expect(args[1].data).toEqual(555);
        expect(args[1].target).toBe(a);
      });

      it("Should copy all properties into event", function() {
        var args = a._getTriggerArgs("doh", {
          target: "fred",
          x: 5,
          y: 20
        });
        expect(args[0]).toEqual("doh");
        expect(args[1]).toEqual(jasmine.any(layer.LayerEvent));
        expect(args[1].target).toEqual("fred");
        expect(args[1].x).toEqual(5);
        expect(args[1].y).toEqual(20);
      });
    });

    describe("The _triggerAsync() method", function() {
      var a, spy;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
      });

      it("Should push the results of _getTriggerArgs into _delayedTriggers", function() {
        spyOn(a, "_getTriggerArgs").and.returnValue("Ardvark!");
        expect(a._delayedTriggers).toEqual([]);

        // Run
        a._triggerAsync("doh", 5);

        // Posttest
        expect(a._getTriggerArgs).toHaveBeenCalledWith("doh", 5);
        expect(a._delayedTriggers).toEqual(["Ardvark!"]);
      });

      it("Should schedule _processDelayedTriggers for first event", function() {
        spyOn(a, "_processDelayedTriggers");
        a._triggerAsync("doh", 5);

        // Posttest
        expect(a._processDelayedTriggers.calls.count()).toEqual(0);
        jasmine.clock().tick(10);
        expect(a._processDelayedTriggers.calls.count()).toEqual(1);
      });

      it("Should not schedule _processDelayedTriggers for additional events", function() {
        spyOn(a, "_processDelayedTriggers");
        a._triggerAsync("doh", 5);
        a._triggerAsync("doh", 50);
        a._triggerAsync("doh", 500);

        // Posttest
        expect(a._processDelayedTriggers.calls.count()).toEqual(0);
        jasmine.clock().tick(10);
        expect(a._processDelayedTriggers.calls.count()).toEqual(1);
      });

      it("Should not schedule _processDelayedTriggers for additional events unless too much time has passed", function() {
        spyOn(a, "_processDelayedTriggers");
        a._triggerAsync("doh", 5);
        a._triggerAsync("doh", 50);

        jasmine.clock().tick(10);
        expect(a._delayedTriggers.length).toEqual(2); // 2 because our spy doesn't let this array be cleared
        expect(a._processDelayedTriggers.calls.count()).toEqual(1);

        // Nothing should change 501 ms later
        jasmine.clock().tick(501);
        var d = new Date();
        d.setSeconds(d.getSeconds() + 501);
        jasmine.clock().mockDate(d);
        expect(a._delayedTriggers.length).toEqual(2);
        expect(a._processDelayedTriggers.calls.count()).toEqual(1);

        // Run
        a._triggerAsync("doh", 1234);
        jasmine.clock().tick(10);

        // Posttest: Let the second call go through if 500ms have passed even if _delayedTriggers.length != 1
        expect(a._processDelayedTriggers.calls.count()).toEqual(2);
      });
    });

    describe("The _foldEvents() method", function() {
      var a, spy, events;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
        events = [
          ["doh", new layer.LayerEvent({hey: ["ho"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["hum"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["ardvark"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["Doh!"]}, "doh")]
        ];
      });

      it("Should replace the named value with an array matching all the events passed in", function() {
        a._foldEvents(events, "hey");
        expect(events[0][1].hey).toEqual(["ho", "hum", "ardvark", "Doh!"]);
        expect(events[0][1].target).toEqual(null);
      });

      it("Should update the target", function() {
        a._foldEvents(events, "hey", "ho");
        expect(events[0][1].target).toEqual("ho");
      });

      it("Should remove all events except the first from delayedTriggers", function() {
        events.forEach(function(evt) {
          a._triggerAsync(evt[0], evt[1]);
        });
        a._foldEvents(events, "hey");
        expect(a._delayedTriggers).toEqual([events[0]]);
      });
    });

    describe("The _foldChangeEvents() method", function() {
      var a, spy, events;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
        events = [
          ["A:change", new layer.LayerEvent({
            property: "a",
            oldValue: "b",
            newValue: "c"
          }, "A:change")],
          ["A:change", new layer.LayerEvent({
            property: "a",
            oldValue: "c",
            newValue: "d"
          }, "A:change")],
          ["A:change", new layer.LayerEvent({
            property: "b",
            oldValue: "x",
            newValue: "y"
          }, "A:change")],
          ["A:change", new layer.LayerEvent({
            property: "c",
            oldValue: "m",
            newValue: "n"
          }, "A:change")]
        ];
      });

      it("Should merge all changes into a single changes array", function() {
         events.forEach(function(evt) {
          a._triggerAsync(evt[0], evt[1]);
        });
        expect(a._delayedTriggers.length).toEqual(4);

        // Run
        a._foldChangeEvents();

        // Posttest
        expect(a._delayedTriggers.length).toEqual(1);
        expect(a._delayedTriggers[0][1].changes).toEqual([
          {
            property: "a",
            oldValue: "b",
            newValue: "c"
          },
          {
            property: "a",
            oldValue: "c",
            newValue: "d"
          },
          {
            property: "b",
            oldValue: "x",
            newValue: "y"
          },
          {
            property: "c",
            oldValue: "m",
            newValue: "n"
          }
        ]);
      });

      it("Should filter out non-change events", function() {
        var moreEvents = events.concat([["doh", new layer.LayerEvent({}, "doh")]]);
         moreEvents.forEach(function(evt) {
          a._triggerAsync(evt[0], evt[1]);
        });
        expect(a._delayedTriggers.length).toEqual(5);

        // Run
        a._foldChangeEvents();

        // Posttest
        expect(a._delayedTriggers.length).toEqual(2);
      });
    });

    describe("The _processDelayedTriggers() method", function() {
      var a, spy, events;
      beforeEach(function() {
        layer.Root.initClass(A, "A");
        spy = jasmine.createSpy('test');
        a = new A();
        events = [
          ["doh", new layer.LayerEvent({hey: ["ho"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["hum"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["ardvark"]}, "doh")],
          ["doh", new layer.LayerEvent({hey: ["Doh!"]}, "doh")]
        ];

        events.forEach(function(evt) {
          a._triggerAsync(evt[0], evt[1]);
        });
      });

      it("Should call _foldChangeEvents", function() {
         spyOn(a, "_foldChangeEvents");
         a._processDelayedTriggers();
        expect(a._foldChangeEvents).toHaveBeenCalledWith();
      });

      it("Should abort if destroyed", function() {
        spyOn(a, "_foldChangeEvents");
        a.isDestroyed = true;
        a._processDelayedTriggers();
        expect(a._foldChangeEvents).not.toHaveBeenCalled();
      });

      it("Should call trigger on all delayedTriggers", function() {
        spyOn(a, "trigger");
        a._processDelayedTriggers();
        expect(a.trigger).toHaveBeenCalledWith(events[0][0], events[0][1]);
        expect(a.trigger).toHaveBeenCalledWith(events[1][0], events[1][1]);
        expect(a.trigger).toHaveBeenCalledWith(events[2][0], events[2][1]);
        expect(a.trigger).toHaveBeenCalledWith(events[3][0], events[3][1]);
      });

      it("Should clear the delayedTriggers array", function() {
        a._processDelayedTriggers();
        expect(a._delayedTriggers).toEqual([]);
      });

    });

    describe("The toString() method", function() {
      beforeEach(function() {
        layer.Root.initClass(A, "A");
      });
      it("Should return internal id", function() {
        var a = new A();
        expect(a.toString()).toEqual(a.internalId);
      });
    });
  });
});