/*eslint-disable */
describe("The SyncEvent Classes", function() {

    describe("The SyncEvent Class", function() {
        describe("The constructor() method", function() {
            it("Should return a SyncEvent instance", function() {
                expect(new layer.SyncEvent({})).toEqual(jasmine.any(layer.SyncEvent));
            });

            it("Should initialize the operation", function() {
                expect(new layer.SyncEvent({operation: "PATCH"}).operation).toEqual("PATCH");
            });

            it("Should initialize depends", function() {
                expect(new layer.SyncEvent({depends: "DEPENDS"}).depends).toEqual("DEPENDS");
            });

            it("Should initialize target", function() {
                expect(new layer.SyncEvent({target: "target"}).target).toEqual("target");
            });

            it("Should initialize data", function() {
                expect(new layer.SyncEvent({data: "data"}).data).toEqual("data");
            });

            it("Should initialize callback", function() {
                expect(new layer.SyncEvent({callback: "callback"}).callback).toEqual("callback");
            });
        });

        describe("The destroy() method", function() {
            var evt;
            beforeEach(function() {
                evt = new layer.SyncEvent({
                    depends: "a",
                    target: "b",
                    callback: function() {},
                    data: "c"
                });
            });

            it("Should clear depends", function() {
                evt.destroy();
                expect(evt.depends).toBe(null);
            });

            it("Should clear target", function() {
                evt.destroy();
                expect(evt.target).toBe(null);
            });

            it("Should clear data", function() {
                evt.destroy();
                expect(evt.data).toBe(null);
            });

            it("Should clear callback", function() {
                evt.destroy();
                expect(evt.callback).toBe(null);
            });
        });

        describe("The _updateData() method", function() {
            it("Should leave data alone if its not a function", function() {
                var evt = new layer.SyncEvent({
                    data: "hey"
                });
                evt._updateData();
                expect(evt.data).toEqual("hey");
            });

            it("Should update data if its a function", function() {
                var evt = new layer.SyncEvent({
                    data: function() {return "hey"}
                });
                expect(evt.data).not.toEqual("hey");
                evt._updateData();
                expect(evt.data).toEqual("hey");
            });
        });
    });

    describe("The XHRSyncEvent Class", function() {
        describe("The _getRequestData() method", function() {
            var evt;
            beforeEach(function() {
                evt = new layer.XHRSyncEvent({
                    url: "url",
                    depends: "a",
                    target: "b",
                    callback: function() {},
                    data: "data",
                    headers: "headers",
                    method: "method"
                });
            });

            it("Should call _updateData", function() {
                spyOn(evt, "_updateData");
                evt._getRequestData();
                expect(evt._updateData).toHaveBeenCalledWith();
            });

            it("Should call _updateUrl", function() {
                spyOn(evt, "_updateUrl");
                evt._getRequestData();
                expect(evt._updateUrl).toHaveBeenCalledWith();
            });

            it("Should return expected properties", function() {
                expect(evt._getRequestData()).toEqual({
                    url: "url",
                    data: "data",
                    headers: "headers",
                    method: "method"
                });

            });
        });

        describe("The _updateUrl() method", function() {
            it("Should leave data alone if its not a function", function() {
                var evt = new layer.XHRSyncEvent({
                    url: "hey"
                });
                evt._updateUrl();
                expect(evt.url).toEqual("hey");
            });

            it("Should update url if its a function", function() {
                var evt = new layer.XHRSyncEvent({
                    url: function() {return "hey"}
                });
                expect(evt.url).not.toEqual("hey");
                evt._updateUrl();
                expect(evt.url).toEqual("hey");
            });

        });
    });
});
