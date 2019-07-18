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
