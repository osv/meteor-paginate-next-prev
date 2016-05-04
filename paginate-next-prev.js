/*global PaginatePrevNext, _, check, Match, Meteor, console */

/* jshint -W020 */

// Names for prev, current, next pages that used in dictionary, etc
var I_PREV = 'prev',
    I_NEXT = 'next',
    I_CURRENT = 'current';

var CHECK_OPTIONS = {
  name:          String,
  collection:    Meteor.Collection,
  subscribe:     Match.Optional(Boolean),
  subscribePrecache: Match.Optional(
    Match.OneOf(Boolean, [Match.OneOf(I_PREV, I_CURRENT, I_NEXT)])),
  limitMin:      Match.Optional(Number),
  limit:         Match.Optional(Number), // default limit
  limitMax:      Match.Optional(Number),
  fields:        Match.Optional(Match.OneOf(Object, Function)),
  onAuth:        Match.Optional(Function),
  onQueryCheck:  Match.Optional(Function),
  sortsBy: [{
    name:   String,
    init:   Match.Optional(Function),
    field:  String,
    abc:    Match.Optional(Boolean)
  }]
};

PaginatePrevNext = function(options) {
  if (! (this instanceof PaginatePrevNext)) {
    throw new Meteor.Error('missing-new', 'PaginatePrevNext instance has to be initiated with `new`');
  }

  check(options, CHECK_OPTIONS);

  this._settings = _.extend({
    limitMin: 1,
    limitMax: 10,
    limit: 10,
    subscribePrecache: true,
  }, options);

  // decide what allow to sub/pub
  var precacheOpt = this._settings.subscribePrecache;
  if (_.isBoolean(precacheOpt)) {
    this.subPages = precacheOpt ? [I_CURRENT, I_PREV, I_NEXT] : [I_CURRENT];
  } else {
    this.subPages = _.uniq([I_CURRENT].concat(precacheOpt));
  }

  var name = this._settings.name;

  this._methodNameSet = 'pg-set-' + name;
  this._subscribeNamePrefix = 'pg-sub-' + name + '_';

  if (Meteor.isClient) {
    this.initDefault();
    if (options.subscribe) {
      this.initSubscribtions();
    }
  }

  if (Meteor.isServer) {
    this._initMethods();
    if (options.subscribe) {
      this._initPublish();
    }
  }

};

// Page names
// Don't change order, see -client.js code
PaginatePrevNext.PAGE_NAMES = [I_PREV, I_CURRENT, I_NEXT];

_.extend(PaginatePrevNext.prototype, {
  sorterByName: function(sorterName) {
    return _.findWhere(this._settings.sortsBy, {name: sorterName});
  },

  error: function(code, msg) {
    msg = msg || code;
    throw new Meteor.Error(code, 'PaginatePrevNext: ' + msg);
  },

  debug: function() {
    if (PaginatePrevNext.debug) {
      var prefix = ['PG "' + this._settings.name + '"'],
          args = [].slice.call(arguments, 0);
      console.log.apply(console, prefix.concat(args));
    }
  }
});
