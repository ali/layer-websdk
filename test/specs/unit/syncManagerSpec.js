/* eslint-disable */
describe("The SyncManager Class", function() {
    var socket, client, syncManager;
    var appId = "Fred's App";

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        client = new layer.Client({
            appId: appId,
            url: "https://huh.com"
        });
        client.sessionToken = "sessionToken";
        client.userId = "Frodo";

        conversation = client._createObject(responses.conversation1).conversation;
        requests.reset();
        client.syncManager.queue = [];
        jasmine.clock().tick(1);
        syncManager = new layer.SyncManager({
            client: client,
            onlineManager: client.onlineManager,
            websocketManager: client.socketManager
        });
        client.onlineManager.isOnline = true;
        client.socketManager._socket = {
            send: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            close: function() {},
            readyState: WebSocket.OPEN
        };

    });

    afterEach(function() {
        client.destroy();
        syncManager.destroy();
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        it("Should return a SyncManager instance", function() {
            var syncManager = new layer.SyncManager({
                client: client,
                onlineManager: client.onlineManager,
                websocketManager: client.socketManager
            });
            expect(syncManager).toEqual(jasmine.any(layer.SyncManager));
            syncManager.destroy();
        });

        it("Should listen for client.authenticated", function() {
            var tmp = layer.SyncManager.prototype._processNextRequest;
            spyOn(layer.SyncManager.prototype  ,"_processNextRequest");
            var syncManager = new layer.SyncManager({
                client: client,
                onlineManager: client.onlineManager,
                websocketManager: client.socketManager
            });


            // Run
            client.trigger("authenticated");

            // Posttest
            expect(syncManager._processNextRequest).toHaveBeenCalled();

            // Restore
            layer.SyncManager.prototype._processNextRequest = tmp;
            syncManager.destroy();
        });

        it("Should listen for onlineManager.connected", function() {
            var tmp = layer.SyncManager.prototype._onlineStateChange;
            spyOn(layer.SyncManager.prototype, "_onlineStateChange");
            var syncManager = new layer.SyncManager({
                client: client,
                onlineManager: client.onlineManager,
                websocketManager: client.socketManager
            });

            // Run
            client.onlineManager.trigger("disconnected");

            // Posttest
            expect(syncManager._onlineStateChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));

            // Restore
            layer.SyncManager.prototype._onlineStateChange = tmp;
            syncManager.destroy();
        });

        it("Should listen for websocketManager.connected", function() {
            var tmp = layer.SyncManager.prototype._onlineStateChange;
            spyOn(layer.SyncManager.prototype, "_onlineStateChange");
            var syncManager = new layer.SyncManager({
                client: client,
                onlineManager: client.onlineManager,
                websocketManager: client.socketManager
            });

            // Run
            client.socketManager.trigger("connected");

            // Posttest
            expect(syncManager._onlineStateChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));

            // Restore
            layer.SyncManager.prototype._onlineStateChange = tmp;
            syncManager.destroy();
        });

        it("Should listen for websocketManager.disconnected", function() {
            var tmp = layer.SyncManager.prototype._onlineStateChange;
            spyOn(layer.SyncManager.prototype, "_onlineStateChange");
            var syncManager = new layer.SyncManager({
                client: client,
                onlineManager: client.onlineManager,
                websocketManager: client.socketManager
            });

            // Run
            client.socketManager.trigger("disconnected");

            // Posttest
            expect(syncManager._onlineStateChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));

            // Restore
            layer.SyncManager.prototype._onlineStateChange = tmp;
            syncManager.destroy();
        });
    });


    describe("The _onlineStateChange() method", function () {
        it("Should schedule a call for _processNextRequest if connected", function() {
            spyOn(syncManager, "_processNextRequest");

            // Run
            client.socketManager.trigger("connected");

            // Midtest
            expect(syncManager._processNextRequest).not.toHaveBeenCalled();

            jasmine.clock().tick(100);

            // Posttest
            expect(syncManager._processNextRequest).toHaveBeenCalled();
        });

        it("Should increment returnToOnlineCount if connected", function() {
            spyOn(syncManager, "_processNextRequest");
            syncManager.queue = [new layer.XHRSyncEvent({})];
            expect(syncManager.queue[0].returnToOnlineCount).toEqual(0);

            // Run
            client.socketManager.trigger("connected");

            // Posttest
            expect(syncManager.queue[0].returnToOnlineCount).toEqual(1);

            client.socketManager.trigger("connected");

            expect(syncManager.queue[0].returnToOnlineCount).toEqual(2);
        });

        it("Should reset firing property if disconnected", function() {
            spyOn(syncManager, "_processNextRequest");
            syncManager.queue = [new layer.XHRSyncEvent({firing: true})];
            expect(syncManager.queue[0].firing).toBe(true);

            // Run
            client.socketManager.trigger("disconnected");

            // Posttest
            expect(syncManager.queue[0].firing).toBe(false);
        });
    });

    describe("The request() method", function() {
        var evt;
        beforeEach(function() {
            evt = new layer.XHRSyncEvent({
                operation: "PATCH",
                target: "fred"
            });
        });

        it("Should add a PATCH request", function() {
            syncManager.request(evt);
            expect(syncManager.queue).toEqual([evt]);
        });


        it("Should NOT add a PATCH request if there is a CREATE request for the same target", function() {
            var createEvt = new layer.XHRSyncEvent({
                operation: "POST",
                target: "fred"
            });
            syncManager.queue = [createEvt];

            // Run
            syncManager.request(evt);

            // Posttest
            expect(syncManager.queue).toEqual([createEvt]);
        });

        it("Should add a PATCH request if there is a CREATE request for a different target", function() {
            var createEvt = new layer.XHRSyncEvent({
                operation: "POST",
                target: "fred2"
            });
            syncManager.queue = [createEvt];

            // Run
            syncManager.request(evt);

            // Posttest
            expect(syncManager.queue).toEqual([createEvt, evt]);
        });

        it("Should trigger sync:add event", function() {
            spyOn(syncManager, "trigger");
            syncManager.request(evt);
            expect(syncManager.trigger).toHaveBeenCalledWith('sync:add', {
                request: evt,
                target: evt.target
            });

        });

        it("Should add a DELETE request", function() {
            evt.operation = "DELETE";
            syncManager.request(evt);
            expect(syncManager.queue).toEqual([evt]);
        });

        it("Should call _purgeOnDelete when adding a DELETE request", function() {
            spyOn(syncManager, "_purgeOnDelete");
            evt.operation = "DELETE";
            syncManager.request(evt);
            expect(syncManager._purgeOnDelete).toHaveBeenCalledWith(evt);
        });

        it("Should call _processNextRequest if this is the first request in the queue", function() {
            spyOn(syncManager, "_processNextRequest");
            syncManager.request(evt);
            expect(syncManager._processNextRequest).toHaveBeenCalledWith();
        });

        it("Should not fire any requests if its NOT the first request in the queue", function() {
            syncManager.queue = [new layer.XHRSyncEvent({})];
            spyOn(syncManager, "_processNextRequest");
            syncManager.request(evt);
            expect(syncManager._processNextRequest).not.toHaveBeenCalled();
        });
    });


    describe("The _processNextRequest() method", function() {
        it("Should call websocketManager.sendRequest", function() {
            var data = {name: "fred"}
            syncManager.queue = [new layer.WebsocketSyncEvent({
                data: data
            })];
            spyOn(syncManager.websocketManager, "sendRequest");

            // Run
            syncManager._processNextRequest();

            // Posttest
            expect(syncManager.websocketManager.sendRequest).toHaveBeenCalledWith(data, jasmine.any(Function));
        });

        it("Should call xhr", function() {
            syncManager.queue = [new layer.XHRSyncEvent({
                data: "fred",
                url: "fred2",
                method: "PATCH"
            })];

            // Run
            syncManager._processNextRequest();

            // Posttest
            expect(requests.mostRecent().url).toEqual("fred2");
            expect(requests.mostRecent().method).toEqual("PATCH");
            expect(requests.mostRecent().params).toEqual("fred");
        });

        it("Should set firing to true", function() {
            syncManager.queue = [new layer.WebsocketSyncEvent({
                data: {name: "fred"}
            })];
            expect(syncManager.queue[0].firing).toBe(false);

            // Run
            syncManager._processNextRequest();

            // Posttest
            expect(syncManager.queue[0].firing).toBe(true);
        });
    });

    describe("The _xhrResult() method", function() {
        beforeEach(function() {
            syncManager.queue = [new layer.XHRSyncEvent({
                data: "fred",
                url: "fred2",
                method: "PATCH"
            })];
            spyOn(syncManager, "_xhrError");
            spyOn(syncManager, "_xhrSuccess");
        });

        it("Should set firing to false", function() {
            syncManager.queue[0].firing = true;
            syncManager._xhrResult({}, syncManager.queue[0]);
            expect(syncManager.queue[0].firing).toBe(false);
        });

        it("Should put the request into the result", function() {
            var result = {};
            syncManager._xhrResult(result, syncManager.queue[0]);
            expect(result).toEqual({request: syncManager.queue[0]});
        });

        it("Should call _xhrSuccess", function() {
            var result = {success: true};
            syncManager._xhrResult(result, syncManager.queue[0]);
            expect(syncManager._xhrSuccess).toHaveBeenCalledWith(result);
            expect(syncManager._xhrError).not.toHaveBeenCalled();
        });

        it("Should call _xhrError", function() {
            var result = {success: false};
            syncManager._xhrResult(result, syncManager.queue[0]);
            expect(syncManager._xhrSuccess).not.toHaveBeenCalled();
            expect(syncManager._xhrError).toHaveBeenCalledWith(result);
        });
    });

    describe("The _xhrSuccess() method", function() {
        var evt;
        beforeEach(function() {
            evt = new layer.XHRSyncEvent({
                target: "fred"
            });
            syncManager.queue = [evt];
        });

        it("Should set the request success to true", function() {
            expect(evt.success).toEqual(null);
            syncManager._xhrSuccess({request: evt});
            expect(evt.success).toEqual(true);
        });

        it("Should remove the request", function() {
            syncManager._xhrSuccess({request: evt});
            expect(syncManager.queue).toEqual([]);
        });

        it("Should call the request callback", function() {
            evt.callback = jasmine.createSpy('callback');
            var result = {request: evt};
            syncManager._xhrSuccess(result);
            expect(evt.callback).toHaveBeenCalledWith(result);
        });

        it("Should call _processNextRequest", function() {
            spyOn(syncManager, "_processNextRequest");
            syncManager._xhrSuccess({request: evt});
            expect(syncManager._processNextRequest).toHaveBeenCalled();
        });

        it("Should trigger sync:success", function() {
            spyOn(syncManager, "trigger");
            syncManager._xhrSuccess({request: evt, data: "hey"});
            expect(syncManager.trigger).toHaveBeenCalledWith('sync:success', {
              target: "fred",
              request: evt,
              response: "hey",
            });
        });
    });

    describe("The _getErrorState() method", function() {

        it("Should return offline if isOnline is false", function() {
            expect(syncManager._getErrorState({status: 408}, {retryCount: 0}, false)).toEqual("offline");
        });

        it("Should return CORS if isOnline is false and returnToOnlineCount is high", function() {
            expect(syncManager._getErrorState({status: 408}, {retryCount: 0, returnToOnlineCount: 3}, false)).toEqual("CORS");
        });

        it("Should return validateOnlineAndRetry if its a 408 no-response", function() {
            expect(syncManager._getErrorState({status: 408}, {retryCount: 0}, true)).toEqual("validateOnlineAndRetry");
            expect(syncManager._getErrorState({status: 408}, {retryCount: layer.SyncManager.MAX_RETRIES - 1}, true)).toEqual("validateOnlineAndRetry");
        });

        it("Should return tooManyFailuresWhileOnline if too many 408s", function() {
            expect(syncManager._getErrorState({status: 408}, {retryCount: layer.SyncManager.MAX_RETRIES }, true)).toEqual("tooManyFailuresWhileOnline");
        });

        it("Should return serverUnavailable for server unavailable errors", function() {
            expect(syncManager._getErrorState({status: 502}, {retryCount: 0}, true)).toEqual("serverUnavailable");
            expect(syncManager._getErrorState({status: 503}, {retryCount: 0}, true)).toEqual("serverUnavailable");
            expect(syncManager._getErrorState({status: 504}, {retryCount: 0}, true)).toEqual("serverUnavailable");
            expect(syncManager._getErrorState({status: 505}, {retryCount: 0}, true)).not.toEqual("serverUnavailable");
        });

        it("Should return tooManyFailuresWhileOnline if too many service unavailables", function() {
            expect(syncManager._getErrorState({status: 503}, {retryCount: layer.SyncManager.MAX_RETRIES }, true)).toEqual("tooManyFailuresWhileOnline");
        });

        it("Should return reauthorize if there is a nonce", function() {
            expect(syncManager._getErrorState({status: 401, data: {data: {nonce: "fred"}}}, {retryCount: 0}, true)).toEqual("reauthorize");
            expect(syncManager._getErrorState({status: 402, data: {data: {nonce: "fred"}}}, {retryCount: 0}, true)).not.toEqual("reauthorize");
        });

        it("Should return serverRejectedRequest for anything else", function() {
            expect(syncManager._getErrorState({status: 404}, {retryCount: 0}, true)).toEqual("serverRejectedRequest");
            expect(syncManager._getErrorState({status: 405}, {retryCount: 0}, true)).toEqual("serverRejectedRequest");
        });
    });

    describe("The _xhrError() method", function() {
        var request;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request = new layer.SyncEvent({
                operation: "PATCH",
                target: "fred"
            });
            syncManager.queue = [request];
        });

        it("Should call _getErrorState", function() {
            spyOn(syncManager, "_getErrorState");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._getErrorState).toHaveBeenCalledWith(result, request, true);
        });

        it("Should call _xhrHandleServerError if tooManyFailuresWhileOnline if too many 408s", function() {
            spyOn(syncManager, "_xhrHandleServerError");
            spyOn(syncManager, "_getErrorState").and.returnValue("tooManyFailuresWhileOnline");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrHandleServerError).toHaveBeenCalledWith(result, jasmine.any(String));
        });

        it("Should call _xhrHandleServerError if CORS error", function() {
            spyOn(syncManager, "_xhrHandleServerError");
            spyOn(syncManager, "_getErrorState").and.returnValue("CORS");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrHandleServerError).toHaveBeenCalledWith(result, jasmine.any(String));
        });

        it("Should call _xhrValidateIsOnline if validateOnlineAndRetry", function() {
            spyOn(syncManager, "_xhrValidateIsOnline");
            spyOn(syncManager, "_getErrorState").and.returnValue("validateOnlineAndRetry");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrValidateIsOnline).toHaveBeenCalledWith();
        });

        it("Should call _xhrHandleServerUnavailableError if serverUnavailable", function() {
            spyOn(syncManager, "_xhrHandleServerUnavailableError");
            spyOn(syncManager, "_getErrorState").and.returnValue("serverUnavailable");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrHandleServerUnavailableError).toHaveBeenCalledWith(request);
        });

        it("Should call callback if reauthorize", function() {
            var spy = request.callback = jasmine.createSpy();
            spyOn(syncManager, "_getErrorState").and.returnValue("reauthorize");
            var result = {request: request};


            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(spy).toHaveBeenCalledWith(result);
        });

        it("Should call _xhrHandleServerError if serverRejectedRequest", function() {
            spyOn(syncManager, "_xhrHandleServerError");
            spyOn(syncManager, "_getErrorState").and.returnValue("serverRejectedRequest");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrHandleServerError).toHaveBeenCalledWith(result, jasmine.any(String));
        });

        it("Should call _xhrHandleConnectionError if offline", function() {
            spyOn(syncManager, "_xhrHandleConnectionError");
            spyOn(syncManager, "_getErrorState").and.returnValue("offline");
            var result = {request: request};

            // Run
            syncManager._xhrError(result);

            // Posttest
            expect(syncManager._xhrHandleConnectionError).toHaveBeenCalledWith();
        });
    });

    describe("The _xhrHandleServerUnavailableError() method", function() {
        var request;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request = new layer.SyncEvent({
                operation: "PATCH",
                target: "fred"
            });
            syncManager.queue = [request];
        });

        it("Should default to retryCount of 0", function() {
            expect(request.retryCount).toEqual(0);
        });

        it("Should increment retryCount", function() {
            syncManager._xhrHandleServerUnavailableError(request);
            expect(request.retryCount).toEqual(1);
            syncManager._xhrHandleServerUnavailableError(request);
            expect(request.retryCount).toEqual(2);
            syncManager._xhrHandleServerUnavailableError(request);
            expect(request.retryCount).toEqual(3);
        });

        it("Should call Utils.getExponentialBackoffSeconds with the retryCount", function() {
            var tmp = layer.Util.getExponentialBackoffSeconds;
            spyOn(layer.Util, "getExponentialBackoffSeconds");

            // Run
            syncManager._xhrHandleServerUnavailableError(request);
            expect(layer.Util.getExponentialBackoffSeconds).toHaveBeenCalledWith(900, 0);
            syncManager._xhrHandleServerUnavailableError(request);
            expect(layer.Util.getExponentialBackoffSeconds).toHaveBeenCalledWith(900, 1);
            syncManager._xhrHandleServerUnavailableError(request);
            expect(layer.Util.getExponentialBackoffSeconds).toHaveBeenCalledWith(900, 2);

            // Restore
            layer.Util.getExponentialBackoffSeconds = tmp;
        });

        it("Should schedule processNextRequest for backoff seconds", function() {
            var tmp = layer.Util.getExponentialBackoffSeconds;
            spyOn(layer.Util, "getExponentialBackoffSeconds").and.returnValue(15);
            spyOn(syncManager, "_processNextRequest");

            // Run
            syncManager._xhrHandleServerUnavailableError(request);
            jasmine.clock().tick(14999);
            expect(syncManager._processNextRequest).not.toHaveBeenCalled();
            jasmine.clock().tick(2);
            expect(syncManager._processNextRequest).toHaveBeenCalledWith();

            // Restore
            layer.Util.getExponentialBackoffSeconds = tmp;
        });
    });

    describe("The _xhrHandleServerError() method", function() {
        var request, result;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request = new layer.XHRSyncEvent({
                operation: "PATCH",
                target: "fred",
                callback: jasmine.createSpy("callback")
            });
            syncManager.queue = [request];
            result = {
                request: request,
                data: "myerror"
            };
        });

        it("Should call the request callback with the results", function() {
            var spy = request.callback = jasmine.createSpy();

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(spy).toHaveBeenCalledWith(result);
        });

        it("Should trigger a sync:error event", function() {
            spyOn(syncManager, "trigger");

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(syncManager.trigger).toHaveBeenCalledWith("sync:error", {
                target: "fred",
                request: request,
                error: "myerror"
            });
        });

        it("Should call _purgeDependentRequests for POST failures", function() {
            spyOn(syncManager, "_purgeDependentRequests");
            request.operation = "POST";

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(syncManager._purgeDependentRequests).toHaveBeenCalledWith(request);
        });

        it("Should NOT call _purgeDependentRequests for non-POST failures", function() {
            spyOn(syncManager, "_purgeDependentRequests");
            request.operation = "PATCH";

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(syncManager._purgeDependentRequests).not.toHaveBeenCalled();
        });

        it("Should call _removeRequest to remove the failed reqeust", function() {
            spyOn(syncManager, "_removeRequest");

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(syncManager._removeRequest).toHaveBeenCalledWith(request);
        });

        it("Should call processNextRequest to start the next request", function() {
            spyOn(syncManager, "_processNextRequest");

            // Run
            syncManager._xhrHandleServerError(result);

            // Posttest
            expect(syncManager._processNextRequest).toHaveBeenCalledWith();
        });
    });

    describe("The _xhrValidateIsOnline() method", function() {
        it("Should call onlineManager.checkOnlineStatus", function() {
            spyOn(syncManager.onlineManager, "checkOnlineStatus");
            syncManager._xhrValidateIsOnline();
            expect(syncManager.onlineManager.checkOnlineStatus).toHaveBeenCalledWith(jasmine.any(Function));
        });

        it("Should call _xhrValidateIsOnlineCallback with the result", function() {
            spyOn(syncManager.onlineManager, "checkOnlineStatus").and.callFake(function(func) {
                func(true);
            });
            spyOn(syncManager, "_xhrValidateIsOnlineCallback");
            syncManager._xhrValidateIsOnline();
            expect(syncManager._xhrValidateIsOnlineCallback).toHaveBeenCalledWith(true);
        });
    });

    describe("The _xhrValidateIsOnlineCallback() method", function() {
        var request;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request = new layer.XHRSyncEvent({
                operation: "PATCH",
                target: "fred"
            });
            syncManager.queue = [request];
        });
        it("Should call _xhrHandleConnectionError if offline", function() {
            spyOn(syncManager, "_xhrHandleConnectionError");
            syncManager._xhrValidateIsOnlineCallback(false);
            expect(syncManager._xhrHandleConnectionError).toHaveBeenCalledWith();
        });

        it("Should increment retryCount if online", function() {
            syncManager._xhrValidateIsOnlineCallback(true);
            expect(request.retryCount).toEqual(1);
            syncManager._xhrValidateIsOnlineCallback(true);
            expect(request.retryCount).toEqual(2);
            syncManager._xhrValidateIsOnlineCallback(true);
            expect(request.retryCount).toEqual(3);
        })

        it("Should call processNextRequest if online", function() {
            spyOn(syncManager, "_processNextRequest");
            syncManager._xhrValidateIsOnlineCallback(true);
            expect(syncManager._processNextRequest).toHaveBeenCalledWith();
        });
    });

    describe("The _removeRequest() method", function() {
        var request;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request = new layer.SyncEvent({
                operation: "PATCH",
                target: "fred"
            });
            syncManager.queue = [request];
        });

        it("Should remove the request from the queue", function() {
            syncManager._removeRequest(request);
            expect(syncManager.queue).toEqual([]);
        });

        it("Should do nothing if request not in the queue", function() {
            var request2 = new layer.SyncEvent({
                operation: "PATCH",
                target: "fred"
            });
            syncManager._removeRequest(request2);
            expect(syncManager.queue).toEqual([request]);
        });
    });

    describe("The _purgeDependentRequests() method", function() {
        var request1, request2, request3;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request1 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["fred"]
            });
            request2 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["freud"]
            });
            request3 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["freud", "fred"]
            });
            syncManager.queue = [request1, request2, request3];
        });

        it("Should remove all requests that share the target", function() {
            syncManager._purgeDependentRequests(new layer.SyncEvent({target: "fred"}));
            expect(syncManager.queue).toEqual([request2]);
        });

        it("Should leave unrelated requests untouched", function() {
            syncManager._purgeDependentRequests(new layer.SyncEvent({
                operation: "PATCH",
                target: "jill"
            }));
            expect(syncManager.queue).toEqual([request1, request2, request3]);
        });
    });

    describe("The _purgeOnDelete() method", function() {
        var request1, request2, request3;
        beforeEach(function() {
            syncManager.onlineManager.isOnline = true;
            request1 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["fred"]
            });
            request2 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["freud", "frozone"]
            });
            request3 = new layer.SyncEvent({
                operation: "PATCH",
                depends: ["fred", "freud"]
            });
            syncManager.queue = [request1, request2, request3];
        });
        it("Should remove all requests that depend upon the target of the input request", function() {
            syncManager._purgeOnDelete(new layer.SyncEvent({
                operation: "PATCH",
                target: "fred"
            }));
            expect(syncManager.queue).toEqual([request2]);
        });
    });

});