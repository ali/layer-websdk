/* istanbul ignore next */
"use strict";

if (!global.layer) global.layer = {};
if (!global.layer.plugins) global.layer.plugins = {};

var layer = global.layer;
layer.Root = require('./lib/root');
layer.Client = require('./lib/client');
layer.ClientAuthenticator = require('./lib/client-authenticator');
layer.Conversation = require('./lib/conversation');
layer.Message = require('./lib/message');
layer.MessagePart = require('./lib/message-part');
layer.Query = require('./lib/query');
layer.QueryBuilder = require('./lib/query-builder');
layer.xhr = require('./lib/xhr');
layer.User = require('./lib/user');
layer.LayerError = require('./lib/layer-error');
layer.LayerEvent = require('./lib/layer-event');
layer.Content = require('./lib/content');
layer.SyncManager = require('./lib/sync-manager');
layer.SyncEvent = require('./lib/sync-event').SyncEvent;
layer.XHRSyncEvent = require('./lib/sync-event').XHRSyncEvent;
layer.WebsocketSyncEvent = require('./lib/sync-event').WebsocketSyncEvent;
layer.WebsocketManager = require('./lib/websocket-manager');
layer.OnlineStateManager = require('./lib/online-state-manager');
layer.Constants = require('./lib/const');
layer.Util = require('./lib/client-utils');
layer.TypingIndicators = require('./lib/typing-indicators/typing-indicators');
layer.TypingIndicators.TypingListener = require('./lib/typing-indicators/typing-listener');
layer.TypingIndicators.TypingPublisher = require('./lib/typing-indicators/typing-publisher');
module.exports = layer;
