/* eslint-disable */
describe("The OnlineStateManager Class", function() {
    var socket, client;
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

        socket = client.socketManager;
    });
    afterEach(function() {
        client.destroy();
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });



    describe("The constructor() method", function() {
        it("Should copy in object parameters", function() {
            var manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });

            expect(manager.socketManager).toBe(socket);
            expect(manager.testUrl).toEqual("/nonces");
        });

        it("Should listen for websocket messages", function() {
            var manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
            spyOn(manager, "_connectionListener");

            // Run
            socket.trigger("message", {data: {body: {}}});

            // Posttest
            expect(manager._connectionListener).toHaveBeenCalledWith({status: "connection:success"});
        });

        it("Should listen for xhr success responses", function() {
            var manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
            spyOn(manager, "_connectionListener");

            // Run
            layer.xhr({
                url: "test"
            });
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(manager._connectionListener).toHaveBeenCalledWith({
                target: jasmine.any(Object),
                status: "connection:success"
            });
        });

        it("Should listen for xhr failure responses", function() {
            var manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
            spyOn(manager, "_connectionListener");

            // Run
            layer.xhr({
                url: "test"
            });
            requests.mostRecent().response({
                status: 0
            });

            // Posttest
            expect(manager._connectionListener).toHaveBeenCalledWith({
                target: jasmine.any(Object),
                status: "connection:error"
            });
        });
    });

    describe("The start() method", function() {
        var manager;
        beforeEach(function() {
            manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
        });

        afterEach(function() {
            manager.destroy();
        });

        it("Should call _scheduleNextOnlineCheck", function() {
          spyOn(manager, "_scheduleNextOnlineCheck");
          manager.start();
          expect(manager._scheduleNextOnlineCheck).toHaveBeenCalledWith();
        });

        it("Should set isOnline to true", function() {
          expect(manager.isOnline).toBe(false);
          manager.start();
          expect(manager.isOnline).toBe(true);
        });

        it("Should not trigger connected for the first call to start", function() {
          spyOn(manager, "trigger");
          manager.start();
          expect(manager.trigger).not.toHaveBeenCalled();
        });


        it("Should trigger connected on all subsequent calls to start", function() {
          spyOn(manager, "trigger");
          manager.start();
          manager.start();
          manager.start();
          expect(manager.trigger).toHaveBeenCalledWith("connected", { offlineDuration: 0 });
          expect(manager.trigger.calls.count()).toEqual(2);
        });

        it("Should set isClientReady to true", function() {
        manager.isClientReady = false;
        manager.start();
        expect(manager.isClientReady).toBe(true);
      });
    });

    describe("The stop() method", function() {
      var manager;
      beforeEach(function() {
          manager = this.onlineManager = new layer.OnlineStateManager({
            socketManager: socket,
            testUrl: '/nonces'
          });
      });

      afterEach(function() {
          manager.destroy();
      });

      it("Should set isClientReady to false", function() {
        manager.isClientReady = true;
        manager.stop();
        expect(manager.isClientReady).toBe(false);
      });

      it("Should set isOnline to false", function() {
        manager.isOnline = true;
        manager.stop();
        expect(manager.isOnline).toBe(false);
      });

      it("Should trigger disconnected", function() {
        spyOn(manager, "trigger");
        manager.isOnline = true;
        manager.stop();
        expect(manager.trigger).toHaveBeenCalledWith("disconnected");
      });

      it("Should call _changeToOffline", function() {
        spyOn(manager, "_changeToOffline");
        manager.stop();
        expect(manager._changeToOffline).toHaveBeenCalledWith();
      });

      it("Should cancel all polling", function() {
        spyOn(manager, "_clearCheck");
        manager.stop();
        expect(manager._clearCheck).toHaveBeenCalledWith();
      });
    });

    describe("The _scheduleNextOnlineCheck() method", function() {
        var manager;
        beforeEach(function() {
            manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces',
              isOnline: true,
              isClientReady: true
            });
        });

        afterEach(function() {
            manager.destroy();
        });

        it("Should call _clearCheck", function() {
            spyOn(manager, "_clearCheck");
            manager._scheduleNextOnlineCheck();
            expect(manager._clearCheck).toHaveBeenCalledWith();
        });

        it("Should schedule _onlineExpired to be called based on pingFrequency if online", function() {
            var frequency = manager.pingFrequency;
            manager.isOnline = true;
            spyOn(manager, "_onlineExpired");

            // Run
            manager._scheduleNextOnlineCheck();
            jasmine.clock().tick(frequency-1);
            expect(manager._onlineExpired).not.toHaveBeenCalled();

            // Posttest
            jasmine.clock().tick(1);
            expect(manager._onlineExpired).toHaveBeenCalled();
        });

        it("Should schedule checkOnlineStatus to be called based on getExponentialBackoffSeconds if offline", function() {
            manager.isOnline = false;
            spyOn(manager, "checkOnlineStatus");
            var tmp = layer.Util.getExponentialBackoffSeconds;
            spyOn(layer.Util, "getExponentialBackoffSeconds").and.returnValue(50);

            // Run
            manager._scheduleNextOnlineCheck();
            jasmine.clock().tick(50000 - 1);
            expect(manager.checkOnlineStatus).not.toHaveBeenCalled();

            // Posttest
            jasmine.clock().tick(2);
            expect(manager.checkOnlineStatus).toHaveBeenCalled();
            expect(layer.Util.getExponentialBackoffSeconds).toHaveBeenCalledWith(manager.maxOfflineWait, 0);

            // Restore
            layer.Util.getExponentialBackoffSeconds = tmp;
        });

        it("Should set onlineCheckId", function() {
            manager.onlineCheckId = 0;
            manager._scheduleNextOnlineCheck();
            expect(manager.onlineCheckId > 0).toBe(true);
        });
    });

    describe("The _handleOnlineEvent() method", function() {
        var manager;
        beforeEach(function() {
            manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
        });

        afterEach(function() {
            manager.destroy();
        });

        it("Should call checkOnlineStatus", function() {
            spyOn(manager, "checkOnlineStatus");
            manager._handleOnlineEvent();
            expect(manager.checkOnlineStatus).toHaveBeenCalledWith();
        });

        it("Should reset offlineCounter if browser is online", function() {
            manager.offlineCounter = 5;
            manager._handleOnlineEvent();
            expect(manager.offlineCounter).toEqual(0);
        });
    });

    describe("The _onlineExpired() method", function() {
      var manager;
      beforeEach(function() {
          manager = this.onlineManager = new layer.OnlineStateManager({
            socketManager: socket,
            testUrl: '/nonces'
          });
      });

      afterEach(function() {
          manager.destroy();
      });

      it("Should clear the timeout", function() {
        spyOn(manager, "_clearCheck");
        manager._onlineExpired();
        expect(manager._clearCheck).toHaveBeenCalledWith();
      });

      it("Should call _changeToOffline", function() {
        spyOn(manager, "_changeToOffline");
        manager._onlineExpired();
        expect(manager._changeToOffline).toHaveBeenCalledWith();
      });

      it("Should schedule continued tests", function() {
        spyOn(manager, "_scheduleNextOnlineCheck");
        manager._onlineExpired();
        expect(manager._scheduleNextOnlineCheck).toHaveBeenCalledWith();
      });
    });

    describe("The checkOnlineStatus() method", function() {
        var manager;
        beforeEach(function() {
            manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
        });

        afterEach(function() {
            manager.destroy();
        });

        it("Should ping the testUrl", function() {
            manager.checkOnlineStatus();
            expect(requests.mostRecent().url).toEqual(manager.testUrl);
        });

        // Integration test which depends upon _connectionListener updating
        // isOnline
        it("Should update isOnline and push it into the callback", function() {
            var spy = jasmine.createSpy('spy');
            manager.isOnline = false;
            manager.checkOnlineStatus(spy);

            // Run
            requests.mostRecent().response({status: 200});

            expect(spy).toHaveBeenCalledWith(true);
            expect(manager.isOnline).toEqual(true);
        });

        it("Should be fine without a callback", function() {
            manager.isOnline = false;
            manager.checkOnlineStatus();

            // Run
            expect(function() {
                requests.mostRecent().response({status: 200});
            }).not.toThrow();
        });
    });


    describe("The _changeToOffline() method", function() {
      var manager;
      beforeEach(function() {
          manager = this.onlineManager = new layer.OnlineStateManager({
            socketManager: socket,
            testUrl: '/nonces'
          });
          manager.isOnline = true;
      });

      afterEach(function() {
          manager.destroy();
      });

      it("Should set isOnline to false", function() {
        manager._changeToOffline();
        expect(manager.isOnline).toBe(false);
      });

      it("Should set trigger disconnected", function() {
        spyOn(manager, "trigger");
        manager._changeToOffline();
        expect(manager.trigger).toHaveBeenCalledWith("disconnected");
      });

      it("Should not trigger if already offline", function() {
        manager.isOnline = false;
        spyOn(manager, "trigger");
        manager._changeToOffline();
        expect(manager.trigger).not.toHaveBeenCalled();
      });
    });

    describe("The _connectionListener() method", function() {
        var manager;
        beforeEach(function() {
            manager = this.onlineManager = new layer.OnlineStateManager({
              socketManager: socket,
              testUrl: '/nonces'
            });
        });

        afterEach(function() {
            manager.destroy();
        });

        it("Should trigger connected if success event and was offline", function() {
            manager.isOnline = false;
            manager.offlineCounter = 100;
            spyOn(manager, "trigger");

            // Run
            manager._connectionListener({status: "connection:success"});

            // Posttest
            expect(manager.trigger).toHaveBeenCalledWith("connected", {offlineDuration: jasmine.any(Number)});
            expect(manager.isOnline).toBe(true);
            expect(manager.offlineCounter).toEqual(0);
        });

        it("Should NOT trigger successful if success event and was online", function() {
            manager.isOnline = true;
            spyOn(manager, "trigger");

            // Run
            manager._connectionListener({status: "connection:success"});

            // Posttest
            expect(manager.trigger).not.toHaveBeenCalled();
        });

        it("Should call _changeToOffline if unsuccess event and was online", function() {
            manager.isOnline = true;
            spyOn(manager, "_changeToOffline");

            // Run
            manager._connectionListener({status: "connection:error"});

            // Posttest
            expect(manager._changeToOffline).toHaveBeenCalledWith();
        });

        it("Should call _scheduleNextOnlineCheck", function() {
            spyOn(manager, "_scheduleNextOnlineCheck");
            manager._connectionListener({status: ""});
            expect(manager._scheduleNextOnlineCheck).toHaveBeenCalledWith();
        });
    });
});