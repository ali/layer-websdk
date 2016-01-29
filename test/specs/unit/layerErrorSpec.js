/* eslint-disable */
describe("The LayerError Class", function() {
    describe("The constructor() method", function() {
        it("Should copy in object parameters", function() {
            expect(new layer.LayerError({url: "hey"}).url).toEqual("hey");
            expect(new layer.LayerError({httpStatus: "hey"}).httpStatus).toEqual("hey");
            expect(new layer.LayerError({message: "hey"}).message).toEqual("hey");
            expect(new layer.LayerError({code: "hey"}).code).toEqual("hey");
            expect(new layer.LayerError({id: "hey"}).errType).toEqual("hey");
            expect(new layer.LayerError({data: {"hey": "ho"}}).data).toEqual({"hey": "ho"});
        });

        it("Should clone an error", function() {
            var err = new layer.LayerError({
                url: "url",
                httpStatus: "status",
                message: "message",
                code: "code",
                id: "errType",
                data: {hey: "ho"}
            });

            expect(new layer.LayerError(err).url).toEqual("url");
            expect(new layer.LayerError(err).httpStatus).toEqual("status");
            expect(new layer.LayerError(err).message).toEqual("message");
            expect(new layer.LayerError(err).code).toEqual("code");
            expect(new layer.LayerError(err).errType).toEqual("errType");
            expect(new layer.LayerError(err).data).toEqual({hey: "ho"});
        });

        it("Should handle case where server didn't give us an object", function() {
            expect(new layer.LayerError("Server crapped out").message).toEqual("Server crapped out");
        });
    });

    describe("The getNonce() method", function() {
        it("Should return the nonce if present", function() {
            var err = new layer.LayerError({
                data: {
                    nonce: "fred"
                }
            });
            expect(err.getNonce()).toEqual("fred");
        });

        it("Should return the empty string if not present", function() {
            var err = new layer.LayerError({});
            expect(err.getNonce()).toEqual("");
        });
    });

    describe("The toString() method", function() {
        it("Should not fail", function() {
            var err = new layer.LayerError({
                url: "url",
                httpStatus: "status",
                message: "message",
                code: "code",
                id: "errType",
                data: {hey: "ho"}
            });

            expect(function() {
                err.toString();
            }).not.toThrow();
        });
    });

    describe("The log() method", function() {
        it("Should not fail", function() {
            var err = new layer.LayerError({
                url: "url",
                httpStatus: "status",
                message: "message",
                code: "code",
                id: "errType",
                data: {hey: "ho"}
            });

            expect(function() {
                err.log();
            }).not.toThrow();
        });

        it("Should not fail when logging is disabled", function() {
            layer.LayerError.disableLogging = true;
            var err = new layer.LayerError({
                url: "url",
                httpStatus: "status",
                message: "message",
                code: "code",
                id: "errType",
                data: {hey: "ho"}
            });

            expect(function() {
                err.log();
            }).not.toThrow();
            layer.LayerError.disableLogging = false;
        });
    });

});