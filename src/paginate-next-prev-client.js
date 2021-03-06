/*global PaginatePrevNext, Meteor, ReactiveDict, _ */

var I_PREV = PaginatePrevNext.PAGE_NAMES[0],
    I_CURRENT = PaginatePrevNext.PAGE_NAMES[1],
    I_NEXT = PaginatePrevNext.PAGE_NAMES[2];

var V_LIMIT = 'limit',
    V_SORTER = 'sorter',
    V_FILTER = 'filter',
    V_WAIT_FOR_SUB_READY = 'readyWait',
    V_PAGE = 'page';

var REFRESH_DELAY = 1000;

_.extend(PaginatePrevNext.prototype, {
  _initVars: function() {
    this.rDict = new ReactiveDict();     // limit, filters, etc
    this.rLoading = new ReactiveDict();  // is loading page status
    this.rPageData = new ReactiveDict(); // data for page
    // timeouts of loading prev/next pages for precaching
    // also if null - don't save data from meteor called method
    this._tmPreCache = {};

    // curr, next, prev pages subscribes here
    this.subscribes = {};

    // data of previous subscribed ids for comparing
    this.oldSubscribes = {};
    this._varsInitialized = true;
  },

  initDefault: function() {
    var settings = this._settings,
        limit = settings.limit;

    // Init reactive var
    if (!this._varsInitialized) {
      this._initVars();
    }
    this.setLimit(limit);
    this.setSorter();
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

    var sorter;
    if (!sorterName) {
      sorter = this._settings.sortsBy[0];
    } else {
      sorter = this.sorterByName(sorterName);
    }

    if (! sorter) {
      this.error('set-sorter', 'Sorter not found');
    }

    this.rDict.set(V_SORTER, sorter.name);
    this.setPage();
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
    this.setPage();
    return this;
  },

  getFilter: function() {
    return this.rDict.get(V_FILTER) || {};
  },

  _setCurrentPage: function(prevNext, sortValue, isNextPage, callback) {
    var self = this,
        settings = self._settings;

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

    [I_PREV, I_NEXT].forEach(function clearTimeout(i) {
      var timeoutId = self._tmPreCache[i];
      if (timeoutId) {
        clearTimeout(timeoutId);
        self._tmPreCache[i] = null;
      }
    });

    Meteor.call(self._methodName, opt, function(err, res) {
      self.rLoading.set(I_CURRENT, false);
      self.rPageData.set(I_CURRENT, res || {});

      if (!err) {
        if (res.previous) {
          self.rLoading.set(I_PREV, true);
          self._tmPreCache[I_PREV] = setTimeout(precachePage(res.previous, I_PREV), settings.prefetchDelay + 100);
        } else {
          self.rPageData.set(I_PREV, {});
        }
        if (res.next) {
          self.rLoading.set(I_NEXT, true);
          self._tmPreCache[I_NEXT] = setTimeout(precachePage(res.next, I_NEXT), settings.prefetchDelay);
        } else {
          self.rPageData.set(I_NEXT, {});
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
        Meteor.call(self._methodName, opt, function(err, res) {
          self.rLoading.set(prevOrNext, false);

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

  getItems: function() {
    var data = this.getPageData().data || [],
        settings = this._settings;

    if (settings.subscribe) {
      var sorter = this.sorterByName(this.getSorter()),
          sortField = sorter.field,
          sortDirection = sorter.abc ? 1 : -1,
          queryOptions = {sort: {}},
          collection = settings.collection,
          ids = _.pluck(data, '_id');

      queryOptions.sort[sortField] = sortDirection;

      return collection.find({_id: {$in: ids}}, queryOptions);
    } else {
      return data;
    }
  },

  setPage: function(prevNext, sortValue, isNextPage) {
    this.rDict.set(V_PAGE, {
      prevNext: prevNext,
      sortValue: sortValue,
      isNextPage: isNextPage,
      t: +new Date()             // force update
    });

    if (!isNextPage) {
      this.rLoading.set(I_CURRENT, true);
    }
    return this;
  },

  refresh: function() {
    var page = this.rDict.get(V_PAGE) || {},
        now = +new Date();
    if (!(page.t && now - page.t < REFRESH_DELAY)) {
      page.t = now;
      this.rDict.set(V_PAGE, page);
    }
    return this;
  },

  _initAutorun: function() {
    var self = this;
    Meteor.autorun(function() {
      var page = self.rDict.get(V_PAGE) || {};
      self._setCurrentPage(page.prevNext, page.sortValue, page.isNextPage);
    });
  },

  _initSubscribtions: function() {
    var self = this;

    self.subPages.forEach(subscribe);

    function subscribe(i) {
      Meteor.autorun(function(c) {
        var page = self.rPageData.get(i) || {},
            itemIds = _.pluck(page.data, '_id'),
            sorterName = self.getSorter();

        if (i !== I_CURRENT) {
          // if subscribe is not "current" and current sub is not ready
          var isCurrentNotReady = (self.subscribes[I_CURRENT] &&
                                   !self.subscribes[I_CURRENT].ready());
          if (isCurrentNotReady ||
              _.isEqual(itemIds, self.oldSubscribes[i])) {
            return;
          }
        }
        self.debug('subscribing "' + i + '"\nids:', itemIds);

        self.oldSubscribes[i] = itemIds;
        self.subscribes[i] =
          Meteor.subscribe(self._subscribeNamePrefix + i, itemIds, sorterName);
      });
    }
  },

  events: function() {
    var self = this;
    return {
      'click .js-pg-next-page': function(e, t) {
        self.nextPage();
      },

      'click .js-pg-prev-page': function(e, t) {
        self.previousPage();
      },

      'click .js-pg-home-page': function(e, t) {
        self.setPage();
      },

      'click .js-pg-refresh-page': function(e, t) {
        self.refresh();
      },
    };
  },

  isLoading: function() {
    var self = this,
        loadingCurrent = this.rLoading.get(I_CURRENT),
        subReady = true;

    if (this._settings.subscribe &&
        this.rLoading.get(V_WAIT_FOR_SUB_READY) &&
        this._settings.subscribe) {
      subReady = this.subscribes.current.ready();

      if (subReady) {
        Meteor.defer(function() {
          if (self.subscribes.current.ready()) {
            self.rLoading.set(V_WAIT_FOR_SUB_READY, false);
          }
        });
      }
    }

    return (loadingCurrent || !subReady);
  },

  nextPage: createNavMethod(I_NEXT),
  previousPage: createNavMethod(I_PREV),
  hasNext: createHasMethod(I_NEXT),
  hasPrev: createHasMethod(I_PREV),

  _has: function(prevOrNext) {
    return prevOrNext === I_NEXT ? this.hasNext() : this.hasPrev();
  }
});

function createNavMethod(prevOrNext) {
  return function() {
    if (this._has(prevOrNext)) {
      var page = this.rPageData.get(prevOrNext) || {},
          data = page.data || [],
          settings = this._settings,
          current = page.current;

      // Test if we have all items in collection that was set,
      // if not - isLoading should also check for sub ready.
      if (settings.subscribe) {
        var ids = _.pluck(data, '_id');
        var count = settings.collection.find({_id: {$in: ids}}).count();
        if (count !== ids.length) {
          this.rLoading.set(V_WAIT_FOR_SUB_READY, true);
          this.rLoading.set(I_CURRENT, true);
        }
      }
      this.rPageData.set(I_CURRENT, page);
      this.setPage(current.prevNext, current.sortValue, true /*isNextPage*/);
    }
    return this;
  };
}

function createHasMethod(prevOrNext) {
  return function(classActive, classDisabled) {
    // if no classes, just return boolean
    if (!arguments.length) {
      classActive = true;
      classDisabled = false;
    }
    var pageData = this.rPageData.get(prevOrNext) || {},
        isEmpty = _.isEmpty(pageData.data),
        isLoading = this.rLoading.get(prevOrNext);
    return !(isEmpty || isLoading) ? classActive : classDisabled;
  };
}

