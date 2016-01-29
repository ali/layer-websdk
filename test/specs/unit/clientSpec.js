/*eslint-disable */

describe("The Client class", function() {
    var appId = "Fred's App";
    var userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";
    var identityToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiIyOWUzN2ZhZS02MDdlLTExZTQtYTQ2OS00MTBiMDAwMDAyZjgifQ.eyJpc3MiOiI4YmY1MTQ2MC02MDY5LTExZTQtODhkYi00MTBiMDAwMDAwZTYiLCJwcm4iOiI5M2M4M2VjNC1iNTA4LTRhNjAtODU1MC0wOTlmOWM0MmVjMWEiLCJpYXQiOjE0MTcwMjU0NTQsImV4cCI6MTQxODIzNTA1NCwibmNlIjoiRFZPVFZzcDk0ZU9lNUNzZDdmaWVlWFBvUXB3RDl5SjRpQ0EvVHJSMUVJT25BSEdTcE5Mcno0Yk9YbEN2VDVkWVdEdy9zU1EreVBkZmEydVlBekgrNmc9PSJ9.LlylqnfgK5nhn6KEsitJMsjfayvAJUfAb33wuoCaNChsiRXRtT4Ws_mYHlgwofVGIXKYrRf4be9Cw1qBKNmrxr0er5a8fxIN92kbL-DlRAAg32clfZ_MxOfblze0DHszvjWBrI7F-cqs3irRi5NbrSQxeLZIiGQdBCn8Qn5Zv9s";
    var cid1 = "layer:///conversations/test1",
        cid2 = "layer:///conversations/test2",
        cid3 = "layer:///conversations/test3",
        url1 = "https://huh.com/conversations/test1",
        url2 = "https://huh.com/conversations/test2",
        url3 = "https://huh.com/conversations/test3";
    var client, requests;

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        jasmine.addCustomEqualityTester(mostRecentEqualityTest);
        jasmine.addCustomEqualityTester(responseTest);

        client = new layer.Client({
            appId: appId,
            url: "https://huh.com"
        });
        client.sessionToken = "sessionToken";
        client.userId = "Frodo";
    });

    afterEach(function() {
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        it("Should register the Client", function() {
            var client = new layer.Client({
                appId: "Samunwise",
                url: "https://huh.com"
            });
            expect(layer.Client.getClient("Samunwise")).toBe(client);
        });

        it("Should initialize all caches", function() {
            expect(client._messagesHash).toEqual({});
            expect(client._conversationsHash).toEqual({});
            expect(client._queriesHash).toEqual({});
        });

        it("Should initialize users to empty array", function() {
            expect(client.users).toEqual([]);
        });

        it("Should initialize any users passed in", function() {
            // Setup
            var user = new layer.User({displayName: "fred", id: "fred"});
            spyOn(user, "setClient");

            client = new layer.Client({
                appId: appId,
                url: "https://huh.com",
                users: [user]
            });
            expect(user.setClient).toHaveBeenCalledWith(client);
        });

        it("Should call _initComponents", function() {
            expect(client.syncManager).toEqual(jasmine.any(layer.SyncManager));
        });

        it("Should call _connectionRestored on receiving an online event", function() {
            var _connectionRestored =  layer.Client.prototype._connectionRestored;
            spyOn(layer.Client.prototype, "_connectionRestored");
            var client = new layer.Client({
                appId: "Samunwise",
                url: "https://huh.com"
            });
            expect(client._connectionRestored).not.toHaveBeenCalled();

            // Run
            client.trigger("online");

            // Posttest
            expect(client._connectionRestored).toHaveBeenCalled();

            // Restore
            layer.Client.prototype._connectionRestored = _connectionRestored;
        });
    });

    describe("The _initComponents() method", function() {
        it("Should setup the TypingListenerIndicator", function() {
            client._initComponents();
            expect(client._typingIndicators).toEqual(jasmine.any(layer.Root));
        });

        xit("Should have a test for plugins", function() {

        });
    });

    describe("The _cleanup() method", function() {
        afterEach(function() {
            client._messagesHash = client._conversationsHash = client._queriesHash = {};
        });

        it("Should destroy all Messages", function() {
            // Setup
            var conversation = client.createConversation(["a"]);
            var message = conversation.createMessage("Hi").send();
            conversation.lastMessage = null;
            message.conversationId = "c1";

            // Pretest
            expect(client._messagesHash[message.id]).toBe(message);

            // Run
            client._cleanup();

            // Posttest
            expect(message.isDestroyed).toBe(true);
            expect(client._messagesHash).toBe(null);
        });

        it("Should destroy all Conversations", function() {
            // Setup
            var conversation = client.createConversation(["a"]);

            // Pretest
            expect(client._conversationsHash[conversation.id]).toBe(conversation);

            // Run
            client._cleanup();

            // Posttest
            expect(conversation.isDestroyed).toBe(true);
            expect(client._conversationsHash).toBe(null);

        });

        it("Should destroy all Queries", function() {
            // Setup
            var query = client.createQuery({});

            // Pretest
            expect(client._queriesHash[query.id]).toBe(query);

            // Run
            client._cleanup();

            // Posttest
            expect(query.isDestroyed).toBe(true);
            expect(client._queriesHash).toBe(null);
        });

        it("Should destroy all Users", function() {
            // Setup
            var user = new layer.User({id: "hi"})
            client.addUser(user);

            // Pretest
            expect(client.users).toEqual([user]);

            // Run
            client._cleanup();

            // Posttest
            expect(user.isDestroyed).toBe(true);
            expect(client.users).toEqual([]);
        });

        it("Should close the websocket", function() {
            spyOn(client.socketManager, "close");
            client._cleanup();
            expect(client.socketManager.close).toHaveBeenCalled();
        });

        it("Should do nothing if destroyed", function() {
            client.isDestroyed = true;
            client._cleanup();
            expect(client._conversationsHash).toEqual({});
            client.isDestroyed = false;
        });
    });

    describe("The destroy() method", function() {
        afterEach(function() {
            client = null;
        });
        it("Should call _cleanup", function() {
            spyOn(client, "_cleanup");
            client.destroy();
            expect(client._cleanup).toHaveBeenCalledWith();
        });

        it("Should call _destroyComponents", function() {
            spyOn(client, "_destroyComponents");
            client.destroy();
            expect(client._destroyComponents).toHaveBeenCalledWith();
        });

        it("Should unregister the client", function() {
            var appId = client.appId;
            expect(layer.Client.getClient(appId)).toBe(client);
            client.destroy();
            expect(layer.Client.getClient(appId)).toBe(undefined);
        });
    });



    describe("The getConversation() method", function() {
        var conversation;
        beforeEach(function() {
            conversation = new layer.Conversation({
                client: client,
                fromServer: {
                    id: "layer:///conversations/ " + layer.Util.generateUUID(),
                    participants: ["a"]
                }
            });
        });
        it("Should get by id", function() {
            expect(client.getConversation(conversation.id)).toBe(conversation);
        });

        it("Should load by id", function() {
            var c1 = client.getConversation(cid1, true);

            // Posttest
            expect(c1 instanceof layer.Conversation).toBe(true);
            expect(c1.participants).toEqual([client.userId]);
            expect(c1.id).toEqual(cid1);
            expect(requests.mostRecent().url).toEqual(url1);
        });

        it("Should fail without id", function() {
            expect(function() {
                client.getConversation(5);
            }).toThrowError(layer.LayerError.dictionary.idParamRequired);
            expect(layer.LayerError.dictionary.idParamRequired.length > 0).toBe(true);
        });
    });

    describe("The _addConversation() method", function() {


        it("Should register a conversation in _conversationsHash", function() {
            client._conversationsHash = {};
            var c = new layer.Conversation({});

            // Run
            client._addConversation(c);

            // Posttest
            expect(client.getConversation(c.id)).toBe(c);
        });

        it("Should set the clientId property", function() {
            // Setup
            var c = new layer.Conversation({});

            // Pretest
            expect(c.clientId).toEqual("");

            // Run
            client._addConversation(c);

            // Posttest
            expect(c.clientId).toEqual(client.appId);
        });

        it("Should fire conversations:add", function() {
            // Setup
            spyOn(client, "_triggerAsync");

            // Run
            var c = new layer.Conversation({
            });
            client._addConversation(c);

            // Posttest
            expect(client._triggerAsync)
            .toHaveBeenCalledWith("conversations:add", {conversations: [c]});
        });

        it("Should not do anything if the conversation is already added", function() {
            // Setup
            var c = new layer.Conversation({});
            client._addConversation(c);
            spyOn(client, "_triggerAsync");


            // Run
            var c2 = new layer.Conversation({
                id: c.id
            });
            client._addConversation(c2);

            // Posttest
            expect(client.getConversation(c.id)).toBe(c);
            expect(client._triggerAsync).not.toHaveBeenCalled();
        });
    });

    describe("The _removeConversation() method", function() {

        it("Should deregister a conversation", function() {
            // Setup
            var c1 = client.createConversation(["a"]);

            // Pretest
            var hash = {};
            hash[c1.id] = c1;
            expect(client._conversationsHash).toEqual(hash);

            // Run
            client._removeConversation(c1);

            // Posttest
            delete hash[c1.id];
            expect(client._conversationsHash).toEqual(hash);
        });

        it("Should trigger event on removing conversation", function() {
            // Setup
            var c1 = new layer.Conversation({});
            client._addConversation(c1);
            spyOn(client, "_triggerAsync");

            // Run
            client._removeConversation(c1);

            // Posttest
            expect(client._triggerAsync).toHaveBeenCalledWith(
                "conversations:remove", {
                    conversations: [c1]
                }
            );
        });


        it("Should do nothing if conversation not registered", function() {
            // Setup
            var c1 = new layer.Conversation({});
            spyOn(client, "trigger");

            // Pretest
            expect(client.getConversation(c1.id)).toEqual(undefined);

            // Run
            client._removeConversation(c1);

            // Posttest
            expect(client.trigger).not.toHaveBeenCalled();
        });

        it("Should destroy any Messages associated with the Conversation", function() {
            // Setup
            var c1 = client.createConversation(["a"]);
            var m1 = c1.createMessage("a").send();
            var m2 = c1.createMessage("b").send();
            var m3 = c1.createMessage("c").send();
            var c2 = client.createConversation(["b"]);
            var m4 = c2.createMessage("a").send();

            // Pretest
            expect(Object.keys(client._messagesHash))
                .toEqual(jasmine.arrayContaining([m1.id, m2.id, m3.id, m4.id]));

            // Run
            client._removeConversation(c1);

            // Posttest
            expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m4.id]));
        });
    });

    describe("The _updateConversationId() method", function() {
        it("Should register the conversation under the new id", function() {
            // Setup
            var c1 = new layer.Conversation({});
            client._addConversation(c1);
            var c1id = c1.id;

            // Run
            c1.id = "fred";
            client._updateConversationId(c1, c1id);

            // Posttest
            expect(client.getConversation("fred")).toBe(c1);
        });

        it("Should update all Message conversationIds", function() {
            // Setup
            var c1 = new layer.Conversation({participants: ["a"]});
            client._addConversation(c1);
            var m1 = c1.createMessage("Hey").send();
            var m2 = c1.createMessage("Ho").send();
            var c1id = c1.id;

            // Pretest
            expect(m1.conversationId).toEqual(c1id);
            expect(m2.conversationId).toEqual(c1id);

            // Run
            c1.id = "fred";
            client._updateConversationId(c1, c1id);

            // Posttest
            expect(m1.conversationId).toEqual("fred");
            expect(m2.conversationId).toEqual("fred");
        });

        it("Should still allow lookup of the old id for a while", function() {
            // Setup
            var c1 = new layer.Conversation({});
            client._addConversation(c1);
            var c1id = c1.id;

            // Run
            c1.id = "fred";
            client._updateConversationId(c1, c1id);

            // Posttest
            expect(client.getConversation(c1id)).toBe(c1);
        });

        it("Should deregister the old id", function() {
            // Setup
            var c1 = new layer.Conversation({});
            client._addConversation(c1);
            var c1id = c1.id;
            c1.id = "fred";
            client._updateConversationId(c1, c1id);

            // Pretest
            expect(client.getConversation(c1id)).toBe(c1);

            // Run
            jasmine.clock().tick(100000);

            // Posttest
            expect(client.getConversation(c1id)).toBe(undefined);
        });
    });

    describe("The getMessagePart() method", function() {
        var conversation;
        var message;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = new layer.Message({
                client: client,
                fromServer: responses.message1,
            });
        });

        it("Should get by id", function() {
            expect(client.getMessagePart(responses.message1.parts[1].id)).toBe(message.parts[1]);
        });

        it("Should fail by id", function() {
            expect(client.getMessagePart(responses.message1.parts[1].id + "1")).toBe(undefined);
        });
    });


    describe("The getMessage() method", function() {
        var conversation;
        var message;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = conversation.createMessage("hello").send();
        });

        it("Should get by id", function() {
            expect(client.getMessage(message.id)).toBe(message);
        });

        it("Should load by id", function() {
            var newId = message.id.replace(/temp_/,"") + "a";
            var m1 = client.getMessage(newId, true);

            // Posttest
            expect(m1 instanceof layer.Message).toBe(true);
            expect(m1.id).toEqual(newId);
            expect(requests.mostRecent().url).toEqual(client.url + newId.replace(/layer\:\/\//,""));
        });

        it("Should fail without id", function() {
            expect(function() {
                client.getMessage(5);
            }).toThrowError(layer.LayerError.dictionary.idParamRequired);
            expect(layer.LayerError.dictionary.idParamRequired.length > 0).toBe(true);
        });
    });

    describe("The _addMessage() method", function() {
        var conversation;
        var message;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = conversation.createMessage("hello").send();
        });

        it("Should register a Message in _messagesHash", function() {
            // Setup
            client._messagesHash = {};

            // Run
            client._addMessage(message);

            // Posttest
            expect(client.getMessage(message.id)).toBe(message);
        });

        it("Should fire messages:add", function() {
            // Setup
            spyOn(client, "_triggerAsync");
            client._messagesHash = {};

            // Run
            client._addMessage(message);

            // Posttest
            expect(client._triggerAsync)
            .toHaveBeenCalledWith("messages:add", {messages: [message]});
        });

        it("Should not do anything if the Message is already added", function() {
            // Setup
            var m = conversation.createMessage("b").send();
            m.id = message.id;
            spyOn(client, "_triggerAsync");

            // Run
            client._addMessage(m);

            // Posttest
            expect(client.getMessage(m.id)).toBe(message);
            expect(client._triggerAsync).not.toHaveBeenCalled();
        });
    });

    describe("The _removeMessage() method", function() {
        var conversation;
        var message;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = conversation.createMessage("hello").send();
        });

        it("Should deregister a Message", function() {
            // Pretest
            var hash = {};
            hash[message.id] = message;
            expect(client._messagesHash).toEqual(hash);

            // Run
            client._removeMessage(message);

            // Posttest
            expect(client._messagesHash).toEqual({});
        });

        it("Should trigger event on removing Message", function() {
            // Setup
            spyOn(client, "_triggerAsync");

            // Run
            client._removeMessage(message);

            // Posttest
            expect(client._triggerAsync).toHaveBeenCalledWith(
                "messages:remove", {
                    messages: [message]
                }
            );
        });


        it("Should do nothing if Message not registered", function() {
            // Setup
            var m = conversation.createMessage("h").send();
            delete client._messagesHash[m.id];
            spyOn(client, "trigger");

            // Pretest
            expect(client.getMessage(m.id)).toEqual(undefined);

            // Run
            client._removeMessage(m);

            // Posttest
            expect(client.trigger).not.toHaveBeenCalled();
        });
    });

    describe("The _updateMessageId() method", function() {
        var conversation;
        var message;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = conversation.createMessage("hello").send();
        });

        it("Should register the Message under the new id", function() {
            // Setup
            var id = message.id;

            // Run
            message.id = "fred";
            client._updateMessageId(message, id);

            // Posttest
            expect(client.getMessage("fred")).toBe(message);
        });

        it("Should still allow lookup of the old id for a while", function() {
            // Setup
            var id = message.id;

            // Run
            message.id = "fred";
            client._updateMessageId(message, id);

            // Posttest
            expect(client.getMessage(id)).toBe(message);
        });

        it("Should deregister the old id", function() {
           // Setup
            var id = message.id;

            // Run
            message.id = "fred";
            client._updateMessageId(message, id);
            jasmine.clock().tick(100000);

            // Posttest
            expect(client.getMessage(id)).toBe(undefined);
        });
    });

    describe("The _getObject() method", function() {
        var message, conversation, query;
        beforeEach(function() {
            conversation = client.createConversation(["a"]);
            message = conversation.createMessage("hey").send();
            query = client.createQuery({
                model: "Conversation"
            });
        });

        // This test validates our inital state before running tests,
        // and is not a unit test.
        it("Should have suitable initial states", function() {
            var cHash = {},
                mHash = {},
                qHash = {};
            cHash[conversation.id] = conversation;
            mHash[message.id] = message;
            qHash[query.id] = query;
            expect(client._conversationsHash).toEqual(cHash);
            expect(client._messagesHash).toEqual(mHash);
            expect(client._queriesHash).toEqual(qHash);
        });

        it("Should get a Conversation", function() {
            expect(client._getObject(conversation.id)).toBe(conversation);
        });

        it("Should not get a Conversation", function() {
            expect(client._getObject(conversation.id + "a")).toBe(undefined);
        });

        it("Should get a Message", function() {
            expect(client._getObject(message.id)).toBe(message);
        });

        it("Should not get a Message", function() {
            expect(client._getObject(message.id + "a")).toBe(undefined);
        });

        it("Should get a Query", function() {
            expect(client._getObject(query.id)).toBe(query);
        });

        it("Should not get a Query", function() {
            expect(client._getObject(query.id + "a")).toBe(undefined);
        });

        it("Should not get a non-layer-object", function() {
            expect(client._getObject("Hey")).toBe(undefined);
        });
    });

    describe("The _createObject() method", function() {
        it("Should call Message._createFromServer", function() {
            // Setup
            var tmp = layer.Message._createFromServer;
            var m = client.createConversation(["a"]).createMessage("a").send();
            spyOn(layer.Message, "_createFromServer").and.returnValue(m);
            var messageObj = JSON.parse(JSON.stringify(responses.message1));

            // Run
            var message = client._createObject(messageObj);

            // Posttest
            expect(message).toBe(m);
            expect(layer.Message._createFromServer).toHaveBeenCalledWith(messageObj, jasmine.any(layer.Conversation));
            expect(layer.Message._createFromServer).toHaveBeenCalledWith(messageObj, jasmine.objectContaining({
                id: messageObj.conversation.id
            }));

            // Restore
            layer.Message._createFromServer = tmp;
        });

        it("Should call Conversation._createFromServer", function() {
            // Setup
            var tmp = layer.Conversation._createFromServer;
            var c = new layer.Conversation({});
            spyOn(layer.Conversation, "_createFromServer").and.returnValue(c);
            var conversationObj = JSON.parse(JSON.stringify(responses.conversation1));

            // Run
            var conversation = client._createObject(conversationObj);

            // Posttest
            expect(conversation).toBe(c);
            expect(layer.Conversation._createFromServer).toHaveBeenCalledWith(conversationObj, client);

            // Restore
            layer.Conversation._createFromServer = tmp;
        });
    });

    describe("The _processDelayedTriggers() method", function() {

        it("Should call _foldEvents on all conversations:add events", function() {
            // Setup
            var c1 = new layer.Conversation();
            var c2 = new layer.Conversation();
            client._triggerAsync("conversations:a", {value: "a"});
            client._triggerAsync("conversations:b", {value: "b"});
            client._triggerAsync("conversations:add", {conversations: [c1]});
            client._triggerAsync("conversations:add", {conversations: [c2]});
            client._triggerAsync("conversations:c", {value: "c"});
            spyOn(client, "_foldEvents");

            // Run
            client._processDelayedTriggers();

            // Posttest
            expect(client._foldEvents)
                .toHaveBeenCalledWith([
                    ["conversations:add", jasmine.objectContaining({
                        conversations: [c1]
                    })],
                    ["conversations:add", jasmine.objectContaining({
                        conversations: [c2]
                    })]
                ], "conversations", client);
        });

        it("Should call _foldEvents on all conversations:remove events", function() {
            // Setup
            var c1 = new layer.Conversation();
            var c2 = new layer.Conversation();
            client._triggerAsync("conversations:a", {value: "a"});
            client._triggerAsync("conversations:b", {value: "b"});
            client._triggerAsync("conversations:remove", {conversations: [c1]});
            client._triggerAsync("conversations:remove", {conversations: [c2]});
            client._triggerAsync("conversations:c", {value: "c"});
            spyOn(client, "_foldEvents");

            // Run
            client._processDelayedTriggers();

            // Posttest
            expect(client._foldEvents)
                .toHaveBeenCalledWith([
                    ["conversations:remove", jasmine.objectContaining({
                        conversations: [c1]
                    })],
                    ["conversations:remove", jasmine.objectContaining({
                        conversations: [c2]
                    })]
                ], "conversations", client);
        });

        it("Should call _foldEvents on all messages:add events", function() {
            // Setup
            var c1 = client.createConversation(["a"]);
            var m1 = new layer.Message({clientId: client.appId, parts: "a"});
            var m2 = new layer.Message({clientId: client.appId, parts: "b"});
            client._delayedTriggers = [];
            client._triggerAsync("messages:a", {value: "a"});
            client._triggerAsync("messages:b", {value: "b"});
            client._triggerAsync("messages:add", {messages: [m1]});
            client._triggerAsync("messages:add", {messages: [m2]});
            client._triggerAsync("messages:c", {value: "c"});
            spyOn(client, "_foldEvents");

            // Run
            client._processDelayedTriggers();

            // Posttest
            expect(client._foldEvents)
                .toHaveBeenCalledWith([
                    ["messages:add", jasmine.objectContaining({
                        messages: [m1]
                    })],
                    ["messages:add", jasmine.objectContaining({
                        messages: [m2]
                    })]
                ], "messages", client);
        });

        it("Should call _foldEvents on all messages:remove events", function() {
            // Setup
            var c1 = client.createConversation(["a"]);
            var m1 = new layer.Message({clientId: client.appId, parts: "a"});
            var m2 = new layer.Message({clientId: client.appId, parts: "b"});
            client._delayedTriggers = [];
            client._triggerAsync("messages:a", {value: "a"});
            client._triggerAsync("messages:b", {value: "b"});
            client._triggerAsync("messages:remove", {messages: [m1]});
            client._triggerAsync("messages:remove", {messages: [m2]});
            client._triggerAsync("messages:c", {value: "c"});
            spyOn(client, "_foldEvents");

            // Run
            client._processDelayedTriggers();

            // Posttest
            expect(client._foldEvents)
                .toHaveBeenCalledWith([
                    ["messages:remove", jasmine.objectContaining({
                        messages: [m1]
                    })],
                    ["messages:remove", jasmine.objectContaining({
                        messages: [m2]
                    })]
                ], "messages", client);
        });
    });

    describe("The findCachedConversation() method", function() {
        var c1, c2, c3;
        beforeEach(function() {
            c1 = client.createConversation({
                participants: ["a"],
                metadata: {
                    b: "c"
                }
            });
            c2 = client.createConversation({
                participants: ["b"],
                metadata: {
                    d: "e"
                }
            });
            c3 = client.createConversation({
                participants: ["c"]
            });

        });

        it("Should call the callback with each Conversation", function() {
            // Setup
            var spy = jasmine.createSpy('spy');

            // Run
            client.findCachedConversation(spy);

            // Posttest
            expect(spy).toHaveBeenCalledWith(c1, 0);
            expect(spy).toHaveBeenCalledWith(c2, 1);
            expect(spy).toHaveBeenCalledWith(c3, 2);
        });

        it("Should call the callback with correct context", function() {
            // Setup
            var d = new Date();

            // Run
            client.findCachedConversation(function(conversation) {
                expect(this).toBe(d);
            }, d);
        });

        it("Should return undefined if no matches", function() {
            // Run
            var result = client.findCachedConversation(function(conversation) {
                return false;
            });

            // Posttest
            expect(result).toBe(undefined);
        });

        it("Should return matching Conversation", function() {
            // Run
            var result = client.findCachedConversation(function(conversation) {
                return conversation.participants.indexOf("b") != -1;
            });

            // Posttest
            expect(result).toBe(c2);
        });
    });

    describe("The _resetSession() method", function() {
        it("Should call _cleanup", function() {
            // Setup
            spyOn(client, "_cleanup");

            // Run
            client._resetSession();

            // Posttest
            expect(client._cleanup).toHaveBeenCalled();
        });

        it("Should reset conversation data", function() {
            // Setup
            client.createConversation(["a"]);

            // Run
            client._resetSession();

            // Posttest
            expect(client._conversationsHash).toEqual({});
        });

        it("Should reset message data", function() {
            // Setup
            client.createConversation(["a"]).createMessage("Hi").send();

            // Run
            client._resetSession();

            // Posttest
            expect(client._messagesHash).toEqual({});
        });

        it("Should reset query data", function() {
            // Setup
            client.createQuery({model: "Conversation"});

            // Run
            client._resetSession();

            // Posttest
            expect(client._queriesHash).toEqual({});
        });

        it("Should reset user data", function() {
            // Setup
            client.users.push(new layer.User({}));

            // Run
            client._cleanup();

            // Posttest
            expect(client.users).toEqual([]);

            // Sanitize
            client._conversationsHash = {};
            client._messagesHash = {};
            client._queriesHash = {};
        });
    });

    describe("The addUser() method", function() {
        it("Should add the user to the users array", function() {
            var u = new layer.User({});
            client.addUser(u);
            expect(client.users).toEqual([u]);
        });

        it("Should call setClient", function() {
            // Setup
            var u = new layer.User({});
            spyOn(u, "setClient");

            // Run
            client.addUser(u);

            // Posttest
            expect(u.setClient).toHaveBeenCalledWith(client);
        });

        it("Should trigger a users:change event", function() {
            spyOn(client, "trigger");
            var u = new layer.User({});
            client.addUser(u);
            expect(client.trigger).toHaveBeenCalledWith("users:change");
        });
    });

    describe("The findUser() method", function() {
        it ("Should find a user with the specified ID", function(){
            var u1 = new layer.User({id: "a"});
            var u2 = new layer.User({id: "b"});
            client.addUser(u1);
            client.addUser(u2);
            expect(client.findUser("b")).toBe(u2);
        });
    });

    describe("The createConversation() method", function() {
        var createMethod;
        beforeEach(function() {
             createMethod = layer.Conversation.create;
             spyOn(layer.Conversation, "create").and.returnValue(5);
        });

        afterEach(function() {
            layer.Conversation.create = createMethod;
        });

        it("Should create a conversation with just a participant array", function() {
            // Run
            var c = client.createConversation(["a","z"]);

            // Posttest
            expect(layer.Conversation.create).toHaveBeenCalledWith({
                participants: ["a", "z"],
                distinct: true,
                client: client
            });
        });

        it("Should create a conversation with a full object", function() {
            // Run
            var c = client.createConversation({participants: ["a","z"]});

            // Posttest
            expect(layer.Conversation.create).toHaveBeenCalledWith({
                participants: ["a", "z"],
                distinct: true,
                client: client
            });
        });

         it("Should create a conversation with a full object", function() {
            // Run
            var c = client.createConversation({
              participants: ["a","z"],
              distinct: false
            });

            // Posttest
            expect(layer.Conversation.create).toHaveBeenCalledWith({
                participants: ["a", "z"],
                distinct: false,
                client: client
            });
        });

        it("Should return the new conversation", function() {
             // Run
            var c = client.createConversation(["a","z"]);

            // Posttest
            expect(c).toEqual(5);
        });
    });

    describe("The createQuery() method", function() {
        it("Should return a Query from options", function() {
            var query = client.createQuery({
                model: "Conversation"
            });

            expect(query).toEqual(jasmine.any(layer.Query));
            expect(query.client).toBe(client);
            expect(query.model).toEqual("Conversation");
        });

        it("Should return a Query from QueryBuilder", function() {
            var query = client.createQuery(layer.QueryBuilder.conversations());

            expect(query).toEqual(jasmine.any(layer.Query));
            expect(query.client).toBe(client);
            expect(query.model).toEqual("Conversation");
        });

        it("Should call _addQuery", function() {
            spyOn(client, "_addQuery");
            var query = client.createQuery({
                model: "Conversation"
            });
            expect(client._addQuery).toHaveBeenCalledWith(query);
        });
    });

    describe("The getQuery() method", function() {
        it("Should throw an error if an invalid id is passed in", function() {
            expect(function() {
                client.getQuery(5);
            }).toThrowError(layer.LayerError.dictionary.idParamRequired);
            expect(layer.LayerError.dictionary.idParamRequired.length > 0).toEqual(true);
        });

        it("Should return a Query if it exists", function() {
            var q = client.createQuery({
                model: "Conversation"
            });
            expect(client.getQuery(q.id)).toBe(q);
        });

        it("Should return undefined if it does not exist", function() {
            var q = client.createQuery({
                model: "Conversation"
            });
            expect(client.getQuery(q.id + "1")).toBe(undefined);
        });
    });

    // TODO: May want to break these up, but they form a fairly simple self contained test
    describe("The _checkCache(), _isCachedObject and _removeObject methods", function() {
        it("Should keep Conversations if they are in a Query and remove all others", function() {
            // Setup
            var query = client.createQuery({model: layer.Query.Conversation});
            var c1 = client.createConversation(["a"]);
            var c2 = client.createConversation(["b"]);
            var c3 = client.createConversation(["c"]);
            query.data = [c1, c3];

            // Pretest
            expect(Object.keys(client._conversationsHash))
                .toEqual(jasmine.arrayContaining([c1.id, c2.id, c3.id]));

            // Run
            client._checkCache([c1, c2, c3]);

            // Posttest
            expect(Object.keys(client._conversationsHash)).toEqual(jasmine.arrayContaining([c1.id, c3.id]));
        });

        it("Should keep Messages if they are in a Query and remove all others", function() {
            // Setup
            var c = client.createConversation(["a"]);
            var query = client.createQuery({
                model: layer.Query.Message,
                predicate: "conversation.id = '" + c.id + "'"
            });
            var m1 = c.createMessage("a").send();
            var m2 = c.createMessage("b").send();
            var m3 = c.createMessage("c").send();
            jasmine.clock().tick(1);

            // Pretest
            expect(query.data).toEqual([m3, m2, m1]);

            query.data = [m1, m3];

            // Pretest
            expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m1.id, m2.id, m3.id]));

            // Run
            client._checkCache([m1, m2, m3]);

            // Posttest
            expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m1.id, m3.id]));
        });

        it("Should keep Messages if they are in a Query's lastMessage and remove all others", function() {
            // Setup
            var cQuery = client.createQuery({model: layer.Query.Conversation});
            var c = client.createConversation(["a"]);
            var query = client.createQuery({
                model: layer.Query.Message,
                predicate: "conversation.id = '" + c.id + "'"
            });
            var m1 = c.createMessage("a").send();
            var m2 = c.createMessage("b").send();
            var m3 = c.createMessage("c").send();
            c.lastMessage = m3;
            query.data = [];
            cQuery.data = [c];

            // Run
            client._checkCache([m1, m2, m3]);

            // Posttest
            expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m3.id]));
        });
    });

    describe("The _removeQuery() method", function() {
        var query;
        beforeEach(function() {
            query = client.createQuery({model: "Conversation"});
        });

        it("Should call _checkCache", function() {
            spyOn(client, "_checkCache");
            client._removeQuery(query);
            expect(client._checkCache).toHaveBeenCalledWith([]);
        });

        it("Should remove the query from cache", function() {
            expect(client.getQuery(query.id)).toBe(query);
            client._removeQuery(query);
            expect(client.getQuery(query.id)).toBe(undefined);
        });

        it("Should do nothing if no query", function() {
            expect(function() {
                client._removeQuery();
            }).not.toThrow();
        });
    });

    describe("The _connectionRestored() method", function() {
      var q1, q2, conversation;
      beforeEach(function() {
         conversation = client.createConversation(["a"]);
         q1 = client.createQuery({model: "Conversation"});
         q2 = client.createQuery({model: "Message", predicate: 'conversation.id = \'' + conversation.id + '\''});
      });

      it("Should call reset on all queries if duration was large", function() {
        spyOn(q1, "reset");
        spyOn(q2, "reset");

        // Run
        client.trigger('online', {
          isOnline: true,
          reset: true
        });

        // Posttest
        expect(q1.reset).toHaveBeenCalledWith();
        expect(q2.reset).toHaveBeenCalledWith();
      });

      it("Should not call reset on all queries if duration was small", function() {
        spyOn(q1, "reset");
        spyOn(q2, "reset");

        // Run
        client.trigger('online', {
          isOnline: true,
          reset: false
        });

        // Posttest
        expect(q1.reset).not.toHaveBeenCalled();
        expect(q2.reset).not.toHaveBeenCalled();

      });

    });

    describe("The createTypingListener() method", function() {
        it("Should return a layer.TypingListener.TypingListener", function() {
            var input = document.createElement("input");
            expect(client.createTypingListener(input)).toEqual(jasmine.any(layer.TypingIndicators.TypingListener));
        });

        it("Should get a proper websocket property", function() {
            var input = document.createElement("input");
            expect(client.createTypingListener(input).websocket).toBe(client.socketManager);
        });

        it("Should get a proper input property", function() {
            var input = document.createElement("input");
            expect(client.createTypingListener(input).input).toBe(input);
        });
    });

    describe("The createTypingPublisher() method", function() {
        it("Should return a layer.TypingListener.TypingPublisher", function() {
            expect(client.createTypingPublisher()).toEqual(jasmine.any(layer.TypingIndicators.TypingPublisher));
        });

        it("Should get a proper socket", function() {
            expect(client.createTypingPublisher().websocket).toBe(client.socketManager);
        });
    });

    describe("The getClient() static method", function() {
        it("Should get a registered client", function() {
            var client = new layer.Client({
                appId: "test1"
            });
            expect(layer.Client.getClient("test1")).toBe(client);
        });

        it("Should not get an unregistered client", function() {
            var client = new layer.Client({
                appId: "test1"
            });
            expect(layer.Client.getClient("test2")).toBe(undefined);
        });
    });
});