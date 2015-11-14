(function (undefined) {
  var root = this;
  var Extend = require('extend');
  var EventEmitter = require('events').EventEmitter;
  var Utils = require('util');
  var _ = require('./helpers');

  /**
   * If "interval" is a {Function} then they must be return a {Number}.
   * @type {{concurrency: number, intervalByStart: number|Function, intervalByFinished: number|Function}}
   * @private
   */
  var defaults = {
    concurrency: 0,
    intervalByStart: 0,
    intervalByFinished: 0,
  };

  /**
   * @param {{concurrency: number, intervalByStart: number|Function, intervalByFinished: number|Function}} options
   * @returns {UniversalQueue}
   * @extends EventEmitter
   * @constructor
   */
  var UniversalQueue = function ThrottledConcurrentQueue$ (options) {
    if (!(this instanceof UniversalQueue)) {
      return new UniversalQueue(options);
    }

    EventEmitter.call(this);

    this._defaults = defaults;
    this.options = {};

    this._setDefaults();
    this.setOptions(defaults);
    this.setOptions(options || {});

    return this;
  };
  Utils.inherits(UniversalQueue, EventEmitter);

  Extend(UniversalQueue.prototype, {

    _setDefaults: function _setDefaults$ () {
      this._state = {
        paused: false,
        stopped: true
      };

      this.lastTaskRunnedTime = 0;
      this.lastTaskFinishedTime = 0;

      this.tasks = [];
      this.tasksInProgress = [];
      this.tasksFinished = [];
      this.tasksIndex = 0;
      this._updateLength();
    },

    _refreshDefaults: function _setDefaults$ () {
      this._state = {
        paused: false,
        stopped: true
      };

      this.lastTaskRunnedTime = 0;
      this.lastTaskFinishedTime = 0;

      this.tasksIndex = 0;
      this.tasksInProgress = [];
      this.tasksFinished = [];
      this._updateLength();
    },

    _updateLength: function _updateLength$ () {
      this.length = this.tasks.length;
    },

    nextTaskAllowed: function nextTaskAllowed$ () {
      var currentTime = _.getTime(),
          intervalByStart = this._getInterval(this.options.options),
          intervalByFinished = this._getInterval(this.options.intervalByFinished);

      if (!this.tasks.length ||
          this.isPaused() || this.isStopped() ||
          // check by concurrency
          (this.options.concurrency && this.tasksInProgress.length >= this.options.concurrency) ||
          // check by intervalByStart
          (currentTime - this.lastTaskRunnedTime) < intervalByStart ||
          // check by intervalByFinished
          (currentTime - this.lastTaskFinishedTime) < intervalByFinished
      ) { return false; }

      return true;
    },

    nextTask: function nextTask$ () {
      if (!this.nextTaskAllowed()) { return; }

      var self = this;
      var delay = this._getDelayForNextTask();

      if (delay) {

        setTimeout(function () {
          if (!self.nextTaskAllowed()) { return; }

          self._nextTask();
        }, delay);

      } else {

        //process.nextTick(function () {
        setImmediate(function () {
          if (!self.nextTaskAllowed()) { return; }

          self._nextTask();
        });

      }
    },

    _getDelayForNextTask: function _getDelayForNextTask$ () {
      var delay = 0;
      var currentTime = _.getTime();

      if (!this.tasks.length) { return delay; }

      var delayByStart = 0, delayByFinished = 0, reserveTime = 15,
          intervalByStart = this._getInterval(this.options.options),
          intervalByFinished = this._getInterval(this.options.intervalByFinished);

      if ((currentTime - this.lastTaskRunnedTime) < intervalByStart) {
        delayByStart = intervalByStart + (currentTime - this.lastTaskRunnedTime) + reserveTime;
      }
      if ((currentTime - this.lastTaskFinishedTime) < intervalByFinished) {
        delayByFinished = intervalByFinished + (currentTime - this.lastTaskFinishedTime) + reserveTime;
      }

      delay = (delayByStart > delayByFinished) ? delayByStart : delayByFinished;

      return delay;
    },


    /**
     * @private
     */
    _nextTask: function _nextTask$ () {
      var currentTime = _.getTime();
      var task = this.shift();

      var taskInfo = {};
      taskInfo.index = null;
      taskInfo.started_at = currentTime;
      taskInfo.finished_at = null;

      this.lastTaskRunnedTime = currentTime;
      this.tasksInProgress.push(task);

      this.emit('task:start', task);

      var self = this;
      _.runSyncAsync(task, (function (task, taskInfo) { return function () {
        var args = _.toArray(arguments);
        var currentTime = _.getTime();

        taskInfo.index = self.tasksIndex++;
        taskInfo.finished_at = currentTime;
        self.lastTaskFinishedTime = currentTime;

        // todo: протестировать работу indexOf
        self.tasks.splice(self.tasks.indexOf(task), 1);
        self.tasksInProgress.splice(self.tasksInProgress.indexOf(task), 1);
        self.tasksFinished.push(task);

        self.emit.apply(self, ['task:end'].concat(args).concat([taskInfo, task]));

        if (!self.tasksInProgress.length) {
          if (self.isPaused()) {
            self.emit('paused');
          }

          if (!self.tasks.length) {
            self.emit('empty');

            if (self.isStopped()) {
              self.emit('stopped');
            }
          }
        }

        self.nextTask();
      }; })(task, taskInfo));
    },

    // Public API
    /**
     * @param {{}} options
     */
    setOptions: function setOptions$ (options) {
      options = Utils.isObject(options) ? options : {};
      this.options = Extend(true, this.options, options);

      this.options.concurrency = parseInt(this.options.concurrency, 10);
      if (!Utils.isNumber(this.options.concurrency) || isNaN(this.options.concurrency) || this.options.concurrency < 0) {
        this.options.concurrency = 1;
      }

      return this.options;
    },

    _getInterval: function _getInterval$ (interval) {
      if (!interval) { return 0; }

      if (Utils.isFunction(interval)) {
        interval = interval.apply(this);
      }
      interval = Utils.isNumber(interval) ? parseInt(interval, 10) : 0;
      if (isNaN(interval) || interval < 0) {
        interval = 0;
      }

      return interval;
    },

    /**
     * @param {...Function|Array} [tasks]
     * @returns {UniversalQueue}
     */
    start: function start$ (tasks) {
      var args = _.toArray(arguments);

      this._refreshDefaults();
      this.push.apply(this, args);

      if (this.isPaused()) { return this.resume(); }
      if (!this.isStopped()) { return this; }

      this._state.paused = false;
      this._state.stopped = false;

      this.emit('start');
      this.nextTask();

      return this;
    },

    /**
     * @returns {UniversalQueue}
     */
    pause: function pause$ () {
      if (this.isPaused() || this.isStopped()) { return this; }

      this._state.paused = true;
      this._state.stopped = false;

      this.emit('pause');

      return this;
    },

    /**
     * @returns {UniversalQueue}
     */
    resume: function resume$ () {
      if (this.isStopped()) { return this.start(); }
      if (!this.isPaused()) { return this; }

      this._state.paused = false;
      this._state.stopped = false;

      this.emit('resume');
      this.nextTask();

      return this;
    },

    /**
     * @returns {UniversalQueue}
     */
    stop: function shutdown$ () {
      if (this.isStopped()) { return this; }

      this._state.paused = false;
      this._state.stopped = true;

      this.emit('stop');

      return this;
    },

    /**
     * @returns {boolean}
     */
    isPaused: function isPaused$ () {
      return this._state.paused;
    },

    /**
     * @returns {boolean}
     */
    isStopped: function isStopped$ () {
      return this._state.stopped;
    },

    /**
     * @returns {Array}
     */
    getTasks: function getTasks$ () {
      return this.tasks;
    },

    /**
     * @returns {Array}
     */
    getTasksInProgress: function getTasksInProgress$ () {
      return this.tasksInProgress;
    },

    /**
     * @returns {Array}
     */
    getTasksFinished: function getTasksInProgress$ () {
      return this.tasksFinished;
    },

    /**
     * Proxy for Array.prototype.push
     *
     * @param {...Function} tasks
     * @returns {Number}
     */
    push: function push$ (tasks) {
      var newTasks = _.methods(_.toArray(arguments));
      var length = Array.prototype.push.apply(this.tasks, newTasks);
      this._updateLength();

      this.nextTask();

      return length;
    },

    /**
     * Proxy for Array.prototype.unshift
     *
     * @param {...Function} [tasks]
     * @returns {Number}
     */
    unshift: function unshift$ (tasks) {
      var newTasks = _.methods(_.toArray(arguments));
      var result = Array.prototype.unshift.apply(this.tasks, newTasks);
      this._updateLength();

      this.nextTask();

      return result;
    },

    /**
     * Proxy for Array.prototype.shift
     *
     * @returns {Function|undefined}
     */
    shift: function shift$ () {
      var result = this.tasks.shift();
      this._updateLength();

      return result;
    },

    /**
     * Proxy for Array.prototype.pop
     *
     * @returns {Function|undefined}
     */
    pop: function pop$ () {
      var result = this.tasks.pop();
      this._updateLength();

      return result;
    },

    /**
     * Proxy for Array.prototype.reverse
     *
     * @returns {Array}
     */
    reverse: function reverse$ () {
      this.tasks.reverse();

      return this.getTasks();
    },

    /**
     * Proxy for Array.prototype.slice
     *
     * @param {Number} [start]
     * @param {Number} [end]
     * @return {Array}
     */
    slice: function slice$ (start, end) {
      return Array.prototype.slice.apply(this.tasks, _.toArray(arguments));
    },

    /**
     * Proxy for Array.prototype.splice
     *
     * @param {Number} [start]
     * @param {Number} [deleteCount]
     * @param {...Function} [tasks]
     * @return {Array}
     */
    splice: function splice$ (start, deleteCount, tasks) {
      var _tasks = [];
      var args = _.toArray(arguments);

      if (args.length > 2) {
        _tasks = _.methods(args.slice(2));
        args = Array.prototype.push.apply(args, _tasks);
      }

      var deletedTasks = Array.prototype.splice.apply(this.tasks, args);
      this._updateLength();

      this.nextTask();

      return deletedTasks;
    },

    /**
     * Proxy for Array.prototype.indexOf
     *
     * @param {*} searchElement
     * @param {number} [fromIndex]
     * @return {number}
     */
    indexOf: function indexOf$ (searchElement, fromIndex) {
      return Array.prototype.indexOf.apply(this.tasks, arguments);
    },

    /**
     * Proxy for Array.prototype.indexOf
     *
     * @param {*} searchElement
     * @param {number} [fromIndex]
     * @return {number}
     */
    lastIndexOf: function lastIndexOf$ (searchElement, fromIndex) {
      return Array.prototype.lastIndexOf.apply(this.tasks, arguments);
    },
  });


  if (typeof window == 'object' && this === window) {
    root = window;
  } else if (typeof global == 'object' && this === global) {
    root = global;
  }

  // Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalQueue;
  } else
  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define([], function () {
      return UniversalQueue;
    });
  }
  // included directly via <script> tag
  else {
    root.ThrottledConcurrentQueue = UniversalQueue;
  }

})();