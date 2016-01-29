/* eslint-disable */
describe("The Messages class", function() {
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
            reset: true,
            url: "https://doh.com"
        });
        client.userId = "999";
        conversation = layer.Conversation._createFromServer(responses.conversation2, client).conversation;

        requests.reset();
        jasmine.clock().tick(1);
        client._clientReady();
    });
    afterEach(function() {
        if (client) client.destroy();
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        var message;
        beforeEach(function() {
            message = new layer.Message({
                parts: [{body: "Hello There", mimeType: "text/plain"}],
                client: client
            });
        });
        afterEach(function() {
            message.destroy();
        });

        it("Should create a default recipientStatus value", function() {
            expect(message.recipientStatus).toEqual({});
        });

        it("Should create a default sentAt value", function() {
            expect(message.sentAt).toEqual(jasmine.any(Date));
        });

        it("Should create a default sender value", function() {
            expect(message.sender).toEqual({
                userId: "",
                name: ""
            });
        });


        it("Should create a localCreatedAt value", function() {
            expect(message.localCreatedAt).toEqual(jasmine.any(Date));
        });


        it("Should create a parts value", function() {
            // Run
            var m = new layer.Message({
                client: client
            });

            // Posttest
            expect(m.parts).toEqual([]);
        });

        it("Should be created with a string for a part", function() {
            // Run
            var m = new layer.Message({
                parts: "Hello There",
                client: client
            });

            // Posttest
            expect(m.parts).toEqual([jasmine.objectContaining({
                body: "Hello There",
                mimeType: "text/plain"
            })]);
        });

        it("Should be created with a Part", function() {
            // Run
            var m = new layer.Message({
                parts: new layer.MessagePart({
                    body: "Hello There",
                    mimeType: "text/greeting"
                }),
                client: client
            });

            // Posttest
            expect(m.parts).toEqual([jasmine.objectContaining({
                body: "Hello There",
                mimeType: "text/greeting",
                clientId: m.clientId
            })]);
        });

        it("Should be created with array of parts", function() {
            // Run
            var m = new layer.Message({
                parts: [new layer.MessagePart({
                    body: "Hello There",
                    mimeType: "text/greeting"
                })],
                client: client
            });

            // Posttest
            expect(m.parts).toEqual([jasmine.objectContaining({
                body: "Hello There",
                mimeType: "text/greeting",
                clientId: m.clientId
            })]);
        });

        it("Should be created with array of mixed", function() {
            // Run
            var m = new layer.Message({
                parts: ["Hello There 1", {
                    body: "Hello There 2",
                    mimeType: "text/greeting"
                }],
                client: client
            });

            // Posttest
            expect(m.parts).toEqual([
                jasmine.objectContaining({
                    body: "Hello There 1",
                    mimeType: "text/plain"
                }),
                jasmine.objectContaining({
                    body: "Hello There 2",
                    mimeType: "text/greeting"
                })
            ]);
        });

        it("Should set isRead = true and isUnread = false for normal call", function() {

            // Posttest
            expect(message.isRead).toBe(true);
            expect(message.isUnread).toBe(false);
        });

        it("Should call _populateFromServer", function() {
            // Setup
            var tmp = layer.Message.prototype._populateFromServer;
            spyOn(layer.Message.prototype, "_populateFromServer");
            var serverDef = {
                sender: {user_id: "fred"},
                is_unread: true,
                parts: []
            };

            // Run
            var m = new layer.Message({
                fromServer: serverDef,
                client: client
            });

            // Posttest
            expect(layer.Message.prototype._populateFromServer).toHaveBeenCalledWith(serverDef);

            // Restore
            layer.Message.prototype._populateFromServer = tmp;
        });

        it("Should call __updateRecipientStatus", function() {
            // Setup
            var tmp = layer.Message.prototype.__updateRecipientStatus;
            spyOn(layer.Message.prototype, "__updateRecipientStatus");
            var serverDef = {
                sender: {user_id: "fred"},
                is_unread: true,
                parts: [],
                recipient_status: {
                    a: "read"
                }
            };

            // Run
            var m = new layer.Message({
                fromServer: serverDef,
                client: client
            });

            // Posttest
            expect(layer.Message.prototype.__updateRecipientStatus).toHaveBeenCalledWith(serverDef.recipient_status);

            // Restore
            layer.Message.prototype.__updateRecipientStatus = tmp;
        });

        it("Should register the message if from server", function() {
            // Setup
            spyOn(client, "_addMessage");

            // Run
            var m = new layer.Message({
                client: client,
                fromServer: responses.message1,
            });

            // Posttest
            expect(client._addMessage).toHaveBeenCalledWith(m);
        });

        it("Should register the message if unsent", function() {
            // Setup
            spyOn(client, "_addMessage");

            // Run
            var m = new layer.Message({
                client: client,
                parts: "hey"
            });

            // Posttest
            expect(client._addMessage).not.toHaveBeenCalledWith(m);
        });

        it("Should get a conversationId", function() {
            var m = new layer.Message({
                conversation: conversation,
                client: client
            });
            expect(m.conversationId).toEqual(conversation.id);
        });

        it("Should get a clientId", function() {
            var m = new layer.Message({
                client: client
            });
            expect(m.clientId).toEqual(client.appId);
        });
    });

    describe("The getClient() method", function() {
        it("Should return the client", function() {
            var m = new layer.Message({
                client: client
            });
            expect(m.getClient()).toEqual(client);
        });

        it("Should return nothing", function() {
            var m = new layer.Message({
                clientId: client.appId
            });
            m.clientId += 'a';
            expect(m.getClient()).toEqual(undefined);

            // Restore
            m.clientId = client.appId;
        });
    });

    describe("The getConversation() method", function() {
        it("Should return the client", function() {
            var m = new layer.Message({
                conversation: conversation,
                client: client
            });
            expect(m.getConversation()).toEqual(conversation);
        });

        it("Should return nothing", function() {
            var m = new layer.Message({
                conversationId: conversation.id + 'a',
                client: client
            });
            expect(m.getConversation()).toEqual(undefined);
        });
    });

    // Tested via constructor so no tests at this time
    describe("The __adjustParts() method", function() {


    });

    describe("The addPart() method", function() {
        var message;
        beforeEach(function() {
            message = new layer.Message({
                parts: [{body: "Hello There", mimeType: "text/plain"}],
                client: client,
                clientId: client.appId
            });
        });

        afterEach(function() {
            message.destroy();
        });

        it("Should add an object part", function() {
            // Pretest
            expect(message.parts).toEqual([jasmine.objectContaining({
                body: "Hello There",
                mimeType: "text/plain",
                clientId: message.clientId
            })]);

            // Run
            message.addPart({
                body: "ho",
                mimeType: "text/ho"
            });

            // Posttest
            expect(message.parts).toEqual([
                jasmine.objectContaining({
                    body: "Hello There",
                    mimeType: "text/plain",
                    clientId: message.clientId
                }),
                jasmine.objectContaining({
                    body: "ho",
                    mimeType: "text/ho",
                    clientId: message.clientId
                })
            ]);
        });

        it("Should add an instance part", function() {
            // Pretest
            expect(message.parts).toEqual([jasmine.objectContaining({
                body: "Hello There",
                mimeType: "text/plain",
                clientId: message.clientId
            })]);

            // Run
            message.addPart(new layer.MessagePart({
                body: "ho",
                mimeType: "text/ho"
            }));

            // Posttest
            expect(message.parts).toEqual([
                jasmine.objectContaining({
                    body: "Hello There",
                    mimeType: "text/plain",
                    clientId: message.clientId
                }),
                jasmine.objectContaining({
                    body: "ho",
                    mimeType: "text/ho",
                    clientId: message.clientId
                })
            ]);
        });
    });

    describe("The _getReceiptStatus() method", function() {
        var message;
        beforeEach(function() {
            message = new layer.Message({
                parts: [{body: "Hello There", mimeType: "text/plain"}],
                client: client
            });
        });
        afterEach(function() {
            message.destroy();
        });

        it("Should return 4 readCount, 4 deliveredCount ignoring logged in user", function() {
            expect(message._getReceiptStatus({
                a: "read",
                b: "read",
                c: "read",
                d: "read",
                "999": "read"
            }, "999")).toEqual({
                readCount: 4,
                deliveredCount: 4
            });
        });

        it("Should return 2 readCount, 4 deliveredCount ignoring logged in user", function() {
            expect(message._getReceiptStatus({
                a: "delivered",
                b: "delivered",
                c: "read",
                d: "read",
                "999": "read"
            }, "999")).toEqual({
                readCount: 2,
                deliveredCount: 4
            });
        });

        it("Should return 3 readCount, 5 deliveredCount if no logged user", function() {
            expect(message._getReceiptStatus({
                a: "delivered",
                b: "delivered",
                c: "read",
                d: "read",
                "999": "read"
            }, "")).toEqual({
                readCount: 3,
                deliveredCount: 5
            });
        });

        it("Should return 0 readCount, 1 deliveredCount ignoring logged in user", function() {
            expect(message._getReceiptStatus({
                a: "sent",
                b: "delivered",
                c: "sent",
                d: "sent",
                "999": "sent"
            }, "999")).toEqual({
                readCount: 0,
                deliveredCount: 1
            });
        });
    });

    describe("The __updateRecipientStatus() method", function() {
        var m;
        beforeEach(function() {
            conversation.participants = ["a","b","d","999"];
            m = new layer.Message({
                parts: "hello",
                conversation: conversation,
                client: client
            });
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should allow the recipientStatus property to update", function() {
            // Run
            m.recipientStatus = {
                z: "sent"
            };

            // Posttest
            expect(m.recipientStatus).toEqual({z: "sent"});
        });

        it("Should set isRead/isUnread", function() {
            // Setup
            m.isRead = false;

            // Pretest
            expect(m.isRead).toEqual(false);
            expect(m.isUnread).toEqual(true);

            // Run
            m.recipientStatus = {999: "read"};

            // Posttest
            expect(m.isRead).toEqual(true);
            expect(m.isUnread).toEqual(false);
        });

        it("Should call _setReceiptStatus", function() {
            // Setup
            spyOn(m, "_setReceiptStatus");

            // Run
            m.recipientStatus = {999: "read", a: "sent", b: "delivered", c: "read"};

            // Posttest
            expect(m._setReceiptStatus).toHaveBeenCalledWith(1, 2, 3);
        });

        it("Should trigger change events if this user was sender and another users status changes", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            m.sender.userId = client.userId;
            m.__recipientStatus = {999: "read", a: "sent", b: "delivered", c: "delivered"};
            m.__recipientStatus[client.userId] = "read";
            var oldValue = m.__recipientStatus;

            // Run
            m.recipientStatus = {999: "read", a: "sent", b: "delivered", c: "read"};

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:change", {
                oldValue: oldValue,
                newValue: {999: "read", a: "sent", b: "delivered", c: "read"},
                property: "recipientStatus"
            })
        });

        it("Should not trigger change events if this user was NOT sender and another users status changes", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            m.sender.userId = 'a';
            m.__recipientStatus = {999: "read", a: "sent", b: "delivered", c: "delivered"};
            m.__recipientStatus[client.userId] = "read";
            var oldValue = m.__recipientStatus;

            // Run
            m.recipientStatus = {999: "read", a: "sent", b: "delivered", c: "read"};

            // Posttest
            expect(m._triggerAsync).not.toHaveBeenCalled();
        });

        it("Should trigger change events if this user was not the sender and this users status changes to read", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            m.sender.userId = 'a';
            m.__recipientStatus = {999: "read", a: "sent", b: "delivered", c: "delivered"};
            m.__recipientStatus[client.userId] = "delivered";
            var oldValue = m.__recipientStatus;

            var newValue = JSON.parse(JSON.stringify(oldValue));
            newValue[client.userId] = "read";

            // Run
            m.recipientStatus = newValue;

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:change", {
                oldValue: oldValue,
                newValue: newValue,
                property: "recipientStatus"
            })
        });

        it("Should not trigger change events if this user was sender and this users status changes to delivered", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            m.sender.userId = 'a';
            m.__recipientStatus = {999: "read", a: "sent", b: "delivered", c: "delivered"};
            m.__recipientStatus[client.userId] = "sent";
            var oldValue = m.__recipientStatus;

            var newValue = JSON.parse(JSON.stringify(oldValue));
            newValue[client.userId] = "delivered";

            // Run
            m.recipientStatus = newValue;

            // Posttest
            expect(m._triggerAsync).not.toHaveBeenCalled();
        });
    });

    describe("The _setReceiptStatus() method", function() {
        var m;
        beforeEach(function() {
            conversation.participants = ["a","b","d","999"];
            m = new layer.Message({
                parts: "hello",
                conversation: conversation,
                client: client
            });
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should set deliveryStatus to none", function() {
            // Pretest
            m.deliveryStatus = layer.Constants.RECIPIENT_STATE.SOME;

            // Run
            m._setReceiptStatus(0, 0, 10)

            // Posttest
            expect(m.deliveryStatus).toEqual(layer.Constants.RECIPIENT_STATE.NONE);
        });

        it("Should set deliveryStatus to some", function() {
            // Pretest
            m.deliveryStatus = layer.Constants.RECIPIENT_STATE.NONE;

            // Run
            m._setReceiptStatus(0, 3, 10)

            // Posttest
            expect(m.deliveryStatus).toEqual(layer.Constants.RECIPIENT_STATE.SOME);
        });

        it("Should set deliveryStatus to some if read", function() {
            // Pretest
            m.deliveryStatus = layer.Constants.RECIPIENT_STATE.NONE;

            // Run
            m._setReceiptStatus(3, 3, 10)

            // Posttest
            expect(m.deliveryStatus).toEqual(layer.Constants.RECIPIENT_STATE.SOME);
        });

        it("Should set deliveryStatus to all", function() {
            // Pretest
            m.deliveryStatus = layer.Constants.RECIPIENT_STATE.NONE;

            // Run
            m._setReceiptStatus(0, 10, 10)

            // Posttest
            expect(m.deliveryStatus).toEqual(layer.Constants.RECIPIENT_STATE.ALL);
        });



        it("Should set readStatus to none", function() {
            // Pretest
            m.readStatus = layer.Constants.RECIPIENT_STATE.SOME;

            // Run
            m._setReceiptStatus(0, 3, 10)

            // Posttest
            expect(m.readStatus).toEqual(layer.Constants.RECIPIENT_STATE.NONE);
        });

        it("Should set readStatus to some", function() {
            // Pretest
            m.readStatus = layer.Constants.RECIPIENT_STATE.NONE;

            // Run
            m._setReceiptStatus(3, 5, 10)

            // Posttest
            expect(m.readStatus).toEqual(layer.Constants.RECIPIENT_STATE.SOME);
        });

        it("Should set readStatus to none if delivered", function() {
            // Pretest
            m.readStatus = layer.Constants.RECIPIENT_STATE.SOME;

            // Run
            m._setReceiptStatus(0, 10, 10)

            // Posttest
            expect(m.readStatus).toEqual(layer.Constants.RECIPIENT_STATE.NONE);
        });

        it("Should set readStatus to all", function() {
            // Pretest
            m.readStatus = layer.Constants.RECIPIENT_STATE.NONE;

            // Run
            m._setReceiptStatus(10, 10, 10)

            // Posttest
            expect(m.readStatus).toEqual(layer.Constants.RECIPIENT_STATE.ALL);
        });
    });

    describe("The __updateIsRead() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
            m.isRead = false;
            jasmine.clock().tick(1);
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should send a read receipt if changed to true", function() {
            // Setup
            spyOn(m, "_sendReceipt");

            // Run
            m.isRead = true;

            // Posttest
            expect(m._sendReceipt).toHaveBeenCalledWith("read");
        });

        it("Should trigger messages:read if changed to true", function() {
            // Setup
            spyOn(m, "_triggerAsync");

            // Run
            m.isRead = true;

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:read");
        });

        it("Should do nothing if already true", function() {
            // Setup
            m.isRead = true;
            spyOn(m, "sendReceipt");

            // Run
            m.isRead = true;

            // Posttest
            expect(m.sendReceipt).not.toHaveBeenCalled();
        });

        it("Should do nothing if changed to false", function() {
            // Setup
            m.isRead = true;
            spyOn(m, "sendReceipt");
            spyOn(m, "_triggerAsync");

            // Run
            m.isRead = false;

            // Posttest
            expect(m.sendReceipt).not.toHaveBeenCalled();
            expect(m._triggerAsync).not.toHaveBeenCalled();
        });

        it("Should update isUnread", function() {
            // Pretest
            expect(m.isUnread).toEqual(true);

            // Run
            m.isRead = true;

            // Posttest
            expect(m.isUnread).toEqual(false);
        });

        it("Should update conversation unreadCount", function() {
          conversation.unreadCount = 5;
          m.isRead = true;
          expect(conversation.unreadCount).toEqual(4);
          m.isRead = true;
          expect(conversation.unreadCount).toEqual(4);
        });
    });

    describe("The sendReceipt() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should call _xhr", function() {
            // Setup
            spyOn(m, "_xhr");

            // Run
            m.sendReceipt("delivery");

            // Posttest
            expect(m._xhr).toHaveBeenCalledWith({
                  url: '/receipts',
                  method: 'POST',
                  data: {
                    type: "delivery"
                  },
                  sync: {
                    // This should not be treated as a POST/CREATE request on the Message
                    operation: 'RECEIPT',
                  },
                },
                jasmine.any(Function)
            );
        });

        it("Should not call _xhr if not a participant", function() {
            conversation.participants = [];
            spyOn(m, "_xhr");
            m.sendReceipt("delivery");
            expect(m._xhr).not.toHaveBeenCalled();
        });

        it("Should call _setSyncing", function() {
            // Setup
            spyOn(m, "_setSyncing");

            // Run
            m.sendReceipt("delivery");

            // Posttest
            expect(m._setSyncing).toHaveBeenCalled();
        });

        it("Should call _setSynced", function() {
            // Setup
            spyOn(m, "_setSynced");

            // Run
            m.sendReceipt("delivery");
            requests.mostRecent().response({
                status: 204
            });

            // Posttest
            expect(m._setSynced).toHaveBeenCalled();
        });

        it("Should set isRead and isUnread", function() {
            m.isRead = false;
            expect(m.isRead).toBe(false);
            expect(m.isUnread).toBe(true);

            // Run
            m.sendReceipt("read");

            // Posttest
            expect(m.isRead).toBe(true);
            expect(m.isUnread).toBe(false);
        });

        it("Should trigger messages:read event on sending read receipt", function() {
            m.isRead = false;
            spyOn(m, "_triggerAsync");

            // Run
            m.sendReceipt("read");

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:read");
        });

        it("Should do nothing if isRead is true", function() {
            m.isRead = true;
            spyOn(m, "_xhr");
            spyOn(m, "_triggerAsync");

            // Run
            m.sendReceipt("read");

            // Posttest
            expect(m._xhr).not.toHaveBeenCalled();
            expect(m._triggerAsync).not.toHaveBeenCalled();
        });

        it("Should not set isRead and isUnread if delivery receipt", function() {
            m.isRead = false;
            expect(m.isRead).toBe(false);
            expect(m.isUnread).toBe(true);

            // Run
            m.sendReceipt("delivery");

            // Posttest
            expect(m.isRead).toBe(false);
            expect(m.isUnread).toBe(true);
        });
    });



    describe("The send() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should fail if there is no conversation or client", function() {
            delete m.conversationId;

            // Run
            expect(function() {
                m.send();
            }).toThrowError(layer.LayerError.dictionary.conversationMissing);
        });

        it("Should fail if its sending or sent", function() {
            m._setSyncing();
            expect(function() {
                m.send();
            }).toThrowError(layer.LayerError.dictionary.alreadySent);

            m._setSynced();
            expect(function() {
                m.send();
            }).toThrowError(layer.LayerError.dictionary.alreadySent);
        });

        it("Should fail if there are no parts", function() {
            m.parts = [];
            expect(function() {
                m.send();
            }).toThrowError(layer.LayerError.dictionary.partsMissing);
        });

        it("Should set isSending", function() {
            expect(m.isSending).toBe(false);
            m.send();
            expect(m.isSending).toBe(true);
        });

        it("Should register the message if from server", function() {
            // Setup
            spyOn(client, "_addMessage");

            // Run
            m.send();

            // Posttest
            expect(client._addMessage).toHaveBeenCalledWith(m);
        });

        it("Should call _preparePartsForSending with no notification property", function() {
            spyOn(m, "_preparePartsForSending");
            m.send();
            expect(m._preparePartsForSending).toHaveBeenCalledWith({
                parts: new Array(1)
            });
        });

        it("Should call _preparePartsForSending with a notification property", function() {
            spyOn(m, "_preparePartsForSending");
            m.send({
                sound: "doh.aiff",
                text: "Doh!"
            });
            expect(m._preparePartsForSending).toHaveBeenCalledWith({
                parts: new Array(1),
                notification: {
                    sound: "doh.aiff",
                    text: "Doh!"
                }
            });
        });

        it("Should set sender.userId", function() {
            // Setup
            spyOn(client, "sendSocketRequest");

            // Run
            m.send();

            // Posttest
            expect(m.sender.userId).toEqual(client.userId);
        });

        it("Should trigger messages:sending", function() {
            // Setup
            spyOn(m, "trigger");
            spyOn(client, "sendSocketRequest");

            // Run
            m.send();
            jasmine.clock().tick(1);

            // Posttest
            expect(m.trigger).toHaveBeenCalledWith("messages:sending");
        });
    });

    describe("The _preparePartsForSending() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
            m.addPart({body: "there", mimeType: "text/plain"});
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should call parts.send on all parts", function() {
            // Setup
            spyOn(m.parts[0], "_send");
            spyOn(m.parts[1], "_send");

            // Run
            m._preparePartsForSending({parts: [null, null]});

            // Posttest
            expect(m.parts[0]._send).toHaveBeenCalledWith(client);
            expect(m.parts[1]._send).toHaveBeenCalledWith(client);
        });

        it("Should copy in part data on receiving a parts:send event and call send", function() {
            // Setup
            spyOn(m, "_send");

            // Run
            m._preparePartsForSending({parts: [null, null]});
            m.parts[0].trigger("parts:send", {
                mime_type: "actor/mime",
                body: "I am a Mime"
            });
            m.parts[1].trigger("parts:send", {
                mime_type: "actor/mimic",
                body: "I am a Mimic"
            });

            // Posttest
            expect(m._send).toHaveBeenCalledWith({
                parts: [{
                    mime_type: "actor/mime",
                    body: "I am a Mime"
                }, {
                    mime_type: "actor/mimic",
                    body: "I am a Mimic"
                }]
            });
        });
    });

    describe("The _send() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
            m.addPart({body: "there", mimeType: "text/plain"});
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should call _setSyncing", function() {
            // Setup
            spyOn(m, "_setSyncing");
            spyOn(client, "sendSocketRequest");

            // Run
            m._send({
                parts: [{
                    mime_type: "actor/mime",
                    body: "I am a Mime"
                }]
            });

            // Posttest
            expect(m._setSyncing).toHaveBeenCalled();
        });

        it("Should call sendSocketRequest", function() {
            // Setup
            spyOn(client, "sendSocketRequest");

            // Run
            m._send({
                parts: [{
                    mime_type: "actor/mime",
                    body: "I am a Mime"
                }]
            });

            // Posttest
            expect(client.sendSocketRequest)
                .toHaveBeenCalledWith({
                    method: 'POST',
                    body: jasmine.any(Function),
                    sync: {
                      target: m.id,
                      depends: jasmine.arrayContaining([m.conversationId, m.id])
                    }
                  }, jasmine.any(Function));
        });
    });

    describe("The _sendResult() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should call _setSynced", function() {
            // Setup
            spyOn(m, "_setSynced");

            // Run
            m._sendResult({success: false});

            // Posttest
            expect(m._setSynced).toHaveBeenCalled();
        });

        it("Should trigger messages:sent-error and then destroy", function() {
            // Setup
            spyOn(m, "trigger");
            spyOn(m, "destroy");

            // Run
            m._sendResult({
                success: false,
                data: "Doh!"
            });

            // Posttest
            expect(m.trigger).toHaveBeenCalledWith("messages:sent-error", { error: "Doh!" });
            expect(m.destroy).toHaveBeenCalled();
        });

        it("Should call _populateFromServer", function() {
            // Setup
            spyOn(m, "_populateFromServer");

            // Run
            m._sendResult({
                success: true,
                data: "hey"
            });

            // Posttest
            expect(m._populateFromServer).toHaveBeenCalledWith("hey");
        });

        it("Should trigger messages:sent", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            spyOn(m, "_populateFromServer");

            // Run
            m._sendResult({
                success: true,
                data: "hey"
            });

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:sent");
        });

        it("Should trigger messages:change", function() {
            // Setup
            spyOn(m, "_triggerAsync");
            var id = m.id;

            // Run
            m._sendResult({
                success: true,
                data: {
                    id: "dohId",
                    sender: {
                        user_id: "999"
                    },
                    parts: [{mime_type: "text/plain", body: "Doh!"}]
                }
            });

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:change", {
                oldValue: id,
                newValue: "dohId",
                property: 'id'
            });
        });
    });

    describe("The on() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            m.destroy();
        });

        it("Should call any callbacks if subscribing to conversations:loaded", function() {
            // Setup
            m.syncState = layer.Constants.SYNC_STATE.SYNCED;
            var spy = jasmine.createSpy("spy");

            // Run
            m.on("messages:loaded", spy);
            jasmine.clock().tick(10);

            // Posttest
            expect(spy).toHaveBeenCalled();
        });

        it("Should call any callbacks if subscribing to ms:loaded via object", function() {
            // Setup
            m.syncState = layer.Constants.SYNC_STATE.SYNCED;
            var spy = jasmine.createSpy("spy");

            // Run
            m.on({
                "messages:loaded": spy
            });
            jasmine.clock().tick(10);

            // Posttest
            expect(spy).toHaveBeenCalled();
        });
    });

    describe("The delete() methods", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
            m.syncState = layer.Constants.SYNC_STATE.SYNCED;
            jasmine.clock().tick(1);
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should fail if already deleting", function() {
            // Setup
            m.delete();

            // Run
            expect(function() {
                m.delete();
            }).toThrowError(layer.LayerError.dictionary.isDestroyed);
        });


        it("Should call _xhr", function() {
            // Setup
            spyOn(m, "_xhr");

            // Run
            m.delete();

            // Posttest
            expect(m._xhr).toHaveBeenCalledWith({
                url: '?destroy=false',
                method: 'DELETE'
            }, jasmine.any(Function));
        });

        it("Should trigger messages:delete", function() {
            // Setup
            spyOn(m, "trigger");

            // Run
            m.delete(true);

            // Posttest
            expect(m.trigger).toHaveBeenCalledWith("messages:delete");
        });

        it("Should destroy the message", function() {

            // Run
            m.delete();

            // Posttest
            expect(m.isDestroyed).toBe(true);
        });

        it("Should load a new copy if deletion fails", function() {
          var tmp = layer.Message.load;
          spyOn(layer.Message, "load");
          spyOn(m, "_xhr").and.callFake(function(args, callback) {
            callback({success: false});
          });


          // Run
          m.delete();

          // Posttest
          expect(m.isDestroyed).toBe(true);
          expect(layer.Message.load).toHaveBeenCalledWith(m.id, client);

          // Cleanup
          layer.Message.load = tmp;
        })
    });

    describe("The destroy() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
            m.addPart({
                body: "Hey",
                mimeType: "text/plain"
            });
            m.send();
            jasmine.clock().tick(1);
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should destroy all parts", function() {
            // Setup
            var p1 = m.parts[0];
            var p2 = m.parts[1];

            // Pretest
            expect(p1.isDestroyed).toBe(false);

            // Run
            m.destroy();

            // Posttest
            expect(p1.isDestroyed).toBe(true);
            expect(p2.isDestroyed).toBe(true);
            expect(m.parts).toBe(null);
        });

        it("Should remove itself from the client", function() {
            // Setup
            spyOn(client, "_removeMessage");

            // Pretest
            expect(client.getMessage(m.id)).toBe(m);

            // Run
            m.destroy();

            // Posttest
            expect(client._removeMessage).toHaveBeenCalledWith(m);
        });

        it("Should trigger destroy", function() {
            // Setup
            var spy = jasmine.createSpy('spy');
            m.on("destroy", spy);

            // Run
            m.destroy();

            // Posttest
            expect(spy).toHaveBeenCalled();
        });

    });

    describe("The _populateFromServer() method", function() {
        var m;

        afterEach(function() {
            if(m && !m.isDestroyed) m.destroy();
        });

        it("Should set the id", function() {
            m = new layer.Message({
                client: client
            });
            m._populateFromServer(responses.message1);
            expect(m.id).toEqual(responses.message1.id);
        });

        it("Should set the url", function() {
            m = new layer.Message({
                client: client
            });
            m._populateFromServer(responses.message1);
            expect(m.url).toEqual(responses.message1.url);
        });

        it("Should set the position", function() {
            m = new layer.Message({
                client: client
            });
            m._populateFromServer(responses.message1);
            expect(m.position).toEqual(responses.message1.position);
            expect(m.position).toEqual(jasmine.any(Number));
        });

        it("Should call __adjustParts", function() {
            // Setup
            m = new layer.Message({
                client: client
            });
            spyOn(m, "__adjustParts");

            // Run
            m._populateFromServer(responses.message1);

            // Posttest
            expect(m.__adjustParts).toHaveBeenCalledWith([
                jasmine.any(layer.MessagePart),
                jasmine.any(layer.MessagePart)
            ]);
        });

        it("Should call MessagePart._createFromServer", function() {
            // Setup
            var tmp = layer.MessagePart._createFromServer;
            m = new layer.Message({
                client: client
            });
            spyOn(layer.MessagePart, "_createFromServer").and.callThrough();

            // Run
            m._populateFromServer(responses.message1);

            // Posttest
            expect(layer.MessagePart._createFromServer).toHaveBeenCalledWith(
                responses.message1.parts[0]
            );

            // Restore
            layer.MessagePart._createFromServer = tmp;
        });

        it("Should call MessagePart._populateFromServer", function() {
            // Setup
            m = new layer.Message({
              client: client,
              fromServer: responses.message1
            });
            spyOn(m.parts[0], "_populateFromServer");
            spyOn(m.parts[1], "_populateFromServer");
            var parts = m.parts;

            // Run
            m._populateFromServer(responses.message1);

            // Posttest
            expect(m.parts[0]).toBe(parts[0]);
            expect(m.parts[1]).toBe(parts[1]);
            expect(m.parts.length).toEqual(2);
            expect(m.parts[0]._populateFromServer).toHaveBeenCalledWith(responses.message1.parts[0]);
            expect(m.parts[1]._populateFromServer).toHaveBeenCalledWith(responses.message1.parts[1]);
        });

        it("Should call __updateRecipientStatus()", function() {
            // Setup
            m = new layer.Message({
                client: client
            });
            spyOn(m, "__updateRecipientStatus");
            var data = JSON.parse(JSON.stringify(responses.message1));

            // Run
            m._populateFromServer(data);

            // Posttest
            expect(m.__updateRecipientStatus).toHaveBeenCalledWith(responses.message1.recipient_status, {});
            expect(m.recipientStatus).toEqual(data.recipient_status);
        });

        it("Should set sender.name", function() {
            m = new layer.Message({
                client: client
            });
            var data = JSON.parse(JSON.stringify(responses.message1));
            m._populateFromServer(data);

            expect(m.sender.userId).toEqual(responses.message1.sender.user_id);
            expect(m.sender.userId.length > 0).toBe(true);
            expect(m.sender.name).toEqual("");
        });

        it("Should set sender.name", function() {
            m = new layer.Message({
                client: client
            });
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.sender = {name: "Fred"};

            m._populateFromServer(data);

            expect(m.sender.name).toEqual("Fred");
            expect(m.sender.userId).toEqual("");
        });

        it("Should call _setSynced", function() {
            // Setup
            m = new layer.Message({
                client: client
            });
            spyOn(m, "_setSynced");

            // Run
            m._populateFromServer(responses.message1);

            // Posttest
            expect(m._setSynced).toHaveBeenCalled();
        });
    });

    // tested by _populateFromServer
    xdescribe("The getPartById() method", function() {});

    describe("The _handlePatchEvent() method", function() {
        it("Should call __updateRecipientStatus", function() {
            // Setup
            var m = new layer.Message({
                client: client
            });
            spyOn(m, "__updateRecipientStatus");

            // Run
            m.recipientStatus.a = "delivered";
            m._handlePatchEvent({
                a: "delivered"
            }, {
                a: "sent"
            }, ["recipient_status.a"]);

            // Posttest
            expect(m.__updateRecipientStatus).toHaveBeenCalledWith({a: "delivered"}, {a: "sent"});
        });
    });

    describe("The _xhr() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should throw an error if destroyed", function() {
            // Setup
            m.destroy();

            // Run
            expect(function() {
                m._xhr({});
            }).toThrowError(layer.LayerError.dictionary.isDestroyed);
        });

        it("Should throw an error if the message does not have a conversation", function() {
            // Setup
            m.conversationId = null;

            // Run
            expect(function() {
                m._xhr({url: ""});
            }).toThrowError(layer.LayerError.dictionary.conversationMissing);
        });

        it("Should throw an error if the request fails to specify a url", function() {
            // Run
            expect(function() {
                m._xhr({method: "GET"});
            }).toThrowError(layer.LayerError.dictionary.urlRequired);
        });


        it("Should add path to url", function() {
            spyOn(client, "xhr");
            m.url = "https://doh.com/ray";
            options = {url: "/hey"};
            m._xhr(options);
            expect(options.url).toEqual("https://doh.com/ray/hey");
        });

        it("Should not require prefixed slash", function() {
            spyOn(client, "xhr");
            m.url = "https://doh.com/ray";
            options = {url: "hey"};
            m._xhr(options);
            expect(options.url).toEqual("https://doh.com/ray/hey");
        });

        it("Should add query to url", function() {
            spyOn(client, "xhr");
            m.url = "https://doh.com/ray";
            options = {url: "?hey"};
            m._xhr(options);
            expect(options.url).toEqual("https://doh.com/ray?hey");
        });

        it("Should call _setupSyncObject", function() {
            spyOn(m, "_setupSyncObject");
            m._xhr({url: "hey"});
            expect(m._setupSyncObject).toHaveBeenCalledWith(undefined);
        });

        it("Should call client.xhr", function() {
            spyOn(client, "xhr");
            m._xhr({url: "hey"});
            expect(client.xhr).toHaveBeenCalledWith(jasmine.objectContaining({
                url: jasmine.any(Function),
                sync: jasmine.any(Object)
            }), undefined);
        });

        it("Should use a function that returns a url", function() {
            var f;
            spyOn(client, "xhr").and.callFake(function(args) {
                f = args.url;
            });
            m._xhr({url: "hey"});
            m.url = "http://dogs.eat.me";
            expect(f()).toEqual("http://dogs.eat.me/hey");
        });
    });

    describe("The _setupSyncObject() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should do nothing if false", function() {
            expect(m._setupSyncObject(false)).toBe(false);
        });

        it("Should generate basic structure if undefined", function() {
            expect(m._setupSyncObject(undefined)).toEqual({
                target: m.id,
                depends: [m.conversationId]
            });
        });

        it("Should add a depends", function() {
            expect(m._setupSyncObject({depends: ["doh"]})).toEqual({
                target: m.id,
                depends: ["doh", m.conversationId]
            });
        });

        it("Should not overwrite a target", function() {
            expect(m._setupSyncObject({target: "what the"})).toEqual({
                target: "what the",
                depends: [m.conversationId]
            });
        });
    });



    describe("The getText() method", function() {
        it("Should return '' if no matching parts", function() {
            // Setup
            var m = new layer.Message({
                parts: [
                    new layer.MessagePart({mimeType: "blah", body: "bleh"}),
                    new layer.MessagePart({mimeType: "blah", body: "bleh2"}),
                    new layer.MessagePart({mimeType: "text/plain2", body: "I fly over the plain"})
                ],
                client: client
            });

            // Posttest
            expect(m.getText()).toEqual("");
        });

        it("Should only return text/plain message parts", function() {
            // Setup
            var m = new layer.Message({
                parts: [
                    new layer.MessagePart({mimeType: "blah", body: "bleh"}),
                    new layer.MessagePart({mimeType: "blah", body: "bleh2"}),
                    new layer.MessagePart({mimeType: "text/plain", body: "I fly over the plain"})
                ],
                client: client
            });

            // Posttest
            expect(m.getText()).toEqual("I fly over the plain");
        });

        it("Should concatenate text/plain message parts using the default '.  '", function() {
            // Setup
            var m = new layer.Message({
                parts: [
                    new layer.MessagePart({mimeType: "text/plain", body: "bleh"}),
                    new layer.MessagePart({mimeType: "blah", body: "bleh2"}),
                    new layer.MessagePart({mimeType: "text/plain", body: "I fly over the plain"})
                ],
                client: client
            });

            // Posttest
            expect(m.getText()).toEqual("bleh. I fly over the plain");
        });

        it("Should concatenate text/plain message parts using a custom join", function() {
            // Setup
            var m = new layer.Message({
                parts: [
                    new layer.MessagePart({mimeType: "text/plain", body: "bleh"}),
                    new layer.MessagePart({mimeType: "blah", body: "bleh2"}),
                    new layer.MessagePart({mimeType: "text/plain", body: "I fly over the plain"})
                ],
                client: client
            });

            // Posttest
            expect(m.getText("DOH!")).toEqual("blehDOH!I fly over the plain");
        });
    });

    describe("The toObject() method", function() {
        var m;
        beforeEach(function() {
            m = conversation.createMessage("hello");
        });

        afterEach(function() {
            if (!m.isDestroyed) m.destroy();
        });

        it("Should return cached value", function() {
            m._toObject = "fred";
            expect(m.toObject()).toEqual("fred");
        });

        it("Should return a clone of participants", function() {
            expect(m.toObject().recipientStatus).toEqual(m.recipientStatus);
            expect(m.toObject().recipientStatus).not.toBe(m.recipientStatus);
        });
    });

    describe("The _createFromServer() method", function() {
        it("Should fail if no conversation", function() {
            expect(function() {
                layer.Message._createFromServer({});
            }).toThrowError(layer.LayerError.dictionary.conversationMissing);
        });

        it("Should call _populateFromServer if found", function() {
            // Setup
            var m = conversation.createMessage("Hello").send();

            layer.Message._createFromServer({
                id: m.id,
                url: "hey ho",
                parts: [],
                sender: {}
            }, conversation).message;

            // Posttest
            expect(m.url).toEqual("hey ho");

            m.destroy();
        });

        it("Should register the message", function() {
            // Run
            var m = layer.Message._createFromServer({
                url: "hey ho",
                id: "layer:///messages/m103",
                parts: [],
                sender: {}
            }, conversation).message;

            // Posttest
            expect(client.getMessage(m.id)).toBe(m);
        });

        it("Should send delivery receipt if not marked as delivered", function() {
            // Setup
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.recipient_status["999"] = "sent";
            var tmp = layer.Message.prototype._sendReceipt;
            spyOn(layer.Message.prototype, "_sendReceipt");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(layer.Message.prototype._sendReceipt).toHaveBeenCalledWith('delivery');

            // Restore
            layer.Message.prototype._sendReceipt = tmp;
        });

        it("Should NOT send delivery receipt if marked as delivered", function() {
            // Setup
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.recipient_status["999"] = "delivered";
            var tmp = layer.Message.prototype.recipientStatus;
            spyOn(layer.Message.prototype, "recipientStatus");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(layer.Message.prototype.recipientStatus).not.toHaveBeenCalledWith('delivery');

            // Restore
            layer.Message.prototype.recipientStatus = tmp;
        });

        it("Should trigger a messages:notify event if fromWebsocket is true", function() {
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.fromWebsocket = true;
            client.getMessage(data.id).destroy();
            spyOn(client, "_triggerAsync");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(client._triggerAsync).toHaveBeenCalledWith('messages:notify', { message: m });
        });

        it("Should not trigger a messages:notify event if message is from sender", function() {
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.fromWebsocket = true;
            data.sender.user_id = client.userId;
            client.getMessage(data.id).destroy();
            spyOn(client, "_triggerAsync");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(client._triggerAsync).not.toHaveBeenCalledWith('messages:notify', { message: m });
        });

        it("Should not trigger a messages:notify event if message is read", function() {
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.fromWebsocket = true;
            data.is_unread = false;
            client.getMessage(data.id).destroy();
            spyOn(client, "_triggerAsync");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(client._triggerAsync).not.toHaveBeenCalledWith('messages:notify', { message: m });
        });

        it("Should not trigger a messages:notify event if fromWebsocket is undefined", function() {
            var data = JSON.parse(JSON.stringify(responses.message1));
            client.getMessage(data.id).destroy();
            spyOn(client, "_triggerAsync");

            // Run
            var m = layer.Message._createFromServer(data, conversation).message;

            // Posttest
            expect(client._triggerAsync).not.toHaveBeenCalledWith('messages:notify', { message: m });
        });
    });

    describe("The load() method", function() {

        it("Should fail without a client", function() {
            // Run
            expect(function() {
                layer.Message.load("https://foo", "argh");
            }).toThrowError(layer.LayerError.dictionary.clientMissing);
        });


        it("Should fail without a valid id", function() {
            // Run
            expect(function() {
                layer.Message.load("layyer:///messages/m1", client);
            }).toThrowError(layer.LayerError.dictionary.invalidId);
        });

        it("Should return a message instance with id/url", function() {
            // Run

            var id = "layer:///messages/m1"
            var m = layer.Message.load(id, client);

            // Posttest
            expect(m.url).toEqual(client.url + "/messages/m1");
            expect(m.id).toEqual(id);
            expect(m).toEqual(jasmine.any(layer.Message));
        });

        it("Should call client.xhr", function() {
            // Run
            spyOn(client, "xhr");
            var id = "layer:///messages/m1";
            var m = layer.Message.load(id, client);

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                url: client.url + "/messages/m1",
                method: "GET",
                sync: false
            }, jasmine.any(Function));
        });

        it("Should have syncState of LOADING", function() {
            // Run
            var id = "layer:///messages/m1"
            var m = layer.Message.load(id, client);

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.LOADING);
        });

        it("Should set the isLoading property", function() {
          var m = layer.Message.load(responses.message1.id, client);
          expect(m.isLoading).toBe(true);
        })
    });

    describe("The _loadResult() method", function() {
        var m;
        beforeEach(function() {
            m = new layer.Message({
                client: client
            });
        });
        afterEach(function() {
            m.destroy();
        });

        it("Should trigger messages:loaded-error on error", function() {
            // Setup
            spyOn(m, "_triggerAsync");

            // Run
            layer.Message._loadResult(m, client, {success: false, data: {hey: "ho"}});

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith(
                "messages:loaded-error", {error: {hey: "ho"}}
            );
        });

        it("Should call _loadSuccess if successful", function() {
            // Setup
            var _loadSuccess = layer.Message._loadSuccess;
            spyOn(layer.Message, "_loadSuccess");

            // Run
            layer.Message._loadResult(m, client, {success: true, data: {hey: "ho"}});

            // Posttest
            expect(layer.Message._loadSuccess).toHaveBeenCalledWith(m, client, {hey: "ho"});

            layer.Message._loadSuccess = _loadSuccess;
        });

        it("Should clear the isLoading property on success", function() {
            var m = layer.Message.load(responses.message1.id, client);
            expect(m.isLoading).toBe(true);

            // Run
            layer.Message._loadResult(m, client, {
                success: true,
                data: JSON.parse(JSON.stringify(responses.message1))
            });
            expect(m.isLoading).toBe(false);
        });

        it("Should clear the isLoading property on error", function() {
            var m = layer.Message.load(responses.message1.id, client);
            expect(m.isLoading).toBe(true);

            // Run
            layer.Message._loadResult(m, client, {
                success: false,
                data: {}
            });
            expect(m.isLoading).toBe(false);
        });
    });

    describe("The _loadSuccess() method", function() {
        var m;
        beforeEach(function() {
            m = new layer.Message({
                client: client
            });
        });
        afterEach(function() {
            m.destroy();
        });

        it("Should call _populateFromServer on the message", function() {
            // Setup
            spyOn(m, "_populateFromServer");

            // Run
            layer.Message._loadSuccess(m, client, responses.message1);

            // Posttest
            expect(m._populateFromServer).toHaveBeenCalledWith(responses.message1);
        });

        it("Should set the conversation if found", function() {
            // Setup
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.conversation.id = responses.conversation2.id;
            var c = client.getConversation(responses.conversation2.id, false);

            // Run
            layer.Message._loadSuccess(m, client, data);

            // Posttest
            expect(m.conversationId).toEqual(c.id);
            expect(m.getConversation()).toBe(c);
        });

        it("Should set the conversation if NOT found", function() {
            // Setup
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.conversation.id = responses.conversation2.id + 1;
            var c = client.getConversation(data.conversation.id, false);

            // Pretest
            expect(c).toBe(undefined);

            // Run
            layer.Message._loadSuccess(m, client, data);

            // Posttest
            expect(m.getConversation()).toBe(undefined);
            expect(m.conversationId).toEqual(data.conversation.id);
        });

        it("Should call messages:loaded", function() {
            // Setup
            var data = JSON.parse(JSON.stringify(responses.message1));
            data.conversation.id = responses.conversation2.id;
            var c = client.getConversation(responses.conversation2.id, false);
            c.lastMessage.destroy();
            var called = false;
            spyOn(m, "_triggerAsync");

            // Run
            layer.Message._loadSuccess(m, client, data);

            // Posttest
            expect(m._triggerAsync).toHaveBeenCalledWith("messages:loaded");
        });

    });

    describe("The _setSynced() method", function() {

        it("Sets syncState to SYNCED if SAVING and syncCounter=1", function() {
            // Setup
            var c = new layer.Message({
                syncState: layer.Constants.SYNC_STATE.SAVING,
                _syncCounter: 1,
                client: client
            });

            // Run
            c._setSynced();

            // Posttest
            expect(c.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCED);
            expect(c._syncCounter).toEqual(0);
        });

        it("Sets syncState to SYNCING if SAVING and syncCounter=2", function() {
            // Setup
            var c = new layer.Message({
                syncState: layer.Constants.SYNC_STATE.SAVING,
                _syncCounter: 2,
                client: client
            });

            // Run
            c._setSynced();

            // Posttest
            expect(c.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(c._syncCounter).toEqual(1);
        });

        it("Sets syncState to SYNCED if SYNCING and syncCounter=1", function() {
            // Setup
            var c = new layer.Message({
                syncState: layer.Constants.SYNC_STATE.SYNCING,
                _syncCounter: 1,
                client: client
            });

            // Run
            c._setSynced();

            // Posttest
            expect(c.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCED);
            expect(c._syncCounter).toEqual(0);
        });
    });

    describe("They _setSyncing() method", function() {
        it("Initial sync state is NEW / 0", function() {
            // Run
            var m = new layer.Message({
                client: client
            });

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.NEW);
            expect(m._syncCounter).toEqual(0);
        });

        it("Sets syncState to SAVING if syncState is NEW and syncCounter=0", function() {
            // Setup
            var m = new layer.Message({
                client: client
            });

            // Run
            m._setSyncing();

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(m._syncCounter).toEqual(1);
        });

        it("Sets syncState to SAVING if syncState is NEW and syncCounter=N", function() {
            // Setup
            var m = new layer.Message({
                client: client,
                _syncCounter: 500
            });

            // Run
            m._setSyncing();

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(m._syncCounter).toEqual(501);
        });

        it("Sets syncState to SAVING if syncState is SAVING and inc syncCounter", function() {
            // Setup
            var m = new layer.Message({
                _syncCounter: 500,
                syncState: layer.Constants.SYNC_STATE.SAVING,
                client: client
            });

            // Run
            m._setSyncing();

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.SAVING);
            expect(m._syncCounter).toEqual(501);
        });

        it("Sets syncState to SYNCING if syncState is SYNCED and inc syncCounter", function() {
            // Setup
            var m = new layer.Message({
                client: client,
                syncState: layer.Constants.SYNC_STATE.SYNCED
            });

            // Run
            m._setSyncing();

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(m._syncCounter).toEqual(1);
        });

        it("Sets syncState to SYNCING if syncState is SYNCING and inc syncCounter", function() {
            // Setup
            var m = new layer.Message({
                client: client,
                syncState: layer.Constants.SYNC_STATE.SYNCING,
                _syncCounter: 500
            });

            // Run
            m._setSyncing();

            // Posttest
            expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.SYNCING);
            expect(m._syncCounter).toEqual(501);
        });
    });
});
