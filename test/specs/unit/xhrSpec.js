/*eslint-disable */
describe("The XHR Module", function() {

    var appId = "Fred's App";
    var userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";
    var identityToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiIyOWUzN2ZhZS02MDdlLTExZTQtYTQ2OS00MTBiMDAwMDAyZjgifQ.eyJpc3MiOiI4YmY1MTQ2MC02MDY5LTExZTQtODhkYi00MTBiMDAwMDAwZTYiLCJwcm4iOiI5M2M4M2VjNC1iNTA4LTRhNjAtODU1MC0wOTlmOWM0MmVjMWEiLCJpYXQiOjE0MTcwMjU0NTQsImV4cCI6MTQxODIzNTA1NCwibmNlIjoiRFZPVFZzcDk0ZU9lNUNzZDdmaWVlWFBvUXB3RDl5SjRpQ0EvVHJSMUVJT25BSEdTcE5Mcno0Yk9YbEN2VDVkWVdEdy9zU1EreVBkZmEydVlBekgrNmc9PSJ9.LlylqnfgK5nhn6KEsitJMsjfayvAJUfAb33wuoCaNChsiRXRtT4Ws_mYHlgwofVGIXKYrRf4be9Cw1qBKNmrxr0er5a8fxIN92kbL-DlRAAg32clfZ_MxOfblze0DHszvjWBrI7F-cqs3irRi5NbrSQxeLZIiGQdBCn8Qn5Zv9s";
    var  requests;

    beforeEach(function() {
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();
    });


    it("Should send a proper xhr GET request", function() {

        // Run test
        layer.xhr({
            url: "/ho",
            method: "GET",
            data: {
                a: "b",
                c: "d"
            },
            withCredentials: true,
            headers: {
                authorization: 'Layer session-token="sample session token"'
            }
        });

        // Posttest
        var r = requests.mostRecent();
        expect(r.method).toEqual("GET");
        expect(r.url).toEqual("/ho?a=b&c=d");
        expect(r.withCredentials).toEqual(true);
        expect(r.requestHeaders).toEqual(jasmine.objectContaining({
            authorization: 'Layer session-token="sample session token"'
        }));
    });

    it("Should send GET request as default type", function() {
        // Run test
        layer.xhr({
            url: "/ho",
            data: {
                a: "b",
                c: "d"
            }
        });

        // Posttest
        var r = requests.mostRecent();
        expect(r.method).toEqual("GET");
    });

    it("Should send a proper xhr POST request", function() {

        // Run test
        layer.xhr({
            method: "POST",
            url: "/ho",
            data: {
                a: "b",
                c: "d"
            },
            headers: {
                "content-type": "application/json"
            }
        });

        // Posttest
        var r = requests.mostRecent();
        expect(r.method).toEqual("POST");
        expect(r.url).toEqual("/ho");
        expect(JSON.parse(r.params)).toEqual({
            "a": "b",
            "c": "d"
        });
    });

    it("XHR Should handle errors", function() {
        var result, response = responses.error1;

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            }
        }, function(xhrResult) {
            result = xhrResult.data;
        });
        requests.mostRecent().response({
            status: responses.error1.code,
            responseText: JSON.stringify(response),
            responseHeaders: {
                "Content-type": "application/json"
            }
        });

        // Posttest
        expect(result.id).toEqual(response.id);
        expect(result.code).toEqual(response.code);
        expect(result.data.property).toEqual(response.data.property);
        expect(result.message).toEqual(response.message);
        expect(result.url).toEqual(response.url);
    });

    it("XHR Should handle success", function() {
        var result,
            success = {
                hey: "ho"
            };

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            }
        }, function(response) {
            result = {
                status: response.status,
                result: response.data
            };
        });
        requests.mostRecent().response({
            status: 200,
            responseText: JSON.stringify(success),
            responseHeaders: {
                "Content-type": "application/json"
            }
        });

        // Posttest
        expect(result).toEqual({
            status: 200,
            result: success
        });
    });

    it("Should gather link headers", function() {
        var result,
            success = {
                hey: "ho"
            };

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            },
            headers: {
                accept: "application/vnd.layer+json; version=1.0"
            }
        }, function(response) {
            result = {
                status: response.status,
                result: response.data,
                links: response.Links
            };
        });
        requests.mostRecent().response({
            status: 200,
            responseText: JSON.stringify(success),
            responseHeaders: {
                "Content-type": "application/json",
                "link": '<https://api.layer.com/nonces>;rel=nonces,<https://api.layer.com/sessions>; rel=sessions,<https://api.layer.com/conversations>; rel=conversations,<https://api.layer.com/content>; rel=content'
            }
        });

        // Posttest
        expect(result.links).toEqual({
            nonces: "https://api.layer.com/nonces",
            sessions: "https://api.layer.com/sessions",
            conversations: "https://api.layer.com/conversations",
            content: "https://api.layer.com/content"
        });
    });

    it("Should pass in the timeout property", function() {
        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            },
            timeout: 5
        });

        expect(requests.mostRecent().timeout).toEqual(5);
    });

    it("Should handle invalid JSON", function() {
        var result, response = responses.error1;

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            }
        }, function(xhrResult) {
            result = xhrResult.data;
        });
        requests.mostRecent().response({
            status: responses.error1.code,
            responseText: JSON.stringify(response) + "hey",
            responseHeaders: {
                "Content-type": "application/json"
            }
        });

        // Posttest
        expect(result.code).toEqual(999);
        expect(result.message).toEqual("Invalid JSON from server");
    });

    it("Should handle non-JSON Errors1", function() {
        var result;

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            }
        }, function(xhrResult) {
            result = xhrResult.data;
        });
        requests.mostRecent().response({
            status: 404,
            responseText: "Doh",
            responseHeaders: {
            }
        });

        // Posttest
        expect(result.status).toEqual(404);
        expect(result.code).toEqual(106);
        expect(result.id).toEqual("operation_not_found");
        expect(result.message).toEqual('Endpoint GET ho?a=b&c=d does not exist');
    });

    it("Should handle non-JSON Errors2", function() {
        var result;

        // Run test
        layer.xhr({
            url: "ho",
            data: {
                a: "b",
                c: "d"
            }
        }, function(xhrResult) {
            result = xhrResult.data;
        });
        requests.mostRecent().response({
            status: 405,
            responseText: "Doh",
            responseHeaders: {
            }
        });

        // Posttest
        expect(result.status).toEqual(405);
        expect(result.code).toEqual(0);
        expect(result.id).toEqual("unknown_error");
        expect(result.message).toEqual("Doh");
    });
});