/*global Meteor, ItemCol, PaginatePrevNext, paginateNoSub, paginateSub, Template, ReactiveVar */

ItemCol = new Meteor.Collection('items');

PaginatePrevNext.debug = true;

const ITEMS = 53,
      MAX_DATA = 9999;

if (Meteor.isServer) {
  ItemCol._ensureIndex({idx: -1});
  if (!ItemCol.findOne()) {
    for(let i = 1; i < ITEMS + 1; i++) {
      ItemCol.insert({
        idx: i,
        data: random(MAX_DATA)});
    }}

  // update some items each second
  Meteor.setInterval(function update10Items() {
    for(let i = 0; i < 10; i++) {
      ItemCol.update({idx: random(ITEMS)}, {$set: {data: random(MAX_DATA)}});
    }
  }, 1000);}

paginateNoSub = new PaginatePrevNext({
  collection: ItemCol,
  name: 'noSub',
  sortsBy: [{name: 'default', field: 'idx'}]});

if (Meteor.isClient) {

  Template.main.helpers({
    pg() { return paginateNoSub; }});

  Template.main.events(paginateNoSub.events());
}

function random(max) { return Math.floor(Math.random() * (max + 1)); }
