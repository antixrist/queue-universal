var _ = {};

/**
 * Logger
 */
_.log = function (prefix) {
  prefix = prefix.toString() || null;

  return function () {
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

      if (prefix) { args.unshift(['[', prefix, ']'].join()); }

      console[consoleMethod].apply(console, args);
    }
  };
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
//_.runWithPromise = function (func, args, thisArg) {
//  var resolve;
//  var reject;
//  var promise = new Promise(function (_resolve, _reject) {
//    resolve = _resolve;
//    reject = _reject;
//  });
//
//  func = (_utils.isFunction(func)) ? func : function () {};
//  args = _.toArray(args || []);
//  thisArg = thisArg || null;
//
//  var callback = function () {
//    var args = _.toArray(arguments);
//
//    resolve(args);
//    //if (args[0]) {
//    //  reject(new Error(args[0]));
//    //} else {
//    //  resolve(args.slice(1));
//    //}
//  };
//
//  console.log('args', args);
//
//  args.push(callback);
//
//  var result = func.apply(thisArg, args);
//  if (typeof result != 'undefined') {
//    resolve(result);
//  }
//
//  return promise;
//};

/**
 * @param {{}} [funcContext]
 * @param {[]} [funcArgs]
 * @param {Function} [func]
 * @param {Function} [cb]
 */
_.runSyncAsync = function (funcContext, funcArgs, func, cb) {
  var args = _.toArray(arguments);

  funcContext = null;
  funcArgs = [];
  func = _.noop;
  cb = _.noop;

  switch (args.length) {
    case 4:
      // runSyncAsync(funcContext, funcArgs, function func () {}, function cb () {});
      funcContext = args[0];
      if (_.isArray(args[1])) {
        funcArgs = args[1];
      }
      if (typeof args[2] == 'function') {
        func = args[2];
      }
      if (typeof args[3] == 'function') {
        cb = args[3];
      }

      break;
    case 3:
      // runSyncAsync(funcArgs, function func () {}, function cb () {});
      if (_.isArray(args[0])) {
        funcArgs = args[0];
      }

      // runSyncAsync(funcContext, function func () {}, function cb () {});
      else {
        funcContext = args[0];
      }

      if (typeof args[1] == 'function') {
        func = args[1];
      }
      if (typeof args[2] == 'function') {
        cb = args[2];
      }

      break;
    case 2:
      // runSyncAsync(function func () {}, function cb () {});
      if (typeof args[0] == 'function') {
        func = args[0];

        if (typeof args[1] == 'function') {
          cb = args[1];
        }
      }

      // runSyncAsync(funcArgs, function func () {});
      else if (_.isArray(args[0])) {
        funcArgs = args[0];

        if (typeof args[1] == 'function') {
          func = args[1];
        }
      }

      // runSyncAsync(funcContext, function func () {});
      else {
        funcContext = args[0];

        if (typeof args[1] == 'function') {
          func = args[1];
        }
      }

      break;
    case 1:
      // runSyncAsync(function () {});

      if (typeof args[0] == 'function') {
        func = args[0];
      }

      break;
    default:
        throw new Error('[runSyncAsync] Invalid arguments list');
      break;
  }

  cb.runSyncAsyncRunned = false;

  var callback = (function (cb) {
    return function () {
      if (cb.runSyncAsyncRunned) {
        delete cb.runSyncAsyncRunned;
      } else {
        cb.runSyncAsyncRunned = true;
        cb.apply(null, arguments);
      }
    }
  })(cb);

  funcArgs.push(callback);

  var result = func.apply(funcContext, funcArgs);
  if (cb.runSyncAsyncRunned) {
    delete cb.runSyncAsyncRunned;
  } else if (typeof result != 'undefined') {
    cb.runSyncAsyncRunned = true;
    cb.apply(null, [result]);
  }
};


module.exports = _;