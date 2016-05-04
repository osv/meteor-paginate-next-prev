/*global Tinytest, Meteor, PaginatePrevNext */

var collection = new Meteor.Collection('pgTestCol');

if (Meteor.isServer) {
  if (!collection.findOne()) {
    for(var i = 0; i < 100; i++) {
      collection.insert({
        _id: '' + i,
        sortItem: i,
        text: 'text ' + i,
      });
    }
  }
}

Meteor.startup(function() {
  if (!Meteor.isClient) {
    return;
  }
  // minimal required params
  var goodPaginateParams = {
    name: 'test1',
    collection: collection,
    sortsBy: [
      {
        name: 'by sort item',
        init: function() { return 12; },
        field: 'sortItem'
      }
    ]
  };

  Tinytest.add('Instantiate - PaginatePrevNext', function (test) {
    var p = new PaginatePrevNext(goodPaginateParams);
    test.instanceOf(p, PaginatePrevNext);
  });

  Tinytest.add('Instantiate - missing new', function (test) {
    test.throws(function() {
      /* jshint -W064 */
      var p = PaginatePrevNext(goodPaginateParams);
    }, /new/);
  });

  Tinytest.add('Instantiate - empty args', function (test) {
    test.throws(function() {
      var p = new PaginatePrevNext();
    });
  });

  Tinytest.add('limit - default limitMin, limitMax, limit', function (test) {
    var p = new PaginatePrevNext(goodPaginateParams);
    test.equal(p._settings.limitMin, 1, 'Default "limitMin"');
    test.equal(p._settings.limitMax, 10, 'Default "limitMax"');
    test.equal(p._settings.limit, 10, 'Default "limit"');
  });

  Tinytest.add('limit - setLimit, getLimit', function (test) {
    var p = new PaginatePrevNext(goodPaginateParams);
    test.equal(p.getLimit(), 10, 'Default');
    var resOfSetter = p.setLimit(3);
    test.equal(resOfSetter, p, 'Setter should return this');
    test.equal(p.getLimit(), 3, 'Set limit to 3');
    test.throws(function() { p.setLimit(11); }, /should be in range/);
  });

  Tinytest.add('sorter - setSorter, getSorter', function (test) {
    var p = new PaginatePrevNext({
      name: 'sorter test',
      collection: collection,
      sortsBy: [
        {
          name: 'sorter1',
          init: function() { return 12; },
          field: 'sortItem'
        },{
          name: 'sorter2',
          init: function() { return 12; },
          field: 'sortItem'
        }]});

    test.equal(p.getSorter(), 'sorter1', 'Default');
    var resOfSetter = p.setSorter('sorter2');
    test.equal(resOfSetter, p, 'Setter should return this');
    test.equal(p.getSorter(), 'sorter2', 'Set limit to 3');
    test.throws(function() { p.setSorter('xyz'); }, /Sorter not found/);
  });

  Tinytest.add('filter - set/get', function (test) {
    var p = new PaginatePrevNext(goodPaginateParams);

    test.equal(p.getFilter(), {}, 'Default');
    var filter = {foo: {$ne: 'abc'}};
    var resOfSetter = p.setFilter(filter);
    test.equal(resOfSetter, p, 'Setter should return this');
    test.equal(p.getFilter(), filter, 'Get previous set filter');
    test.throws(function() { p.setFilter(1); }, /Filter should be object/);
  });
});

Meteor.startup(function() {
  var paginator = new PaginatePrevNext({
    collection: collection,
    name: 'test-method-field',
    fields: {
      _id: 1
    },
    sortsBy: [
      {
        name: 'by sort item',
        init: function() { return 12; },
        field: 'sortItem',
      }, {
        name: 'by sort item reverse',
        init: function() { return 12; },
        field: 'sortItem',
        abc: true,
      }, {
        name: 'sort without init',
        field: 'sortItem'
      }
    ]
  });

  if (Meteor.isClient) {
    Tinytest.addAsync('Query page - empty args, CBA', function (test, cb) {

      var testCallback = function(err, res) {
        // from 12 CBA -> 12..3
        var expect = _.map(_.range(3, 13).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query page with empty art, use defaut, and expect _id and sortItem only fields');
        test.equal(res.current, {
          sortValue: 12,
          prevNext: false
        }, 'Current page');
        test.equal(res.previous, {
          sortValue: 12,
          prevNext: true
        }, 'Query page with empty art, previous pages');
        test.equal(res.next, {
          sortValue: 3,
          prevNext: false
        }, 'Query page with empty art, next pages');
        cb();
      };

      paginator.setPage(testCallback);
    });

    Tinytest.addAsync('Query page - empty args, ABC', function (test, cb) {
      paginator.setSorter('by sort item reverse');
      var testCallback = function(err, res) {
        // from 12 ABC 12..22
        var expect = _.map(_.range(12, 22), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query page with empty art, use defaut, and expect _id and sortItem only fields');
        test.equal(res.previous, {
          sortValue: 12,
          prevNext: true
        }, 'Query page with empty art, previous pages');
        test.equal(res.next, {
          sortValue: 21,
          prevNext: false
        }, 'Query page with empty art, next pages');
        cb();
      };

      paginator.setPage(testCallback);
    });

    Tinytest.addAsync('Query page - getPageData() method', function (test, cb) {
      paginator.setSorter('by sort item reverse');
      var testCallback = function() {
        // from 12 ABC 12..22
        var expect = _.map(_.range(12, 22), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        var res = paginator.getPageData();
        test.equal(res.data, expect, 'getPageData()');
        cb();
      };

      paginator.setPage(testCallback);
    });

    ////
    Tinytest.addAsync('Query page CBA - next page', function (test, cb) {
      paginator.setSorter('by sort item');
      var testCallback = function(err, res) {
        // next from 3 CBA 2..0
        var expect = _.map(_.range(0, 3).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query next page - data');
        test.equal(res.previous, {
          sortValue: 2,
          prevNext: true
        }, 'Previous page');
        test.equal(res.next, undefined, 'Next pages');
        cb();
      };

      paginator.setPage(false /* next */, 3, true /* isNextPage*/, testCallback);
    });

    Tinytest.addAsync('Query page CBA - previous page', function (test, cb) {
      paginator.setSorter('by sort item');
      var testCallback = function(err, res) {
        // prev from 12 bca -> 22..13
        var expect = _.map(_.range(13, 23).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query next page - data');
        test.equal(res.previous, {
          sortValue: 22,
          prevNext: true
        }, 'Previous page');
        test.equal(res.next, {
          sortValue: 13,
          prevNext: false
        }, 'Next pages');
        cb();
      };

      paginator.setPage(true /* prev */, 12, true /* isNextPage*/, testCallback);
    });

    Tinytest.addAsync('Query page CBA - sorter without init()', function (test, cb) {
      paginator.setSorter('sort without init');
      var testCallback = function() {
        // from 12 CBA 99..90
        var expect = _.map(_.range(90, 100).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        var res = paginator.getPageData();
        test.equal(res.data, expect, 'getPageData()');
        cb();
      };

      paginator.setPage(testCallback);
    });

    Tinytest.addAsync('Query page ABC - next page', function (test, cb) {
      paginator.setSorter('by sort item reverse');
      var testCallback = function(err, res) {
        // next from abc 21 ->  22..31
        var expect = _.map(_.range(22, 32), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query next page - data');
        test.equal(res.previous, {
          sortValue: 22,
          prevNext: true
        }, 'Previous page');
        test.equal(res.next, {
          sortValue: 31,
          prevNext: false
        }, 'Next pages');
        cb();
      };

      paginator.setPage(false /* next */, 21, true /* isNextPage*/, testCallback);
    });

    Tinytest.addAsync('Query page ABC - previous page', function (test, cb) {
      paginator.setSorter('by sort item reverse');
      var testCallback = function(err, res) {
        // prev from abc 21 ->  11..20
        var expect = _.map(_.range(11, 21), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query next page - data');
        test.equal(res.previous, {
          sortValue: 11,
          prevNext: true
        }, 'Previous page');
        test.equal(res.next, {
          sortValue: 20,
          prevNext: false
        }, 'Next pages');
        cb();
      };

      paginator.setPage(true /* previous */, 21, true /* isNextPage*/, testCallback);
    });

    Tinytest.addAsync('Queried page not full - previous page', function (test, cb) {
      paginator.setSorter('by sort item');
      var testCallback = function(err, res) {
        // prev from BCA 95 -> 99..96
        var expect = _.map(_.range(96, 100).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query previous page - data');
        test.equal(res.previous, undefined, 'Previous page');
        test.equal(res.next, {
          sortValue: 96,
          prevNext: false
        }, 'Next pages');
        cb();
      };

      paginator.setPage(true /* previous */, 95, true /* isNextPage*/, testCallback);
    });

    Tinytest.addAsync('Queried page not full - next page', function (test, cb) {
      paginator.setSorter('by sort item');
      var testCallback = function(err, res) {
        // next from BCA 4 -> 3..0
        var expect = _.map(_.range(0, 4).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'Query next page - data');
        test.equal(res.previous, {
          sortValue: 3,
          prevNext: true
        }, 'Previous page');
        test.equal(res.next, undefined, 'Next pages');
        cb();
      };

      paginator.setPage(false /* next */, 4, true /* isNextPage*/, testCallback);
    });
  }
});

/* Complex callback test
 * use stash for collecting called callbacks
 * final callback fields check called callbacks and set field to {_id: 1}
 * So it pass only if result is array of {_id, sortItem}
 */
Meteor.startup(function() {
  var paginator = new PaginatePrevNext({
    collection: collection,
    name: 'test-auth',
    onAuth: function(stash) {
      stash.onAuth = 1;
      return true;
    },
    onQueryCheck: function(stash, fields) {
      stash.onQueryCheck = 2;
    },
    fields: function(stash) {
      if (stash.onQueryCheck === 2 &&
          stash.onAuth === 1) {
        return {_id: 1};
      }
      return undefined;
    },
    sortsBy: [
      {
        name: 'by sort item',
        init: function() { return 12; },
        field: 'sortItem',
      }
    ]
  });

  if (Meteor.isClient) {
    Tinytest.addAsync('Callbacks test', function (test, cb) {
      var testCallback = function(err, res) {
        // from 12 CBA -> 12..3
        var expect = _.map(_.range(3, 13).reverse(), function(i) {
          return {_id: '' + i, sortItem: i};
        });
        res = res || {};
        test.equal(res.data, expect, 'If fields called right expected only _id and sortItem.');
        cb();
      };

      paginator.setPage(testCallback);
    });
  }
});

// subscribtion test
Meteor.startup(function() {
  var paginator = new PaginatePrevNext({
    collection: collection,
    name: 'test-sub',
    subscribe: true,
    subscribePrecache: ['next'],
    sortsBy: [
      {
        name: 'by sort item',
        init: function() { return 12; },
        field: 'sortItem',
      }
    ]
  });

  if (Meteor.isClient) {
    Tinytest.addAsync('Subscribe - basic', function (test, cb) {
      Meteor.autorun(function(a) {
        var page = paginator.getPageData();
        if (paginator.subscribes.current.ready() &&
            collection.find().count() > 0) {
          Meteor.defer(function() {
            var itemsCount = collection.find().count();
            test.equal(itemsCount, 10, 'subscribed for 10 items');

            var firstCachedItem = page.data[0];
            test.equal(firstCachedItem, {
              _id: '12',
              sortItem: 12
            }, 'If subscribe then cached items should ' +
                       'have only id and sort\'s field');

            var item12 = collection.findOne('12');
            test.equal(item12, {
              _id: '12',
              sortItem: 12,
              text: 'text ' + 12
            }, 'Subscribed item should have all properties');

            cb();
            a.stop();
          });
        }
      });
      paginator.setPage(function() {});
    });
  }
});
