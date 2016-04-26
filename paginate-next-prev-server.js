/*global Meteor, PaginatePrevNext, Match, check, _ */

_.extend(PaginatePrevNext.prototype, {
  _initMethods: function() {
    var self = this;
    if (self._methods) {
      return self;
    }

    var methods = {};
    methods[self._methodNameSet] = function(opt) {

      if (self.onAuth) {
        var res = self.onAuth.call(this, self);
        if (!res) {
          self.error(401);
        }
      }
      check(opt, {
        prevNext: Boolean,
        sortValue: Match.Optional(Match.OneOf(String, Number, Date)),
        equality: Boolean,
        sorterName: String,
        filter: Object,
        limit: Number,
      });

      var sorter = self.sorterByName(opt.sorterName);
      var settings = self._settings;
      if (!sorter) {
        this.error(403);
      }

      if (_.isUndefined(opt.sortValue)) {
        opt.sortValue = sorter.init();
      }

      if (self.onQueryCheck) {
        opt.filter = self.onQueryCheck(this, opt.filter, self);
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

      queryForSort[sorter.field] = {};
      queryForSort[sorter.field][direction ? $gt : $lt] = opt.sortValue;

      var query = _.extend(opt.filter, queryForSort);
      var queryOpt = {
        sort: {},
        limit: opt.limit
      };

      if (settings.fields) {
        queryOpt.fields = settings.fields;
        queryOpt.fields[sorter.field] = 1;
      }

      queryOpt.sort[sorter.field] = direction ? 1 : -1;
      console.log('find', query, queryOpt);

      var data =  settings.collection.find(query, queryOpt).fetch();
      if (opt.prevNext) {
        data = data.reverse();
      }
      var nextPageData = data[opt.limit - 1],
          nextPage = nextPageData ? {prevNext: false, sortValue: nextPageData[sorter.field]} : undefined;
      var prevPageData = data[0],
          prevPage = prevPageData ? {prevNext: true, sortValue: prevPageData[sorter.field]} : undefined;
      return {
        data: data,
        previous: prevPage,
        next: nextPage,
      };
    };

    Meteor.methods(methods);

    self._methods = true;

    return self;
  }
});
