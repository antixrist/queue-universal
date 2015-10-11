var root = this;
var _extend = require('extend');
var _ = require('../helpers');
var _cheerio = require('cheerio');
var _url = require('url');
var _utils = require('util');

var _defaults = {};

/**
 *
 * @param {string|Cheerio} html
 * @param {string} baseUrl
 * @returns {bluebird}
 * @constructor
 */
var PageParser = function (html, baseUrl) {
  if (!(this instanceof PageParser)) {
    return new (PageParser.bind.apply(PageParser, arguments));
  }

  this.data = [];
  this.$rows = [];

  if (!html) {
    throw new Error('[PageParser] "html" is required!');
  }
  if (!baseUrl) {
    throw new Error('[PageParser] "baseUrl" is required!');
  }

  this.startUrl = baseUrl;
  this.set$(html);

  return this.getData();
};

/**
 * @param {string|Cheerio} html
 */
PageParser.prototype.set$ = function (html) {
  if (html instanceof _cheerio) {
    this.$ = html;
  } else {
    this.$ = _cheerio.load(html);
  }

  this.data = [];
  this.$rows = [];
};

/**
 * @returns {bluebird}
 */
PageParser.prototype.getData = function () {
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
PageParser.prototype.get$ = function () {
  return this.$;
};

/**
 * @param {string} url
 * @returns {string}
 */
PageParser.prototype.resolveUrl = function (url) {
  return _url.resolve(this.startUrl, url || '');
};


/**
 * @param {Cheerio} $
 * @param {Function} cb
 * @returns {Cheerio}
 * @abstract
 */
PageParser.prototype.get$rows = function ($, cb) {};

/**
 * @param {Cheerio} $
 * @param {Function} cb
 * @returns {string|false|null}
 * @abstract
 */
PageParser.prototype.getNextPageUrl = function ($, cb) {};

/**
 * @param {Cheerio} $row
 * @param {Number} index
 * @param {Function} cb
 * @returns {{}}
 * @abstract
 */
PageParser.prototype.getRowData = function ($row, index, cb) {};

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

    PageParser.apply(this, arguments);
  };
  _utils.inherits(PageParserFactory, PageParser);

  PageParserFactory.prototype = _extend(PageParserFactory.prototype, methods, {options: options});

  return PageParserFactory;
};

module.exports = Factory;

