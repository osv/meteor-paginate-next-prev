/*global PaginatePrevNext, _, check, Match, Meteor */

/* jshint -W020 */

var CHECK_OPTIONS = {
  name:          String,
  collection:    Meteor.Collection,
  subscribe:     Match.Optional(Boolean),
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

var methodsCount = 0;
PaginatePrevNext = function(options) {
  if (! (this instanceof PaginatePrevNext)) {
    throw new Meteor.Error('missing-new', 'PaginatePrevNext instance has to be initiated with `new`');
  }

  check(options, CHECK_OPTIONS);

  this._settings = _.extend({
    limitMin: 1,
    limitMax: 10,
    limit: 10,
  }, options);

  methodsCount = methodsCount + 1;
  var name = this._settings.name;

  this._methodNameSet = 'pg-set-' + name;
  this._subscribeNameCurrent = 'pg-sub-' + name + '-current';

  if (Meteor.isClient) {
    this.initDefault();
    if (options.subscribe) {
      this.initSubscribtions();
    }
  }

  if (Meteor.isServer) {
    this._initMethods()
    if (options.subscribe) {
      this.initPublish();
    }
  }

};

var KV_RE = /(.*?)=(.*)/,
    // smplified regexp
    ISO_DATE_TEST_RE = /\d+-\d+-\d+T\d+:\d+:\d+/;

_.extend(PaginatePrevNext.prototype, {
  sorterByName: function(sorterName) {
    return _.findWhere(this._settings.sortsBy, {name: sorterName});
  },

  error: function(code, msg) {
    msg = msg || code;
    throw new Meteor.Error(code, 'PaginatePrevNext: ' + msg);
  },
});
