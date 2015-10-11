var root = this;
var _extend = require('extend');
var _ = require('../helpers');
var _url = require('url');
var _utils = require('util');
var PageParser = require('./page-parser');

var _defaults = {};

/**
 *
 * @param {string} startUrl
 * @param {PageParser} PageParserFactory
 * @returns {bluebird}
 * @constructor
 */
var TabularDataParser = function (startUrl, PageParserFactory) {
  if (!(this instanceof TabularDataParser)) {
    return new (TabularDataParser.bind.apply(TabularDataParser, arguments));
  }

  if (!startUrl) {
    throw new Error('[TabularDataParser] "startUrl" is required!');
  }

  if (!(PageParserFactory instanceof PageParser)) {
    throw new Error('[TabularDataParser] "PageParserFactory" must be instanceof PageParser!');
  }

  this.pages = [];
  this.data = [];
  this.pagesData = {};
  this.startUrl = startUrl;
  this.PageParserFactory = PageParserFactory;

  return this.getData();
};

/**
 * @returns {bluebird}
 */
TabularDataParser.prototype.getData = function () {
  var self = this;

  return _.runWithPromise(this.get$rows, [this.get$()], this).then(function ($rows) {
    if (!($rows instanceof _cheerio)) {
      return new Error('You must return a "Cheerio" instance in "get$rows" method');
    }
    self.$rows = $rows;

    var promises = [];
    self.$rows.each(function (index, node) {
      var $row = $(node);
      var promise = _.runWithPromise(self.getRowData, [$row, index], self);

      promises.push(promise);
    });

    return promises;
  })
  .each(function (row) {
    self.data.push(row);
  })
  .catch(function (err) { throw err; })
  .then(function () {
    return self.data;
  });
};

/**
 * @returns {Cheerio}
 */
TabularDataParser.prototype.get$ = function () {
  return this.$;
};

/**
 * @param {string} url
 * @returns {string}
 */
TabularDataParser.prototype.resolveUrl = function (url) {
  return _url.resolve(this.startUrl, url || '');
};


/**
 * @param {Cheerio} $
 * @param {Function} cb
 * @returns {Cheerio}
 * @abstract
 */
TabularDataParser.prototype.get$rows = function ($, cb) {};

/**
 * @param {Cheerio} $
 * @param {Function} cb
 * @returns {string|false|null}
 * @abstract
 */
TabularDataParser.prototype.getNextPageUrl = function ($, cb) {};

/**
 * @param {Cheerio} $row
 * @param {Number} index
 * @param {Function} cb
 * @returns {{}}
 * @abstract
 */
TabularDataParser.prototype.getRowData = function ($row, index, cb) {};

/**
 * @param {{get$rows:Function, getNextPageUrl:Function, getRowData:Function}} methods
 * @param {string} [options]
 * @returns {Function}
 * @constructor
 */
var Factory = function (methods, options) {
  if (this instanceof Factory) {
    return (Factory.bind.apply(Factory, arguments));
  }

  methods = (!_utils.isObject(methods)) ? methods : {};
  options = (!_utils.isObject(options)) ? options : {};
  options = _extend(true, {}, _defaults, options);

  var PageParserFactory = function () {
    if (!(this instanceof PageParserFactory)) {
      return new (PageParserFactory.bind.apply(PageParserFactory, arguments));
    }

    TabularDataParser.apply(this, arguments);
  };
  _utils.inherits(PageParserFactory, TabularDataParser);

  PageParserFactory.prototype = _extend(PageParserFactory.prototype, methods, {options: options});

  return PageParserFactory;
};

module.exports = Factory;

