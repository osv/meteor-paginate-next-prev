Package.describe({
  name: 'osv:paginate-next-prev',
  version: '0.1.0',
  summary: 'Pagination with previous and next navigation.',
  git: 'https://github.com/osv/meteor-paginate-next-prev.git',
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
