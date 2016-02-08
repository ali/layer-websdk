/*eslint-disable */
describe("The Conversation Class", function() {
    var appId = "Fred's App";

    var conversation,
        client,
        requests;

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
        it("Shoulds setup an empty participants array", function() {
            expect(new layer.Conversation().participants).toEqual([]);
        });

        it("Should setup empty metadata", function() {
            expect(new layer.Conversation().metadata).toEqual({});
        });

        it("Should default to distinct true", function() {
           expect(new layer.Conversation().distinct).toEqual(true);
        });

        it("Should setup the clientId", function() {
            expect(new layer.Conversation({client: client}).clientId).toEqual(client.appId);
        });

        it("Should setup localCreatedAt", function() {
            expect(new layer.Conversation({client: client}).localCreatedAt).toEqual(jasmine.any(Date));
        });


        it("Should copy in any input participants", function() {
            expect(new layer.Conversation({participants: ["a","b"]}).participants).toEqual(["a","b"]);
        });

        it("Should copy in any metadata", function() {
            expect(new layer.Conversation({metadata: {a: "b"}}).metadata).toEqual({a: "b"});
        });

        it("Should copy in distinct", function() {
            expect(new layer.Conversation({distinct: false}).distinct).toEqual(false);
        });



        it("Should call _addConversation", function() {
            // Setup
            spyOn(client, "_addConversation");

            // Run
            var c = new layer.Conversation({
                client: client
            });

            // Posttest
            expect(client._addConversation).toHaveBeenCalledWith(c);
        });

        it("Should NOT call _addConversation if no client", function() {
            // Setup
            spyOn(client, "_addConversation");

            // Run
            var c = new layer.Conversation({
            });

            // Posttest
            expect(client._addConversation).not.toHaveBeenCalledWith(c);
        });



        it("Should copy in the ID if using fromServer", function() {
            expect(new layer.Conversation({
                fromServer: {
                    id: "ccc",
                    participants: [],
                    metadata: {}
                },
                client: client
            }).id).toEqual("ccc");
        });

        it("Should call _populateFromServer if fromServer", function() {
            // Setup
            var tmp = layer.Conversation.prototype._populateFromServer;
            spyOn(layer.Conversation.prototype, "_populateFromServer");

            // Run
            new layer.Conversation({
                fromServer: {
                    id: "ccc",
                    participants: [],
                    metadata: {}
                },
                client: client
            });

            // Posttest
            expect(layer.Conversation.prototype._populateFromServer).toHaveBeenCalledWith({
                id: "ccc",
                participants: [],
                metadata: {}
            });

            // Restore
            layer.Conversation.prototype._populateFromServer = tmp;
        });
    });



    describe("The destroy() method", function() {

        it("Should clear the lastMessage", function() {
            // Pretest
            var m = conversation.lastMessage;
            expect(m).toEqual(jasmine.any(layer.Message));

            // Run
            conversation.destroy();

            // Posttest
            expect(conversation.lastMessage).toBe(null);
            expect(m.isDestroyed).toBe(true);
        });

        it("Should call _removeConversation", function() {
            // Setup
            spyOn(client, "_removeConversation");

            // Run
            conversation.destroy();

            // Posttest
            expect(client._removeConversation).toHaveBeenCalledWith(conversation);
        });


        it("Should fire a destroy event", function() {
            // Setup
            spyOn(conversation, "trigger");

            // Run
            conversation.destroy();

            // Posttest
            expect(conversation.trigger).toHaveBeenCalledWith("destroy");
        });
    });

    describe("The send() method", function() {
      var conversation;
      beforeEach(function() {
        conversation = new layer.Conversation({
            participants: ["a"],
            client: client
        });
      });

      it("Should fail without a client property", function() {
        delete conversation.clientId;

        // Run + Posttest
        expect(function() {
            conversation.send();
        }).toThrowError(layer.LayerError.dictionary.clientMissing);
      });

        it("Should update the lastMessage property", function() {
          m = new layer.Message({
            client: client,
            parts: [{body: "hey", mimeType: "text/plain"}]
          });

          // Run
          conversation.send(m);

          // Posttest
          expect(conversation.lastMessage).toBe(m);
        });

        it("Should update the lastMessage property even if syncState is not NEW", function() {
          conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
          m = new layer.Message({
            client: client,
            parts: [{body: "hey", mimeType: "text/plain"}]
          });

          // Run
          conversation.send(m);

          // Posttest
          expect(conversation.lastMessage).toBe(m);
        });

        it("Should update the lastMessage position property if prior lastMessage", function() {
          mOld = new layer.Message({
            client: client,
            parts: [{body: "hey", mimeType: "text/plain"}]
          });
          mOld.position = 5;
          conversation.lastMessage = mOld;
          m = new layer.Message({
            client: client,
            parts: [{body: "hey", mimeType: "text/plain"}]
          });

          // Run
          conversation.send(m);

          // Posttest
          expect(conversation.lastMessage.position).toBe(6);
        });

        it("Should set the lastMessage position property to 0 if no prior message", function() {
          m = new layer.Message({
            client: client,
            parts: [{body: "hey", mimeType: "text/plain"}]
          });

          // Run
          conversation.send(m);

          // Posttest
          expect(conversation.lastMessage.position).toBe(0);
        });



        it("Should do nothing if syncState is not NEW", function() {

            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
            spyOn(conversation, "_setSyncing");

            conversation.send();

            expect(conversation._setSyncing).not.toHaveBeenCalled();
        });

        it("Should fail with 1 participant if it is the current user", function() {
            // Setup
            conversation.participants = [client.userId];
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;

            // Run
            expect(function() {
                conversation.send();
            }).toThrowError(layer.LayerError.dictionary.moreParticipantsRequired);
            expect(layer.LayerError.dictionary.moreParticipantsRequired).toEqual(jasmine.any(String));
        });

        it("Should fail with 0 participants", function() {
            conversation.participants = [];
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;

            // Run
            expect(function() {
                conversation.send();
            }).toThrowError(layer.LayerError.dictionary.moreParticipantsRequired);

        });

        it("Should succeed with 1 participant if it is NOT the current user", function() {
            // Setup
            conversation.participants = ["hey"];
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;
            spyOn(client, "sendSocketRequest");

            // Run
            expect(function() {
                conversation.send();
            }).not.toThrow();
        });

        it("Should trigger _handleLocalDistinctConversation and abort", function() {
            // Setup
            conversation._sendDistinctEvent = "Doh!";
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;
            spyOn(conversation, "_handleLocalDistinctConversation");
            spyOn(client, "sendSocketRequest");

            // Run
            conversation.send();

            // Posttest
            expect(conversation._handleLocalDistinctConversation).toHaveBeenCalledWith();
            expect(client.sendSocketRequest).not.toHaveBeenCalled();
        });



        it("Should be chainable", function() {
            // Run
            expect(conversation.send()).toBe(conversation);
        });

        it("Should call _setSyncing", function() {
            // Setup
            spyOn(conversation, "_setSyncing");
            spyOn(client, "sendSocketRequest");
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;

            // Run
            conversation.send();

            // Posttest
            expect(conversation._setSyncing).toHaveBeenCalledWith();
        });

        it("Should call client.sendSocketRequest", function() {
            // Setup
            spyOn(client, "sendSocketRequest");
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;

            // Run
            conversation.send();

            // Posttest
            expect(client.sendSocketRequest).toHaveBeenCalledWith({
                method: 'POST',
                body: jasmine.any(Function),
                sync: {
                  depends: conversation.id,
                  target: conversation.id
                }
              }, jasmine.any(Function));
        });
    });

    describe("The _handleLocalDistinctConversation() method", function() {
        it("Should clear the _sendDistinctEvent", function() {
            // Setup
            conversation._sendDistinctEvent = "Doh!";

            // Run
            conversation._handleLocalDistinctConversation();

            // Posttest
            expect(conversation._sendDistinctEvent).toBe(null);
        });

        it("Should trigger a conversations:sent event", function(done) {
            // Setup
            conversation._sendDistinctEvent = "Doh!";
            var called = false;
            conversation.on("conversations:sent", function(evt) {
                called = true;
                expect(evt.data).toEqual("Doh!");
                done();
            });
            jasmine.clock().uninstall();

            // Run
            conversation._handleLocalDistinctConversation();

            // Posttest
            expect(called).toBe(false);
        });
    });

    describe("The _getPostData() method", function() {
        it("Should return participants", function() {
            conversation.participants = ["a", "b", "c"];
            expect(conversation._getPostData().participants).toEqual(["a","b","c"]);
        });

        it("Should return distinct", function() {
            conversation.distinct = true;
            expect(conversation._getPostData().distinct).toEqual(true);

            conversation.distinct = false;
            expect(conversation._getPostData().distinct).toEqual(false);
        });

        it("Should return null if no metadata", function() {
            conversation.metadata = {};
            expect(conversation._getPostData().metadata).toEqual(null);
        });

        it("Should return  metadata", function() {
            conversation.metadata = {a: "b", c: "d"};
            expect(conversation._getPostData().metadata).toEqual({a: "b", c: "d"});
        });
    });

    describe("The _createResult() method", function() {

        it("Calls _createSuccess if successful", function() {
            spyOn(conversation, "_createSuccess");
            conversation._createResult({success: true, data: "Argh!"});
            expect(conversation._createSuccess).toHaveBeenCalledWith("Argh!");
        });

        it("Calls _populateFromServer() if its a conflict error", function() {
            // Setup
            spyOn(conversation, "_populateFromServer");

            // Run
            conversation._createResult({success: false, data: {id: 'conflict', data: 'Doh!'}});

            // Posttest
            expect(conversation._populateFromServer).toHaveBeenCalledWith("Doh!");
        });


        it("Should trigger conversations:sent if its a conflict", function() {
            // Setup
            spyOn(conversation, "_triggerAsync");

            // Run
            conversation._createResult({success: false, data: {
                id: 'conflict',
                data:{
                    participants: []
                }
            }});

            // Posttest
            expect(conversation._triggerAsync).toHaveBeenCalledWith("conversations:sent", {
                result: layer.Conversation.FOUND_WITHOUT_REQUESTED_METADATA
            });
            expect(layer.Conversation.FOUND_WITHOUT_REQUESTED_METADATA).toEqual(jasmine.any(String));
        });

        it("Should trigger conversations:sent-error if its an error", function() {
            // Setup
            spyOn(conversation, "trigger");

            // Run
            conversation._createResult({success: false, data: {
                id: 'doh',
                data: 'ray'
            }});

            // Posttest
            expect(conversation.trigger)
                .toHaveBeenCalledWith("conversations:sent-error", {
                error: {
                    id: 'doh',
                    data: 'ray'
                }
            });
        });
    });

    describe("The _createSuccess() method", function() {
        it("Calls _populateFromServer() ", function() {
            // Setup
            spyOn(conversation, "_populateFromServer");

            // Run
            conversation._createSuccess({id: "layer:///messages/fred"});

            // Posttest
            expect(conversation._populateFromServer).toHaveBeenCalledWith({id: "layer:///messages/fred"});
        });

        it("Should trigger conversations:sent Conversations.CREATED if non distinct", function() {
            // Setup
            spyOn(conversation, "_triggerAsync");
            conversation.distinct = false;

            // Run
            conversation._createSuccess({
                participants: ["a"]
            });

            // Posttest
            expect(conversation._triggerAsync)
                .toHaveBeenCalledWith("conversations:sent", {result: layer.Conversation.CREATED});
            expect(layer.Conversation.CREATED).toEqual(jasmine.any(String));
        });

        it("Should trigger conversations:sent Conversations.CREATED if distinct/not found", function() {
            // Setup
            spyOn(conversation, "_triggerAsync");
            conversation.distinct = true;

            // Run
            conversation._createSuccess({
                participants: ["a"]
            });

            // Posttest
            expect(conversation._triggerAsync)
                .toHaveBeenCalledWith("conversations:sent", {result: layer.Conversation.CREATED});
            expect(layer.Conversation.CREATED).toEqual(jasmine.any(String));
        });

        it("Should trigger conversations:sent Conversations.FOUND if distinct/found", function() {
            // Setup
            spyOn(conversation, "_triggerAsync");
            conversation.distinct = true;


            // Run
            conversation._createSuccess({
                id: "layer:///conversations/fred",
                participants: ["a"],
                distinct: true,
                last_message: {
                    id: "layer:///messages/joe",
                    sender: {
                        user_id: "joe"
                    },
                    parts: [{mime_type: "text/plain", body: "hey"}],
                    conversation: {
                        id: "layer:///conversations/fred"
                    }
                }
            });

            // Posttest
            expect(conversation._triggerAsync)
                .toHaveBeenCalledWith("conversations:sent", {result: layer.Conversation.FOUND});
            expect(layer.Conversation.FOUND).toEqual(jasmine.any(String));
        });
    });

    describe("The _setSynced() method", function() {

        it("Sets syncState to SYNCED if SAVING and _syncCounter=1", function() {
            // Setup
            conversation._syncCounter = 1;
            conversation.syncState = layer.Constants.SYNC_STATE.SAVING;

            // Run
            conversation._setSynced();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCED);
            expect(conversation._syncCounter).toEqual(0);
        });

        it("Sets syncState to SYNCING if SAVING and _syncCounter=2", function() {
            // Setup
            conversation._syncCounter = 2;
            conversation.syncState = layer.Constants.SYNC_STATE.SAVING;

            // Run
            conversation._setSynced();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(conversation._syncCounter).toEqual(1);
        });

        it("Sets syncState to SYNCED if SYNCING and _syncCounter=1", function() {
            // Setup
            conversation._syncCounter = 1;
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCING;

            // Run
            conversation._setSynced();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCED);
            expect(conversation._syncCounter).toEqual(0);
        });
    });

    describe("The _setSyncing() method", function() {
        var conversation;
        beforeEach(function() {
            conversation = client.createConversation({
                participants: ["a"],
                distinct: false
            });
        });
        afterEach(function() {
            conversation.destroy();
        });

        it("Initial sync state is NEW / 0", function() {
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.NEW);
            expect(conversation._syncCounter).toEqual(0);
        });

        it("Sets syncState to SAVING if syncState is NEW and _syncCounter=0", function() {

            // Run
            conversation._setSyncing();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(conversation._syncCounter).toEqual(1);
        });

        it("Sets syncState to SAVING if syncState is NEW and increments the counter", function() {
            // Setup
            conversation._syncCounter = 500;

            // Run
            conversation._setSyncing();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(conversation._syncCounter).toEqual(501);
        });

        it("Sets syncState to SAVING if syncState is SAVING and inc _syncCounter", function() {
            // Setup
            conversation._syncCounter = 500;
            conversation.syncState = layer.Constants.SYNC_STATE.SAVING;

            // Run
            conversation._setSyncing();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(conversation._syncCounter).toEqual(501);
        });

        it("Sets syncState to SYNCING if syncState is SYNCED and inc _syncCounter", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;

            // Run
            conversation._setSyncing();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(conversation._syncCounter).toEqual(1);
        });

        it("Sets syncState to SYNCING if syncState is SYNCING and inc _syncCounter", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCING;
            conversation._syncCounter = 500;

            // Run
            conversation._setSyncing();

            // Posttest
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(conversation._syncCounter).toEqual(501);
        });
    });

    describe("The _populateFromServer() method", function() {
        var conversation, c;
        beforeEach(function() {
            c = JSON.parse(JSON.stringify(responses.conversation1));
            conversation = new layer.Conversation({client: client});
            jasmine.clock().tick(1);
        });

        it("Should copy in all conversation properties", function() {
            // Run
            c.last_message = null;
            conversation._populateFromServer(c);

            // Posttest
            expect(conversation.id).toEqual(c.id);
            expect(conversation.url).toEqual(c.url);
            expect(conversation.unreadCount).toEqual(c.unread_message_count);
            expect(conversation.distinct).toEqual(c.distinct);
            expect(conversation.metadata).toEqual(c.metadata);
            expect(conversation.createdAt).toEqual(new Date(c.created_at));
            expect(conversation.lastMessage).toEqual(null);
        });

        it("Should trigger change events if not new", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
            spyOn(conversation, "_triggerAsync");

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(conversation._triggerAsync).toHaveBeenCalledWith("conversations:change", jasmine.any(Object));
        });

        it("Should trigger ID change events", function() {
            // Setup
            spyOn(conversation, "_triggerAsync");
            var initialId = conversation.id;

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(conversation._triggerAsync)
                .toHaveBeenCalledWith('conversations:change', {
                    oldValue: initialId,
                    newValue: conversation.id,
                    property: 'id',
                });
        });

        it("Should setup lastMessage", function() {
            // Setup
            client._messagesHash = {};

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(client._messagesHash[conversation.lastMessage.id]).toEqual(jasmine.any(layer.Message));
            expect(conversation.lastMessage).toEqual(jasmine.any(layer.Message));
            expect(conversation.lastMessage.parts[0].body).toEqual(c.last_message.parts[0].body);
        });

        it("Should call client._addConversation", function() {
            // Setup
            spyOn(client, "_addConversation");

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(client._addConversation).toHaveBeenCalledWith(conversation);
        });

        it("Should set isCurrentParticipant to true", function() {
            // Setup
            c.participants = [client.userId + "a"];

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(conversation.isCurrentParticipant).toBe(false);
        });

        it("Should set isCurrentParticipant to true", function() {
            // Setup
            c.participants = [client.userId];

            // Run
            conversation._populateFromServer(c);

            // Posttest
            expect(conversation.isCurrentParticipant).toBe(true);
        });
    });


    describe("The addParticipants() method", function() {
        it("Should call _patchParticipants with only new participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];
            spyOn(conversation, "_patchParticipants");

            // Run
            conversation.addParticipants(["a","d","e"]);

            // Posttest
            expect(conversation._patchParticipants).toHaveBeenCalledWith({
                add: ["d","e"], remove: []
            });
        });

        it("Should immediately modify the participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];

            // Run
            conversation.addParticipants(["a","d","e"]);

            // Posttest
            expect(conversation.participants).toEqual(["a","b","c","d","e"]);
        });
    });

    describe("The removeParticipants method", function() {

        it("Should call _patchParticipants with existing removed participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];
            spyOn(conversation, "_patchParticipants");

            // Run
            conversation.removeParticipants(["b","c","z"]);

            // Posttest
            expect(conversation._patchParticipants).toHaveBeenCalledWith({
                add: [], remove: ["b","c"]
            });
        });

        it("Should immediately modify the participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];

            // Run
            conversation.removeParticipants(["b","c","z"]);

            // Posttest
            expect(conversation.participants).toEqual(["a"]);
        });

        it("Should throw error if removing ALL participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];

            // Run
            expect(function() {
                conversation.removeParticipants(["a","b","c","z"]);
            }).toThrowError(layer.LayerError.dictionary.moreParticipantsRequired);
            expect(layer.LayerError.dictionary.moreParticipantsRequired).toEqual(jasmine.any(String));
        });
    });

    describe("The replaceParticipants() method", function() {
        it("Should throw error if removing ALL participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];

            // Run
            expect(function() {
                conversation.replaceParticipants([]);
            }).toThrowError(layer.LayerError.dictionary.moreParticipantsRequired);
            expect(layer.LayerError.dictionary.moreParticipantsRequired).toEqual(jasmine.any(String));
        });

        it("Should call _patchParticipants", function() {
            // Setup
            conversation.participants = ["a","b","c"];
            spyOn(conversation, "_patchParticipants");

            // Run
            conversation.replaceParticipants(["b","c","z"]);

            // Posttest
            expect(conversation._patchParticipants).toHaveBeenCalledWith({
                add: ["z"], remove: ["a"]
            });
        });

        it("Should immediately modify the participants", function() {
            // Setup
            conversation.participants = ["a","b","c"];

            // Run
            conversation.replaceParticipants(["b","c","z"]);

            // Posttest
            expect(conversation.participants).toEqual(["b","c","z"]);
        });
    });

    describe("The _patchParticipants() method", function() {
        it("Should send a message to the server", function() {
            // Setup
            spyOn(conversation, "_xhr");

            // Run
            conversation._patchParticipants({
                add: ["a"], remove: ["b","c"]
            });

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "",
                method: "PATCH",
                headers: {
                    'content-type': 'application/vnd.layer-patch+json',
                },
                data: JSON.stringify([
                    {operation: "remove", property: "participants", value: "b"},
                    {operation: "remove", property: "participants", value: "c"},
                    {operation: "add", property: "participants", value: "a"}
                ])
            }, jasmine.any(Function));
        });

        it("Should call _applyParticipantChange", function() {
             // Setup
            spyOn(conversation, "_applyParticipantChange");

            // Run
            conversation._patchParticipants({
                add: ["y", "z"], remove: ["b","c"]
            });

            // Posttest
            expect(conversation._applyParticipantChange).toHaveBeenCalledWith({
                add: ["y", "z"], remove: ["b","c"]
            });
        });

        it("Should set isCurrentParticipant", function() {
            // Setup
            conversation.isCurrentParticipant = false;

            conversation._patchParticipants({
                add: ["y", "z", client.userId], remove: ["b","c"]
            });

            expect(conversation.isCurrentParticipant).toBe(true);
        });

        it("Should clear isCurrentParticipant", function() {
            // Setup
            conversation.isCurrentParticipant = true;

            conversation._patchParticipants({
                add: ["y", "z"], remove: ["b","c", client.userId]
            });

            expect(conversation.isCurrentParticipant).toBe(false);
        });

        it("Should reload the Conversation on error", function() {
          spyOn(conversation, "_load");
          spyOn(conversation, "_xhr").and.callFake(function(args, callback) {
            callback({success: false});
          });

          // Run
          conversation._patchParticipants({
              add: ["y", "z"], remove: ["b","c", client.userId]
          });

          // Posttest
          expect(conversation._load).toHaveBeenCalledWith();
        });
    });

    describe("The _applyParticipantChange() method", function() {
        it("Should add/remove participants", function() {
            // Setup
            conversation.participants = ["a", "b"];

            // Run
            conversation._applyParticipantChange({
                add: ["a", "x", "y"],
                remove: ["b", "m", "n"]
            });

            // Posttest
            expect(conversation.participants).toEqual(jasmine.arrayContaining(["a", "x", "y"]));
        });

        it("Should call __updateParticipants", function() {
            // Setup
            conversation.participants = ["a", "b"];
            spyOn(conversation, "__updateParticipants");

            // Run
            conversation._applyParticipantChange({
                add: ["a", "x", "y"],
                remove: ["b", "m", "n"]
            });

            // Posttest
            expect(conversation.__updateParticipants).toHaveBeenCalledWith(["a", "x", "y"], ["a", "b"]);
        });
    });

    describe("The delete() method", function() {

        it("Should call _deleted", function() {
            // Setup
            spyOn(conversation, "_deleted");

            // Run
            conversation.delete();

            // Posttest
            expect(conversation._deleted).toHaveBeenCalledWith();
        });

        it("Should destroy the conversation", function() {
            // Setup
            spyOn(conversation, "destroy");

            // Run
            conversation.delete();

            // Posttest
            expect(conversation.destroy).toHaveBeenCalled();
        });


        it("Should call the server", function() {
            // Setup
            spyOn(conversation, "_xhr");

            // Run
            conversation.delete(true);

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "?destroy=true",
                method: "DELETE"
            }, jasmine.any(Function));
        });

        it("Should load a new copy if deletion fails", function() {
          var tmp = layer.Conversation.load;
          spyOn(layer.Conversation, "load");
          spyOn(conversation, "_xhr").and.callFake(function(args, callback) {
            callback({success: false});
          });


          // Run
          conversation.delete();

          // Posttest
          expect(conversation.isDestroyed).toBe(true);
          expect(layer.Conversation.load).toHaveBeenCalledWith(conversation.id, client);

          // Cleanup
          layer.Conversation.load = tmp;
        })
    });

    describe("The _deleted() method", function() {
        it("Should trigger conversations:delete", function() {
            spyOn(conversation, "trigger");
            conversation._deleted();
            expect(conversation.trigger).toHaveBeenCalledWith("conversations:delete");
        });
    });

    describe("The createMessage() method", function() {
        it("Should return a new message with the provided parameters", function() {

            // Run
            var m = conversation.createMessage({
                parts: [new layer.MessagePart({body: "Hey"})]
            });

            // Posttest
            expect(m).toEqual(jasmine.any(layer.Message));
            expect(m.parts.length).toEqual(1);
            expect(m.parts[0].body).toEqual("Hey");
        });

        it("Should have its conversationId property set", function() {
            expect(conversation.createMessage("hi").conversationId).toBe(conversation.id);
        });

        it("Should have its clientId property set", function() {
            expect(conversation.createMessage("hi").clientId).toBe(client.appId);
        });
    });

    describe("The _handlePatchEvent method", function() {
        it("Should call __updateMetadata", function() {
            spyOn(conversation, "__updateMetadata");
            conversation._handlePatchEvent({a: "b"}, {c: "d"}, ["metadata.a", "metadata.b"]);
            expect(conversation.__updateMetadata).toHaveBeenCalledWith({a: "b"}, {c: "d"}, ["metadata.a", "metadata.b"]);
        });

        it("Should call __updateParticipants", function() {
            spyOn(conversation, "__updateParticipants");
            conversation._handlePatchEvent(["a", "b"], ["c", "d"], ["participants"]);
            expect(conversation.__updateParticipants).toHaveBeenCalledWith(["a", "b"], ["c", "d"]);
        });
    });

    describe("The _getParticipantChange() method tested via replaceParticipants()", function() {

    });

    describe("The setMetadataProperties() method", function() {
        var conversation;
        beforeEach(function() {
            conversation = client.createConversation({
                participants: ["a"],
                metadata: {hey: "ho"}
            });
        });
        afterEach(function() {
            conversation.destroy();
        });
        it("Should trigger an event", function() {
            // Setup
            spyOn(conversation, "_xhr"); // disable xhr calls and events it will trigger
            spyOn(conversation, "_triggerAsync");

            // Run
            conversation.setMetadataProperties({
                "a.b.c": "fred",
                "a.d": "wilma"
            });
            jasmine.clock().tick(1);

            // Posttest
            expect(conversation._triggerAsync)
            .toHaveBeenCalledWith("conversations:change", jasmine.objectContaining({
                oldValue: {hey: "ho"},
                newValue: {hey: "ho", a: {b: {c: "fred"}, d: "wilma"}},
                property: "metadata",
                paths: ["metadata.a.b.c", "metadata.a.d"]
            }));
        });


        it("Should call the server with layer+patch data", function() {

            // Setup
            spyOn(conversation, "_xhr");

            // Run
            conversation.setMetadataProperties({"a.b.c": "fred", "a.d": "wilma"});

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "",
                method: "PATCH",
                headers: {
                    'content-type': 'application/vnd.layer-patch+json'
                },
                data: JSON.stringify([
                    {operation: "set", property: "metadata.a.b.c", value: "fred"},
                    {operation: "set", property: "metadata.a.d", value: "wilma"}
                ])
            }, jasmine.any(Function));
        });

        it("Should call layerParse", function() {
            // Setup
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            // Run
            conversation.setMetadataProperties({"a.b.c": "fred", "a.d": "wilma"});

            // Posttest
            expect(layer.Util.layerParse).toHaveBeenCalledWith({
                object: conversation,
                type: "Conversation",
                operations: [
                    {operation: "set", property: "metadata.a.b.c", value: "fred"},
                    {operation: "set", property: "metadata.a.d", value: "wilma"}
                ],
                client: client
            });

            // Cleanup
            layer.Util.layerParse = tmp;
        });

        it("Should reload the Conversation on error", function() {
          spyOn(conversation, "_load");
          spyOn(conversation, "_xhr").and.callFake(function(args, callback) {
            callback({success: false});
          });

          // Run
          conversation.setMetadataProperties({"a.b.c": "fred", "a.d": "wilma"});

          // Posttest
          expect(conversation._load).toHaveBeenCalledWith();
        });
    });


    describe("The deleteMetadataProperties() method", function() {
        var conversation;
        beforeEach(function() {
            conversation = client.createConversation({
                participants: ["a"],
                metadata: {a: {b: {c: "fred"}}, ho: "hum"}
            });
        });
        afterEach(function() {
            conversation.destroy();
        });
        it("Should trigger change", function() {
            // Setup
            spyOn(conversation, "_xhr"); // disable xhr calls and events it will trigger
            spyOn(conversation, "_triggerAsync");

            // Run
            conversation.deleteMetadataProperties(["a.b.c"]);

            // Posttest
            expect(conversation._triggerAsync)
            .toHaveBeenCalledWith("conversations:change", {
                oldValue: {ho: "hum", a: {b: {c: "fred"}}},
                newValue: {ho: "hum", a: {b: {}}},
                property: "metadata",
                paths: ["metadata.a.b.c"]
            });
        });


        it("Should call the server with layer+patch data", function() {

            // Setup
            spyOn(conversation, "_xhr");

            // Run
            conversation.deleteMetadataProperties(["a.b.c"]);

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "",
                method: "PATCH",
                headers: {
                    'content-type': 'application/vnd.layer-patch+json'
                },
                data: JSON.stringify([
                    {operation: "delete", property: "metadata.a.b.c"}
                ])
            }, jasmine.any(Function));
        });

        it("Should call layerParse", function() {
            // Setup
            var tmp = layer.Util.layerParse;
            spyOn(layer.Util, "layerParse");

            // Run
            conversation.deleteMetadataProperties(["a.b.c"]);

            // Posttest
            expect(layer.Util.layerParse).toHaveBeenCalledWith({
                object: conversation,
                type: "Conversation",
                operations: [
                    {operation: "delete", property: "metadata.a.b.c"}
                ],
                client: client
            });

            // Cleanup
            layer.Util.layerParse = tmp;
        });

        it("Should reload the Conversation on error", function() {
          spyOn(conversation, "_load");
          spyOn(conversation, "_xhr").and.callFake(function(args, callback) {
            callback({success: false});
          });

          // Run
          conversation.deleteMetadataProperties(["a.b.c"]);

          // Posttest
          expect(conversation._load).toHaveBeenCalledWith();
        });
    });

    describe("The __updateMetadata() method", function() {
        it("Should call the server with layer+patch data", function() {
            spyOn(conversation, "_xhr");

            // Run
            conversation.setMetadataProperties({
                ho: "hum"
            });

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "",
                method: "PATCH",
                data: JSON.stringify([
                    {operation: "set", property: "metadata.ho", value: "hum"}
                ]),
                headers: {
                    "content-type": "application/vnd.layer-patch+json"
                }
            }, jasmine.any(Function));
        });
    });

    describe("The __updateUnreadCount() method", function() {
        it("Should not let value drop below 0", function() {
          conversation.unreadCount = -50;
          expect(conversation.unreadCount).toEqual(0);
        });

        it("Should not trigger events if forced to not change", function() {
          conversation.unreadCount = 0;
          spyOn(conversation, "_updateUnreadCountEvent");
          conversation.unreadCount = -50;
          expect(conversation._updateUnreadCountEvent).not.toHaveBeenCalled();
        })

        it("Should  trigger events if changed", function() {
          conversation.unreadCount = 1;
          spyOn(conversation, "_updateUnreadCountEvent");
          conversation.unreadCount = 0;
          expect(conversation._updateUnreadCountEvent).toHaveBeenCalled();
        });

        it("Should delay events for 1 second if getting changes from layer-patch websocket events", function() {
          conversation._inLayerParser = true;
          spyOn(conversation, "_updateUnreadCountEvent");
          conversation.unreadCount = 100;
          expect(conversation._updateUnreadCountEvent).not.toHaveBeenCalled();
          jasmine.clock().tick(1001);
          expect(conversation._updateUnreadCountEvent).toHaveBeenCalled();
        });

        it("Should only trigger one event while processing websocket events", function() {
          conversation._inLayerParser = true;
          spyOn(conversation, "_updateUnreadCountEvent");
          conversation.unreadCount = 100;
          jasmine.clock().tick(10);
          conversation.unreadCount = 80;
          jasmine.clock().tick(10);
          conversation.unreadCount = 60;
          expect(conversation._updateUnreadCountEvent).not.toHaveBeenCalled();
          jasmine.clock().tick(1001);
          expect(conversation._updateUnreadCountEvent.calls.count()).toEqual(1);
        });
    });

    describe("The __updateLastMessage() method", function() {
      it("Should trigger an event if Message ID changes", function() {
        spyOn(conversation, "_triggerAsync");
        conversation.__updateLastMessage({id: "1"}, {id: "2"});
        expect(conversation._triggerAsync).toHaveBeenCalledWith("conversations:change", {
          property: "lastMessage",
          newValue: {id: "1"},
          oldValue: {id: "2"}
        });
      });

      it("Should not trigger an event if Message ID did not change", function() {
        spyOn(conversation, "_triggerAsync");
        conversation.__updateLastMessage({id: "1"}, {id: "1"});
        expect(conversation._triggerAsync).not.toHaveBeenCalled();
      });
    });



    describe("The xhr() method", function() {
        it("Should throw an error if destroyed", function() {
            // Setup
            conversation.destroy();

            // Run
            expect(function() {
                conversation._xhr({});
            }).toThrowError(layer.LayerError.dictionary.isDestroyed);
            expect(layer.LayerError.dictionary.isDestroyed).toEqual(jasmine.any(String));
        });

        it("Should throw an error if the conversation does not have a client", function() {
            // Setup
            delete conversation.clientId;

            // Run
            expect(function() {
                conversation._xhr({});
            }).toThrowError(layer.LayerError.dictionary.clientMissing);
            expect(layer.LayerError.dictionary.clientMissing).toEqual(jasmine.any(String));

            // Recovery
            conversation.clientId = client.appId;
        });

        it("Should throw an error if no url specified", function() {
            expect(function() {
                conversation._xhr({});
            }).toThrowError(layer.LayerError.dictionary.urlRequired);
            expect(layer.LayerError.dictionary.urlRequired).toEqual(jasmine.any(String));
        });

        it("Should do nothing if its not a POST request on a NEW Conversation", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.NEW;
            spyOn(client, "xhr");

            // Run
            conversation._xhr({
                url: "",
                method: "GET"
            });

            // Posttest
            expect(client.xhr).not.toHaveBeenCalled();
        });

        it("Should call _setSyncing if its not a GET request", function() {
            // Setup
            spyOn(conversation, "_setSyncing");

            // Run
            conversation._xhr({
                url: "",
                method: "POST"
            });

            // Posttest
            expect(conversation._setSyncing).toHaveBeenCalledWith();
        });

        it("Should call client.xhr", function() {
            // Setup
            spyOn(client, "xhr");
            conversation.url = "hey";

            // Run
            conversation._xhr({
                url: "",
                method: "POST"
            });

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith(jasmine.objectContaining({
                url: "hey",
                sync: {
                    target: conversation.id
                },
                method: "POST"
            }), jasmine.any(Function));
        });

        it("Should call client.xhr with function getUrl", function() {
            // Setup
            spyOn(client, "xhr");
            conversation.url = "";

            // Run
            conversation._xhr({
                url: "",
                method: "POST"
            });

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith(jasmine.objectContaining({
                url: jasmine.any(Function),
                sync: {
                    target: conversation.id
                },
                method: "POST"
            }), jasmine.any(Function));
        });
    });


    describe("The _load() method", function() {
        it("Should set the syncState to LOADING", function() {
            conversation._load();
            expect(conversation.syncState).toEqual(layer.Constants.SYNC_STATE.LOADING);
            expect(layer.Constants.SYNC_STATE.LOADING).toEqual(jasmine.any(String));
        });

        it("Should call _xhr", function() {
            // Setup
            spyOn(conversation, "_xhr");

            // Run
            conversation._load();

            // Posttest
            expect(conversation._xhr).toHaveBeenCalledWith({
                url: "",
                method: "GET",
                sync: false
            }, jasmine.any(Function));
        });

        it("Should call _loadResult()", function() {
            spyOn(conversation, "_loadResult");

            // Run
            conversation._load();
            var r = requests.mostRecent();
            r.response({
                responseText: JSON.stringify({hey: "ho"}),
                status: 200
            });

            // Posttest
            expect(conversation._loadResult).toHaveBeenCalledWith(jasmine.objectContaining({
                data: {hey: "ho"}
            }));
        });

        it("Should set the isLoading property", function() {
            conversation._load();
            expect(conversation.isLoading).toBe(true);
        });
    });

    describe("The _loadResult() method", function() {
        it("Should trigger conversations:loaded-error on error", function() {
            // Setup
            spyOn(conversation, "trigger");

            // Run
            conversation._loadResult({success: false, data: "Argh"});

            // Posttest
            expect(conversation.trigger).toHaveBeenCalledWith(
                "conversations:loaded-error", {
                    error: "Argh"
                });
        });

        it("Should call _removeConversation on error", function() {
            // Setup
            spyOn(client, "_removeConversation");

            // Run
            conversation._loadResult({success: false, response: "Argh"});

            // Posttest
            expect(client._removeConversation).toHaveBeenCalledWith(conversation);
        });

        it("Should call _populateFromServer on success", function() {
            // Setup
            spyOn(conversation, "_populateFromServer");

            // Run
            conversation._loadResult({success: true, data: "Argh"});

            // Posttest
            expect(conversation._populateFromServer).toHaveBeenCalledWith("Argh");
        });

        it("Should call _addConversation if success", function() {
            // Setup
            spyOn(client, "_addConversation");

            // Run
            conversation._loadResult({
                success: true,
                data: JSON.parse(JSON.stringify(responses.conversation1))
            });

            // Posttest
            expect(client._addConversation).toHaveBeenCalledWith(conversation);
        });

        it("Should trigger conversations:loaded if success", function() {
            // Setup
            spyOn(conversation, "trigger");

            // Run
            conversation._loadResult({
                success: true,
                data: JSON.parse(JSON.stringify(responses.conversation1))
            });

            // Posttest
            expect(conversation.trigger).toHaveBeenCalledWith("conversations:loaded");
        });

        it("Should clear the isLoading property on success", function() {
            conversation._load();
            conversation._loadResult({
                success: true,
                data: JSON.parse(JSON.stringify(responses.conversation1))
            });
            expect(conversation.isLoading).toBe(false);
        });

        it("Should clear the isLoading property on error", function() {
            conversation._load();
            conversation._loadResult({
                success: false,
                data: {}
            });
            expect(conversation.isLoading).toBe(false);
        });
    });

    describe("The on() method", function() {
        it("Should call any callbacks if subscribing to conversations:loaded", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
            var spy = jasmine.createSpy("spy");

            // Run
            conversation.on("conversations:loaded", spy);

            // Midtest
            expect(spy).not.toHaveBeenCalled();


            // Posttest
            jasmine.clock().tick(1);
            expect(spy).toHaveBeenCalled();
        });

        it("Should call any callbacks if subscribing to conversations:loaded via object", function() {
            // Setup
            conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
            var spy = jasmine.createSpy("spy");

            // Run
            conversation.on({
                "conversations:loaded": spy
            });

            // Midtest
            expect(spy).not.toHaveBeenCalled();


            // Posttest
            jasmine.clock().tick(1);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe("The toObject() method", function() {
        it("Should return cached value", function() {
            conversation._toObject = "fred";
            expect(conversation.toObject()).toEqual("fred");
        });

        it("Should return a clone of participants", function() {
            expect(conversation.toObject().participants).toEqual(conversation.participants);
            expect(conversation.toObject().participants).not.toBe(conversation.participants);
        });

        it("Should return a clone of metadata", function() {
            expect(conversation.toObject().metadata).toEqual(conversation.metadata);
            expect(conversation.toObject().metadata).not.toBe(conversation.metadata);
        });
    });

    describe("Static Methods", function() {

        // NOTE: These tests go well beyond unit testing as I needed to verify how
        // _createFromServer, _populateFromServer, and the same methods as applied to lastMessage
        // all fit together.
        describe("The _createFromServer() method", function() {
            it("Should call _populateFromServer if found", function() {
                // Setup
                var c = JSON.parse(JSON.stringify(responses.conversation1));
                spyOn(conversation, "_populateFromServer");

                // Run
                var result = layer.Conversation._createFromServer(c, client);

                // Posttest
                expect(conversation._populateFromServer).toHaveBeenCalledWith(c);
                expect(result.new).toEqual(false);
            });

            it("Should call _populateFromServer", function() {
                // Setup
                var c = JSON.parse(JSON.stringify(responses.conversation1));
                c.id += "a";
                var f = layer.Conversation.prototype._populateFromServer;
                spyOn(layer.Conversation.prototype, "_populateFromServer");

                // Run
                layer.Conversation._createFromServer(c, client);

                // Posttest
                expect(layer.Conversation.prototype._populateFromServer).toHaveBeenCalledWith(c);

                layer.Conversation.prototype._populateFromServer = f;
            });

            it("Should throw error if no client provided", function() {
                // Setup
                var c = JSON.parse(JSON.stringify(responses.conversation1));

                // Run
                expect(function() {
                    var conversation = layer.Conversation._createFromServer(c, "fred");
                }).toThrowError(layer.LayerError.dictionary.clientMissing);

                expect(function() {
                    var conversation = layer.Conversation._createFromServer(c);
                }).toThrowError(layer.LayerError.dictionary.clientMissing);
            });

            it("Should setup a client", function() {
                 // Setup
                var c = JSON.parse(JSON.stringify(responses.conversation1));

                // Run
                var result = layer.Conversation._createFromServer(c, client);

                // Posttest
                expect(result.conversation.clientId).toBe(client.appId);
            });
        });

        describe("The load() method", function() {
            it("Should fail if no client parameter", function() {
                expect(function() {
                    layer.Conversation.load("https://doh.com/blah");
                }).toThrowError(layer.LayerError.dictionary.clientMissing);
            });

            it("Should return a new conversation with the specified id and clientId", function() {
                // Run
                var c = layer.Conversation.load("layer:///conversations/m1", client);

                // Posttest
                expect(c.clientId).toBe(client.appId);
                expect(c.url).toEqual(client.url + "/conversations/m1");
            });

            it("Should request the conversation from the server", function() {
                // Setup
                var f = layer.Conversation.prototype._load;
                spyOn(layer.Conversation.prototype, "_load");

                // Run
                var c = layer.Conversation.load("layer:///conversations/blah", client);

                // Posttest
                expect(c._load).toHaveBeenCalledWith();
            });

        });

        describe("The create() method", function() {
            it("Should throw error if no client", function() {
                expect(function() {
                    layer.Conversation.create({});
                }).toThrowError(layer.LayerError.dictionary.clientMissing);
            });

            it("Should call _createDistinct to get a conversation if distinct", function() {
                // Setup
                var createDistinct = layer.Conversation._createDistinct;
                spyOn(layer.Conversation, "_createDistinct");
                var args = {
                    distinct: true,
                    client: client,
                    participants: ["a","b"]
                };

                // Run
                layer.Conversation.create(args);

                // Posttest
                expect(layer.Conversation._createDistinct).toHaveBeenCalledWith(args);

                layer.Conversation._createDistinct = createDistinct;
            });

            it("Should return any conversation returned by _createDistinct", function() {
                // Setup
                var createDistinct = layer.Conversation._createDistinct;
                var c = new layer.Conversation();
                spyOn(layer.Conversation, "_createDistinct").and.returnValue(c);
                spyOn(c, "send");

                // Run
                var result = layer.Conversation.create({
                    distinct: true,
                    client: client,
                    participants: ["a","b"]
                });

                // Posttest
                expect(result).toBe(c);

                layer.Conversation._createDistinct = createDistinct;
            });

            it("Should create a new conversation if no conversation returned by _createDistinct", function() {
                // Setup
                var createDistinct = layer.Conversation._createDistinct;
                spyOn(layer.Conversation, "_createDistinct").and.returnValue(null);

                // Run
                var result = layer.Conversation.create({
                    distinct: true,
                    client: client,
                    participants: ["a","b"]
                });

                // Posttest
                expect(result).toEqual(jasmine.any(layer.Conversation));

                layer.Conversation._createDistinct = createDistinct;
            });

            it("Should NOT call _createDistinct if not distinct", function() {
                // Setup
                var createDistinct = layer.Conversation._createDistinct;
                spyOn(layer.Conversation, "_createDistinct");

                // Run
                var result = layer.Conversation.create({
                    distinct: false,
                    client: client,
                    participants: ["a","b"]
                });

                // Posttest
                expect(layer.Conversation._createDistinct).not.toHaveBeenCalled();

                layer.Conversation._createDistinct = createDistinct;
            });

        });

        describe("The _createDistinct() method", function() {
            it("Should return a matching distinct conversation", function() {
                // Setup
                var c = new layer.Conversation({
                    client: client,
                    fromServer: {
                        participants: ["x","y", "Frodo"],
                        distinct: true,
                        id:  "layer:///conversations/ " + layer.Util.generateUUID()
                    }
                });

                // Run
                var result = layer.Conversation._createDistinct({
                    client: client,
                    participants: ["x","y"],
                    distinct: true
                });

                // Posttest
                expect(result).toBe(c);
            });

            it("Should return undefined if not match is found", function() {
                // Setup
                var c = new layer.Conversation({
                    client: client,
                    fromServer: {
                        participants: ["x","y", "Frodo"],
                        distinct: true,
                        id:  "layer:///conversations/ " + layer.Util.generateUUID(),
                    }
                });

                // Run
                var result = layer.Conversation._createDistinct({
                    client: client,
                    participants: ["x","y","z"],
                    distinct: true
                });

                // Posttest
                expect(result).toBe(undefined);
            });

            it("Should return prop with a FOUND event if no metadat requested", function() {
                // Setup
                var c = new layer.Conversation({
                    client: client,
                    fromServer: {
                        participants: ["x","y", "Frodo"],
                        distinct: true,
                        id:  "layer:///conversations/ " + layer.Util.generateUUID()
                    }
                });

                // Run
                var result = layer.Conversation._createDistinct({
                    client: client,
                    participants: ["x","y"],
                    distinct: true
                });

                // Posttest
                expect(c._sendDistinctEvent).toEqual(jasmine.objectContaining({
                    target: c,
                    result: layer.Conversation.FOUND
                }));
            });

            it("Should return prop with a FOUND event if no metadat requested", function() {
                // Setup
                var c = new layer.Conversation({
                    client: client,
                    fromServer: {
                        participants: ["x","y", "Frodo"],
                        distinct: true,
                        id:  "layer:///conversations/ " + layer.Util.generateUUID(),
                        metadata: {hey: "ho", there: "goes"}
                    }
                });

                // Run
                var result = layer.Conversation._createDistinct({
                    client: client,
                    participants: ["x","y"],
                    distinct: true,
                    metadata: {hey: "ho", there: "goes"}
                });

                // Posttest
                expect(c._sendDistinctEvent).toEqual(jasmine.objectContaining({
                    target: c,
                    result: layer.Conversation.FOUND
                }));
            });

            it("Should return prop with a FOUND_WITHOUT_REQUESTED_METADATA event if no metadat requested", function() {
                // Setup
                var c = new layer.Conversation({
                    client: client,
                    fromServer: {
                        participants: ["x","y", "Frodo"],
                        distinct: true,
                        id:  "layer:///conversations/ " + layer.Util.generateUUID(),
                        metadata: {hey: "ho", there: "goes"}
                    }
                });

                // Run
                var result = layer.Conversation._createDistinct({
                    client: client,
                    participants: ["x","y"],
                    distinct: true,
                    metadata: {hey: "ho", there: "goes2"}
                });

                // Posttest
                expect(c._sendDistinctEvent).toEqual(jasmine.objectContaining({
                    target: c,
                    result: layer.Conversation.FOUND_WITHOUT_REQUESTED_METADATA
                }));
            });
        });
    });
});