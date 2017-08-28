# SimpleSitemapGenerator

Generates a sitemap by crawling your site. Uses streams to efficiently write the sitemap to your drive and runs asynchronously to avoid blocking the thread. Is cappable of creating multiple sitemaps if threshold is reached. Respects robots.txt and meta tags.

## Usage
```JavaScript
const fs = require('fs');
const SimpleSitemapGenerator = require('simple-sitemap-generator');

new SimpleSitemapGenerator('https://example.com', {

    /**
     * @param {Object} item
     */
    onFetchComplete: function (item) {
        if ( item.loc == 'https://example.com/' ) {
            item.priority = 0.8;
        }
        else if ( item.loc.indexOf('/2017-18/') != -1 ) {
            item.priority = 0.8;
        }
        else {
            item.priority = 0.5;
        }

        console.log( 'FETCH: ' +item.loc+ ' -> priority:' +item.priority );
    },

    /**
     * @param {String} sitemap
     */
    onComplete: function (sitemap) {
        fs.writeFile('./sitemap.xml', sitemap, 'utf-8')
    }
})
```

## Usage with gulp
```JavaScript
// Include our Plugins
const gulp = require('gulp'),
      SimpleSitemapGenerator = require('./src/SitemapGenerator'),
      fs = require('fs');

// Compile JavaScript
gulp.task('Sitemap', function (cb) {

    new SimpleSitemapGenerator('https://www.hobbycup-bad-toelz.de', {

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
})
```

### Options
 - `changefreq` - **String** How frequently the page is likely to change (always | hourly | daily | weekly | monthly | yearly | never) *(default "weekly")*
 - `priority` - **Float** Signal the importance of individual pages in the website *(default 0.5)*
 - `interval` - **Number** The interval with which the crawler will spool up new requests (one per tick) *(default 500)*
 - `maxConcurrency` - **Number** The maximum number of requests the crawler will run simultaneously *(default 5)*
 - `ignoreInvalidSSL` - **Boolean** Treat self-signed SSL certificates as valid. SSL certificates will not be validated against known CAs *(default true)*
 - `exclude` - **Array** Excludes filetypes *(default [ 'gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp', 'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip', 'rar', '7z', 'css', 'js', 'gzip', 'exe', 'svg' ])*

### Events
 - `onFetchComplete: function (queueItem, event) {}` - Fired after a resource has been completely downloaded
 - `onFetchError: function (queueItem, responseObject) {}` - Fired when an alternate 400 or 500 series HTTP status code is returned for a request
 - `onComplete: function (sitemap, queueItems) {}` - Fired when the crawler completes processing all the items in its queue, and does not find any more to add