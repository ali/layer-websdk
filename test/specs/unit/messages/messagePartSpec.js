
/* eslint-disable */
describe("The MessageParts class", function() {
    var appId = "Fred's App";

    var conversation,
        client,
        requests,
        oldBlob;

    afterAll(function() {
        if (oldBlob) window.Blob = oldBlob;
        layer.Client.destroyAllClients();
    });

    beforeAll(function() {

    });

    beforeEach(function() {
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        client = new layer.Client({
            appId: appId,
            reset: true,
            url: "https://doh.com"
        });
        client.userId = "999";
        conversation = layer.Conversation._createFromServer(responses.conversation2, client).conversation;
        conversation.lastMessage.destroy();
        requests.reset();
        client._clientReady();
    });
    afterEach(function() {
        client.destroy();
        jasmine.Ajax.uninstall();
    });

    function generateBlob(large) {
        var imgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAECElEQVR4Xu2ZO44TURREa0SAWBASKST8xCdDQMAq+OyAzw4ISfmLDBASISERi2ADEICEWrKlkYWny6+77fuqalJfz0zVOXNfv/ER8mXdwJF1+oRHBDCXIAJEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8waWjX8OwHcAv5f9Me3fPRugvbuxd14C8B7AVwA3q0oQAcYwtr2+hn969faPVSWIAG2AT3rXJvz17CcAN6ptgggwrwDb4JeVIALMJ8AY/JISRIB5BGDhr3/aZwDXKxwHEWC6AJcBvAOwfuBjvuNfABcBfGGGl5yJANPabYV/B8DLaT96nndHgPYeu4c/RI8AbQJIwO9FgDMAfrVxWuRdMvB7EOA+gHsALgD4uQjO3b6pFPzqAjwA8HTF5weA8weWQA5+ZQGOw1//jR5SAkn4VQV4CODJls18CAmuAHjbcM8vc9U76ZSrdgt4BODxyLG8Twla4P8BcLfKPX/sEaeSAAz8fR4H8vArHQHXAHwYs3Xj9SU3gQX8SgKcAvBitTp38WAJCWzgVxJg+F0qSGAFv5oAh5bADn5FAQ4lwVUAb3a86nX1tL/tXK10Czj+O+7zOLCFX3UDrEXYhwTW8KsLsPRx0Ap/+A/fq12uKpVnqx4BSx8Hgb9quAcB5t4EgX/sz6sXAeaSIPA3zqOeBJgqwTMAzxuuelJn/ubzSG8CTJFg12ex4Z4vDb+HW8A2aK1XRFYCC/g9C7DkJrCB37sAS0hgBV9BgDklGODfBvCaPScU5np8CPxf71OfCSzhq2yAqZ8d2MJXE6DlOLCGryjALhLYw1cVgJEg8Dv7MKjlgXvbg2Hgd/ph0BwSBH7nHwZNkeCW4z1/rDCV/wOM5RyOg7MAvo0Nur3uIoAbVzpvBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hz8BzIXtYE3VcPnAAAAAElFTkSuQmCC";
        if (large) imgBase64 += imgBase64;
        if (window.isPhantomJS) {
            var b = new Blob([atob(imgBase64)], {type: "image/png"});
            b.length = large ? 12345 : 125;
            return b;
        } else {
            var imageBinary = atob(imgBase64),
                buffer = new ArrayBuffer(imageBinary.length),
                view = new Uint8Array(buffer),
                i;

            for (i = 0; i < imageBinary.length; i++) {
                view[i] = imageBinary.charCodeAt(i);
            }
            return new Blob( [view], { type: "image/png" });
        }
    }

    describe("The constructor() method", function() {
        it("Should initialize with an object", function() {
            expect(new layer.MessagePart({body: "hey"}).body).toEqual("hey");
            expect(new layer.MessagePart({mimeType: "text/hey"}).mimeType).toEqual("text/hey");
            expect(new layer.MessagePart({encoding: "base64"}).encoding).toEqual("base64");
            expect(new layer.MessagePart({id: "Impart"}).id).toEqual("Impart");
        });

        it("Should initialize with a string", function() {
           expect(new layer.MessagePart("hey").body).toEqual("hey");
           expect(new layer.MessagePart("ho").mimeType).toEqual("text/plain");
        });

        it("Should initialize with two strings", function() {
           expect(new layer.MessagePart("hey", "text/mountain").mimeType).toEqual("text/mountain");
        });

        it("Should initialize with a blob", function() {
            var b = generateBlob();
            expect(new layer.MessagePart(b).body instanceof Blob).toBe(true);
            if (!window.isPhantomJS) {
                expect(new layer.MessagePart(b).size).toEqual(b.size);
            }
            expect(new layer.MessagePart(b).mimeType).toEqual("image/png");
        });

        it("Should set url if initialize with blob", function() {
            var b = generateBlob();
            expect(new layer.MessagePart(b).url.length > 0).toBe(true);
        });

        it("Should initialize with Content", function() {
            var c = new layer.Content({});
            expect(new layer.MessagePart({_content: c})._content).toBe(c);
        });

    });

    describe("The destroy() method", function() {
        var part, tmp;
        beforeEach(function() {
          tmp = URL.revokeObjectURL;
          spyOn(URL, "revokeObjectURL");
          content = new layer.Content({});
          part = new layer.MessagePart({mimeType: "text/dog", _content: content});
        });
        afterEach(function() {
          URL.revokeObjectURL = tmp;
        });

        it("Should call revokeObjectURL if there is a url", function() {
            part.url = "fred";
            part.destroy();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith("fred");
        });

        it("Should call revokeObjectURL if there is a url", function() {
            part.destroy();
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    })

    describe("The fetchContent() method", function() {
        var part, message, content;
        beforeEach(function() {
            content = new layer.Content({});
            part = new layer.MessagePart({mimeType: "text/dog", _content: content});
            message = conversation.createMessage({parts: [part]}).send();
            part.id = message.id + "/parts/0";
        });

        it("Should call content.loadContent", function() {
            // Setup
            spyOn(content, "loadContent");
            spyOn(part, "_fetchContentCallback")

            // Run
            part.fetchContent();

            // Posttest
            expect(content.loadContent).toHaveBeenCalledWith("text/dog", jasmine.any(Function));
            content.loadContent.calls.first().args[1]("Test!");
            expect(part._fetchContentCallback).toHaveBeenCalledWith("Test!", undefined);
        });

        it("Should not call content.loadContent if still processing last fetchContent request", function() {
            // Setup
            part.fetchContent();
            spyOn(content, "loadContent");

            // Run
            part.fetchContent();

            // Posttest
            expect(content.loadContent).not.toHaveBeenCalled();
        });

        it("Should fail quietly if no content property", function() {
            part.content = null;
            expect(function() {
                part.fetchContent();
            }).not.toThrow();
        });

        it("Should treat image/jpeg+preview as image/jpeg", function() {
            part.mimeType = "image/jpeg+preview";
            spyOn(content, "loadContent");

            // Run
            part.fetchContent();

            // Posttest
            expect(content.loadContent).toHaveBeenCalledWith("image/jpeg", jasmine.any(Function));
        });
    });

    describe("The _fetchContentCallback() method", function() {
        var part, message, content;
        beforeEach(function() {
            content = new layer.Content({expiration: new Date()});
            part = new layer.MessagePart({mimeType: "text/dog", _content: content});
            message = conversation.createMessage({parts: [part]}).send();
            part.id = message.id + "/parts/0";
        });

        it("Should set the URL property", function() {
          expect(part.url).toEqual("");
          part._fetchContentCallback(generateBlob());
          expect(part.url).toEqual("http://Doh.com");
        });

        it("Should clear the isFiring property", function() {
          part.isFiring = true;
          part._fetchContentCallback("test");
          expect(part.isFiring).toEqual(false);
        });

        it("Should call _fetchContentComplete for non-text/plain", function() {
          spyOn(part, "_fetchContentComplete");
          part.mimeType = "image/png"
          part._fetchContentCallback("test");
          expect(part._fetchContentComplete).toHaveBeenCalledWith("test", undefined);
        });

        it("Should call readAsText for text/plain", function() {
          var tmp = window.FileReader.prototype.readAsText;
          spyOn(window.FileReader.prototype, "readAsText");
          spyOn(part, "_fetchContentComplete");

          part.mimeType = "text/plain"
          part._fetchContentCallback("test");

          // Posttest
          expect(window.FileReader.prototype.readAsText).toHaveBeenCalledWith("test");

          expect(part._fetchContentComplete).not.toHaveBeenCalled();

          // Cleanup
          window.FileReader.prototype.readAsText = tmp;
        });

        it("Should call read_fetchContentComplete for text/plain", function() {
          spyOn(part, "_fetchContentComplete");
          part._fetchContentCallback("test");
          expect(part._fetchContentComplete).toHaveBeenCalledWith("test", undefined);
        });
    });

    describe("The _fetchContentComplete() method", function() {
        var part, message, content;
        beforeEach(function() {
            content = new layer.Content({});
            part = new layer.MessagePart({mimeType: "text/dog", _content: content});
            message = conversation.createMessage({parts: [part]}).send();
            part.id = message.id + "/parts/0";
        });

        it("Should set body", function() {
            part._fetchContentComplete("Hey Ho");
            expect(part.body).toEqual("Hey Ho");
        });

        it("Should trigger a content-loaded event", function() {
            spyOn(part, "trigger");
            part._fetchContentComplete("Hey Ho");
            expect(part.trigger).toHaveBeenCalledWith("content-loaded");
        });

        it("Should trigger messages:change event", function() {
            spyOn(message, "_triggerAsync");
            part._fetchContentComplete("Hey Ho");

            // Posttest
            expect(message._triggerAsync).toHaveBeenCalledWith("messages:change", {
                property: "parts",
                oldValue: message.parts,
                newValue: message.parts
            });
        });

        it("Should call the callback", function() {
          var spy = jasmine.createSpy('callback');
          part._fetchContentComplete("Hey Ho", spy);
          expect(spy).toHaveBeenCalledWith("Hey Ho");
        });
    });

    describe("The fetchStream() method", function() {
      var part, message;
      beforeEach(function() {
        message = new layer.Message({
          client: client,
          fromServer: responses.message1
        });
          part = layer.MessagePart._createFromServer({
              id: message.id + "/parts/3",
              body: "jane",
              encoding: "john",
              content: {
                  id: "jill",
                  download_url: "fred",
                  expiration: new Date()
              }
          });
          message.addPart(part);
      });

      it("Should throw an error if no content", function() {
        delete part._content;
        expect(function() {
          part.fetchStream();
        }).toThrowError(layer.LayerError.dictionary.contentRequired);
        expect(layer.LayerError.dictionary.contentRequired.length > 0).toBe(true);
      });

      it("Should call refreshContent if expired", function() {
        spyOn(part._content, "refreshContent");
        spyOn(part, "_fetchStreamComplete");
        part._content.expiration.setHours(part._content.expiration.getHours() - 1);
        part.fetchStream();
        expect(part._content.refreshContent).toHaveBeenCalled();
        expect(part._fetchStreamComplete).not.toHaveBeenCalled();
      });

      it("Should call _fetchStreamComplete if not expired", function() {
        spyOn(part._content, "refreshContent");
        spyOn(part, "_fetchStreamComplete");
        part._content.expiration.setHours(part._content.expiration.getHours() + 1);
        part.fetchStream();
        expect(part._content.refreshContent).not.toHaveBeenCalled();
        expect(part._fetchStreamComplete).toHaveBeenCalled();
      });
    });

    describe("The _fetchStreamComplete() method", function() {
      var part, message;
      beforeEach(function() {
          message = new layer.Message({
            client: client,
            fromServer: responses.message1
          });
          client._addMessage(message);
          part = layer.MessagePart._createFromServer({
              id: "joe",
              body: "jane",
              encoding: "john",
              content: {
                  id: "jill",
                  download_url: "fred",
                  expiration: new Date()
              }
          });
          message.addPart(part);
          part.id = message.id + "/parts/2"
          part._streamInUse = true;
      });

      it("Should trigger url-loaded", function() {
        spyOn(part, "trigger");
        part._fetchStreamComplete("hey");
        expect(part.trigger).toHaveBeenCalledWith("url-loaded");
      });

      it("Should trigger messages:change", function() {
        spyOn(message, "_triggerAsync");

        // Run
        part._fetchStreamComplete("hey");

        // Posttest
        expect(message._triggerAsync).toHaveBeenCalledWith("messages:change", {
          oldValue: message.parts,
          newValue: message.parts,
          property: "parts"
        })
      });

      it("Should call callback", function() {
        var spy = jasmine.createSpy("callback");
        part._fetchStreamComplete("hey", spy);
        expect(spy).toHaveBeenCalledWith("hey");
      });
    });

    describe("The _send() method", function() {
        it("Should call _sendWithContent", function() {
            var content = new layer.Content({});
            var part = new layer.MessagePart({
                _content: content
            });
            spyOn(part, "_sendWithContent");


            // Run
            part._send(client);

            // Posttest
            expect(part._sendWithContent).toHaveBeenCalledWith();

        });

        it("Should call _generateContentAndSend", function() {
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello")
            });
            spyOn(part, "_generateContentAndSend");

            // Run
            part._send(client);

            // Posttest
            expect(part._generateContentAndSend).toHaveBeenCalledWith(client);
        });

        it("Should call _sendBlob", function() {
            var part = new layer.MessagePart({
                body: generateBlob()
            });
            spyOn(part, "_sendBlob");

            // Run
            part._send(client);

            // Posttest
            expect(part._sendBlob).toHaveBeenCalledWith(client);
        });

        it("Should call _sendBody", function() {
            var part = new layer.MessagePart({
                body: "hey"
            });
            spyOn(part, "_sendBody");

            // Run
            part._send(client);

            // Posttest
            expect(part._sendBody).toHaveBeenCalledWith();
        });
    });

    describe("The _sendBody() method", function() {
        it("Should trigger with body and mime_type", function() {
            var part = new layer.MessagePart({
                body: "hey",
                mimeType: "ho"
            });
            spyOn(part, "trigger");

            // Run
            part._sendBody();

            // Posttest
            expect(part.trigger).toHaveBeenCalledWith("parts:send", {
                body: "hey",
                mime_type: "ho"
            });
        });

        it("Should trigger with encoding", function() {
            var part = new layer.MessagePart({
                body: "hey",
                mimeType: "ho",
                encoding: "fred"
            });
            spyOn(part, "trigger");

            // Run
            part._sendBody();

            // Posttest
            expect(part.trigger).toHaveBeenCalledWith("parts:send", {
                body: "hey",
                mime_type: "ho",
                encoding: "fred"
            });
        });
    });

    describe("The _sendWithContent() method", function() {
        it("Should trigger parts:send", function() {
            var content = new layer.Content({
                id: "fred"
            });
            var part = new layer.MessagePart({
                _content: content,
                mimeType: "ho",
                size: 500
            });
            spyOn(part, "trigger");

            // Run
            part._sendWithContent();

            // Posttest
            expect(part.trigger).toHaveBeenCalledWith("parts:send", {
                content: {
                    id: "fred",
                    size: 500
                },
                mime_type: "ho"
            });
        });
    });

    describe("The _sendBlob() method", function() {
        it("Should send small blobs", function(done) {
            var part = new layer.MessagePart({
                body: new Blob([atob("abc")], {type: "text/plain"}),
                mimeType: "fred"
            });

            spyOn(part, "_sendBody").and.callFake(function() {
                expect(true).toBe(true);
                done();
            });

            // Run
            part._sendBlob();
        });

        it("Should generate content for large blobs", function(done) {
            var b = generateBlob(true);
            var part = new layer.MessagePart({
                body: b,
                mimeType: "fred"
            });
            spyOn(part, "_generateContentAndSend").and.callFake(function() {
                expect(true).toBe(true);
                done();
            });

            // Run
            part._sendBlob();
        });
    });

    describe("The _generateContentAndSend() method", function() {
        it("Should call client.xhr", function() {
            spyOn(client, "xhr");
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain"
            });

            // Run
            part._generateContentAndSend(client);

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                method: "POST",
                url: "/content",
                headers: {
                    'Upload-Content-Type': "text/plain",
                    'Upload-Content-Length': part.body.length,
                    'Upload-Origin': location.origin
                },
                sync: {}
            }, jasmine.any(Function));
        });

        it("Should call _processContentResponse", function() {
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain"
            });
            spyOn(part, "_processContentResponse");

            // Run
            part._generateContentAndSend(client);
            requests.mostRecent().response({
                status: 200,
                responseText: JSON.stringify({
                    hey: "ho"
                })
            });

            // Posttest
            expect(part._processContentResponse).toHaveBeenCalledWith({hey: "ho"}, client);
        });
    });

    describe("The _processContentResponse() method", function() {
        it("Should create Content", function() {
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain"
            });

            // Run
            part._processContentResponse({
                id: "layer:///content/fred"
            }, client);

            // Posttest
            expect(part._content.id).toEqual("layer:///content/fred");
        });

        it("Should call xhr and post to cloud storage", function() {
            spyOn(client, "xhr");
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain"
            });

            // Run
            part._processContentResponse({
                upload_url: "http://argh.com",
                id: "layer:///content/fred"
            }, client);

            // Posttest
            expect(requests.mostRecent().url).toEqual("http://argh.com");
            expect(requests.mostRecent().method).toEqual('PUT');
            expect(requests.mostRecent().params).toEqual(part.body);
            expect(requests.mostRecent().requestHeaders).toEqual({
                'upload-content-length': part.size,
                'upload-content-type': part.mimeType,
            });
        });

        it("Should call _processContentUploadResponse", function() {
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain"
            });
            spyOn(part, "_processContentUploadResponse");

            // Run
            part._processContentResponse({
                upload_url: "http://argh.com",
                id: "layer:///content/fred"
            }, client);
            requests.mostRecent().response({
                status: 200,
                responseText: JSON.stringify({hey: "ho"})
            });

            // Posttest
            expect(part._processContentUploadResponse)
                .toHaveBeenCalledWith(jasmine.objectContaining({
                    success: true,
                    status: 200,
                    data: {hey: "ho"}
                }),
                {
                upload_url: "http://argh.com",
                    id: "layer:///content/fred"
                },
                client);
        });
    });

    describe("The _processContentUploadResponse() method", function() {

        it("Should trigger parts:send", function() {
            var content = new layer.Content({
                id: "layer:///content/fred"
            });
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                _content: content,
                mimeType: "text/plain"
            });
            spyOn(part, "trigger");

            // Run
            part._processContentUploadResponse({
                success: true
            }, {id: "doh"}, client);


            // Posttest
            expect(part.trigger).toHaveBeenCalledWith("parts:send", {
                content: {
                    id: "layer:///content/fred",
                    size: part.body.length
                },
                mime_type: "text/plain"
            });
        });

        it("Should setup to retry if isOnline is false", function() {
            client.onlineManager.isOnline = false;
            var content = new layer.Content({
                id: "layer:///content/fred"
            });
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                _content: content,
                mimeType: "text/plain"
            });
            spyOn(part, "_processContentResponse");

            // Run
            part._processContentUploadResponse({
                success: false
            }, {id: "doh"}, client);
            client.onlineManager.trigger("connected");

            // Posttest
            expect(part._processContentResponse).toHaveBeenCalledWith({id: "doh"}, client, jasmine.any(layer.LayerEvent));
        });

        it("Should not know how to handle other errors", function() {
            var part = new layer.MessagePart({
                body: new Array(5000).join("hello"),
                mimeType: "text/plain",
                id: "layer:///content/fred"
            });
            spyOn(part, "trigger");

            // Run
            part._processContentUploadResponse({
                success: false
            }, {id: "doh"}, client);

            // Posttest
            expect(part.trigger).not.toHaveBeenCalled();
        });
    });

    describe("The getText() method", function(){
        it("Should return part.body if its text/plain", function() {
            var part = new layer.MessagePart({
                body: "hey",
                mimeType: "text/plain"
            });
            expect(part.getText()).toEqual("hey");
        });

        it("Should return empty string if its not text/plain", function() {
            var part = new layer.MessagePart({
                body: "hey",
                mimeType: "text/plain2"
            });
            expect(part.getText()).toEqual("");
        });
    });

    describe("The static _createFromServer() method", function() {
        var part;
        beforeEach(function() {
            part = layer.MessagePart._createFromServer({
                id: "joe",
                body: "jane",
                encoding: "john",
                content: {
                    id: "jill"
                }
            });
        });

        it("Should create a MessagePart instance", function() {
            expect(part instanceof layer.MessagePart).toBe(true);
        });

        it("Should have a correct id", function() {
            expect(part.id).toEqual("joe");
        });

        it("Should have a correct body", function() {
            expect(part.body).toEqual("jane");
        });

        it("Should have a correct encoding", function() {
            expect(part.encoding).toEqual("john");
        });

        it("Should have a correct content", function() {
            expect(part._content instanceof layer.Content).toBe(true);
            expect(part._content.id).toEqual("jill");
        });

        it("Should have a hasContent true", function() {
            expect(part.hasContent).toEqual(true);
        });

        it("Should have a hasContent false", function() {
          part = layer.MessagePart._createFromServer({
                id: "joe",
                body: "jane",
                encoding: "john"
            });
            expect(part.hasContent).toEqual(false);
        });
    });

    describe("The get url() method", function() {
      var part;
      beforeEach(function() {
          part = layer.MessagePart._createFromServer({
              id: "joe",
              body: "jane",
              encoding: "john",
              content: {
                  id: "jill",
                  download_url: "fred",
                  expiration: new Date()
              }
          });
          part._streamInUse = true;
      });

      it("Should return the downloadUrl if there is content that has not expired", function() {
        part._content.expiration.setHours(part._content.expiration.getHours() + 1);
        expect(part.url).toEqual("fred");
      });

      it("Should return '' if content has expired", function() {
        part._content.expiration.setHours(part._content.expiration.getHours() - 1);
        expect(part.url).toEqual("");
      });

      it("Should return '' if no content", function() {
        delete part._content;
        delete part.hasContent;
        expect(part.url).toEqual("");
      });

      it("Should return the url if its been set", function() {
        part.url = "fred2";
        part._content.expiration = new Date("2010-10-10"); // long ago...
        expect(part.url).toEqual("fred2");
      });
    })
});