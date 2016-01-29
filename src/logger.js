/**
 * @class layer.Logger
 * @private
 *
 */
const { DEBUG, INFO, WARN, ERROR } = require('./const').LOG;
const { isEmpty } = require('./client-utils');
const LayerCss = 'color: #888; font-weight: bold;';
const Black = 'color: black';

class Logger {
  log(msg, obj, type, color) {
    if (typeof msg === 'string') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`%cLayer%c ${type}%c [${timestamp}]: ${msg}`, LayerCss, `color: ${color}`, Black);
    } else {
      this._logObj(msg, type, color);
    }
    if (obj) this._logObj(obj, type, color);
  }

  _logObj(obj, type, color) {
    if (!obj || isEmpty(obj)) return;
    if (obj.constructor.name === 'Object') {
      console.log(`%cLayer%c ${type}%c: ${JSON.stringify(obj, null, 4)}`, LayerCss, `color: ${color}`, Black);
    } else {
      console.log(`%cLayer%c ${type}%c: %O`, LayerCss, `color: ${color}`, Black, obj);
    }
  }

  debug(msg, obj) {
    if (this.level >= DEBUG) this.log(msg, obj, 'DEBUG', '#888');
  }

  info(msg, obj) {
    if (this.level >= INFO) this.log(msg, obj, 'INFO', 'black');
  }

  warn(msg, obj) {
    if (this.level >= WARN) this.log(msg, obj, 'WARN', 'orange');
  }

  error(msg, obj) {
    if (this.level >= ERROR) this.log(msg, obj, 'ERROR', 'red');
  }
}

Logger.prototype.level = ERROR;

const logger = new Logger();

module.exports = logger;
