# SimpleSitemapGenerator

Generates a sitemap by crawling your site. Uses streams to efficiently write the sitemap to your drive and runs asynchronously to avoid blocking the thread. Is cappable of creating multiple sitemaps if threshold is reached. Respects robots.txt and meta tags.

## Usage
```JavaScript
const gulp = require("gulp"),
    SimpleSitemapGenerator = require("./src/SitemapGenerator");

var generator = new SimpleSitemapGenerator("https://www.example.com", {
        changefreq: "weekly",
        priority: 0.5,

        interval: 500,
        maxConcurrency: 5,
        stripQuerystring: true,
        ignoreInvalidSSL: true,
        restrictToBasepath: false,
        maxEntriesPerFile: 50000,
        maxDepth: 0,
        filepath: "./sitemap.xml",

        ignore: url => {
            return url.indexOf("/page-to-ignore") != -1;
        }
    });

    generator.on("fetchcomplete", item => {
        if (item.loc == "https://www.example.com/") {
            item.priority = 0.8;
        } else if (item.loc.indexOf("/page-1") != -1) {
            item.priority = 0.8;
        } else if (item.loc.indexOf("/page-2") != -1) {
            item.priority = 0.5;
        }

        console.log("fetch: " + item.loc + " -> priority: " + item.priority);
    });

    generator.on("complete", (sitemap, items) => {
        console.log("complete");

        cb();
    });

    generator.start();
```

## Usage with gulp
```JavaScript
// Include our Plugins
const gulp = require("gulp"),
    SimpleSitemapGenerator = require("./src/SitemapGenerator");

// Compile JavaScript
gulp.task("Sitemap", function(cb) {
    var generator = new SimpleSitemapGenerator("https://www.example.com", {
        changefreq: "weekly",
        priority: 0.5,

        interval: 500,
        maxConcurrency: 5,
        stripQuerystring: true,
        ignoreInvalidSSL: true,
        restrictToBasepath: false,
        maxEntriesPerFile: 50000,
        maxDepth: 0,
        filepath: "./sitemap.xml",

        ignore: url => {
            return url.indexOf("/page-to-ignore") != -1;
        }
    });

    generator.on("fetchcomplete", item => {
        if (item.loc == "https://www.example.com/") {
            item.priority = 0.8;
        } else if (item.loc.indexOf("/page-1") != -1) {
            item.priority = 0.8;
        } else if (item.loc.indexOf("/page-2") != -1) {
            item.priority = 0.5;
        }

        console.log("fetch: " + item.loc + " -> priority: " + item.priority);
    });

    generator.on("complete", (sitemap, items) => {
        console.log("complete");

        cb();
    });

    generator.start();
});
```

### Options
 - `changefreq` - **String** How frequently the page is likely to change (always | hourly | daily | weekly | monthly | yearly | never) *(default "weekly")*
 - `priority` - **Float** Signal the importance of individual pages in the website *(default 0.5)*
 - `interval` - **Number** The interval with which the crawler will spool up new requests (one per tick) *(default 500)*
 - `maxConcurrency` - **Number** The maximum number of requests the crawler will run simultaneously *(default 5)*
 - `ignoreInvalidSSL` - **Boolean** Treat self-signed SSL certificates as valid. SSL certificates will not be validated against known CAs *(default true)*
 - `exclude` - **Array** Excludes filetypes *(default [ 'gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp', 'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip', 'rar', '7z', 'css', 'js', 'gzip', 'exe', 'svg' ])*
 - `filepath` - **String** Sitemap path *(default ./sitemap.xml)*
 - `ignore` - **Function** Apply a test condition to a URL before it's added to the sitemap *(default (url) => { return true })*
 
### Events
 - `fetchomplete: function (queueItem, event) {}` - Fired after a resource has been completely downloaded
 - `fetcherror: function (queueItem, responseObject) {}` - Fired when an alternate 400 or 500 series HTTP status code is returned for a request
 - `complete: function (sitemap, queueItems) {}` - Fired when the crawler completes processing all the items in its queue, and does not find any more to add