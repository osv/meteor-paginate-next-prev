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
    // you can stash smtg for other callback like onQueryCheck, fields
    stash.role = Role(stash.userId);
    return isAdmin;
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

If collection have unique (most time) field then this package able to create paginating with previous/next page navigation.
Optional subscription or fast fetch items without. Precaching previous/next pages and optional precaching subscription too. Designer for speed and various use cases.

## SPEED AND PERFORMANCE

This package will do 3 method requests for ids of current, next, previous pages (delayed) and other fields of items if subscibe is not enabled.
With right index on sort field these 3 queries are very cheap.
Subscription require more resources - need 1..3 subscribtion and collection mat be fullfilled with extra data that may be not need on client.
