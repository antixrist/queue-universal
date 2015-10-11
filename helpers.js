var _utils = require('util');
var Promise = require('bluebird');

var _ = {};

/**
 * Logger
 */
_.log = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  var consoleMethod = null;
  if (console) {
    if (typeof console.info != 'undefined') {
      consoleMethod = 'info';
    } else if (typeof console.log != 'undefined') {
      consoleMethod = 'log';
    }
  }

  if (consoleMethod) {
    console[consoleMethod].apply(console, ['[ThrottledConcurrentQueue]'].concat(args));
  }
};

/**
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
_.random = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Plug function
 */
_.noop = function () {};

/**
 * Positive plug function
 * @returns {boolean}
 */
_.noopPositive = function () { return true; };

/**
 * Return current timestamp in milliseconds
 * @returns {Number}
 */
_.getTime = function () {
  if (!Date.now) {
    Date.now = function now() {
      return (new Date()).getTime();
    };
  }
  return Date.now();
};

/**
 * @param raw
 * @returns {Array}
 */
_.toArray = function (raw) {
  if (!raw) {
    return [];
  }
  return Array.prototype.slice.call(raw, 0);
};

/**
 * @param arg
 * @returns {boolean}
 */
_.isArray = function (arg) {
  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  return Array.isArray(arg);
};

/**
 * @param array
 * @returns {Array}
 */
_.methods = function (array) {
  array = (_.isArray(array)) ? array : [];

  return array.filter(function (item) {
    return typeof item === 'function';
  });
};

/**
 * Pause runtime synchronous
 *
 * @param {Number} timeout In milliseconds
 */
_.waitSync = function (timeout) {
  timeout = parseInt(timeout, 10);
  timeout = timeout || 0;

  var start = _.getTime();
  while (_.getTime() - start < timeout);
};

/**
 * Run function and return Promise instance (bluebird)
 *
 * @param {Function} func
 * @param {[]} [args]
 * @param {{}|*} [thisArg]
 * @returns {bluebird}
 */
_.runWithPromise = function (func, args, thisArg) {
  var resolve;
  var reject;
  var promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
  });

  func = (_utils.isFunction(func)) ? func : function () {};
  args = _.toArray(args || []);
  thisArg = thisArg || null;

  var callback = function () {
    var args = _.toArray(arguments);

    if (args[0]) {
      reject(new Error(args[0]));
    } else {
      resolve(args.slice(1));
    }
  };

  console.log('args', args);

  args.push(callback);

  var result = func.apply(thisArg, args);
  if (typeof result != 'undefined') {
    resolve(result);
  }

  return promise;
};


module.exports = _;