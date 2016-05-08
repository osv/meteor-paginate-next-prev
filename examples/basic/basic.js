/*global Meteor, ItemCol, PaginatePrevNext, paginateNoSub, paginateSub, Template, ReactiveVar */

ItemCol = new Meteor.Collection('items');

const ITEMS = 53,
      MAX_DATA = 9999;

if (Meteor.isServer) {
  ItemCol._ensureIndex({idx: -1});
  if (!ItemCol.findOne()) {
    for(let i = 1; i < ITEMS + 1; i++) {
      ItemCol.insert({
        idx: i,
        data: random(MAX_DATA) });}}

  Meteor.setInterval(function update10Items() {
    for(let i = 0; i < 10; i++) {
      ItemCol.update({idx: random(ITEMS)}, {$set: {data: random(MAX_DATA)}});
    }
  }, 300);
}

//PaginatePrevNext.debug = true;

paginateNoSub = new PaginatePrevNext({
  collection: ItemCol,
  name: 'noSub',
  sortsBy: [
    {
      name: 'default',
      field: 'idx'
    }, {
      name: 'reverse',
      field: 'idx',
      abc: true
    }
  ]});

paginateSub = new PaginatePrevNext({
  collection: ItemCol,
  name: 'sub',
  subscribe: true,
  subscribePrecache: ['next'],
  sortsBy: [
    {
      name: 'default',
      field: 'idx'
    }, {
      name: 'reverse',
      field: 'idx',
      abc: true
    }
  ]});

function random(max) { return Math.floor(Math.random() * (max + 1)); }

if (Meteor.isClient) {
  const REFRESH_TIMEOUT = 5;   // seconds
  var countRefresh = new ReactiveVar(REFRESH_TIMEOUT);
  Meteor.setInterval(function() {
    countRefresh.set(countRefresh.get() - 1);
    if (countRefresh.get() === 0) {
      countRefresh.set(REFRESH_TIMEOUT);
      paginateNoSub.refresh();
    }
  }, 1000);

  Template.main.helpers({
    refreshTime() { return countRefresh.get(); },
    paginationSub() { return paginateSub; },
    paginationNoSub() { return paginateNoSub; }});

  Template.main.events({
    'click .js-refresh': function() { paginateNoSub.refresh(); }});

  Template.pagination.events({
    'click .js-toggle-order': function() {
      var paginator = Template.instance().data.pg,
          oldSorter = paginator.getSorter(),
          newSorter = oldSorter == 'default' ? 'reverse' : 'default';
      paginator.setSorter(newSorter);}});

  Template.navigationSub.helpers({
    pager() { return paginateSub; }});
  Template.navigationSub.events(paginateSub.events());
  
  Template.navigationNoSub.helpers({
    pager() { return paginateNoSub; }});
  Template.navigationNoSub.events(paginateNoSub.events());  
}
