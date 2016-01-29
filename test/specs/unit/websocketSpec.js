/* eslint-disable */
describe("The Websocket Manager Class", function() {
    var socket, client, websocketManager;
    var appId = "Fred's App";

    beforeAll(function() {
        // Test for phantomjs websocket handling
        var ws = new WebSocket("wss://testthisfakeurl.com");
        if (!ws.url) {
            window.WebSocket = function WebSocket(url) {
                this.url = url;
                this.close = function() {};
                this.send = function() {};
                this.addEventListener = function() {};
                this.removeEventListener = function() {};
            };
            window.WebSocket.CONNECTING = 0;
            window.WebSocket.OPEN = 1;
            window.WebSocket.CLOSING = 2;
            window.WebSocket.CLOSED = 3;
        }
   });

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
        websocketManager = new layer.WebsocketManager({
            client: client
        });

        conversation = client._createObject(responses.conversation1).conversation;
        requests.reset();
        client.syncManager.queue = [];
        jasmine.clock().tick(1);
        client.isAuthenticated = true;
        client._clientReady();
        websocketManager.connect();
        websocketManager._socket.readyState = WebSocket.OPEN;
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        it("Should return a WebsocketManager", function() {
            expect(new layer.WebsocketManager({
                client: client
            })).toEqual(jasmine.any(layer.WebsocketManager));
        });

        it("Should throw an error if no client", function() {
            expect(function() {
                new layer.WebsocketManager({});
            }).toThrow();
        });

        it("Should setup _requestCallbacks", function() {
            expect(websocketManager._requestCallbacks).toEqual({});
        });

        it("Should call connect if client is authenticated", function() {
            var tmp = layer.WebsocketManager.prototype.connect;
            spyOn(layer.WebsocketManager.prototype, "connect");
            client.isAuthenticated = true;

            // Run
            new layer.WebsocketManager({
                client: client
            });

            // Posttest
            expect(layer.WebsocketManager.prototype.connect).toHaveBeenCalledWith();

            // Cleanup
            layer.WebsocketManager.prototype.connect = tmp;
        });

        it("Should skip connect if client is not authenticated", function() {
            var tmp = layer.WebsocketManager.prototype.connect;
            spyOn(layer.WebsocketManager.prototype, "connect");
            client.isAuthenticated = false;

            // Run
            new layer.WebsocketManager({
                client: client
            });

            // Posttest
            expect(layer.WebsocketManager.prototype.connect).not.toHaveBeenCalled();

            // Cleanup
            layer.WebsocketManager.prototype.connect = tmp;
        });

        it("Should subscribe to call connect on client authenticated", function() {
            var oldSocket = websocketManager._socket;
            client.trigger("authenticated");
            expect(oldSocket).not.toBe(websocketManager._socket);
        });
    });

    describe("The _reset() method", function() {
      // This is the one thing that Really matters.
      it("Should clear _hasCounter", function() {
        websocketManager._hasCounter = true;
        websocketManager._reset();
        expect(websocketManager._hasCounter).toBe(false);
      });
    });

    describe("The _onlineStateChange() method", function() {
      it("Should call _reconnect(false) if online without a reset", function() {
        spyOn(websocketManager, "close");
        spyOn(websocketManager, "_reconnect");

        websocketManager._onlineStateChange({
          eventName: "online",
          isOnline: true,
          reset: false
        });

        expect(websocketManager.close).not.toHaveBeenCalled();
        expect(websocketManager._reconnect).toHaveBeenCalledWith(false);
      });

      it("Should call _reconnect(true) if online event is a reset", function() {
        spyOn(websocketManager, "_reconnect");

        websocketManager._onlineStateChange({
          eventName: "online",
          isOnline: true,
          reset: true
        });

        expect(websocketManager._reconnect).toHaveBeenCalledWith(true);
      });

      it("Should close if offline", function() {
        spyOn(websocketManager, "close");
        spyOn(websocketManager, "_reconnect");

        websocketManager._onlineStateChange({
          eventName: "online",
          isOnline: false
        });

        expect(websocketManager.close).toHaveBeenCalledWith();
        expect(websocketManager._reconnect).not.toHaveBeenCalled();
      });

    });

    describe("The _reconnect() method", function() {
      it("Should close _reset and connect if resetting", function() {
        spyOn(websocketManager, "close");
        spyOn(websocketManager, "_reset");
        spyOn(websocketManager, "connect");

        websocketManager._reconnect(true);

        expect(websocketManager.close).toHaveBeenCalledWith();
        expect(websocketManager._reset).toHaveBeenCalled();
        expect(websocketManager.connect).toHaveBeenCalled();
      });

      it("Should close and connect if not resetting", function() {
        spyOn(websocketManager, "close");
        spyOn(websocketManager, "_reset");
        spyOn(websocketManager, "connect");

        websocketManager._reconnect(false);

        expect(websocketManager.close).toHaveBeenCalledWith();
        expect(websocketManager._reset).not.toHaveBeenCalled();
        expect(websocketManager.connect).toHaveBeenCalled();
      });
    });

    describe("The connect() method", function() {
        it("Should clear state", function() {
            websocketManager._closing = true;
            websocketManager._lastCounter = 10;

            // Run
            websocketManager.connect();

            // Posttest
            expect(websocketManager._closing).toEqual(false);
            expect(websocketManager._lastCounter).toEqual(-1);
        });

        it("Should create a websocket connection", function() {
            websocketManager._socket = null;
            websocketManager.connect();
            expect(websocketManager._socket).toEqual(jasmine.any(WebSocket));
        });

        it("Should use the correct url", function() {
           websocketManager._socket = null;
           websocketManager.connect();
           expect(websocketManager._socket.url).toEqual(client.url.replace(/https/, "wss") + "/websocket?session_token=sessionToken");
        });

        it("Should be subscribed to websocket events", function(done) {
            spyOn(websocketManager, "_onSocketClose").and.callFake(function() {
                expect(1).toEqual(1);
                done();
            });
            websocketManager._socket = null;
            websocketManager.connect();
            websocketManager.close();
        });

        it("Should schedule _connectionFailed to be called", function() {
          websocketManager._connectionFailedId = 0;
          spyOn(websocketManager, "_connectionFailed");

          // Run
          websocketManager.connect();

          // Posttest
          expect(websocketManager._connectionFailedId).not.toEqual(0);
          expect(websocketManager._connectionFailed).not.toHaveBeenCalled();
          jasmine.clock().tick(5001);
          expect(websocketManager._connectionFailed).toHaveBeenCalledWith();
        });
    });

    describe("The _clearConnectionFailed() method", function() {
      it("Should clear the timeout", function() {

      });

      it("Should clear the id", function() {

      });
    });

    describe("The _onOpen() method", function() {
        beforeEach(function() {
            websocketManager.isOpen = false;
            websocketManager._lostConnectionCount = 5;
        });
        it("Should do nothing if _isOpen() returns false", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(false);
            websocketManager._onOpen();
            expect(websocketManager.isOpen).toEqual(false);
        });

        it("Should reset _lostConnectionCount", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            websocketManager._onOpen();
            expect(websocketManager._lostConnectionCount).toEqual(0);
        });

        it("Should set isOpen", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            websocketManager._onOpen();
            expect(websocketManager.isOpen).toEqual(true);
        });

        it("Should trigger connected", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            spyOn(websocketManager, "trigger");

            // Run
            websocketManager._onOpen();

            // Posttest
            expect(websocketManager.trigger).toHaveBeenCalledWith("connected");
        });

        it("Should call replayEvents if there is a lastCounter", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            websocketManager._hasCounter = true;
            websocketManager._lastTimestamp = new Date();
            spyOn(websocketManager, "replayEvents");

            // Run
            websocketManager._onOpen();

            // Posttest
            expect(websocketManager.replayEvents).toHaveBeenCalledWith(websocketManager._lastTimestamp, true);
        });

        it("Should skip replayEvents and call if there is not a lastCounter", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            websocketManager._hasCounter = false;
            websocketManager._lastTimestamp = new Date();
            spyOn(websocketManager, "replayEvents");
            spyOn(websocketManager, "_reschedulePing");

            // Run
            websocketManager._onOpen();

            // Posttest
            expect(websocketManager.replayEvents).not.toHaveBeenCalled();
            expect(websocketManager._reschedulePing).toHaveBeenCalledWith();
        });

        it("Should call _clearConnectionFailed", function() {
          spyOn(websocketManager, "_clearConnectionFailed");

          // Run
          websocketManager._onOpen();

          // Posttest
          expect(websocketManager._clearConnectionFailed).toHaveBeenCalledWith();
        });
    });

    describe("The _isOpen() method", function() {
        it("Should return false if there is no websocket", function() {
            websocketManager._socket = null;
            expect(websocketManager._isOpen()).toEqual(false);
        });

        it("Should return false if readyState != open", function() {
            if (typeof WebSocket == "undefined") {
                expect(true).toBe(true);
            } else {
                websocketManager._socket.readyState = WebSocket.CLOSED;
                expect(websocketManager._isOpen()).toEqual(false);
            }
        });

        it("Should return true if readyState == open", function() {
            if (typeof WebSocket == "undefined") {
                expect(true).toBe(true);
            } else {
                websocketManager._socket.readyState = WebSocket.OPEN;
                expect(websocketManager._isOpen()).toEqual(true);
            }
        });
    });

    describe("The _onError() method", function() {

        it("Should do nothing if _closing is true", function() {
            websocketManager._closing = true;
            websocketManager.isOpen = true;
            spyOn(websocketManager, "_onSocketClose");

            // Run
            websocketManager._onError();

            // Posttest
            expect(websocketManager._onSocketClose).not.toHaveBeenCalled();
        });

        it("Should increment _lostConnectionCount if not isOpen", function() {
            websocketManager._lostConnectionCount = 5;
            websocketManager.isOpen = false;

            // Run
            websocketManager._onError();

            // Posttest
            expect(websocketManager._lostConnectionCount).toEqual(6);
        });

        it("Should call _scheduleReconnect if not isOpen", function() {
            websocketManager.isOpen = false;
            spyOn(websocketManager, "_scheduleReconnect");

            // Run
            websocketManager._onError();

            // Posttest
            expect(websocketManager._scheduleReconnect).toHaveBeenCalledWith();

        });

        it("Should call _onSocketClose if isOpen", function() {
            websocketManager.isOpen = true;
            spyOn(websocketManager, "_onSocketClose");

            // Run
            websocketManager._onError();

            // Posttest
            expect(websocketManager._onSocketClose).toHaveBeenCalledWith();

        });

        it("Should call socket.close if isOpen", function() {
            websocketManager.isOpen = true;
            var spy = websocketManager._socket.close = jasmine.createSpy('close');

            // Run
            websocketManager._onError();

            // Posttest
            expect(spy).toHaveBeenCalledWith();
        });

        it("Should clear socket", function() {
            websocketManager.isOpen = true;

            // Run
            websocketManager._onError();

            // Posttest
            expect(websocketManager._socket).toBe(null);
        });

        it("Should call _clearConnectionFailed", function() {
          spyOn(websocketManager, "_clearConnectionFailed");

          // Run
          websocketManager._onError();

          // Posttest
          expect(websocketManager._clearConnectionFailed).toHaveBeenCalledWith();
        });
    });

    describe("The sendSignal() method", function() {
        it("Should call _socket.send", function() {
            websocketManager._socket.send = jasmine.createSpy('send');
            websocketManager.sendSignal({hey: "ho"});
            expect(websocketManager._socket.send).toHaveBeenCalledWith(JSON.stringify({
                type: "signal",
                body: {hey: "ho"}
            }));
        });
    });

    describe("The sendRequest() method", function() {
        beforeEach(function() {
            websocketManager._socket.send = jasmine.createSpy('send');
        });

        it("Should not modify the input object", function() {
            var body = {body: "good"};
            websocketManager.sendRequest(body);
            expect(body).toEqual({body: "good"});
        });

        it("Should register the callback", function() {
            websocketManager._requestCallbacks = {};
            var f = function() {};
            websocketManager.sendRequest({}, f);
            var requestId = Object.keys(websocketManager._requestCallbacks)[0];
            expect(websocketManager._requestCallbacks[requestId]).toEqual({
                date: jasmine.any(Number),
                callback: f
            });
        });

        it("Should correctly handle no callback", function() {
            websocketManager._requestCallbacks = {};
            websocketManager.sendRequest({});
            expect(websocketManager._requestCallbacks).toEqual({});
        });


        it("Should call _socket.send", function() {
            websocketManager._requestCallbacks = {};
            websocketManager.sendRequest({hey: "ho"}, function() {});
            var requestId = Object.keys(websocketManager._requestCallbacks)[0];
            expect(JSON.parse(websocketManager._socket.send.calls.allArgs())).toEqual({
                type: "request",
                body: {
                    request_id: requestId,
                    hey: "ho"
                }
            });
        });

        it("Should call _scheduleCallbackCleanup", function() {
            spyOn(websocketManager, "_scheduleCallbackCleanup");
            websocketManager.sendRequest({hey: "ho"});
            expect(websocketManager._scheduleCallbackCleanup).toHaveBeenCalledWith();
        });
    });


    describe("The _scheduleCallbackCleanup() method", function() {
        it("Should schedule a call to _runCallbackCleanup", function() {
            spyOn(websocketManager, "_runCallbackCleanup");

            // Run
            websocketManager._scheduleCallbackCleanup();
            expect(websocketManager._runCallbackCleanup).not.toHaveBeenCalled();
            jasmine.clock().tick(60000);

            // Posttest
            expect(websocketManager._runCallbackCleanup).toHaveBeenCalledWith();
        });

        it("Should do nothing if its already scheduled", function() {
            spyOn(websocketManager, "_runCallbackCleanup");
            websocketManager._callbackCleanupId = 5;

            // Run
            websocketManager._scheduleCallbackCleanup();
            jasmine.clock().tick(60000);

            // Posttest
            expect(websocketManager._runCallbackCleanup).not.toHaveBeenCalled();
        });
    });

    describe("The _runCallbackCleanup() method", function() {
        var spy1, spy2, spy3, spy4;
        beforeEach(function() {
            var now = new Date();
            var past = new Date();
            spy1 = jasmine.createSpy('spy1');
            spy2 = jasmine.createSpy('spy2');
            spy3 = jasmine.createSpy('spy3');
            spy4 = jasmine.createSpy('spy4');
            past.setHours(past.getHours() - 1);
            websocketManager._requestCallbacks = {
                a: {
                    date: now.getTime(),
                    callback: spy1
                },
                b: {
                    date: past.getTime(),
                    callback: spy2,
                },
                c: {
                    date: past.getTime(),
                    callback: spy3,
                },
                d: {
                    date: now.getTime(),
                    callback: spy4
                }
            };
        });

        it("Should call _timeoutRequest if the request has expired and there have been other websocket data received", function() {
            spyOn(websocketManager, "_timeoutRequest");
            websocketManager._lastDataFromServerTimestamp = new Date();
            websocketManager._runCallbackCleanup();
            expect(websocketManager._timeoutRequest).toHaveBeenCalledWith("b");
            expect(websocketManager._timeoutRequest).toHaveBeenCalledWith("c");
            expect(websocketManager._timeoutRequest).not.toHaveBeenCalledWith("a");
            expect(websocketManager._timeoutRequest).not.toHaveBeenCalledWith("d");
        });

        it("Should reconnect and reschedule if the request has expired and there has been no other websocket data received", function() {
            spyOn(websocketManager, "_reconnect");
            spyOn(websocketManager, "_scheduleCallbackCleanup");
            websocketManager._lastDataFromServerTimestamp = new Date('2010-10-10');
            websocketManager._runCallbackCleanup();
            expect(websocketManager._reconnect).toHaveBeenCalledWith(false);
            expect(websocketManager._scheduleCallbackCleanup).toHaveBeenCalledWith();
        });

        it("Should reschedule if any requests have not timed out", function() {
            spyOn(websocketManager, "_scheduleCallbackCleanup");
            websocketManager._lastDataFromServerTimestamp = new Date();
            websocketManager._runCallbackCleanup();
            expect(websocketManager._scheduleCallbackCleanup).toHaveBeenCalledWith();
        });

        it("Should skip _scheduleCallbackCleanup if no remaining requests", function() {
            spyOn(websocketManager, "_scheduleCallbackCleanup");
            websocketManager._lastDataFromServerTimestamp = new Date();
            delete websocketManager._requestCallbacks.a;
            delete websocketManager._requestCallbacks.d;
            websocketManager._runCallbackCleanup();
            expect(websocketManager._scheduleCallbackCleanup).not.toHaveBeenCalled();
        });

        it("Should clear _callbackCleanupId if all events are old", function() {
          websocketManager._lastDataFromServerTimestamp = new Date();
          websocketManager._callbackCleanupId = 5;
          delete websocketManager._requestCallbacks.a;
          delete websocketManager._requestCallbacks.d;
          websocketManager._runCallbackCleanup();
          expect(websocketManager._callbackCleanupId).toEqual(0);
        });
    });

    describe("The _timeoutRequest() method", function() {
      var spy1, spy2, spy3, spy4;
      beforeEach(function() {
          var now = new Date();
          var past = new Date();
          spy1 = jasmine.createSpy('spy1');
          spy2 = jasmine.createSpy('spy2');
          spy3 = jasmine.createSpy('spy3');
          spy4 = jasmine.createSpy('spy4');
          past.setHours(past.getHours() - 1);
          websocketManager._requestCallbacks = {
              a: {
                  date: now.getTime(),
                  callback: spy1
              },
              b: {
                  date: past.getTime(),
                  callback: spy2,
              },
              c: {
                  date: past.getTime(),
                  callback: spy3,
              },
              d: {
                  date: now.getTime(),
                  callback: spy4
              }
          };
      });

      it("Should call the callback", function() {
        websocketManager._timeoutRequest("b");
        expect(spy2).toHaveBeenCalledWith(jasmine.objectContaining({
          success: false,
          data: jasmine.objectContaining({
            id: 'request_timeout'
          })
        }));
      });

      it("Should remove the request if the request has expired", function() {
          websocketManager._timeoutRequest("b");
          expect(websocketManager._requestCallbacks.a).not.toBe(undefined);
          expect(websocketManager._requestCallbacks.b).toBe(undefined);
          expect(websocketManager._requestCallbacks.c).not.toBe(undefined);
          expect(websocketManager._requestCallbacks.d).not.toBe(undefined);
      });

      it("Should remove the request even if the callback throws an error", function() {
          websocketManager._requestCallbacks.b.callback = function() {
            throw new Error("Doh!");
          };
          websocketManager._timeoutRequest("b");
          expect(websocketManager._requestCallbacks.b).toBe(undefined);
      });

    });

    describe("The getCounter() method", function() {
        it("Should call sendRequest", function() {
            spyOn(websocketManager, "sendRequest");
            websocketManager.getCounter();
            expect(websocketManager.sendRequest).toHaveBeenCalledWith({
                method: "Counter.read"
            }, jasmine.any(Function));
        });


        it("Should call the callback", function() {
            var spy = jasmine.createSpy('spy');
            spyOn(websocketManager, "sendRequest").and.callFake(function(body, callback) {
                callback({
                    success: true,
                    data: {counter: 5},
                    fullData: {counter: 4, data: {counter: 5}}
                });
            });

            // Run
            websocketManager.getCounter(spy);

            // Posttest
            expect(spy).toHaveBeenCalledWith(true, 5, 4);
        });
    });

    describe("The replayEvents() method", function() {
        var timestamp, nexttimestamp;
        beforeEach(function() {
            timestamp = new Date();
            timestamp.setHours(timestamp.getHours() - 1); // make sure these are different from new Date() which the system might use
            nexttimestamp = new Date();
            nexttimestamp.setHours(nexttimestamp.getHours() + 1);
        });

        it("Should set _inReplay if _inReplay isn't set", function() {
            websocketManager._inReplay = false;
            websocketManager.replayEvents(timestamp);
            expect(websocketManager._inReplay).toBe(true);
        });

        it("Should update _needsReplayFrom if _inReplay is true, and _needsReplayFrom unset", function() {
            websocketManager._inReplay = true;
            websocketManager._needsReplayFrom = null;
            websocketManager.replayEvents(timestamp);
            expect(websocketManager._inReplay).toEqual(true);
            expect(websocketManager._needsReplayFrom).toBe(timestamp);
        });

        it("Should NOT update _needsReplayFrom if _inReplay is true, and _needsReplayFrom is set", function() {
            websocketManager._inReplay = true;
            websocketManager._needsReplayFrom = nexttimestamp;
            websocketManager.replayEvents(timestamp);
            expect(websocketManager._needsReplayFrom).toEqual(nexttimestamp);

        });

        it("Should NOT call sendRequest if _inReplay is true", function() {
            spyOn(websocketManager, "sendRequest");
            websocketManager._inReplay = true;
            websocketManager.replayEvents(timestamp);
            expect(websocketManager.sendRequest).not.toHaveBeenCalled();
        });

        it("Should ignore _inReplay", function() {
            spyOn(websocketManager, "sendRequest");
            websocketManager._inReplay = true;
            websocketManager.replayEvents(timestamp, true);
            expect(websocketManager.sendRequest).toHaveBeenCalled();
        });

        it("Should call sendRequest", function() {
            spyOn(websocketManager, "sendRequest");
            websocketManager._inReplay = false;
            websocketManager.replayEvents(timestamp.toISOString());
            expect(websocketManager.sendRequest).toHaveBeenCalledWith({
                method: "Event.replay",
                data: {from_timestamp: timestamp.toISOString()}
            }, jasmine.any(Function));
        });

        it("Should call _replayEventsComplete", function() {
            var spy = jasmine.createSpy('callback');
            spyOn(websocketManager, "sendRequest").and.callFake(function(body, callback) {
                callback({success: true});
            });
            spyOn(websocketManager, "_replayEventsComplete");
            websocketManager._inReplay = false;
            websocketManager.replayEvents(timestamp, false, spy);
            expect(websocketManager._replayEventsComplete).toHaveBeenCalledWith(timestamp, spy, true);

        });
    });

    describe("The _replayEventsComplete() method", function() {
        var callback, timestamp, nexttimestamp;
        beforeEach(function() {
            timestamp = new Date();
            timestamp.setHours(timestamp.getHours() - 1); // make sure these are different from new Date() which the system might use
            nexttimestamp = new Date();
            nexttimestamp.setHours(nexttimestamp.getHours() + 1);

            callback = jasmine.createSpy('callback');
        });

        it("Should clear _inReplay", function() {
            spyOn(websocketManager, "replayEvents"); // prevent replayEvents from resetting _inReplay
            websocketManager._inReplay = true;
            websocketManager._replayEventsComplete(timestamp, callback, false);
            expect(websocketManager._inReplay).toEqual(false);
        });

        it("Should trigger synced and call callback if completely done", function() {
            websocketManager._needsReplayFrom = null;
            spyOn(websocketManager, "trigger");

            // Run
            websocketManager._replayEventsComplete(timestamp, callback, true);

            // Posttest
            expect(websocketManager.trigger).toHaveBeenCalledWith("synced");
            expect(callback).toHaveBeenCalledWith();
        });

        it("Should recall replayEvents if another round was requested", function() {
            websocketManager._needsReplayFrom = nexttimestamp;
            spyOn(websocketManager, "trigger");
            spyOn(websocketManager, "replayEvents");

            // Run
            websocketManager._replayEventsComplete(timestamp, callback, true);

            // Posttest
            expect(websocketManager.trigger).not.toHaveBeenCalled();
            expect(callback).not.toHaveBeenCalled();
            expect(websocketManager.replayEvents).toHaveBeenCalledWith(nexttimestamp);
        });

        it("Should retry replayEvents if it failed", function() {
            websocketManager._needsReplayFrom = nexttimestamp;
            spyOn(websocketManager, "trigger");
            spyOn(websocketManager, "replayEvents");

            // Run
            websocketManager._replayEventsComplete(timestamp, callback, false);

            // Posttest
            expect(websocketManager.trigger).not.toHaveBeenCalled();
            expect(callback).not.toHaveBeenCalled();
            expect(websocketManager.replayEvents).toHaveBeenCalledWith(timestamp);
        });
    });

    describe("The _getObject() method", function() {
        it("Should call client._getObject", function() {
            spyOn(client, "_getObject").and.returnValue("fred");
            expect(websocketManager._getObject({object: {id: "jane"}})).toEqual("fred");
        });
    });

    describe("The _onMessage() method", function() {
        beforeEach(function() {
            spyOn(websocketManager, "replayEvents");
            spyOn(websocketManager, "_processMessage");

            websocketManager._lastCounter = 5;
        });

        it("Should clear _lostConnectionCount", function() {
            websocketManager._lostConnectionCount = 5;
            websocketManager._onMessage({data: JSON.stringify({
                counter: 6
            })});
            expect(websocketManager._lostConnectionCount).toEqual(0);
        });

        it("Should set _hasCounter to true", function() {
            websocketManager._hasCounter = false;
            websocketManager._onMessage({data: JSON.stringify({
                counter: 6
            })});
            expect(websocketManager._hasCounter).toEqual(true);
        });

        it("Should update _lastCounter", function() {
            websocketManager._onMessage({data: JSON.stringify({
                counter: 6
            })});
            expect(websocketManager._lastCounter).toEqual(6);
        });

        it("Should NOT call replayEvents if counter is one greater than _lastCounter", function() {
            websocketManager._onMessage({data: JSON.stringify({
                counter: 6
            })});
            expect(websocketManager.replayEvents).not.toHaveBeenCalled();
        });

        it("Should call replayEvents if counter is more than one greater than _lastCounter", function() {
            websocketManager._lastTimestamp = "fred";
            websocketManager._onMessage({data: JSON.stringify({
                counter: 7
            })});
            expect(websocketManager.replayEvents).toHaveBeenCalledWith("fred");
        });

        it("Should update _lastTimestamp", function() {
            websocketManager._lastTimestamp = "fred";
            websocketManager._onMessage({data: JSON.stringify({
                timestamp: new Date("10/10/2010"),
                counter: 6
            })});
            expect(websocketManager._lastTimestamp).toEqual(new Date("10/10/2010"));
        });

        it("Should not update _lastTimestamp if a counter was skipped", function() {
            websocketManager._lastTimestamp = "fred";
            websocketManager._onMessage({data: JSON.stringify({
                counter: 7,
                timestamp: "doh"
            })});
            expect(websocketManager._lastTimestamp).toEqual("fred");
        });

        it("Should call _processMessage", function() {
            websocketManager._onMessage({data: JSON.stringify({
                timestamp: "doh",
                counter: 6,
                body: {hey: "ho"}
            })});
            expect(websocketManager._processMessage).toHaveBeenCalledWith({
                timestamp: "doh",
                counter: 6,
                body: {hey: "ho"}
            });
        });

        it("Should call _reschedulePing", function() {
            spyOn(websocketManager, "_reschedulePing");
            websocketManager._onMessage({data: JSON.stringify({
                timestamp: "doh",
                counter: 6
            })});
            expect(websocketManager._reschedulePing).toHaveBeenCalledWith();
        });
    });

    describe("The _processMessage() method", function() {
        beforeEach(function() {
            spyOn(websocketManager, "_handleChange");
            spyOn(websocketManager, "_handleResponse");
        });

        it("Should call _handleChange", function() {
            websocketManager._processMessage({
                type: "change",
                body: "fred"
            });
            expect(websocketManager._handleChange).toHaveBeenCalledWith("fred");
            expect(websocketManager._handleResponse).not.toHaveBeenCalled();
        });

        it("Should call _handleResponse", function(){
            websocketManager._processMessage({
                type: "response",
                body: "fred"
            });
            expect(websocketManager._handleChange).not.toHaveBeenCalled();
            expect(websocketManager._handleResponse).toHaveBeenCalledWith({
                type: "response",
                body: "fred"
            });
        });

        it("Should trigger message", function() {
            spyOn(websocketManager, "trigger");
            websocketManager._processMessage({
                type: "response",
                body: "fred"
            });
            expect(websocketManager.trigger).toHaveBeenCalledWith("message", {
                data: {
                    type: "response",
                    body: "fred"
                }
            });
        });
    });

    describe("The _handleResponse() method", function() {
        var spy1, spy2;
        beforeEach(function() {

            spy1 = jasmine.createSpy('spy1');
            spy2 = jasmine.createSpy('spy2');

            websocketManager._requestCallbacks = {
                a: {
                    callback: spy1
                },
                b: {
                    callback: spy2
                }
            };
        });


        it("Should not fail if no request handler", function() {
            expect(function() {
                websocketManager._handleResponse({
                    body: {
                        success: true,
                        request_id: "c"
                    }
                });
            }).not.toThrow();
        });

        it("Should call the request handler", function() {
            websocketManager._handleResponse({
                body: {
                    success: true,
                    request_id: "a",
                    data: {hey: "ho"}
                }
            });
            expect(spy1).toHaveBeenCalledWith({
                success: true,
                data: {hey: "ho"},
                fullData: {
                    body: {
                        success: true,
                        request_id: "a",
                        data: {hey: "ho"}
                    }
                }
            });
        });

        it("Should remove the request handler", function() {
            websocketManager._handleResponse({
                body: {
                    success: true,
                    request_id: "a",
                    data: {hey: "ho"}
                }
            });
            expect(websocketManager._requestCallbacks.a).toBe(undefined);
        });
    });


    describe("The _handleChange() method", function() {
        it("Should call _handleCreate", function() {
            // Setup
            spyOn(websocketManager, "_handleCreate");

            // Run
            websocketManager._handleChange({
                "operation": "create",
                data: "fred",
                object: {}
            });

            // Posttest
            expect(websocketManager._handleCreate).toHaveBeenCalledWith({
                operation: "create",
                data: "fred",
                object: {}
            });
        });

        it("Should call _handleDelete", function() {
            // Setup
            spyOn(websocketManager, "_handleDelete");

            // Run
            websocketManager._handleChange({
                "operation": "delete",
                data: "fred",
                object: {}
            });

            // Posttest
            expect(websocketManager._handleDelete).toHaveBeenCalledWith({
                operation: "delete",
                data: "fred",
                object: {}
            });
        });

        it("Should call _handlePatch", function() {
            // Setup
            spyOn(websocketManager, "_handlePatch");

            // Run
            websocketManager._handleChange({
                "operation": "patch",
                data: [],
                object: {}
            });

            // Posttest
            expect(websocketManager._handlePatch).toHaveBeenCalledWith({
                operation: "patch",
                data: [],
                object: {}
            });
        });
    });

    describe("The _handleCreate() method", function() {
        it("Should call client._createObject", function() {
            spyOn(client, "_createObject");
            websocketManager._handleCreate({
                operation: "create",
                data: {id: "layer:///messages/uuid"}
            });
            expect(client._createObject).toHaveBeenCalledWith({
                id: "layer:///messages/uuid",
                fromWebsocket: true,
            });
        });
    });

    describe("The _handleDelete() method", function() {
        it("Should call object._deleted and object.destroy if found", function() {
            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(m);
            spyOn(m, "_deleted");
            spyOn(m, "destroy");

            // Run
            websocketManager._handleDelete({
                object: {
                    id: "fred"
                }
            });

            // Posttest
            expect(m._deleted).toHaveBeenCalledWith();
            expect(m.destroy).toHaveBeenCalledWith();
        });

        it("Should do nothing if the object is not found", function() {
            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(null);
            spyOn(m, "_deleted");
            spyOn(m, "destroy");

            // Run
            websocketManager._handleDelete({
                object: {
                    id: "fred"
                }
            });

            // Posttest
            expect(m._deleted).not.toHaveBeenCalled();
            expect(m.destroy).not.toHaveBeenCalled();
        });
    });

    describe("The _handlePatch() method", function() {
        it("Should call Util.layerParse if found", function() {
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");
            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(m);

            // Run
            websocketManager._handlePatch({
                operation: "patch",
                object: {
                    id: m.id,
                    type: "Message"
                },
                data: [{operation: "set", property: "joe", value: "jane"}]
            });

            // Posttest
            expect(layer.Util.layerParse).toHaveBeenCalledWith({
                object: m,
                type: "Message",
                operations: [{operation: "set", property: "joe", value: "jane"}],
                client: client
            });

            // Cleanup
            layer.Util.LayerParse = tmp;
        });

        it("Should load a Conversation if not found and allowed", function() {
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            var _loadResourceForPatch = layer.Conversation._loadResourceForPatch;
            spyOn(layer.Conversation, "_loadResourceForPatch").and.returnValue(true);

            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(null);

            // Run
            websocketManager._handlePatch({
                operation: "patch",
                object: {
                    id: "layer:///conversations/fred"
                },
                data: [{operation: "set", property: "joe", value: "jane"}]
            });

            // Posttest
            expect(layer.Util.layerParse).not.toHaveBeenCalled();
            expect(requests.mostRecent().url).toEqual(client.url + "/conversations/fred");

            // Cleanup
            layer.Util.LayerParse = tmp;
            layer.Conversation._loadResourceForPatch = _loadResourceForPatch;
        });

        it("Should not load a Conversation if not found and not allowed", function() {
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            var _loadResourceForPatch = layer.Conversation._loadResourceForPatch;
            spyOn(layer.Conversation, "_loadResourceForPatch").and.returnValue(false);

            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(null);

            // Run
            websocketManager._handlePatch({
                operation: "patch",
                object: {
                    id: "layer:///conversations/fred"
                },
                data: [{operation: "set", property: "joe", value: "jane"}]
            });

            // Posttest
            expect(layer.Util.layerParse).not.toHaveBeenCalled();
            expect(requests.mostRecent()).toBe(undefined);

            // Cleanup
            layer.Util.LayerParse = tmp;
            layer.Conversation._loadResourceForPatch = _loadResourceForPatch;
        });

        it("Should load a Message if not found and allowed", function() {
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            var _loadResourceForPatch = layer.Message._loadResourceForPatch;
            spyOn(layer.Message, "_loadResourceForPatch").and.returnValue(true);

            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(null);

            // Run
            websocketManager._handlePatch({
                operation: "patch",
                object: {
                    id: "layer:///messages/fred"
                },
                data: [{operation: "set", property: "joe", value: "jane"}]
            });

            // Posttest
            expect(layer.Util.layerParse).not.toHaveBeenCalled();
            expect(requests.mostRecent().url).toEqual(client.url + "/messages/fred");

            // Cleanup
            layer.Util.LayerParse = tmp;
            layer.Message._loadResourceForPatch = _loadResourceForPatch;
        });

        it("Should not load a Message if not found and not allowed", function() {
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            var _loadResourceForPatch = layer.Message._loadResourceForPatch;
            spyOn(layer.Message, "_loadResourceForPatch").and.returnValue(false);

            var m = conversation.createMessage("hey");
            spyOn(websocketManager, "_getObject").and.returnValue(null);

            // Run
            websocketManager._handlePatch({
                operation: "patch",
                object: {
                    id: "layer:///messages/fred"
                },
                data: [{operation: "set", property: "joe", value: "jane"}]
            });

            // Posttest
            expect(layer.Util.layerParse).not.toHaveBeenCalled();
            expect(requests.mostRecent()).toBe(undefined);

            // Cleanup
            layer.Util.LayerParse = tmp;
            layer.Message._loadResourceForPatch = _loadResourceForPatch;
        });
    });

    describe("The _reschedulePing() method", function() {
        it("Should schedule a ping request", function() {
            spyOn(websocketManager, "_ping");
            websocketManager.pingFrequency = 10;

            // Run
            websocketManager._reschedulePing();
            jasmine.clock().tick(9);
            expect(websocketManager._ping).not.toHaveBeenCalled();
            jasmine.clock().tick(2);

            // Posttest
            expect(websocketManager._ping).toHaveBeenCalledWith();
        });

        it("Should cancel any prior scheduled ping request", function() {
            spyOn(websocketManager, "_ping");
            websocketManager.pingFrequency = 10;

            // Run
            websocketManager._reschedulePing();
            jasmine.clock().tick(9);
            websocketManager._reschedulePing();
            jasmine.clock().tick(2);

            // Posttest
            expect(websocketManager._ping).not.toHaveBeenCalled();
        });
    });

    describe("The _ping() method", function() {
        it("Should not call getCounter if not connected", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(false);
            spyOn(websocketManager, "getCounter");
            websocketManager._socket.readyState = WebSocket.CLOSED;
            websocketManager._ping();
            expect(websocketManager.getCounter).not.toHaveBeenCalled();
        });

        it("Should call getCounter", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);
            spyOn(websocketManager, "getCounter");
            websocketManager._socket.readyState = WebSocket.OPEN;
            websocketManager._ping();
            expect(websocketManager.getCounter).toHaveBeenCalledWith(jasmine.any(Function));
        });

        it("Should call _reschedulePing", function() {
            spyOn(websocketManager, "_isOpen").and.returnValue(true);

            spyOn(websocketManager, "_reschedulePing");
            spyOn(websocketManager, "getCounter").and.callFake(function(callback) {
                callback();
            });
            websocketManager._socket.readyState = WebSocket.OPEN;

            // Run
            websocketManager._ping();

            // Posttest
            expect(websocketManager._reschedulePing).toHaveBeenCalledWith();
        });
    });

    describe("the close() method", function() {
        var spy;
        beforeEach(function() {
            spy = jasmine.createSpy('close');
            websocketManager._socket.close = spy;
        });

        it("Should set _closing to true", function() {
            websocketManager._closing = false;
            websocketManager.close();
            expect(websocketManager._closing).toBe(true);
        });

        it("Should not have errors if called when there is no websocket", function() {
            websocketManager._socket = null;
            expect(function() {
                websocketManager.close();
            }).not.toThrow();
        });

        it("Should call _onSocketClose", function() {
            spyOn(websocketManager, "_onSocketClose");
            websocketManager.close();
            expect(websocketManager._onSocketClose).toHaveBeenCalledWith();
        });

        it("Should call close", function() {
            websocketManager.close();
            expect(spy).toHaveBeenCalledWith();
        });

        it("Should clear the websocket", function() {
            websocketManager.close();
            expect(websocketManager._socket).toBe(null);
        });
    });

    describe("The destroy() method", function() {
        it("Should call close", function() {
            spyOn(websocketManager, "close");
            websocketManager.destroy();
            expect(websocketManager.close).toHaveBeenCalledWith();
        });

        it("Should clear _callbackCleanupId", function() {
            var spy = jasmine.createSpy('timeout');
            websocketManager._callbackCleanupId = setTimeout(spy, 10);
            websocketManager.destroy();
            jasmine.clock().tick(100);
            expect(spy).not.toHaveBeenCalled();
        });

        it("Should clear _nextPingId", function() {
            var spy = jasmine.createSpy('timeout');
            websocketManager._nextPingId = setTimeout(spy, 10);
            websocketManager.destroy();
            jasmine.clock().tick(100);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("The _onSocketClose() method", function() {
        it("Should set _isOpen to false", function() {
            websocketManager.isOpen = true;
            websocketManager._onSocketClose();
            expect(websocketManager.isOpen).toBe(false);
        });

        it("Should call _scheduleReconnect if not closing", function() {
            spyOn(websocketManager, "_scheduleReconnect");
            websocketManager._closing = false;
            websocketManager._onSocketClose();
            expect(websocketManager._scheduleReconnect).toHaveBeenCalledWith();
        });

        it("Should skip _scheduleReconnect if closing", function() {
            spyOn(websocketManager, "_scheduleReconnect");
            websocketManager._closing = true;
            websocketManager._onSocketClose();
            expect(websocketManager._scheduleReconnect).not.toHaveBeenCalled();
        });

        it("Should remove all event listeners", function() {
            spyOn(websocketManager, "_removeSocketEvents");

            // Run
            websocketManager._onSocketClose();

            // Posttest
            expect(websocketManager._removeSocketEvents).toHaveBeenCalledWith();
        });


        it("Should trigger disconnected", function() {
            spyOn(websocketManager, "trigger");
            websocketManager._onSocketClose();
            expect(websocketManager.trigger).toHaveBeenCalledWith("disconnected");
        });
    });

    describe("The _removeSocketEvents() method", function() {
      it("Should remove all event listeners", function() {
        var spy = websocketManager._socket.removeEventListener = jasmine.createSpy('remove');

        // Run
        websocketManager._onSocketClose();

        // Posttest
        expect(spy).toHaveBeenCalledWith("message", websocketManager._onMessage);
        expect(spy).toHaveBeenCalledWith("close", websocketManager._onSocketClose);
        expect(spy).toHaveBeenCalledWith("open", websocketManager._onOpen);
        expect(spy).toHaveBeenCalledWith("error", websocketManager._onError);
      });
    });

    describe("The _scheduleReconnect() method", function() {
      it("Should schedule connect to be called using exponential backoff", function() {
        websocketManager._lostConnectionCount = 10;
        spyOn(websocketManager, "connect");
        expect(websocketManager._reconnectId).toEqual(0);

        // Run
        websocketManager._scheduleReconnect();
        expect(websocketManager._reconnectId).not.toEqual(0);
        expect(websocketManager.connect).not.toHaveBeenCalled();

        jasmine.clock().tick(layer.Util.getExponentialBackoffSeconds(10000, 10) - 1001);
        expect(websocketManager.connect).not.toHaveBeenCalled();

        jasmine.clock().tick(1002);
        expect(websocketManager.connect).toHaveBeenCalled();
      });
      it("Should abort if destroyed or if offline", function() {
        client.onlineManager.isOnline = false;
        websocketManager._scheduleReconnect();
        expect(websocketManager._reconnectId).toEqual(0);
      });
    });
});