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


module.exports = _;