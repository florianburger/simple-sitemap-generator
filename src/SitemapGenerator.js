// Include our Plugins
const EventEmitter = require("events");

const Crawler = require("simplecrawler"),
    cheerio = require("cheerio"),
    moment = require("moment"),
    url = require("url"),
    fs = require("fs");

const DEFAULT_OPTIONS = {
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

    exclude: [
        "gif",
        "jpg",
        "jpeg",
        "png",
        "ico",
        "bmp",
        "ogg",
        "webp",
        "mp4",
        "webm",
        "mp3",
        "ttf",
        "woff",
        "json",
        "rss",
        "atom",
        "gz",
        "zip",
        "rar",
        "7z",
        "css",
        "js",
        "gzip",
        "exe",
        "svg"
    ],
    ignore: url => {
        return false;
    }
};

class SitemapGenerator extends EventEmitter {
    /**
     * @param {String} url
     * @param {Object} options
     */
    constructor(url, options) {
        super();

        this.url = url;
        options = this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        };

        if (options.ignoreInvalidSSL) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }

        this.extRegex = new RegExp("\\.(" + options.exclude.join("|") + ")$", "i");

        console.log("start", url);

        var me = this,
            items = [];

        var crawler = (this.crawler = Crawler(url));

        crawler.on("fetchcomplete", function(data) {
            var date = moment(new Date(data.stateData.headers.date));

            if (options.ignore(data.url)) {
                return false;
            }

            var urlItem = {
                loc: data.url,
                lastmod: date.format(),
                changefreq: options.changefreq,
                priority: options.priority,
                status: data
            };

            items.push(urlItem);

            me.emit("fetchcomplete", urlItem);
        });
        crawler.on("fetcherror", (queueItem, responseObject) => {
            console.log("ERROR");
            console.log(queueItem);
            console.log(responseObject);

            me.emit("fetcherror", queueItem, responseObject);
        });

        crawler.on("fetchconditionerror", (queueItem, error) => {
            console.log("ERROR");
            console.log(queueItem);
            console.log(error);

            me.emit("fetcherror", queueItem, responseObject);
        });

        crawler.on("fetchdataerror", (queueItem, error) => {
            console.log("ERROR");
            console.log(queueItem);
            console.log(error);

            me.emit("fetcherror", queueItem, responseObject);
        });

        crawler.on("complete", () => {
            var content = me.generateSitemap(items);

            fs.writeFile("./sitemap.xml", content, "utf-8", () => {
                me.emit("complete", content, items);
            });
        });

        crawler.addFetchCondition((queueItem, referrerQueueItem, callback) => {
            var check = !queueItem.path.match(me.extRegex);
            if (queueItem.path.indexOf("disclaimer.html") != -1) {
                check = false;
            }
            callback(null, check);
            // callback(null, !queueItem.path.match(me.extRegex) );
        });

        crawler.noindex = [];
        crawler.decodeResponses = true;
        crawler.urlEncoding = "utf-8";
        crawler.interval = options.interval;
        crawler.discoverResources = this._discoverResources;
        crawler.restrictToBasepath = options.restrictToBasepath;
        (crawler.maxEntriesPerFile = options.maxEntriesPerFile),
            (crawler.maxDepth = options.maxDepth),
            (crawler.stripQuerystring = options.stripQuerystring);
        crawler.maxConcurrency = options.maxConcurrency;
        crawler.ignoreInvalidSSL = options.ignoreInvalidSSL;
    }

    /**
     * @param {Array} items
     * @returns {String}
     */
    generateSitemap(items) {
        var sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        items.forEach(function(urlItem) {
            sitemap += "<url>";
            sitemap += "<loc>" + urlItem.loc + "</loc>";
            sitemap += urlItem.lastmod ? "<lastmod>" + urlItem.lastmod + "</lastmod>" : "";
            sitemap += urlItem.changefreq ? "<changefreq>" + urlItem.changefreq + "</changefreq>" : "";
            sitemap += urlItem.priority ? "<priority>" + urlItem.priority + "</priority>" : "";
            sitemap += "</url>";
        });

        sitemap += "</urlset>";

        return sitemap;
    }

    /**
     * @param {String} buffer
     * @param {Object} queueItem
     * @returns {Array}
     * @private
     */
    _discoverResources(buffer, queueItem) {
        var $ = cheerio.load(buffer.toString("utf8"));

        // cancel if meta robots nofollow is present
        var metaRobots = $('meta[name="robots"]');

        // add to noindex for it later to be removed from the store before a sitemap is built
        if (metaRobots.length && /noindex/i.test(metaRobots.attr("content"))) {
            this.noindex.push(queueItem.url);
        }

        if (metaRobots.length && /nofollow/i.test(metaRobots.attr("content"))) {
            return [];
        }

        // parse links
        var links = $("a[href]").map(function() {
            var href = $(this).attr("href");

            // exclude "mailto:" etc
            if (/^[a-z]+:(?!\/\/)/i.test(href)) {
                return null;
            }

            // exclude rel="nofollow" links
            var rel = $(this).attr("rel");
            if (/nofollow/i.test(rel)) {
                return null;
            }

            // remove anchors
            href = href.replace(/(#.*)$/, "");

            // handle "//"
            if (/^\/\//.test(href)) {
                return queueItem.protocol + ":" + href;
            }

            // check if link is relative
            // (does not start with "http(s)" or "//")
            if (!/^https?:\/\//.test(href)) {
                var base = $("base").first();
                if (base.length) {
                    // base tag is set, prepend it
                    href = url.resolve(base.attr("href"), href);
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

    /**
     * @return {Object}
     */
    getCrawler() {
        return this.crawler;
    }

    /**
     * Start crawler
     */
    start() {
        this.crawler.start();
    }
}

module.exports = SitemapGenerator;
