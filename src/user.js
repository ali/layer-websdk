/**
 * Layer does not at this time have a concept of Users, so this class
 * is more of a convenience/utility than required use.
 *
 * The main conveniences provided by this class are that when
 * used in conjunction with the `client.users`  array,
 * and the `client.addUser(user)` method, each instance
 * will look for/monitor for Conversations that are direct
 * messages between the currently authenticated user and
 * the user represented by this User instance.
 *
 * This is useful if listing users and want to show their last
 * message or their unread message count.
 *
 *      client.addUser(new layer.User({
 *          displayName: 'Fred',
 *          id: 'fred1234',
 *          data: {
 *              a: 'a',
 *              b: 'b',
 *              lastName: 'Huh?'
 *          }
 *      }));
 *
 * The id will be what is used to find matching Conversations.
 *
 * displayName is not required, but is a convenient place
 * to store a displayable name.
 *
 * The data property contains an arbitrary javascript object
 * with any relevant details of your user.
 *
 * TODO: Replace client with clientId
 *
 * @class  layer.User
 * @extends layer.Root
 */
"use strict";
var Root = require("./root");
var Util = require("./client-utils");
class User extends Root {
    constructor(options) {
        super(options);
        this.on("all", this._clearObject, this);
    }

    /**
     * Sets the Client property.
     *
     * This is called as a side-effect of `client.addUser(user)`
     *
     * If you directly manipulate `client.users`, instead of calling
     * addUser(), you may need to call this method and set the client property.
     *
     * @method setClient
     * @param  {layer.Client} client
     */
    setClient(client) {
        if (client) {
            var conversations = Object.keys(client._conversationsHash).map(id => client.getConversation(id))
                .filter(function(c) {
                    return c.participants.length == 2 && c.participants.indexOf(this.id) != -1;
                }, this);

            Util.sortBy(conversations, function(conversation) {
                return conversation.lastMessage ? conversation.lastMessage.sentAt : null;
            }, true);
            if (conversations.length) {
                this.conversation = conversations[0];
            } else {
                client.on("conversations:add", this._checkNewConversation, this);
            }
        }
    }

    /**
     * Searches all new Conversations for matching Conversation.
     *
     * A matching Conversation is a direct message conversation
     * between this user and the client's authenticated user.
     *
     * If its a match, updates this.conversation and stops
     * listening for new Conversations.
     *
     * @method _checkNewConversation
     * @private
     * @param  {layer.LayerEvent} evt
     */
    _checkNewConversation(evt) {
        var conversations = evt.conversations;
        conversations.forEach(conversation => {
            if (conversation.participants.length == 2 && conversation.participants.indexOf(this.id) != -1) {
                this.conversation = conversation;
                conversation.client.off(null, null, this);
            }
        });
    }

    /**
     * Handles new values for the Conversation property.
     *
     * Any time a new Conversation is assigned to this property,
     * subscribe to its "destroy" event and trigger a "conversations:change"
     * event on this user.
     *
     * @method __updateConversation
     * @private
     * @param  {layer.Conversation} conversation
     * @param  {layer.Conversation} oldConversation
     */
    __updateConversation(conversation, oldConversation) {
        if (oldConversation) oldConversation.off(null, null, this);
        if (conversation) conversation.on("destroy", this._destroyConversation, this);
        this.trigger("conversations:change");
    }

    /**
     * If the Conversation is destroyed, this user has no Conversation.
     *
     * @method _destroyConversation
     * @private
     * @param  {layer.LayerEvent} evt
     */
    _destroyConversation(evt) {
        this.conversation = null;
    }

    toObject() {
        if (!this._toObject) {
            this._toObject = super.toObject();
        }
        return this._toObject;
    }

    _clearObject() { delete this._toObject;}
}

/**
 * Custom user data.
 *
 * This property has no built-in meaning; but is intended to let you store a custom data.
 * Initialize this via constructor:
 *
 *         new layer.User({
 *             data: {
 *                 age: 109,
 *                 nickName: "Freddy"
 *             },
 *             id: "fred"
 *         });
 *
 * @type {Object}
 */
User.prototype.data = null;

/**
 * Your User ID.
 *
 * This ID should match up with the IDs used in participants in Conversations;
 * such IDs are based on your own user IDs which are passed to the Layer services via Identity Tokens.
 * @type {String}
 */
User.prototype.id = "";

/**
 * Your user's displayable name.
 *
 * This property has no built-in meaning; but is intended to let you store a custom string
 * for how to render this user.  Initialize this via constructor:
 *
 *         new layer.User({
 *             displayName: "Freddy",
 *             id: "fred"
 *         });
 *
 * @type {String}
 */
User.prototype.displayName = "";

/**
 * CSS Class for user icon.
 *
 * This property has no built-in meaning; use this if your rendering engine needs this;
 * just pass it into the constructor;
 *
 *         new layer.User({
 *             iconClass: "unknown-face",
 *             id: "fred"
 *         });
 *
 * @type {String}
 */
User.prototype.iconClass = "";

/**
 * The User's Conversation.
 *
 * This property is managed by the user class and is set to always point to any matching Direct
 * Message conversation between this user and the currently authenticated user.  Useful
 * for rendering in a User List and showing unread counts, last message, etc...
 * Can also be used when selecting the user to quickly resume a Conversation.
 * @type {layer.Conversation}
 */
User.prototype.conversation = null;
User.prototype._toObject = null;

User._inObjectIgnore = [].concat(Root._inObjectIgnore);
User._supportedEvents = ["conversations:change"].concat(Root._supportedEvents);
Root.initClass.apply(User, [User, "User"]);

module.exports = User;
