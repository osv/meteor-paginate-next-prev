/*global PaginatePrevNext, Meteor, ReactiveVar, console, _ */

var I_PREV = 0,
    I_NEXT = 1;

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
      this.rIsLoading = new ReactiveVar();
      // Cached data for prev/next: index 0 - previous, 1 - next page
      this.rPreCache = [new ReactiveVar(), new ReactiveVar()];

      // timeouts of loading prev/next pages for precaching
      // also if null - don't save data from meteor called method
      this._tmPreCache = [null, null];
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

  setPage: function(prevNext, sortValue, isNextPage, callback) {
    var self = this;

    // allow first arg to be callback
    if (arguments.length === 1 && _.isFunction(prevNext)) {
      callback = prevNext;
      prevNext = sortValue = isNextPage = undefined;
    }

    var opt = {
      prevNext: prevNext || false,
      sortValue: sortValue,
      equality: !isNextPage,
      sorterName: this.getSorter(),
      filter: this.getFilter(),
      limit: this.getLimit(),
    };

    callback = callback || function() {};

    self.rIsLoading.set(true);

    [I_PREV, I_NEXT].forEach(function clearTimeout(prevNext) {
      var timeoutId = self._tmPreCache[prevNext];
      if (timeoutId) {
        clearTimeout(timeoutId);
        self._tmPreCache[prevNext] = null;
      }
    });


    Meteor.call(self._methodNameSet, opt, function(err, res) {
      self.rIsLoading.set(false);
      self.rCurrentPage.set(res || {});

      [I_PREV, I_NEXT].forEach(function(prevNext) {
        self.rPreCache[prevNext].set({});
      });

      if (!err) {
        if (res.previous) {
          self._tmPreCache[I_PREV] = setTimeout(precachePage(res.previous, I_PREV), 400);
        }
        if (res.next) {
          self._tmPreCache[I_NEXT] = setTimeout(precachePage(res.next, I_NEXT), 300);
        }
      }
      callback(err, res);
    });

    function precachePage(prevNextRes, prevNextIndex) {
      return function() {
        var opt = {
          prevNext: prevNextRes.prevNext,
          sortValue: prevNextRes.sortValue,
          equality: false,
          sorterName: self.getSorter(),
          filter: self.getFilter(),
          limit: self.getLimit(),
        };
        Meteor.call(self._methodNameSet, opt, function(err, res) {
          // only apply if not cancelled
          if (self._tmPreCache[prevNextIndex]) {
            self.rPreCache[prevNextIndex].set(res);
          }
          self._tmPreCache[prevNextIndex] = null;
        });
      };
    }

  },

  getPageData: function() {
    return this.rCurrentPage.get() || {};
  },

  initSubscribtions: function() {
    var self = this;
    Meteor.autorun(function(c) {
      var page = self.getPageData(),
          pageItems = _.pluck(page.data, '_id'),
          sorterName = page.sorterName;

      if (!_.isEmpty(pageItems) && _.isString(sorterName)) {
        self.subscribeCurrent =
          Meteor.subscribe(self._subscribeNameCurrent, pageItems, sorterName);
      }
    });
  },

  nextPage: function() {
    if (this.hasNext()) {
      var page = this.rPreCache[I_NEXT].get() || {},
          current = page.current;
      this.rCurrentPage.set(page);
      this.setPage(current.prevNext, current.sortValue, true /*isNextPage*/);
    }
    return this;
  },

  previousPage: function() {
    if (this.hasPrev()) {
      var page = this.rPreCache[I_PREV].get() || {},
          current = page.current;
      this.rCurrentPage.set(page);
      this.setPage(current.prevNext, current.sortValue, true /*isNextPage*/);
    }
    return this;
  },

  hasNext: function() {
    var pageData = this.rPreCache[I_NEXT].get() || {};
    return !_.isEmpty(pageData.data);
  },
  hasPrev: function() {
    var pageData = this.rPreCache[I_PREV].get() || {};
    return !_.isEmpty(pageData.data);
  },

  // templateHelpers: function(template) {
  //   var self = this;
  //   var helpers = {
  //     isLoading: function() {
  //       var subReady = true;
  //       if (self._settings.subscribe) {
  //         subReady = self.subscribeCurrent.ready();
  //       }
  //       return self.rIsLoading.get() && !subReady;
  //     },
  //     hasNext: function() {
  //       var pageData = self.getPageData() || {},
  //           nextPage = pageData.next;

  //       return !!nextPage;
  //     },
  //     hasPrev: function() {
  //       var pageData = self.getPageData() || {},
  //           previousPage = pageData.previous;

  //       return !!previousPage;
  //     },
  //   };

  //   template.helpers(helpers);
  // },
});
