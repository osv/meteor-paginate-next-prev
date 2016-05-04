Package.describe({
  name: 'osv:paginate-next-prev',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Pagination with previous and next navigation.',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.2');
  api.use('underscore');
  api.use('check');
  api.use('reactive-dict');
  api.addFiles('paginate-next-prev.js');
  api.addFiles('paginate-next-prev-server.js', 'server');
  api.addFiles('paginate-next-prev-client.js', 'client');
  api.export('PaginatePrevNext');
});

Package.onTest(function(api) {
  api.use('underscore');
  api.use('tinytest');
  api.use('osv:paginate-next-prev');
  api.addFiles('paginate-next-prev-tests.js');
});
