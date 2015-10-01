var td = require('throttle-debounce');
var extend = require('extend');

var throttle = td.throttle;
var debounce = td.debounce;


var fn = throttle(1000, function () {
  console.log('exec!');
});
setInterval(fn, 50);


var _defaults = {
  interval: 200, // or function. function must return integer
  concurrency: 1,
};

