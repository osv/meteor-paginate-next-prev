/*global Meteor, PaginatePrevNext, Match, check, _ */

_.extend(PaginatePrevNext.prototype, {
  _initMethods: function() {
    var self = this;
    if (self._methods) {
      return self;
    }

    var methods = {};
    methods[self._methodNameSet] = function(opt) {

      check(opt, {
        prevNext: Boolean,
        sortValue: Match.Optional(Match.OneOf(String, Number, Date)),
        equality: Boolean,
        sorterName: String,
        filter: Object,
        limit: Number,
      });

      var sorter = self.sorterByName(opt.sorterName);

      if (!sorter) {
        this.error(403);
      }

      var settings = self._settings;

      // this will be passed to some callbacks
      var stashForCallbacks = {
        userId: this.userId,
        sorter: sorter,
      };

      if (_.isFunction(settings.onAuth)) {
        var res = settings.onAuth(stashForCallbacks);
        if (!res) {
          self.error(401);
        }
      }

      if (_.isUndefined(opt.sortValue) && sorter.init) {
        opt.sortValue = sorter.init();
      }

      if (_.isFunction(settings.onQueryCheck)) {
        opt.filter = settings.onQueryCheck(stashForCallbacks, opt.filter) || {};
        check(opt.filter, Object);
      }

      var lmin = settings.limitMin,
          lmax = settings.limitMax;

      if (opt.limit < lmin || opt.limit > lmax) {
        this.error(403,
                   'Limit should be in range: ' + lmin + ' ' + lmax);
      }

      var queryForSort = {};
      var $gt = opt.equality ? '$gte' : '$gt',
          $lt = opt.equality ? '$lte' : '$lt';

      // direction of next page, if sort is ABC - invert
      var direction = sorter.abc ^ opt.prevNext;

      if (!_.isUndefined(opt.sortValue)) {
        queryForSort[sorter.field] = {};
        queryForSort[sorter.field][direction ? $gt : $lt] = opt.sortValue;
      }

      var query = _.extend(opt.filter, queryForSort);
      var queryOpt = {
        sort: {},
        limit: opt.limit
      };

      var fields = settings.fields;
      // if subscribe - no need all fields, _id is enough
      if (settings.subscribe) {
        fields = {
          _id: 1
        };
      } else {
        if (_.isFunction(fields)) {
          fields = fields(stashForCallbacks);
        }
      }
      // Ensure that sorter field is exposed
      if (fields) {
        queryOpt.fields = fields;
        queryOpt.fields[sorter.field] = 1;
      }

      queryOpt.sort[sorter.field] = direction ? 1 : -1;
      self.debug('using sorter "' + opt.sorterName + '" find(\n', query, ',\n', queryOpt, ')');

      var data =  settings.collection.find(query, queryOpt).fetch();
      if (opt.prevNext) {
        data = data.reverse();
      }
      var nextPageData = data[data.length - 1],
          nextPage = nextPageData ? {prevNext: false, sortValue: nextPageData[sorter.field]} : undefined;
      var prevPageData = data[0],
          prevPage = prevPageData ? {prevNext: true, sortValue: prevPageData[sorter.field]} : undefined;

      if (opt.prevNext && data.length !== opt.limit) {
        prevPage = undefined;
      }

      if (!opt.prevNext && data.length !== opt.limit) {
        nextPage = undefined;
      }

      return {
        sorterName: opt.sorterName,
        current: {prevNext: opt.prevNext, sortValue: opt.sortValue},
        data: data,
        previous: prevPage,
        next: nextPage,
      };
    };

    Meteor.methods(methods);

    self._methods = true;

    return self;
  },

  _initPublish: function() {
    var self = this;

    if (self._published) {
      return self;
    }

    self.subPages.forEach(function(i) {
      Meteor.publish(self._subscribeNamePrefix + i, publish);
    });

    self._published = true;
    return self;

    function publish(pageItems, sorterName) {
      var settings = self._settings;
      var stashForCallbacks = {
        userId: this.userId,
      };

      if (_.isEmpty(pageItems)) {
        return [];
      }
      // ensure that pageitems is id - str, num or ObjectID
      check(pageItems, [Match.OneOf(String, Meteor.Collection.ObjectID, Number)]);
      check(sorterName, String);

      var sorter = self.sorterByName(sorterName);

      if (!sorter ||
          pageItems.length < settings.limitMin ||
          pageItems.length > settings.limitMax) {
        return [];
      }

      if (_.isFunction(settings.onAuth)) {
        var res = settings.onAuth(stashForCallbacks);
        if (!res) {
          return [];
        }
      }

      // XXX: Does it realy need sort and limit for turnon oplog with $in query?
      var queryOpt = {
        sort: {},
        limit: pageItems.length
      };

      var direction = sorter.abc;
      queryOpt.sort[sorter.field] = direction ? 1 : -1;

      var fields = settings.fields;
      if (_.isFunction(fields)) {
        fields = fields(stashForCallbacks);
      }
      // Ensure that sorter field is exposed
      if (fields) {
        queryOpt.fields = fields;
        queryOpt.fields[sorter.field] = 1;
      }

      return settings.collection.find({_id: {$in: pageItems}}, queryOpt);
    }
  },
});
