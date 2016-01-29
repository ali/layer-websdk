# Layer Web SDK
[![Build Status](http://img.shields.io/travis/layerhq/layer-websdk.svg)](https://travis-ci.org/layerhq/layer-websdk)
[![npm version](http://img.shields.io/npm/v/layer-websdk.svg)](https://npmjs.org/package/layer-websdk)

The Layer Web SDK is a JavaScript library for adding chat services to your web application. For detailed documentation, tutorials and guides please visit our [Web SDK documentation](https://developer.layer.com/docs/websdk).

## Public Beta Disclaimer

This **public beta is NOT production ready**; while we will not stop you from using it in production, your expectations of polish and support will need to account for this. There are known limitations and known concerns with the Layer Web SDK.

## Installation

All examples below assume your using the CDN installation method.

### CDN

Simplest approach to install the Web SDK is to add the following script tag:

```html
<script src='//cdn.layer.com/sdk/0.9/layer-websdk.min.js'></script>
```

All classes can then be accessed via the `layer` namespace:

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID
});
```

### NPM

    npm install layer-websdk --save

All classes can then be accessed via the layer module:

```javascript
var layer = require('layer-websdk');

var client = new layer.Client({
    appId: LAYER_APP_ID
});
```

### Github

    > git clone git@github.com:layerhq/layer-websdk.git
    > cd layer-websdk
    > npm install
    > grunt build

A `build/` folder will be generated that contains `client.min.js` file.

Other build commands:

* `grunt debug`: Generates `build/client.debug.js` which provides source-mapped files if you need to step through the Web SDK.
* `grunt docs`: Generates `docs/index.html` which you can open to view the API documentation.
* `grunt test`: Run the unit tests

## Getting Started

To start using Layer's Web SDK, you need to initialize a client with your Layer Application ID which can be found in the [Developer Dashboard](https://developer.layer.com/projects/keys).

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID
});
```

The client requires two event handlers to get started:

* `challenge`: Performs an authentication challenge requiring your application to provide an Identity Token
* `ready`: The client is authenticated and is ready for your UI

```javascript
client.on('challenge', function(evt) {
    getIdentityToken(evt.nonce, function(identityToken) {
        evt.callback(identityToken);
    })
});

client.on('ready', function() {
    renderMyUI(client);
});
```

The following shorthand is also acceptable:

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID,
    challenge: function(evt) {
        getIdentityToken(evt.nonce, function(identityToken) {
            evt.callback(identityToken);
        })
    },
    ready: function() {
        renderMyUI(client);
    }
});
```

`getIdentityToken()` is a method you provide for accessing your Identity Provider, and is covered in the [Authentication](https://developer.layer.com/docs/websdk/integration#authentication) section.

### Accessing Data

Data is accessed via layer.Query instances.  Some notes about queries before going into details:

* The `update()` method lets you change properties of the Query, and then fetches updated results.
* Results of Queries will update as new Conversations or Messages are created locally or remotely.
* Results are accessed via the `data` property.
* Events are triggered whenever there is a change to the query's results.
* Querys for Conversations should specify a `model` of `layer.Query.Conversation`.
* Querys for Messages should specify a `model` of `layer.Query.Message`.

#### Conversation Query

```javascript
var query = client.createQuery({
    model: layer.Query.Conversation
});

query.on('change', function(evt) {
    var conversations = query.data;
    myConversationListRenderer(conversations);
});
```

At this time, no predicates are supported for filtering results.

Conversations can be sorted by `lastMessage.sentAt` or `createdAt`; the default sort is `createdAt`; only Descending sorts are supported at this time.

```javascript
var query = client.createQuery({
    model: layer.Query.Conversation,
    sortBy: [{'lastMessage.sentAt': 'desc'}]
});
```

Improved support for sorting and predicates will ship once the server adds a Query API.

#### Message Query

```javascript
var query = client.createQuery({
    model: layer.Query.Message,
    predicate: 'conversation.id = "layer:///conversations/uuid"'
});

query.on('change', function(evt) {
    var messages = query.data;
    myMessageListRenderer(messages);
});
```

The Message query only accepts a predicate/filter of the form:

```javascript
 'predicate': 'conversation.id = "' + myConversation.id + '"'
```

Notes:

* Single and double quotes are both supported for this predicate.
* Any other predicate will trigger a change event, and the new data will be `[]`. In other words, no other predicates are currently supported.
* No sorting options are currently supported on Message queries.

#### Query Update

Any time you want to change properties of your query, you can call the `update()` method:

_Page the Query:_

```javascript
query.update({
    paginationWindow: query.paginationWindow + 50
});
```

Paging the query will fire a request to the server and append additional data to the results.  In this case, the next 50 results will be downloaded.

_Change the Query:_

```javascript
query.update({
    predicate: 'conversation.id = "' + conversation.id + '"'
});
```
Changing the predicate:

* clears the query's data
* resets its paginationWindow
* triggers a reset event
* fires a request to the server
* sets the data to the results from the server
* triggers a data event

A common pattern is to use a single `layer.Query` bound to your MessageListView, changing the predicate as the user moves from Conversation to Conversation.

An alternate pattern of creating a new `layer.Query` each time the user navigates to a new Conversation also works; however, you **must** destroy each query when done with it:

```javascript
query.destroy();
```

#### The Query Builder

There is a `layer.QueryBuilder` class that simplifies assembling of Queries:

```javascript
var builder = QueryBuilder
  .messages()
  .forConversation(conversationOne.id)
  .paginationWindow(50);

var query = client.createQuery(builder);

query.update(builder.forConversation(conversationTwo.id));
```

The QueryBuilder may suit some developer styles better, and makes specifying a predicateis simpler than concatenating strings when specifying a predicate.

#### Query Results

Any change to the Query results are announced via a `change` event.  The simplest pattern for using a `change` event is to grab the query's data:

```javascript
query.on('change', function(evt) {
  renderCurrentMessages(query.data);
});
```

To get more granular details about the different types of `change` events and how to access just the data within the results that have changed, see the [Query API](http://static.layer.com/sdk/docs/#!/api/layer.Query)

## Authentication

Authentication requires that:

* you have setup an Identity Service
* your client sends a request to your identity service to get an Identity Token
* your client provides that identity token to the Layer Web SDK.

Some of these concepts are explained in more detail in the [Authentication Guide](https://developer.layer.com/docs/websdk/guides#authentication); concepts specific to the Layer Web SDK are described here.

Assuming that you have an Identity Service, your javascript application will need to provide some method (`getIdentityToken()` in the example below) that gets the identity token.

```javascript
function getIdentityToken(nonce, callback) {
    xhr({
        url: 'https://myservice.com/identity',
        method: 'POST',
        data: {
            nonce: nonce
        }
    }, function(result) {
        callback(result.identity_token);
    });
}
```

Presumably, before you try to initialize a Layer Client, the user has already logged into your application, and you already have a session validating who this user is for your server.  Your server just needs to take this nonce and create and Identity Token.

The full sequence may look like:

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID
});

client.on('challenge', function(evt) {
    getIdentityToken(evt.nonce, function(identityToken) {
        evt.callback(identityToken);
    })
});
```

Note that `evt.callback` must be called to provide the Layer Client with the identity token and procede with authorization.

### Reusing the previous Authorization?

When reloading a web page, the framework will try to restore the last session.  However, it will only do this **if** you provide a `userId` parameter AND if that parameter matches the name associated with the last session:

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID,
    userId: 'Frodo_the_Dodo'
});
```

* If there is no session cached for Frodo_the_Dodo, then your `challenge` event handler will be called.
* If there is a session but its expired, then your `challenge` event handler will be called.
* If there is a session and its valid, then your `ready` event handler will be called.

## Creating a Conversation

```javascript
// Shorthand
var conversation = client.createConversation(['a', 'b']);

// Complete version
var conversation = client.createConversation({
    participants: ['a','b'],
    distinct: false,
    metadata: {
        title: 'My conversation title'
    }
});
```

The above Conversation will not be sent to the server until you send a message with it.

## Creating and Sending a Message

```javascript
// Shorthand
var message = conversation.createMessage('Hello World').send();

// Complete version
var message = conversation.createMessage({
    parts: [{
        body: 'Hello World',
        mimeType: 'text/plain'
    })]
}).send({
    text: 'Push Notification: Your New Message says Hello',
    sound: 'ding.aiff'
});
```

Note that creation of a Message is separate from sending it. This allows you to add additional MessageParts to your message after creating it:

```javascript
var message = conversation.createMessage('Hello World');
message.addPart({
    body: 'Farewell World',
    mimeType: 'text/plain'
});
message.send();
```

Also note that the send method takes an optional parameter for push notifications; without that parameter there will be no new message notification for recipients:

```javascript
message.send({
    text: 'Push Notification: Your New Message says Hello',
    sound: 'ding.aiff'
});
```

## Retrieving a Conversation

A Conversation can be retrieved by ID using:

```javascript
var conversation = client.getConversation('layer:///conversations/uuid');
```

A Conversation can be retrieved by ID from cache OR from the server if not cached using:

```javascript
var conversation = client.getConversation('layer:///conversations/uuid', true);
```

If you need the Conversation's details to be loaded from the server, use the 'conversations:loaded' event.

```javascript
var conversation = client.getConversation('layer:///conversations/uuid', true);
conversation.on('conversations:loaded', function() {
    renderMyUI(conversation);
});
```

The `conversations:loaded` event will be called immediately if its already loaded.

## Retrieving a Message

A Message can be retrieved by ID using:

```javascript
var Message = client.getMessage('layer:///messages/uuid');
```

A Message can be retrieved by ID from cache OR from the server if not cached using:

```javascript
var Message = client.getMessage("layer:///messages/uuid", true);
```

If you need the Message's details to be loaded from the server, use the "messages:loaded" event.

```javascript
var message = client.getMessage("layer:///messages/uuid", true);
message.on("messages:loaded", function() {
    renderMyUI(message);
});
```
The `messages:loaded` event will be called immediately if its already loaded.

## Change Events

The Layer Web SDK provides not just a set of APIs for letting you create, retrieve and control Conversations and Messages, but also a websocket connection that keeps your objects up-to-date and in sync with everyone else.  Changes, regardless of whether they are generated by websocket messages or changes you have made programatically, will all result in Events being triggered.


### Commonly Used Events

There are a log of available events, but only a few that are really necessary for building applications:

* layer.Query Events
    * `change` - Any change to the Query results

* layer.Message Events:
    * `messages:sent` - A message you were sending is now sent
    * `messages:change` - A Message's property has changed
    * `messages:delete` - A message has been deleted
    * `messages:read` - A message has been marked as read by your user

* layer.Conversation Events:
    * `conversations:sent` - A Conversation has been sent to the server
    * `conversations:change` - A Conversation's property has changed
    * `conversations:delete` - A Conversation has been deleted

* layer.Client Events: Receives all of the above events as well as:
    * `ready` - The client is connected, authenticated and ready for use
    * `challenge` - The client requires an identity token
    * `messages:add` - A Message has been added to the messages cache
    * `conversations:add` - A Conversation has been added to the conversations cache


### Event Arguments

Event callbacks are called with an `event` argument that is an instance of layer.LayerEvent.  This contains a `target` property identifying the object changed, along with any information about what changed.  The `target` allows an application to write:

```javascript
client.on('conversation:change', function(event) {
    var changedItem = event.target;
    alert((changedItem.toString() + ' has changed');
});
```

Change events get some special handling; any event name that matches 'xxxx:change' will come with a `changes` property containing an array of properties that have changed:

```javascript
[{
  oldValue: 5,
  newValue: 10,
  property: 'unreadCount'
}]
```

Change events also come with a `getChangesFor` method for extracting all changes to a specific property:

```javascript
client.on('conversation:change', function(event) {
    var changedItem = event.target;
    var participantChanges = event.getChangesFor('participants');
    var metadataChanges    = event.getChangesFor('metadata');

    participantChanges.forEach(function(change) {
        alert(changedItem.toString() + ' old value is ' + change.oldValue +
          '; new value is ' + change.newValue);
    });

    metadataChanges.forEach(function(change) {
        alert(changedItem.toString() + ' old value is ' + change.oldValue +
          '; new value is ' + change.newValue);
    });
}, this);
```

The Event system is built on top of the backbone.js events. This accepts:

```javascript
object.on(eventName, callback, context);

object.on({
    eventName1: callback,
    eventName2: callback,
    eventName3: callback
}, context);

object.off(eventName, null, null);
object.off(null, callback, null);
object.off(null, null, context);
```

## Websockets

The layer.Client instance manages a websocket connection to the server.  If the connection is lost, it will attempt to reconnect when able, and will catchup on missed events. Typically, all management of this connection should be left to the Layer Web SDK.

## Users

Layer imposes very little meaning on the identity of participants in a Conversation.  However, it is often useful to manage an array of users that can be used to populate a user list.  Even more important is being able to find a user by user-id, and find a display name to show for them next to messages they send.

The layer.Client `users` property can be used for storing an array of `layer.User` instances, and a `client.findUser(id)` call for retreiving a User object by ID.  At this time there is no code within the framework that depends upon use of the `layer.User` object, nor the `users` property.

```javascript
client.users = [
    new layer.User({displayName: 'Fred', id: 'fred.flinstone@ancients.com', data: {custom-data}}),
    new layer.User({displayName: 'Frodo', id: 'frodo.baggins@gandalf-fan-club.org', data: {custom-data}})
];
```

The user object automatically looks for any Direct Message conversations between the currently authenticated user and the user represented by the layer.User instance and sets it in the `layer.User` `conversation` property.  When rendering a User list, this helps to provide information about last messages, unread message counts, etc... related to each user in the list.

## Testing

To run unit tests use the following command:

    npm test

## Contributing

Layer Web SDK is an Open Source project maintained by Layer, inc. Feedback and contributions are always welcome and the maintainers try to process patches as quickly as possible. Feel free to open up a Pull Request or Issue on Github.

## Contact

Layer Web SDK was developed in San Francisco by the Layer team. If you have any technical questions or concerns about this project feel free to reach out to engineers responsible for the development:

* [Michael Kantor](mailto:michael@layer.com)
* [Nil Gradisnik](mailto:nil@layer.com)
