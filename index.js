(function (undefined) {
  var _extend = require('extend');
  var _EventEmitter = require('events').EventEmitter;
  var _utils = require('util');
  var _ = require('./helpers');

  /**
   * If "interval" is a {Function} then they must be return a {Number}.
   * @type {{concurrency: number, interval: number|Function}}
   * @private
   */
  var _defaults = {
    concurrency: 1,
    interval: 200
  };

  /**
   * @param {{concurrency: number, interval: number|Function}} _options
   * @returns {ThrottledConcurrentQueue}
   * @extends _EventEmitter
   * @constructor
   */
  var ThrottledConcurrentQueue = function (_options) {
    if (!(this instanceof ThrottledConcurrentQueue)) {
      return new ThrottledConcurrentQueue(_options);
    }

    _EventEmitter.call(this);

    this.setOptions(_options);
    this._setDefaults();

    return this;
  };
  _utils.inherits(ThrottledConcurrentQueue, _EventEmitter);

  _extend(ThrottledConcurrentQueue.prototype, {

    _setDefaults: function () {
      this._state = {
        paused: false,
        stopped: true
      };

      this._started_at = 0;
      this._paused_at = 0;
      this._resumed_at = 0;
      this._stopped_at = 0;

      this._stopCount = 0;
      this._pauseCount = 0;

      this._stats = [];
      this._statsDefault = {
        started_at: 0,
        stopped_at: 0,
        payloadTime: 0,
        idleTime: 0,
        pausedTime: 0,
        stoppedTime: 0,
        allTime: 0,

        pauseCount: 0,
        stopCount: 0,

        tasksCount: 0,
        tasksFinishedCount: 0
      };

      this._tasks = [];
      this._tasksInProgress = [];
      this._tasksFinishedCount = 0;
      this._updateLength();
    },

    _updateLength: function () {
      this.length = this._tasks.length;
    },

    _getInterval: function () {
      var interval = this._options.interval;
      if (_utils.isFunction(interval)) {
        interval = interval();
      }
      interval = (_utils.isNumber(interval)) ? interval : 0;

      return interval;
    },

    _nextTask: function () {
      var self = this;
      if (!this.length || this._tasksInProgress >= this._options.concurrency || this._itPaused ||
          (_.getTime() - this._lastTimeRunned) < this._getInterval()
      ) { return; }

      setImmediate(function () {
        var task = self.shift();
        task._started_at = _.getTime();
        self._lastTimeRunned = task._started_at;
        self._tasksInProgress++;
        self.emit('task:start');

        var taskHandler = self._getTaskHandler(task);
        taskHandler(task(self._getTaskCallback(taskHandler)));
      });
    },

    _getTaskHandler: function (task, itWasAsync) {
      var self = this;
      itWasAsync = !!itWasAsync;


      return this._handleTask;
    },

    _getTaskCallback: function (taskHandler) {
      var self = this;

      return function () {
        var args = _.toArray(arguments);
        if (args.length === 1 && _.isArray(args[0])) {
          args = [args];
        }

        taskHandler.apply(self, args);
      };
    },

    _handleTask: function (task, args) {
      if (typeof args != 'undefined' && !_.isArray(args)) {
        args = [args];
      }
      args = (_.isArray(args)) ? args : [];

      this._tasksInProgress--;
      this._finishedLength++;

      args.unshift('task:end');
      this.emit.apply(null, args);

      if (!this._tasksInProgress && !this.length) {
        this.emit('empty');
      }

      this._nextTask();
    },

    _shutdown: function () {

    },

    _getDefaultStats: function () {
      return _extend({}, this._statsDefault)
    },

    _getCurrentStats: function () {
      this._stats[this._stopCount] = this._stats[this._stopCount] || this._getDefaultStats();
      return this._stats[this._stopCount];
    },

    _updateStats: function () {
      var changed = {};
      var stats = this._getCurrentStats();
      this._previousStates = this._previousStates || false;

      if (!this._previousStates) {
        // started
        stats.started_at = this._started_at;
      } else {

        for (var state in this._state) if (this._state.hasOwnProperty(state)) {
          if (typeof this._previousStates[state] == 'undefined') {

          } else {
            changed[state] = (this._previousStates[state] != this._state[state]);
          }
        }

        if (changed.paused) {
          if (this.isPaused()) {
            // paused
            stats.paused_at = this._paused_at;
          } else {
            // resumed
            stats.resumed_at = this._resumed_at;
          }
        }

        if (changed.stopped) {
          if (this.isStopped()) {
            // stopped
            stats.stopped_at = this._stopped_at;

            if (changed.paused) {
              // it was paused without resume

            } else {

            }
          } else {
            // started again
            stats.started_at = this._started_at;

          }
        }

      }

      //this._started_at = 0;
      //this._paused_at = 0;
      //this._resumed_at = 0;
      //this._stopped_at = 0;
      //
      //this._stopCount = 0;
      //this._pauseCount = 0;
      //
      //this._stats = [];
      //this._statsDefault = {
      //  started_at: 0,
      //  stopped_at: 0,

      //  pausedTime: 0,
      //  stoppedTime: 0,
      //  payloadTime: 0,
      //  idleTime: 0,
      //  allTime: 0,
      //
      //  pauseCount: 0,
      //  stopCount: 0,
      //
      //  tasksCount: 0,
      //  tasksFinishedCount: 0
      //};




      this._previousStates = _extend({}, this._state);
    },

    // Public API
    /**
     * @param {{}} _options
     */
    setOptions: function (_options) {
      this._options = (_utils.isObject(_options)) ? _extend(true, {}, _defaults, _options) : _defaults;

      if (!_utils.isNumber(this._options.concurrency) || isNaN(this._options.concurrency) || !isFinite(this._options.concurrency) || this._options.concurrency < 1) {
        this._options.concurrency = 1;
      }
    },

    /**
     * @param {...Function|Array} [tasks]
     * @returns {ThrottledConcurrentQueue}
     */
    start: function (tasks) {
      var args = _.toArray(arguments);
      this.push.apply(this, args);

      if (this.isPaused()) { return this.resume(); }
      if (!this.isStopped()) { return this; }

      this._state.paused = false;
      this._state.stopped = false;

      this._started_at = _.getTime();
      this._paused_at = 0;
      this._resumed_at = 0;
      this._stopped_at = 0;

      this.emit('start');
      setImmediate(this._nextTask());

      return this;
    },

    /**
     * @returns {ThrottledConcurrentQueue}
     */
    pause: function () {
      if (this.isPaused() || this.isStopped()) { return this; }

      this._state.paused = true;
      this._state.stopped = false;
      this._paused_at = _.getTime();
      this._resumed_at = 0;

      this.emit('pause');
      this._pauseCount++;

      return this;
    },

    /**
     * @returns {ThrottledConcurrentQueue}
     */
    resume: function () {
      if (this.isStopped()) { return this.start(); }
      if (!this.isPaused()) { return this; }

      this._state.paused = false;
      this._state.stopped = false;
      this._resumed_at = _.getTime();
      this._updateStats();

      this.emit('resume');
      setImmediate(this._nextTask());

      return this;
    },

    /**
     * @returns {ThrottledConcurrentQueue}
     */
    stop: function () {
      if (this.isStopped()) { return this; }

      this._state.paused = false;
      this._state.stopped = true;
      this._stopped_at = _.getTime();
      this._updateStats();

      this._shutdown();

      this.emit('stop');
      this._stopCount++;

      return this;
    },

    /**
     * @returns {boolean}
     */
    isPaused: function () {
      return this._state.paused;
    },

    /**
     * @returns {boolean}
     */
    isStopped: function () {
      return this._state.stopped;
    },

    /**
     * @returns {{}}
     */
    getStats: function () {
      var length = this._stats.length;
      var stats = this._getDefaultStats();

      this._stats.forEach(function (stat, index) {
        if (index === 0) {
          stats._started_at = stat._started_at;
        }
        if (index === (length - 1)) {
          stats._stopped_at = stat._stopped_at;
        }

        stats.pausedTime += stat.pausedTime;
        stats.stoppedTime += stat.stoppedTime;
        stats.payloadTime += stat.payloadTime;
        stats.idleTime += stat.idleTime;
        stats.allTime += stat.allTime;

        stats.tasksCount += stat.tasksCount;
        stats.tasksFinishedCount += stat.tasksFinishedCount;
      });

      stats.pauseCount = this._pauseCount;
      stats.stopCount = this._stopCount;

      return stats;
    },

    /**
     * @returns {Array}
     */
    getTasks: function () {
      return [].concat(this._tasks);
    },

    /**
     * @returns {Array}
     */
    getTasksInProgress: function () {
      return [].concat(this._tasksInProgress);
    },

    /**
     * Proxy for Array.prototype.push
     *
     * @param {...Function} tasks
     * @returns {Number}
     */
    push: function (tasks) {
      var newTasks = _.methods(_.toArray(arguments));
      var result = Array.prototype.push.apply(this._tasks, newTasks);
      this._updateLength();

      !!result && setImmediate(this._nextTask);

      return result;
    },

    /**
     * Proxy for Array.prototype.unshift
     *
     * @param {...Function} [tasks]
     * @returns {Number}
     */
    unshift: function (tasks) {
      var newTasks = _.methods(_.toArray(arguments));
      var result = Array.prototype.unshift.apply(this._tasks, newTasks);
      this._updateLength();

      !!result && setImmediate(this._nextTask);

      return result;
    },

    /**
     * Proxy for Array.prototype.shift
     *
     * @returns {Function|undefined}
     */
    shift: function () {
      var result = this._tasks.shift();
      this._updateLength();

      return result;
    },

    /**
     * Proxy for Array.prototype.pop
     *
     * @returns {Function|undefined}
     */
    pop: function () {
      var result = this._tasks.pop();
      this._updateLength();

      return result;
    },

    /**
     * Proxy for Array.prototype.reverse
     *
     * @returns {Array}
     */
    reverse: function () {
      this._tasks.reverse();

      return this.getTasks();
    },

    /**
     * Proxy for Array.prototype.slice
     *
     * @param {Number} [start]
     * @param {Number} [end]
     * @return {Array}
     */
    slice: function (start, end) {
      return [].concat(Array.prototype.slice.apply(this._tasks, _.toArray(arguments)));
    },

    /**
     * Proxy for Array.prototype.splice
     *
     * @param {Number} [start]
     * @param {Number} [deleteCount]
     * @param {...Function} [tasks]
     * @return {Array}
     */
    splice: function (start, deleteCount, tasks) {
      var newTasks = [];
      var args = _.toArray(arguments);

      if (args.length > 2) {
        newTasks = _.methods(args.slice(2));
        args = [start, deleteCount].concat(newTasks);
      }

      var result = Array.prototype.splice.apply(this._tasks, args);
      this._updateLength();

      !!newTasks.length && setImmediate(this._nextTask);

      return result;
    }

  });


  var root = this;
  if (typeof window == 'object' && this === window) {
    root = window;
  } else if (typeof global == 'object' && this === global) {
    root = global;
  }

  // Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThrottledConcurrentQueue;
  } else
  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define([], function () {
      return ThrottledConcurrentQueue;
    });
  }
  // included directly via <script> tag
  else {
    root.ThrottledConcurrentQueue = ThrottledConcurrentQueue;
  }

})();