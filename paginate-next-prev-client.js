/*global PaginatePrevNext, _ */

_.extend(PaginatePrevNext.prototype, {
  initDefault: function() {
    var settings = this._settings,
        limit = settings.limit,
        sorterName = settings.sortsBy[0].name;

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

  setPage: function(prevNext, sortValue, isNextPrevPage) {
    var self = this,
        sorterName = this.getSorter();

    var opt = {
      prevNext: prevNext || false,
      sortValue: sortValue,
      equality: !isNextPrevPage,
      sorterName: sorterName,
      filter: this.getFilter(),
      limit: this.getLimit(),
    };

    console.log('call', this._methodNameSet);

    Meteor.call(this._methodNameSet, opt, function(err, res) {
      self._setPageRes(err, res);

      if (err) {
        console.warn(err);
      } else {
        console.log('res', res);
      }
    });
  },

  _setPageRes: function(err, res) {
    // dummy fun, used for testing
  }
});
