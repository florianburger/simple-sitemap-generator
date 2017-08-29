// Include our Plugins
const Crawler = require('simplecrawler'),
      url = require('url'),
      cheerio = require('cheerio'),
      moment = require('moment');

const DEFAULT_OPTIONS = {
    changefreq: 'weekly',
    priority: 0.5,

    interval: 500,
    maxConcurrency: 5,
    stripQuerystring: true,
    ignoreInvalidSSL: true,
    restrictToBasepath: false,
    maxEntriesPerFile: 50000,
    crawlerMaxDepth: 0,

    exclude: [ 'gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp', 'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip', 'rar', '7z', 'css', 'js', 'gzip', 'exe', 'svg' ],

    onFetchComplete: function (urlItem, event) {},
    onFetchError: function (queueItem, responseObject) {},
    onComplete: function (sitemap, queueItems) {},

    filterFunction: function (urlItem) { return true }
};

/**
 * @param {String} url
 * @param {Object} options
 * @constructor
 */
var SitemapGenerator = function (url, options) {

    this.url = url;

    options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.options = options;

    if ( options.ignoreInvalidSSL ) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    this.extRegex = new RegExp('\\.(' + options.exclude.join('|') + ')$', 'i');

    console.log('start', url);

    var me = this;
    var items = [];

    var crawler = Crawler(url).on("fetchcomplete", function (data) {

        var date = moment(new Date(data.stateData.headers.date));

        var urlItem = {
            loc: data.url,
            lastmod: date.format(),
            changefreq: options.changefreq,
            priority: options.priority,
            status: data
        };

        items.push( urlItem );
        options.onFetchComplete(urlItem)
    });
    crawler.on("fetcherror", function (queueItem, responseObject) {
        console.log('ERROR');
        console.log( queueItem );
        console.log( responseObject );

        options.onFetchError(queueItem, responseObject)
    });

    crawler.on("fetchconditionerror", function (queueItem, error) {
        console.log('ERROR');
        console.log( queueItem );
        console.log( error );
    });

    crawler.on("fetchdataerror", function (queueItem, error) {
        console.log('ERROR');
        console.log( queueItem );
        console.log( error );

        options.onFetchError(queueItem, error)
    });

    crawler.on("complete", function () {
        options.onComplete( me.generateSitemap(items), items )
    });

    crawler.addFetchCondition(function(queueItem, referrerQueueItem, callback) {

        var check = !queueItem.path.match(me.extRegex);
        if ( queueItem.path.indexOf('disclaimer.html') != -1  ) {
            check = false;
        }
        callback(null, check);
//        callback(null, !queueItem.path.match(me.extRegex) );
    });

    crawler.noindex = [];
    crawler.decodeResponses = true;
    crawler.urlEncoding = "utf-8";
    crawler.interval = options.interval;
    crawler.discoverResources = this._discoverResources;
    crawler.restrictToBasepath = options.restrictToBasepath;
    crawler.maxEntriesPerFile = options.maxEntriesPerFile,
    crawler.crawlerMaxDepth = options.crawlerMaxDepth,
    crawler.stripQuerystring = options.stripQuerystring;
    crawler.maxConcurrency = options.maxConcurrency;
    crawler.ignoreInvalidSSL = options.ignoreInvalidSSL;

    crawler.start();
};

SitemapGenerator.prototype = {

    /**
     * @param {Array} items
     * @returns {String}
     */
    generateSitemap: function ( items ) {
        var sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        items.forEach(function ( urlItem ) {
            sitemap += '<url>';
            sitemap +=   '<loc>' +urlItem.loc+ '</loc>';
            sitemap +=   urlItem.lastmod ? '<lastmod>' +urlItem.lastmod+ '</lastmod>' : '';
            sitemap +=   urlItem.changefreq ? '<changefreq>' +urlItem.changefreq+ '</changefreq>' : '';
            sitemap +=   urlItem.priority ? '<priority>' +urlItem.priority+ '</priority>' : '';
            sitemap += '</url>';
        });

        sitemap += '</urlset>';

        return sitemap;
    },

    /**
     * @param {String} buffer
     * @param {Object} queueItem
     */
    _discoverResources: function (buffer, queueItem) {
        var $ = cheerio.load(buffer.toString('utf8'));

        // cancel if meta robots nofollow is present
        var metaRobots = $('meta[name="robots"]');

        // add to noindex for it later to be removed from the store before a sitemap is built
        if (metaRobots.length && /noindex/i.test(metaRobots.attr('content'))) {
            this.noindex.push(queueItem.url);
        }

        if (metaRobots.length && /nofollow/i.test(metaRobots.attr('content'))) {
            return []
        }

        // parse links
        var links = $('a[href]').map(function () {
            var href = $(this).attr('href');

            // exclude "mailto:" etc
            if (/^[a-z]+:(?!\/\/)/i.test(href)) {
                return null
            }

            // exclude rel="nofollow" links
            var rel = $(this).attr('rel');
            if (/nofollow/i.test(rel)) {
                return null
            }

            // remove anchors
            href = href.replace(/(#.*)$/, '');

            // handle "//"
            if (/^\/\//.test(href)) {
                return queueItem.protocol +':'+ href;
            }

            // check if link is relative
            // (does not start with "http(s)" or "//")
            if (!/^https?:\/\//.test(href)) {
                var base = $('base').first();
                if (base.length) {
                    // base tag is set, prepend it
                    href = url.resolve(base.attr('href'), href);
                }

                // handle links such as "./foo", "../foo", "/foo"
                if (/^\.\.?\/.*/.test(href) || /^\/[^\/].*/.test(href)) {
                    href = url.resolve(queueItem.url, href);
                }
            }

            return href;
        });

        return links.get();
    }
};

module.exports = SitemapGenerator;