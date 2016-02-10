/* eslint-disable */
describe("The Websocket Change Manager Class", function() {
    var client, changeManager;
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
        changeManager = client.socketChangeManager;
        conversation = client._createObject(responses.conversation1).conversation;
        requests.reset();
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        it("Should return a Websockets.ChangeManager", function() {
            expect(new layer.Websockets.ChangeManager({
                client: client,
                socketManager: client.socketManager
            })).toEqual(jasmine.any(layer.Websockets.ChangeManager));
        });


        it("Should subscribe to call _handleChange on message", function() {
            var tmp = layer.Websockets.ChangeManager.prototype._handleChange;
            layer.Websockets.ChangeManager.prototype._handleChange = jasmine.createSpy('handleChange');
            var changeManager = new layer.Websockets.ChangeManager({
                client: client,
                socketManager: client.socketManager
            })
            expect(layer.Websockets.ChangeManager.prototype._handleChange).not.toHaveBeenCalled();

            // Run
            client.socketManager.trigger("message", {data: {body: {}}});

            // Posttest
            expect(layer.Websockets.ChangeManager.prototype._handleChange).toHaveBeenCalledWith(jasmine.any(layer.LayerEvent));

            // Restore
            layer.Websockets.ChangeManager.prototype._handleChange = tmp;
            changeManager.destroy();
        });
    });

    describe("The _getObject() method", function() {
        it("Should call client._getObject", function() {
            spyOn(client, "_getObject").and.returnValue("fred");
            expect(changeManager._getObject({object: {id: "jane"}})).toEqual("fred");
        });
    });

    describe("The _handleChange() method", function() {
        it("Should call _handleCreate", function() {
            // Setup
            spyOn(changeManager, "_handleCreate");

            // Run
            changeManager._handleChange({
              data: {
                type: 'change',
                body: {
                  "operation": "create",
                  data: "fred",
                  object: {}
                }
              }
            });

            // Posttest
            expect(changeManager._handleCreate).toHaveBeenCalledWith({
                operation: "create",
                data: "fred",
                object: {}
            });
        });

        it("Should call _handleDelete", function() {
            // Setup
            spyOn(changeManager, "_handleDelete");

            // Run
            changeManager._handleChange({
                data: {
                  type: 'change',
                  body: {
                    "operation": "delete",
                    data: "fred",
                    object: {}
                  }
              }
            });

            // Posttest
            expect(changeManager._handleDelete).toHaveBeenCalledWith({
                operation: "delete",
                data: "fred",
                object: {}
            });
        });

        it("Should call _handlePatch", function() {
            // Setup
            spyOn(changeManager, "_handlePatch");

            // Run
            changeManager._handleChange({
              data: {
                type: 'change',
                body: {
                  "operation": "patch",
                  data: [],
                  object: {}
                }
              }
            });

            // Posttest
            expect(changeManager._handlePatch).toHaveBeenCalledWith({
                operation: "patch",
                data: [],
                object: {}
            });
        });

        it("Should ignore non-change events", function() {
           // Setup
            spyOn(changeManager, "_handlePatch");
            spyOn(changeManager, "_handleCreate");
            spyOn(changeManager, "_handleDelete");

            // Run
            changeManager._handleChange({
              data: {
                type: 'change2',
                body: {
                  "operation": "patch",
                  data: [],
                  object: {}
                }
              }
            });

            // Posttest
            expect(changeManager._handlePatch).not.toHaveBeenCalled();
            expect(changeManager._handleCreate).not.toHaveBeenCalled();
            expect(changeManager._handleDelete).not.toHaveBeenCalled();
        });
    });

    describe("The _handleCreate() method", function() {
        it("Should call client._createObject", function() {
            spyOn(client, "_createObject");
            changeManager._handleCreate({
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
            spyOn(changeManager, "_getObject").and.returnValue(m);
            spyOn(m, "_deleted");
            spyOn(m, "destroy");

            // Run
            changeManager._handleDelete({
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
            spyOn(changeManager, "_getObject").and.returnValue(null);
            spyOn(m, "_deleted");
            spyOn(m, "destroy");

            // Run
            changeManager._handleDelete({
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
            spyOn(changeManager, "_getObject").and.returnValue(m);

            // Run
            changeManager._handlePatch({
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
            spyOn(changeManager, "_getObject").and.returnValue(null);

            // Run
            changeManager._handlePatch({
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
            spyOn(changeManager, "_getObject").and.returnValue(null);

            // Run
            changeManager._handlePatch({
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
            spyOn(changeManager, "_getObject").and.returnValue(null);

            // Run
            changeManager._handlePatch({
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
            spyOn(changeManager, "_getObject").and.returnValue(null);

            // Run
            changeManager._handlePatch({
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
});