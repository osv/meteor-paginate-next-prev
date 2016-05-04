/*global PaginatePrevNext, Meteor, ReactiveDict, _ */

var I_PREV = PaginatePrevNext.PAGE_NAMES[0],
    I_CURRENT = PaginatePrevNext.PAGE_NAMES[1],
    I_NEXT = PaginatePrevNext.PAGE_NAMES[2];

var V_LIMIT = 'limit',
    V_SORTER = 'sorter',
    V_FILTER = 'filter',
    V_IS_LOADING = 'isLoading';

_.extend(PaginatePrevNext.prototype, {
  initDefault: function() {
    var settings = this._settings,
        limit = settings.limit,
        sorterName = settings.sortsBy[0].name;

    // Init reactive var
    if (!this.rDict) {
      this.rDict = new ReactiveDict();
      this.rPageData = new ReactiveDict();
      // timeouts of loading prev/next pages for precaching
      // also if null - don't save data from meteor called method
      this._tmPreCache = {};

      this.subscribes = {};
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
    this.rDict.set(V_LIMIT, limit);
    return this;
  },
  getLimit: function() {
    return this.rDict.get(V_LIMIT);
  },

  setSorter: function(sorterName) {
    var sorter = this.sorterByName(sorterName);

    if (! sorter) {
      this.error('set-sorter', 'Sorter not found');
    }

    this.rDict.set(V_SORTER, sorterName);
    return this;
  },

  getSorter: function() {
    return this.rDict.get(V_SORTER);
  },

  setFilter: function(queryFilter) {
    queryFilter = queryFilter || {};
    if (! _.isObject(queryFilter) || _.isArray(queryFilter)) {
      this.error('set-filter', 'Filter should be object');
    }

    this.rDict.set(V_FILTER, queryFilter);
    return this;
  },

  getFilter: function() {
    return this.rDict.get(V_FILTER) || {};
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

    self.rDict.set(V_IS_LOADING, true);

    [I_PREV, I_NEXT].forEach(function clearTimeout(i) {
      var timeoutId = self._tmPreCache[i];
      if (timeoutId) {
        clearTimeout(timeoutId);
        self._tmPreCache[i] = null;
      }
    });

    Meteor.call(self._methodNameSet, opt, function(err, res) {
      self.rDict.set(V_IS_LOADING, false);
      self.rPageData.set(I_CURRENT, res || {});

      [I_PREV, I_NEXT].forEach(function(prevOrNext) {
        self.rPageData.set(prevOrNext, {});
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

    function precachePage(prevNextRes, prevOrNext) {
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
          if (self._tmPreCache[prevOrNext]) {
            self.rPageData.set(prevOrNext, res);
          }
          self._tmPreCache[prevOrNext] = null;
        });
      };
    }

  },

  getPageData: function() {
    return this.rPageData.get(I_CURRENT) || {};
  },

  initSubscribtions: function() {
    var self = this;

    // precacheOpt may be array of string or boolean

    self.subPages.forEach(subscribe);

    function subscribe(i) {
      Meteor.autorun(function(c) {
        var page = self.rPageData.get(i) || {},
            pageItems = _.pluck(page.data, '_id'),
            sorterName = page.sorterName;

        self.subscribes[i] =
          Meteor.subscribe(self._subscribeNamePrefix + i, pageItems, sorterName);
      });
    }
  },

  isLoading: function() {
    var loadingCurrent = this.rDict.get(V_IS_LOADING),
        subReady = true;
    if (this._settings.subscribe) {
        subReady = this.subscribes.current.ready();
    }
    return (loadingCurrent && subReady);
  },

  nextPage: function() {
    if (this.hasNext()) {
      var page = this.rPageData.get(I_NEXT) || {},
          current = page.current;
      this.rPageData.set(I_CURRENT, page);
      this.setPage(current.prevNext, current.sortValue, true /*isNextPage*/);
    }
    return this;
  },

  previousPage: function() {
    if (this.hasPrev()) {
      var page = this.rPageData.get(I_PREV) || {},
          current = page.current;
      this.rPageData.set(I_CURRENT, page);
      this.setPage(current.prevNext, current.sortValue, true /*isNextPage*/);
    }
    return this;
  },

  hasNext: function() {
    var pageData = this.rPageData.get(I_NEXT) || {};
    return !_.isEmpty(pageData.data);
  },
  hasPrev: function() {
    var pageData = this.rPageData.get(I_PREV) || {};
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
