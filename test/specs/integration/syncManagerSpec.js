/*eslint-disable */
describe("SyncManager Integration Tests", function() {
    var socket, client, syncManager, request;
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
        request = new layer.XHRSyncEvent({
            method: "POST",
            data: {hey: "ho"},
            target: "fred",
            callback: function() {}
        });
        syncManager.queue = [request];
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    it("Should schedule a retry after a service unavailable error", function() {
        var tmp = layer.Util.getExponentialBackoffSeconds;
        spyOn(layer.Util, "getExponentialBackoffSeconds").and.returnValue(5);
        spyOn(syncManager, "_processNextRequest");
        syncManager._xhrError({
            success: false,
            status: 503,
            request: request,
            data: {}
        });

        jasmine.clock().tick(4999);
        expect(syncManager._processNextRequest).not.toHaveBeenCalled();

        jasmine.clock().tick(2);
        expect(syncManager._processNextRequest).toHaveBeenCalled();

        expect(request.retryCount).toEqual(1);
        expect(syncManager.queue).toEqual([request]);

        while(request.retryCount < layer.SyncManager.MAX_RETRIES) {
            syncManager._xhrError({
                success: false,
                status: 503,
                request: request,
                data: {}
            });
            jasmine.clock().tick(5002);
        }

        syncManager._xhrError({
            success: false,
            status: 503,
            request: request,
            data: {}
        });

        expect(syncManager.queue).toEqual([]);

        // Restore
        layer.Util.getExponentialBackoffSeconds = tmp;
    });


});