try {
    var b = new Blob([atob("abc938a")], {type: "text/plain"});
} catch(e) {
    console.log("NO BLOBS FOUND");
    window.isPhantomJS = isPhantomJS = true;
}
oldBlob = window.Blob;
window.Blob = function Blob(data, options) {
    this.data = data;
    this.type = options.type;
    this.size = data[0].length;
};

window.FileReader = function FileReader() {
}
window.FileReader.prototype.readAsDataURL = function readAsDataURL(body) {
    this.result = Array.prototype.map.call(body.data[0], function(numb) {return numb;}).join('');
    if (this.onloadend) this.onloadend();
};
window.FileReader.prototype.readAsText = function readAsText(body) {
    this.result = Array.prototype.map.call(body.data[0], function(numb) {return numb;}).join('');
    if (this.onloadend) this.onloadend();
}
window.FileReader.prototype.addEventListener = function(name, callback) {this.onloadend = callback;}
window.FileReader.prototype.removeEventListener = function() {}

window.URL = function() {
}
window.URL.createObjectURL = function() {return "http://Doh.com"};
window.URL.revokeObjectURL = function() {};

window.WebSocket = function(url) {
  this.url = url;
};
window.WebSocket.CONNECTING = 0;
window.WebSocket.OPEN = 1;
window.WebSocket.CLOSING = 2;
window.WebSocket.CLOSED = 3;

window.WebSocket.prototype.readyState = window.WebSocket.CLOSED;

window.WebSocket.prototype.open = function() {
  this.readyState = window.WebSocket.CONNECTING;
  window.setTimeout(function() {
    this.readyState = window.WebSocket.OPEN;
    if (this.onOpen) this.onOpen();
  }.bind(this), 0);
}

window.WebSocket.prototype.close = function() {
  this.readyState = window.WebSocket.CLOSING;
  window.setTimeout(function() {
    this.readyState = window.WebSocket.CLOSED;
    if (this.onError) this.onError();
    if (this.onClose) this.onClose();
  }.bind(this), 0);
}

window.WebSocket.prototype.send = function() {};

window.WebSocket.prototype.addEventListener = function(name, func) {
  switch(name) {
    case 'open':
      return this.onOpen = func;
    case 'error':
      return this.onError = func;
    case 'close':
      return this.onClose = func;
  }
}
window.WebSocket.prototype.removeEventListener = function(name, func) {};
