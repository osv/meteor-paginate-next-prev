/*global PaginatePrevNext, Meteor, ReactiveVar, console, _ */

_.extend(PaginatePrevNext.prototype, {
  initDefault: function() {
    var settings = this._settings,
        limit = settings.limit,
        sorterName = settings.sortsBy[0].name;

    // Init reactive variables
    if (!this.rLimit) {
      this.rLimit = new ReactiveVar();
      this.rSorter = new ReactiveVar();
      this.rFilter = new ReactiveVar();
      this.rCurrentPage = new ReactiveVar();
    }
    this.setLimit(limit);
    this.setSorter(sorterName);
    return this;
  },

  setLimit: function(limit) {
    var settings = this._settings,
        min = settings.limitMin,
        max = settings.limitMax;
    if (limit < min || limit > max) {
      this.error('set-limit',
                 'Limit should be in range: ' + min + ' ' + max);
    }
    this.rLimit.set(limit);
    return this;
  },
  getLimit: function() {
    return this.rLimit.get();
  },

  setSorter: function(sorterName) {
    var sorter = this.sorterByName(sorterName);

    if (! sorter) {
      this.error('set-sorter', 'Sorter not found');
    }

    this.rSorter.set(sorterName);
    return this;
  },

  getSorter: function() {
    return this.rSorter.get();
  },

  setFilter: function(queryFilter) {
    queryFilter = queryFilter || {};
    if (! _.isObject(queryFilter) || _.isArray(queryFilter)) {
      this.error('set-filter', 'Filter should be object');
    }

    this.rFilter.set(queryFilter);
    return this;
  },

  getFilter: function() {
    return this.rFilter.get() || {};
  },

  setPage: function(prevNext, sortValue, isNextPrevPage, callback) {
    var self = this,
        sorterName = this.getSorter();

    // allow first arg to be callback
    if (arguments.length === 1 && _.isFunction(prevNext)) {
      callback = prevNext;
      prevNext = sortValue = isNextPrevPage = undefined;
    }

    var opt = {
      prevNext: prevNext || false,
      sortValue: sortValue,
      equality: !isNextPrevPage,
      sorterName: sorterName,
      filter: this.getFilter(),
      limit: this.getLimit(),
    };

    callback = callback || function() {
      console.warn('pagination: You forgot calback!');
    };

    Meteor.call(this._methodNameSet, opt, function(err, res) {
      self.rCurrentPage.set(res || {data: []});
      callback(err, res);
    });
  },

  getPageData: function() {
    return this.rCurrentPage.get();
  },

  initSubscribtions: function() {
    var self = this;
    Meteor.autorun(function(c) {
      var page = self.getPageData() || {},
          pageItems = _.pluck(page.data, '_id'),
          sorterName = page.sorterName;

      if (!_.isEmpty(pageItems) && _.isString(sorterName)) {
        self.subscribeCurrent =
          Meteor.subscribe(self._subscribeNameCurrent, pageItems, sorterName);
      }
    });
  },
});
