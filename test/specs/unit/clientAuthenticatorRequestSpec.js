/*eslint-disable */

describe("The Client Authenticator Requests", function() {
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
        client._initComponents();
        client._clientReady();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
        client._destroyComponents();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The sendSocketRequest() method", function() {
        it("Should create a SyncEvent with a body if sync is empty", function() {
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                sync: {}
            });
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.objectContaining({
                data: "Hey!"
            }));
        });

        it("Should create a WebsocketSyncEvent if sync is empty", function() {
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                sync: {}
            });
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.any(layer.WebsocketSyncEvent));
        });

        it("Should create a SyncEvent with specified callback if sync is empty", function() {
            var callback = function() {};
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                sync: {}
            }, callback);
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.objectContaining({
                callback: callback
            }));
        });

        it("Should create a SyncEvent with specified method if sync is empty", function() {
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                method: "PUT",
                sync: {}
            });
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.objectContaining({
                operation: "PUT"
            }));
        });

        it("Should create a SyncEvent with specified target if sync is true", function() {
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                sync: {
                    target: "Fred!"
                }
            });
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.objectContaining({
                target: "Fred!"
            }));
        });

        it("Should create a SyncEvent with specified depends if sync is true", function() {
            spyOn(client.syncManager, "request");
            client.sendSocketRequest({
                body: "Hey!",
                sync: {
                    depends: ["Fred!"]
                }
            });
            expect(client.syncManager.request).toHaveBeenCalledWith(jasmine.objectContaining({
                depends: ["Fred!"]
            }));
        });

        it("Should call socketRequestManager.sendRequest if sync is false", function() {
            var callback = function() {};
            spyOn(client.socketRequestManager, "sendRequest");
            client.sendSocketRequest({
                body: "Hey!",
                sync: false
            }, callback);
            expect(client.socketRequestManager.sendRequest)
                .toHaveBeenCalledWith(jasmine.objectContaining({body: "Hey!"}), callback);
        });
    });

    describe("The xhr() method", function() {
        it("Should call _xhrFixRelativeUrls", function() {
            // Setup
            spyOn(client, "_xhrFixRelativeUrls");

            // Run
            client.xhr({url: "/conversations"});

            // Posttest
            expect(client._xhrFixRelativeUrls).toHaveBeenCalledWith("/conversations");
        });

        it("Should call _xhrFixHeaders", function() {
            // Setup
            spyOn(client, "_xhrFixHeaders");
            var options = {url: "/conversations", headers: {hey: "ho"}};
            // Run
            client.xhr(options);

            // Posttest
            expect(client._xhrFixHeaders).toHaveBeenCalledWith({hey: "ho"});
        });

        it("Should call _xhrFixHeaders", function() {
            // Setup
            spyOn(client, "_xhrFixHeaders");

            // Run
            client.xhr({url: "/conversations", headers: {hey: "ho"}});

            // Posttest
            expect(client._xhrFixHeaders).toHaveBeenCalledWith({hey: "ho"});
        });

        it("Should add withCredentials to options", function() {
            // Setup
            var options = {};

            // Run
            client.xhr(options);

            // Posttest
            expect(options.withCredentials).toBe(true);
        });

        it("Should set method to GET if unspecified", function() {
            // Setup
            var options = {};

            // Run
            client.xhr(options);

            // Posttest
            expect(options.method).toEqual("GET");
        });

        it("Should use the provided method", function() {
            // Setup
            var options = {method: "POST"};

            // Run
            client.xhr(options);

            // Posttest
            expect(options.method).toEqual("POST");
        });

        it("Should call _nonsyncXhr if sync is false", function() {
            spyOn(client, "_nonsyncXhr");
            var callback = function callback() {};
            client.xhr({url: "", sync: false}, callback);
            expect(client._nonsyncXhr).toHaveBeenCalled();
        });

        it("Should call _syncXhr if sync is true", function() {
            spyOn(client, "_syncXhr");
            var callback = function callback() {};
            client.xhr({url: "", sync: true}, callback);
            expect(client._syncXhr).toHaveBeenCalled();
        });

        it("Should call _syncXhr if sync is empty", function() {
            spyOn(client, "_syncXhr");
            var callback = function callback() {};
            client.xhr({url: ""}, callback);
            expect(client._syncXhr).toHaveBeenCalled();
        });
    });

    describe("The _syncXhr() method", function() {
        it("Should fire a correct call to xhr", function() {
            // Run
            client._syncXhr({url: "fred", method: "POST", headers: {}});

            // Posttest
            expect(requests.mostRecent()).toEqual(jasmine.objectContaining({
                url: "fred",
                method: "POST",
                requestHeaders: {}
            }));

        });

        it("Should call _xhrResult with the callback", function() {
            // Setup
            spyOn(client, "_xhrResult");

            var callback = function callback() {}
            var response = {
                status: 200,
                responseText: JSON.stringify({doh: "a deer"})
            };

            // Run
            client._nonsyncXhr({url: ""}, callback);
            requests.mostRecent().response(response);

            // Posttest
            expect(client._xhrResult).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    status: 200,
                    data: {doh: "a deer"},
                    success: true
                }),
                jasmine.any(Function)
            );
        });

        it("Should retry once", function() {
            var callback = function callback() {}
            client._nonsyncXhr({url: "test"}, callback, 0);
            spyOn(client, "_nonsyncXhr");
            var response = {
                status: 503,
                responseText: JSON.stringify({id: "fred"})
            };

            // Run
            requests.mostRecent().response(response);
            expect(client._nonsyncXhr).not.toHaveBeenCalled();

            jasmine.clock().tick(1001);
            expect(client._nonsyncXhr).toHaveBeenCalledWith({url: "test", headers: {}}, callback, 1);
        });

        it("Should retry twice", function() {
            var callback = function callback() {}
            client._nonsyncXhr({url: "test"}, callback, 1);
            spyOn(client, "_nonsyncXhr");
            var response = {
                status: 503,
                responseText: JSON.stringify({id: "fred"})
            };

            // Run
            requests.mostRecent().response(response);
            expect(client._nonsyncXhr).not.toHaveBeenCalled();

            jasmine.clock().tick(1001);
            expect(client._nonsyncXhr).toHaveBeenCalledWith({url: "test", headers: {}}, callback, 2);
        });

        it("Should retry thrice", function() {
            var callback = function callback() {}
            client._nonsyncXhr({url: "test"}, callback, 2);
            spyOn(client, "_nonsyncXhr");
            var response = {
                status: 503,
                responseText: JSON.stringify({id: "fred"})
            };

            // Run
            requests.mostRecent().response(response);
            expect(client._nonsyncXhr).not.toHaveBeenCalled();

            jasmine.clock().tick(1001);
            expect(client._nonsyncXhr).toHaveBeenCalledWith({url: "test", headers: {}}, callback, 3);
        });

        it("Should stop retrying", function() {
            var callback = function callback() {}
            client._nonsyncXhr({url: "test"}, callback, 3);
            spyOn(client, "_nonsyncXhr");
            var response = {
                status: 503,
                responseText: JSON.stringify({id: "fred"})
            };

            // Run
            requests.mostRecent().response(response);
            expect(client._nonsyncXhr).not.toHaveBeenCalled();

            jasmine.clock().tick(1001);
            expect(client._nonsyncXhr).not.toHaveBeenCalled();
        });
    });

    describe("The _nonsyncXhr() method", function() {
        it("Should call the syncManager", function() {
            var callback = jasmine.createSpy('callback');
            spyOn(client.syncManager, "request");
            client._syncXhr({url: "test"}, callback, 0);
            expect(client.syncManager.request.calls.argsFor(0)[0] instanceof layer.XHRSyncEvent).toBe(true);
            expect(client.syncManager.request.calls.argsFor(0)[0].url).toEqual("test");
        });

        it("Should call _xhrResult with the original callback", function() {
            var callback = jasmine.createSpy('callback');
            spyOn(client.syncManager, "request");
            spyOn(client, "_xhrResult");
            client._syncXhr({url: "test"}, callback, 0);
            client.syncManager.request.calls.argsFor(0)[0].callback({status: 200});
            expect(client._xhrResult).toHaveBeenCalledWith({status: 200}, callback);
        });
    });



    describe("The _xhrFixAuth() method", function() {
        it("Should add an auth header if we have a session token", function() {
            client.sessionToken = "sessionToken";
            var headers = {};
            client._xhrFixAuth(headers);
            expect(headers).toEqual({authorization: 'Layer session-token="sessionToken"'});
        });

        it("Should do nothing if we do not have a session token", function() {
            client.sessionToken = "";
            var headers = {};
            client._xhrFixAuth(headers);
            expect(headers).toEqual({});
        });
    });

    describe("The _xhrFixRelativeUrls() method", function() {
        it("Should accept an absolute url", function() {
            // Run
            var url = client._xhrFixRelativeUrls("https://duh2.com/conversations");

            // Posttest
            expect(url).toEqual("https://duh2.com/conversations");
        });

        it("Should convert to absolute url", function() {
            // Run
            var url = client._xhrFixRelativeUrls("conversations");

            // Posttest
            expect(url).toEqual(client.url + "/conversations");
        });
    });

    describe("The _xhrFixHeaders() method", function() {
        it("Should set content-type to application/json if no content-type", function() {
            // Setup
            var headers = {};

            // Run
            client._xhrFixHeaders(headers);

            // Posttest
            expect(headers["content-type"]).toEqual("application/json");
        });

        it("Should replace upper case headers with lower case", function() {
            // Setup
            var headers = {'Hey-HO': "Doh"};

            // Run
            client._xhrFixHeaders(headers);

            // Posttest
            expect(headers).toEqual({
                "hey-ho": "Doh",
                "content-type": "application/json",
                accept: "application/vnd.layer+json; version=1.0"
            });
        });

        it("Should pass through lower case headers", function() {
            // Setup
            var headers = {'hey-ho': "Doh"};

            // Run
            client._xhrFixHeaders(headers);

            // Posttest
            expect(headers).toEqual({
                "hey-ho": "Doh",
                "content-type": "application/json",
                accept: "application/vnd.layer+json; version=1.0"
            });
        });

        it("Should pass through content-type if provided", function() {
            // Setup
            var headers = {'Content-Type': "text/mountain"};

            // Run
            client._xhrFixHeaders(headers);

            // Posttest
            expect(headers).toEqual({
                "content-type": "text/mountain",
                accept: "application/vnd.layer+json; version=1.0"
            });
        });
    });

    describe("The _xhrResult() method", function() {
        it("Should abort if destroyed", function() {
            // Setup
            client.isDestroyed = true;
            var callback = jasmine.createSpy('callback');

            // Run
            client._xhrResult({success: true}, callback);

            // Posttest
            expect(callback).not.toHaveBeenCalled();
            client.isDestroyed = false;
        });

        it("Should call the callback with success", function() {
            // Setup
            var callback = jasmine.createSpy('callback');

            // Run
            client._xhrResult({
                success: true,
                data: {doh: "a deer"}
            }, callback);

            // Posttest
            expect(callback).toHaveBeenCalledWith({
                success: true,
                data: {doh: "a deer"}});
        });

        it("Should call the callback without success", function() {
            // Setup
            var callback = jasmine.createSpy('callback');
            spyOn(client, "_generateError");

            // Run
            client._xhrResult({
                success: false,
                data: {doh: "a deer"}
            }, callback);

            // Posttest
            expect(callback).toHaveBeenCalledWith({
                success: false,
                data: {doh: "a deer"}});
        });

        it("Should call _generateError if success if false", function() {
            // Setup
            spyOn(client, "_generateError");

            // Run
            client._xhrResult({
                success: false,
                data: {doh: "a deer"}
            });

            // Posttest
            expect(client._generateError).toHaveBeenCalledWith({
                success: false,
                data: {doh: "a deer"}
            });
        });

        it("Should clear isAuthenticated on getting a 401", function() {
            client.isAuthenticated = true;
            client._xhrResult({
                success: false,
                status: 401,
                data: {
                    id: "fred",
                    data: {
                        nonce: "sense"
                    }
                }
            });

            expect(client.isAuthenticated).toBe(false);
        });

        it("Should call _authenticate on getting a 401 if authenticated", function() {
            // Setup
            client.isAuthenticated = true;
            spyOn(client, "_authenticate");

            // Run
            client._xhrResult({
                success: false,
                status: 401,
                data: {
                    id: "fred",
                    data: {
                        nonce: "sense"
                    }
                }
            });

            // Posttest
            expect(client._authenticate).toHaveBeenCalledWith("sense");
        });

        it("Should call not _authenticate on getting a 401 if not authenticated", function() {
            // Setup
            client.isAuthenticated = false;
            spyOn(client, "_authenticate");

            // Run
            client._xhrResult({
                success: false,
                status: 401,
                data: {
                    id: "fred",
                    data: {
                        nonce: "sense"
                    }
                }
            });

            // Posttest
            expect(client._authenticate).not.toHaveBeenCalled();
        });
    });

    describe("The _generateError() method", function() {
        it("Should return an error", function() {
            // Setup
            var results = {
                data: {
                    id: "fred"
                }
            };

            // Run
            client._generateError(results);

            // Posttest
            expect(results.data).toEqual(jasmine.any(layer.LayerError));
            expect(results.data.id).toEqual("fred");
        });
    });
});
