/*eslint-disable */

describe("The Client Authenticator Class", function() {
    var appId = "layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff";
    var userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";
    var identityToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiIyOWUzN2ZhZS02MDdlLTExZTQtYTQ2OS00MTBiMDAwMDAyZjgifQ.eyJpc3MiOiI4YmY1MTQ2MC02MDY5LTExZTQtODhkYi00MTBiMDAwMDAwZTYiLCJwcm4iOiI5M2M4M2VjNC1iNTA4LTRhNjAtODU1MC0wOTlmOWM0MmVjMWEiLCJpYXQiOjE0MTcwMjU0NTQsImV4cCI6MTQxODIzNTA1NCwibmNlIjoiRFZPVFZzcDk0ZU9lNUNzZDdmaWVlWFBvUXB3RDl5SjRpQ0EvVHJSMUVJT25BSEdTcE5Mcno0Yk9YbEN2VDVkWVdEdy9zU1EreVBkZmEydVlBekgrNmc9PSJ9.LlylqnfgK5nhn6KEsitJMsjfayvAJUfAb33wuoCaNChsiRXRtT4Ws_mYHlgwofVGIXKYrRf4be9Cw1qBKNmrxr0er5a8fxIN92kbL-DlRAAg32clfZ_MxOfblze0DHszvjWBrI7F-cqs3irRi5NbrSQxeLZIiGQdBCn8Qn5Zv9s";

    var client, requests;

    beforeAll(function() {
        jasmine.addCustomEqualityTester(mostRecentEqualityTest);
        jasmine.addCustomEqualityTester(responseTest);
    });

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;

        client = new layer.ClientAuthenticator({
            appId: appId,
            reset: true,
            url: "https://duh.com"
        });
    });

    afterEach(function() {
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor method", function() {
        it("Should return a new client", function() {
            var clientLocal = new layer.ClientAuthenticator({
                appId: appId,
                url: "https://duh.com"
            });

            expect(clientLocal instanceof layer.ClientAuthenticator).toBe(true);
        });

        it("Should require an appId", function() {
            expect(function() {
                var clientLocal = new layer.ClientAuthenticator({
                    appId: "",
                    url: "https://duh.com"
                });
            }).toThrowError(layer.LayerError.dictionary.appIdMissing);
            expect(layer.LayerError.dictionary.appIdMissing.length > 0).toBe(true);
        });

        it("Should not end urls with slash", function() {
            var clientLocal = new layer.ClientAuthenticator({
                appId: appId,
                url: "https://duh.com/"
            });

            expect(clientLocal.url).toEqual("https://duh.com");
        });

        it("Should not call _restoreLastSession if a userId is not passed", function() {
            var tmp = layer.ClientAuthenticator.prototype._restoreLastSession;
            spyOn(layer.ClientAuthenticator.prototype, "_restoreLastSession");

            var clientLocal = new layer.ClientAuthenticator({
                appId: appId,
                url: "https://duh.com"
            });

            expect(layer.ClientAuthenticator.prototype._restoreLastSession).not.toHaveBeenCalled();
            layer.ClientAuthenticator.prototype._restoreLastSession = tmp;
        });

        it("Should call _restoreLastSession if a userId is passed", function() {
            var tmp = layer.ClientAuthenticator.prototype._restoreLastSession;
            spyOn(layer.ClientAuthenticator.prototype, "_restoreLastSession");
            window.localStorage[layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + appId] = JSON.stringify({
                userId: "Joe",
                sessionToken: "sessionToken"
            });

            var clientLocal = new layer.ClientAuthenticator({
                appId: appId,
                userId: "Fred",
                url: "https://duh.com"
            });

            expect(layer.ClientAuthenticator.prototype._restoreLastSession).toHaveBeenCalledWith({
                appId: appId,
                url: "https://duh.com"
            }, "Fred", "Joe");
            layer.ClientAuthenticator.prototype._restoreLastSession = tmp;
        });
    });

    describe("The _restoreUserId() method", function() {
        var clientLocal;
        beforeEach(function() {
            clientLocal = new layer.ClientAuthenticator({
                appId: appId,
                url: "https://duh.com"
            });
        });

        it("Should accept the requested userId if a sessionToken is also provided", function() {
            expect(clientLocal.userId).toEqual("");
            clientLocal._restoreLastSession({sessionToken: "a"}, "Fred", "Joe");
            expect(clientLocal.userId).toEqual("Fred");
        });

        it("Should accept the requested userId if it matches the last userId and there is a last sessionToken", function() {
            window.localStorage[layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + appId] = JSON.stringify({
                userId: "Joe",
                sessionToken: "Doh"
            });
            expect(clientLocal.userId).toEqual("");
            clientLocal._restoreLastSession({}, "Fred", "Fred");
            expect(clientLocal.userId).toEqual("Fred");
        });

        it("Should reject the requested userId if it matches the last userId and there is not a last sessionToken", function() {
            window.localStorage[layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + appId] = JSON.stringify({
                userId: "Joe",
                sessionToken: ""
            });
            expect(clientLocal.userId).toEqual("");
            clientLocal._restoreLastSession({}, "Fred", "Fred");
            expect(clientLocal.userId).toEqual("");
        });

        it("Should reject the requested userId if it does not match the last userId", function() {
            window.localStorage[layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + appId] = JSON.stringify({
                userId: "Joe",
                sessionToken: "Doh"
            });
            expect(clientLocal.userId).toEqual("");
            clientLocal._restoreLastSession({}, "Fred", "Joe");
            expect(clientLocal.userId).toEqual("");
        });
    });


    describe("The _initComponents() method", function() {
        it("Should initialize the socketManager", function() {
            expect(client.socketManager).toBe(null);
            client._initComponents();
            expect(client.socketManager).not.toBe(null);
            client._destroyComponents();
        });

        it("Should initialize the onlineManager", function() {
            expect(client.onlineManager).toBe(null);
            client._initComponents();
            expect(client.onlineManager).not.toBe(null);
            client._destroyComponents();
        });

        it("Should setup events for the onlineManager", function() {
            spyOn(client, "_handleOnlineChange");
            client._initComponents();
            client.onlineManager.trigger('connected');
            expect(client._handleOnlineChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));
            client.onlineManager.trigger('disconnected');
            expect(client._handleOnlineChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));
        });

        it("Should initialize the syncManager", function() {
            expect(client.syncManager).toBe(null);
            client._initComponents();
            expect(client.syncManager).not.toBe(null);
            client._destroyComponents();
        });

        it("Should initiate the _connect process", function() {
            spyOn(client, "_connect");
            client._initComponents();
            expect(client._connect).toHaveBeenCalled();
            client._destroyComponents();
        });

        it("Should setup the onlineManager", function() {
            client._initComponents();
            client.isAuthenticated = true;
            spyOn(client.socketManager, "connect");
            client.onlineManager.trigger("connected");
            expect(client.socketManager.connect).toHaveBeenCalled();
            client._destroyComponents();
        });
    });


    describe("The _connect() method", function() {
        it("Should request a nonce if there is no sessionToken", function() {
            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client._connect();
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(requests.mostRecent()).toEqual({
                url: client.url + "/nonces",
                requestHeaders: {
                    "content-type": "application/json",
                    "accept": "application/vnd.layer+json; version=1.0"
                },
                method: "POST"
            });

        });

        it ("Should call _connectionResponse with the nonce response", function() {
            // Setup
            spyOn(client, "_connectionResponse");

            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client._connect();
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(client._connectionResponse).toHaveBeenCalled();
        });

        it("Should fire a test request if a sessionToken is found", function() {
            // Setup
            client.sessionToken = "sessionToken";
            expect(client.sessionToken).toEqual("sessionToken");
            var tmp = client._connect;
            client._connect = function() {};
            client._initComponents();
            client._connect = tmp;

            // Run
            client._connect();
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(requests.mostRecent()).toEqual({
                method: "GET",
                url: client.url + "/messages/ffffffff-ffff-ffff-ffff-ffffffffffff",
                headers: {
                    authorization: 'Layer session-token="sessionToken"',
                    "content-type": "application/json",
                    "accept": "application/vnd.layer+json; version=1.0"
                }
            });
        });

        it("Should call _connectionWithSessionResponse with test results", function() {
            // Setup
            client.sessionToken = "sessionToken";
            spyOn(client, "_connectionWithSessionResponse");

            // Run
            client._connect();
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(client._connectionWithSessionResponse).toHaveBeenCalled();
        });
    });


    describe("The _connectionResponse() method", function() {
        it("Should call _connectionError if success is false", function() {
            spyOn(client, "_connectionError");
            client._connectionResponse({
                success: false,
                data: "Doh!"
            });
            expect(client._connectionError).toHaveBeenCalledWith("Doh!");
        });

        it("Should call _connectionComplete if success is true", function() {
            spyOn(client, "_connectionComplete");
            client._connectionResponse({success: true, data: "Doh!"});
            expect(client._connectionComplete).toHaveBeenCalledWith("Doh!");
        });
    });

    describe("The _connectionWithSessionResponse() method", function() {
        it("Should call _sessionTokenExpired if success if false and a nonce is provided", function() {
            var layerError = new layer.LayerError({
                message: "Hey",
                url: "http://hey.com",
                data: {nonce: "Ardvark!"}
            });
            spyOn(client, "_sessionTokenExpired");
            client._connectionWithSessionResponse({
                success: false,
                data:layerError
            });
            expect(client._sessionTokenExpired).toHaveBeenCalledWith("Ardvark!");
        });


        it("Should call _sessionTokenRestored if success is false but no nonce", function() {
            spyOn(client, "_sessionTokenRestored");
            var err = new layer.LayerError({message: "Doh", url: "Ray"});
            client._connectionWithSessionResponse({
                success: false,
                data: err
            });
            expect(client._sessionTokenRestored).toHaveBeenCalledWith(err);
        });
    });

    describe("The _connectionError() method", function() {
        it("Should trigger connected-error", function() {
            // Setup
            var response = new layer.LayerError(responses.error1);
            spyOn(client, "trigger");

            // Run
            client._connectionError(response);

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("connected-error", {error: response})
        });
    });


    describe("The _connectionComplete() method", function() {
        it("Should trigger 'connected'", function() {
            // Setup
            spyOn(client, "trigger");

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: {nonce: "mynonce"}
            });

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("connected");
        });

        it("Should call _authenticate", function() {
            // Setup
            spyOn(client, "_authenticate");

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: {nonce: "mynonce"}
            });

            // Posttest
            expect(client._authenticate).toHaveBeenCalledWith("mynonce");

        });

        it("Should set isConnected to true", function() {
            // Pretest
            expect(client.isConnected).toEqual(false);

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: {nonce: "mynonce"}
            });

            // Posttest
            expect(client.isConnected).toEqual(true);
        });
    });

    describe("The _authenticate() method", function() {
        it("Should do nothing if not provided with a nonce", function() {
            spyOn(client, "trigger");
            client._authenticate("");
            expect(client.trigger).not.toHaveBeenCalled();
        });

        it("Should provide the challenge event", function() {
            spyOn(client, "trigger");
            client._authenticate("mynonce");

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("challenge", {
                nonce: "mynonce",
                callback: jasmine.any(Function)
            });
        });
    });

    describe("The answerAuthenticationChallenge() method", function() {
        it("Should fail without an identityToken", function() {
            expect(function() {
                client.answerAuthenticationChallenge();
            }).toThrowError(layer.LayerError.dictionary.identityTokenMissing);
            expect(layer.LayerError.dictionary.identityTokenMissing.length > 0).toBe(true);
        });

        it("Should set a userId", function() {
            // Pretest
            expect(client.userId).toEqual("");

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.userId).toEqual("93c83ec4-b508-4a60-8550-099f9c42ec1a");
        });

        it("Should request a sessionToken", function() {
            // Setup
            spyOn(client, "xhr");

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                url: "/sessions",
                method: "POST",
                sync: false,
                data: {
                  "identity_token": identityToken,
                  "app_id": client.appId
                }
            }, jasmine.any(Function));
        });

        it("Should call _authResponse on completion", function() {
            // Setup
            spyOn(client, "_authResponse");
            var response = {
                status: 200,
                responseText: JSON.stringify({doh: "a deer"})
            };

            // Run
            client.answerAuthenticationChallenge(identityToken);
            requests.mostRecent().response(response);

            // Posttest
            expect(client._authResponse).toHaveBeenCalledWith(jasmine.objectContaining({
                status: 200,
                success: true
            }), identityToken);
        });
    });

    describe("The _authResponse() method", function() {
        it("Should call _authError if success is false", function() {
            spyOn(client, "_authError");
            client._authResponse({success: false, data: "Doh!"}, identityToken);
            expect(client._authError).toHaveBeenCalledWith("Doh!", identityToken);
        });

        it("Should call _authComplete if success is true", function() {
            spyOn(client, "_authComplete");
            client._authResponse({success: true, data: "Doh!"}, identityToken);
            expect(client._authComplete).toHaveBeenCalledWith("Doh!");
        });
    });

    describe("The _authComplete() method", function( ) {
        beforeEach(function() {
            client._initComponents();
        });

        afterEach(function() {
          client._destroyComponents();
        });

        it("Should set the sessionToken", function() {
            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, identityToken);

            // Posttest
            expect(client.sessionToken).toEqual("sessionToken");
        });

        it("Should set isAuthenticated", function() {
            // Pretest
            expect(client.isAuthenticated).toEqual(false);

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, identityToken);

            // Posttest
            expect(client.isAuthenticated).toEqual(true);

        });

        it("Should trigger 'authenticated'", function() {
            // Setup
            spyOn(client, "trigger");

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, identityToken);

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("authenticated");
        });

        it("Should call _clientReady", function() {
            // Setup
            spyOn(client, "_clientReady");

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, identityToken);

            // Posttest
            expect(client._clientReady).toHaveBeenCalled();
        });
    });
    describe("The _authError() method", function() {
        it("Should trigger an error event", function() {
            // Setup
            spyOn(client, "trigger");
            var error = new layer.LayerError(responses.error1);

            // Run
            client._authError(error, identityToken);

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith(
                "authenticated-error", {
                    error: error
                });
        });
    });

    describe("The _sessionTokenRestored() method", function() {
        beforeEach(function() {
            client._initComponents();
        });

        afterEach(function() {
          client._destroyComponents();
        });

        it("Should trigger authenticated", function() {
            spyOn(client, "trigger");
            client._sessionTokenRestored([]);
            expect(client.trigger).toHaveBeenCalledWith("authenticated");
        });

        it("Should trigger connected", function() {
            spyOn(client, "trigger");
            client._sessionTokenRestored([]);
            expect(client.trigger).toHaveBeenCalledWith("connected");
        });

        it("Should set isAuthenticated", function() {
            expect(client.isAuthenticated).toEqual(false);
            client._sessionTokenRestored([]);
            expect(client.isAuthenticated).toEqual(true);
        });

        it("Should set isConnected", function() {
            expect(client.isConnected).toEqual(false);
            client._sessionTokenRestored([]);
            expect(client.isConnected).toEqual(true);
        });

        it("Should call _clientReady", function() {
            // Setup
            spyOn(client, "_clientReady");

            client._sessionTokenRestored([]);

            // Posttest
            expect(client._clientReady).toHaveBeenCalled();
        });
    });

    describe("The _sessionTokenExpired() method", function() {
        it("Should clear the sessionToken", function() {
            client.sessionToken = "sessionToken";
            client._sessionTokenExpired("nonce");
            expect(client.sessionToken).toEqual("");
        });

        it("Should call _authenticate", function() {
            spyOn(client, "_authenticate");
            client._sessionTokenExpired("nonce");
            expect(client._authenticate).toHaveBeenCalledWith("nonce");
        });
    });

    describe("The _clientReady() method", function() {
      beforeEach(function() {
          client._initComponents();
      });

      afterEach(function() {
        client._destroyComponents();
      });

      it("Should trigger ready", function() {
        spyOn(client, "trigger");
        client._clientReady();
        expect(client.trigger).toHaveBeenCalledWith('ready');
      });

      it("Should set isReady", function() {
        expect(client.isReady).toBe(false);
        client._clientReady();
        expect(client.isReady).toBe(true);
      });

      it("Should call onlineManager.start()", function() {
        spyOn(client.onlineManager, "start");
        client._clientReady();
        expect(client.onlineManager.start).toHaveBeenCalledWith();
      });

      it("Should do nothing if already ready", function() {
        client.isReady = true;
        spyOn(client, "trigger");
        spyOn(client.onlineManager, "start");
        client._clientReady();
        expect(client.trigger).not.toHaveBeenCalled();
        expect(client.onlineManager.start).not.toHaveBeenCalled();
      });
    });

    describe("The logout() method", function() {
        beforeEach(function() {
            client._initComponents();
        });

        afterEach(function() {
          client._destroyComponents();
        });

        it("Should not xhr if not authenticated", function() {
            // Setup
            client.isAuthenticated = false;
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client.xhr).not.toHaveBeenCalled();
        });

        it("Should call _resetSession even if not authenticated", function() {
            // Setup
            client.isAuthenticated = false;
            spyOn(client, "_resetSession");

            // Run
            client.logout();

            // Posttest
            expect(client._resetSession).toHaveBeenCalled();
        });

        it("Should call xhr DELETE if authenticated", function() {
             // Setup
            client.isAuthenticated = true;
            client.sessionToken = "sessionToken";
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                method: "DELETE",
                url: '/sessions/sessionToken'
            });
        });


        it("Should call _resetSession if authenticated", function() {
             // Setup
            client.isAuthenticated = true;
            spyOn(client, "_resetSession");
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client._resetSession).toHaveBeenCalledWith();
        });
    });


    describe("The _resetSession() method", function() {
        beforeEach(function() {
            client._initComponents();
        });

        afterEach(function() {
          client._destroyComponents();
        });

        it("Should clear the sessionToken", function() {
            client.sessionToken = "sessionToken";
            client._resetSession();
            expect(client.sessionToken).toEqual("");
        });

        it("Should clear isConnected", function() {
            client.isConnected = true;
            client._resetSession();
            expect(client.isConnected).toEqual(false);
        });

        it("Should clear isAuthenticated", function() {
            client.isAuthenticated = true;
            client._resetSession();
            expect(client.isAuthenticated).toEqual(false);
        });

        it("Should clear isReady", function() {
            client.isReady = true;
            client._resetSession();
            expect(client.isReady).toEqual(false);
        });

        it("Should trigger authenticated-expired", function() {
            spyOn(client, "trigger");
            client._resetSession();
            expect(client.trigger).toHaveBeenCalledWith("deauthenticated");
        });

        it("Should call onlineManager.stop()", function() {
            spyOn(client.onlineManager, "stop");
            client._resetSession();
            expect(client.onlineManager.stop).toHaveBeenCalledWith();
        });
    });

    describe("Property Adjuster Methods", function() {
        it("Should not be possible to change appIds while connected", function() {
            client.appId = "appId1";
            client.isConnected = true;
            expect(function() {
                client.appId = "appId2";
            }).toThrowError(layer.LayerError.dictionary.cantChangeIfConnected);
            expect(layer.LayerError.dictionary.cantChangeIfConnected.length > 0).toBe(true);
        });

        it("Should not be possible to change userIds while connected", function() {
            client.userId = "userId1";
            client.isConnected = true;
            expect(function() {
                client.userId = "userId2";
            }).toThrowError(layer.LayerError.dictionary.cantChangeIfConnected);
        });
    });

    describe("The _handleOnlineChange() method", function() {
      it("Should trigger online: false if disconnected", function() {
        client.isAuthenticated = true;
        spyOn(client, "trigger");
        client._handleOnlineChange({
          eventName: 'disconnected'
        });

        expect(client.trigger).toHaveBeenCalledWith('online', { isOnline: false});
      });

      it("Should trigger online: true if connected", function() {
        client.isAuthenticated = true;
        spyOn(client, "trigger");
        client._handleOnlineChange({
          eventName: 'connected',
          offlineDuration: 500
        });

        expect(client.trigger).toHaveBeenCalledWith('online', { isOnline: true, reset: false });
      });

      it("Should trigger reset: true if connected after 30 hours offline", function() {
        client.isAuthenticated = true;
        spyOn(client, "trigger");
        client._handleOnlineChange({
          eventName: 'connected',
          offlineDuration: 1000 * 60 * 60 * 31
        });

        expect(client.trigger).toHaveBeenCalledWith('online', { isOnline: true, reset: true });
      });

      it("Should not trigger if not authenticated", function() {
        client.isAuthenticated = false;
        spyOn(client, "trigger");
        client._handleOnlineChange({
          eventName: 'connected',
          offlineDuration: 1000 * 60 * 60 * 31
        });

        expect(client.trigger).not.toHaveBeenCalled();

      });
    });

    describe("Untested Methods", function() {
        xit("SHould have a test for _clientReady", function() {});
    });

    describe("The isOnline property getter", function() {
      beforeEach(function() {
          client._initComponents();
      });

      afterEach(function() {
        client._destroyComponents();
      });

      it("Should return the onlineState's online state", function() {
        client.onlineManager.isOnline = "fred";
        expect(client.isOnline).toEqual("fred");
      });

    });

     describe("The logLevel property setter", function() {
      beforeEach(function() {
          client._initComponents();
      });

      afterEach(function() {
        client._destroyComponents();
      });

      it("Should update the loggers level", function() {
        client.logLevel = 100;
        expect(client.logLevel).toEqual(100);
        client.logLevel = 0;
      });
    });
});
