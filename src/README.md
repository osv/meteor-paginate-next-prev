# osv:paginate-next-prev

Meteor pagination with previous and next navigation

## SYNOPSIS

```js

YourCollection = new JobCollection('someItems');
YourCollection._ensureIndex({updated: -1});
YourCollection._ensureIndex({created: -1});

Paginate = new PaginatePrevNext({
  collection: YourCollection,
  name: 'pgSomeItems',
  onAuth(stash) {
    var isAdmin = Acl.isAdminById(stash.userId);
    // you can stash smtg for other callback like onQueryCheck(), fields()
    stash.role = Role(stash.userId);
    return isAdmin;
  },
  fields: function(stash) {
    return stash.role = 'admin' ? {} : {public: 1, someOtherPublic: 1};
  },
  limitMin: 10, limit: 20, limitMax: 50,
  subscribe: true,
  subscribePrecache: ['next'], // default: ['prev', 'next']. false - disable
  sortsBy: [
    {
      name: 'default',
      field: 'created'
    },
    {
      name: 'by updated',
      field: 'updated'
      },
   ],
});

// playground
if (Meteor.isClient) {
  var cursor =
        Paginate
        .setLimit(10)
        .setSorter('by update')
        .setFilter({type: {$in: ['foo', 'bar']}})
        .getItems();            // cursor if subscribe, otherwise items

  Paginate.setFilter(); // reset filter
  Paginate.nextPage();  // go to next page

  // next methods may be used in template helpers
  Paginate.hasNext();   // true if can go next page
  // return 'active' if can go to next page, otherwise 'disable'
  Paginate.hasNext('active', 'disable');
  Paginate.isLoading(); // current page loading status
}
```

## DESCRIPTION

This package simplifies to you building next/previous paginate of Mongo collections. 
Collection should have unique (in most time) field.
Supported neighbor prefetching previous/next pages and optional precaching subscriptions of next/previous pages.
There no templates to use for you, but it easy to create own templates by exposing instance to template and ready for use events.
Check demo in [../examples](examples) folder.

## SPEED AND PERFORMANCE

Next/previous pagination pattern is cheap because it avoid `skip` query parameter and no need to calculate count of items of query.
This package will do 3 method requests for IDs of current, next, previous pages (requests are delayed via settings `prefetchDelay`, methods is blocked so you can set to 0 this).
With right index on sort field these 3 queries are very cheap.
Next, previous IDs need to test for prev/next navigation availability and used as cached version of next/previous navigating (certainly actual data of current page will be loaded again).
If you need subscription then it require more resources -
need 1..3 subscribtion and collection will be fullfilled with extra data that may be not need on client. But you can presubscribe for 'next' only, for example.

## SETTINGS

Settings can be passed to constructor `PaginatePrevNext()` and should be same for client/server.

- **name** - *required*;
- **collection** - *required*, Meteor.Collection instance;
- **sortsBy** - *required* Array of sorts. Used `[0]` as default sorter.
You can use only one field for sorting.
So if you need compound sort - use slug field. For example for sort: {index: 1, created: -1,} value of slug field may looks like `00001/2016-08-01-12-00-000`.
Values should be unique for work in correct way. Be carefull when you use Date if some of you items may be created in same time.
Possible fields:
  - **name** - *required*, name of sorter. *setSorter(name)* can change pagination sort;
  - **field** - *required* Mongo's sort field;
  - **abc** - Boolean. Sort direction ABC. Default - false. 
  - **init** - Function. Return default (home) value of sort. Default is undefined.
Example:

```js
  sortsBy: [
    {    // {sort: {created: -1}}
      name: 'default',
      field: 'created'
    }, { // {sort: {created: 1}}
      name: 'reverse',
      field: 'created'
      abc: true;
    }
  ]
  ```
- **subscribe** - boolean, Meteor.subscribe for items or not;
- **subscribePrecache** - boolean or array that may contains 'next', 'prev', affect only if `subscribe: true`;
- **onAuth** - Function. Check authorization function. Should return *true* if access allowed;
- **onQueryCheck** - Filter processing function. You may restrict some queries if need here;
- **fields** - Object or Function that return object. Limit fields of Mongo query.
Allowed to specify the inclusion only. e.x. `{foo: 1, bar: 1}`.
Suppression not allowed (`{foo: 0}`);
- **prefetchDelay** - Number, default 300. Delay for prefetching next/previous page. previous page delay = prefetchDelay + 100;
- **limitMin** - Number, default 1;
- **limit** - Number, default 10. Set default limit. Can be modified via *setLimit(N)* method;
- **limitMax** - Number, default 10;

## API

- **sorterByName(name)**;
- **allMethods()** - return methods and subscribtions list. Usefull for DDPRateLimiter.

Client only API:

- **setLimit(N)** - Set new limit, return self;
- **getLimit()** - *reactive*;
- **setSorter(name)** - Set sorter. Empty args reset to default (first sorter in array *sortsBy*).
- **getSorter()** - *reactive*;
- **setFilter(object)** - Set Mongo query. *onQueryCheck* function may be used to sanitize filter.
- **getFilter()** - *reactive*;
- **getItems()** - get Minimongo cursor if subscribe enabled or array of items in current page;
- **setPage(prevOrNext, sortValue, isNextPage)** - Change page. Empty args reset to defailt (if you setup *init* function in sorter then used sortValue from it). Arguments:
  - **prevOrNext** - Direction. false - next;
  - **sortValue** - value for sort field;
  - **isNextPage** - if false - use `$lte`/`$gte` for value of sort field when quering page.
- **refresh()** - refresh current page, throttled to 1s.
- **events()** - return navigation events for template: `click .js-pg-refresh-page`, `click .js-pg-home-page`, `click .js-pg-prev-page`, `click .js-pg-next-page`. Example:
```js
  Template.navigation.events(paginate.events());
  ```
- **isLoading()** - *reactive*, is loading current page status.
- **hasNext()**, **hasPrev()** - *reactive*, return true if can go to next/previous page;
- **nextPage()**, **previousPage()** - go to next/previous page

## SECURITY

You can set next callbacks in constructor to make pagination more secure:

- **onAuth(stash)**  - return false if no allowed. stash.userId - userId. You can extend stash object here. For example, you can add to stash role that will be used in other callbacks - *onQueryCheck*, *fields*.

```js
onAuth: function(stash, filter) {
  stash.isAdmin = checkAdmin(stash.userId);
  return true;
}
```

- **onQueryCheck(stash, filter)** - called after *onAuth()*. Sanitize Mongo query. Stash - modified stash from *onAuth()*. Example:

```js
onQueryCheck: function allowCustomFilterForAdminOnly(stash, filter) {
  return stash.isAdmin ? filter : {};
}
```

- **fields(stash)** - called after *onQueryCheck()*. Limit Fields. Example:

```js
fields: function restrictFields(stash, filter) {
  var allFields = {};
  var publicFields = {public: 1, someOtherPublic: 1};
  return stash.isAdmin ? allFields : publicFields;
}
```

If you secure your app by using DDPRateLimiter check method **allMethods()**. It return {type, name} methods and subscriptions.

## TEMPLATE EXAMPLE

See examples on github for more examples.

```html
<template name="itemsPaginate">
  <div class="row">
    <div class="col-md-12">
      {{#each pg.getItems}}
        {{> _id}}
      {{/each}}
    </div>
    <div class="col-md-12">
      {{> navigation pager=pg}}
    </div>
  </div>
</template>

<template name="navigation">
  <nav>
    <ul class="pager">
      <li class="js-pg-prev-page {{pager.hasPrev '' 'disabled'}}"><a href="#">Previous</a></li>
      <li class="js-pg-home-page"><a href="#">Home</a></li>
      <li class="js-pg-next-page {{pager.hasNext '' 'disabled'}}"><a href="#">Next</a></li>
    </ul>
  </nav>
</template>
```

```js
// where `paginate` is instance of PaginatePrevNext
Template.itemsPaginate.helpers({
  pg: function() {
    return paginate;
  }  
});

Template.itemsPaginate.events(paginate.events());
```
