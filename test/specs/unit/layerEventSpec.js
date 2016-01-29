/* eslint-disable */
describe("The LayerEvent Class", function() {
    describe("The constructor() method", function() {
        it("Should copy in object parameters", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                fred: "flinstone",
                friday: "saturday"
            }, "eventName");
            expect(evt.eventName).toEqual("eventName");
            expect(evt.target).toEqual("target");
            expect(evt.fred).toEqual("flinstone");
            expect(evt.friday).toEqual("saturday");
        });

        it("Should copy in changes parameters", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                fred: "flinstone",
                friday: "saturday",
                property: "sunday"
            }, "eventName:change");
            expect(evt.eventName).toEqual("eventName:change");
            expect(evt.target).toEqual("target");
            expect(evt.changes[0].fred).toEqual("flinstone");
            expect(evt.changes[0].friday).toEqual("saturday");
            expect(evt.changes[0].property).toEqual("sunday");
        });
    });

    describe("The hasProperty() method", function() {
        it("Should return true if its a changes event with the specified property name", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                fred: "flinstone",
                friday: "saturday",
                property: "sunday"
            }, "eventName:change");
            expect(evt.hasProperty("sunday")).toBe(true);
            expect(evt.hasProperty("sunday1")).toBe(false);
        });
        it("Should return false if its NOT a changes event", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                changes: [{
                    fred: "flinstone",
                    friday: "saturday",
                    property: "sunday"
                }]
            }, "eventName");
            expect(evt.hasProperty("sunday")).toBe(false);
        });
    });

    describe("The getChangesFor() method", function() {
        it("Should return true if its a changes event with the specified property name", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                fred: "flinstone",
                friday: "saturday",
                property: "sunday"
            }, "eventName:change");
            expect(evt.getChangesFor("sunday")).toEqual([{
                fred: "flinstone",
                friday: "saturday",
                property: "sunday"
            }]);
            expect(evt.getChangesFor("sunday1")).toEqual([]);
        });
        it("Should return false if its NOT a changes event", function() {
            var evt = new layer.LayerEvent({
                target: "target",
                changes: [{
                    fred: "flinstone",
                    friday: "saturday",
                    property: "sunday"
                }]
            }, "eventName");
            expect(evt.getChangesFor("sunday")).toEqual([]);
        });
    });

    describe("The _mergeChanges() method", function() {
        it("Should add changes from the new event to the old event", function() {
            var evt1 = new layer.LayerEvent({
                target: "target",
                changes: [{
                    fred: "flinstone",
                    friday: "saturday",
                    property: "sunday"
                }]
            }, "eventName");
            var evt2 = new layer.LayerEvent({
                target: "target",
                changes: [{
                    fred: "frodo",
                    friday: "january",
                    property: "febrary"
                }]
            }, "eventName");
            evt1._mergeChanges(evt2);
            expect(evt1.changes).toEqual([
                {
                    fred: "flinstone",
                    friday: "saturday",
                    property: "sunday"
                },
                {
                    fred: "frodo",
                    friday: "january",
                    property: "febrary"
                }
            ]);
        });
    });
});