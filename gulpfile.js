// Include our Plugins
const gulp = require('gulp'),
      SitemapGenerator = require('./src/SitemapGenerator'),
      fs = require('fs');

// Compile JavaScript
gulp.task('Sitemap', function (cb) {

    var generator = new SitemapGenerator('https://www.hobbycup-bad-toelz.de', {

        /**
         * @param {Object} item
         */
        onFetchComplete: function (item) {
            if ( item.loc == 'https://www.hobbycup-bad-toelz.de/' ) {
                item.priority = 0.8;
            }
            else if ( item.loc.indexOf('/2017-18/') != -1 ) {
                item.priority = 0.8;
            }
            else if ( item.loc.indexOf('/jobs') != -1 ) {
                item.priority = 0.5;
            }

            console.log( 'FETCH: ' +item.loc+ ' -> priority:' +item.priority );
        },

        /**
         * @param {String} sitemap
         */
        onComplete: function (sitemap) {
            fs.writeFile('./sitemap.xml', sitemap, 'utf-8', cb)
        }
    })
});