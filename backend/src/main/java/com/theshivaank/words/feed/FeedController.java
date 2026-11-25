package com.theshivaank.words.feed;

import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.config.AppProperties;
import com.theshivaank.words.entry.Entry;
import com.theshivaank.words.entry.EntryService;
import com.theshivaank.words.settings.SiteSettingsData;
import com.theshivaank.words.settings.SiteSettingsService;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** RSS 2.0 and a sitemap for the public essays. Served at the site root (/rss.xml, /sitemap.xml). */
@RestController
public class FeedController {

    private final EntryService entries;
    private final SiteSettingsService settings;
    private final String base;

    public FeedController(EntryService entries, SiteSettingsService settings, AppProperties props) {
        this.entries = entries;
        this.settings = settings;
        this.base = props.publicUrl().replaceAll("/+$", "");
    }

    @GetMapping(value = {"/rss.xml", "/api/v1/public/rss.xml"}, produces = "application/rss+xml;charset=UTF-8")
    public ResponseEntity<String> rss() {
        SiteSettingsData s = settings.current();
        if (!Boolean.TRUE.equals(s.preferences().rssFeed())) throw new NotFoundException("The feed is switched off.");
        List<Entry> essays = entries.publicEssaysForFeeds();
        StringBuilder xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
                <channel>
                """);
        xml.append("<title>").append(esc(s.siteName() + " " + s.byline())).append("</title>\n")
                .append("<link>").append(base).append("/</link>\n")
                .append("<description>").append(esc(s.tagline())).append("</description>\n")
                .append("<language>en</language>\n")
                .append("<atom:link href=\"").append(base).append("/rss.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n");
        for (Entry e : essays.stream().limit(30).toList()) {
            String url = base + "/writing/" + e.getSlug();
            xml.append("<item>\n")
                    .append("<title>").append(esc(e.getTitle())).append("</title>\n")
                    .append("<link>").append(url).append("</link>\n")
                    .append("<guid isPermaLink=\"true\">").append(url).append("</guid>\n")
                    .append("<pubDate>").append(DateTimeFormatter.RFC_1123_DATE_TIME.format(e.getPublishedAt().atOffset(ZoneOffset.UTC))).append("</pubDate>\n")
                    .append("<description>").append(esc(e.getExcerpt() == null ? "" : e.getExcerpt())).append("</description>\n")
                    .append("<content:encoded><![CDATA[").append(e.getContentHtml().replace("]]>", "]]]]><![CDATA[>")).append("]]></content:encoded>\n");
            e.getTags().forEach(t -> xml.append("<category>").append(esc(t.getName())).append("</category>\n"));
            xml.append("</item>\n");
        }
        xml.append("</channel>\n</rss>\n");
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(xml.toString());
    }

    /** Served here rather than as a static file because the Sitemap line must be an absolute URL. */
    @GetMapping(value = "/robots.txt", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<String> robots() {
        String body = """
                User-agent: *
                Allow: /
                Disallow: /desk
                Disallow: /login

                Sitemap: %s/sitemap.xml
                """.formatted(base);
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic()).body(body);
    }

    @GetMapping(value = {"/sitemap.xml", "/api/v1/public/sitemap.xml"}, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        StringBuilder xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                """);
        for (String path : List.of("/", "/writing", "/archive", "/about")) {
            xml.append("<url><loc>").append(base).append(path).append("</loc></url>\n");
        }
        for (Entry e : entries.publicEssaysForFeeds()) {
            xml.append("<url><loc>").append(base).append("/writing/").append(esc(e.getSlug())).append("</loc>")
                    .append("<lastmod>").append(e.getUpdatedAt().atOffset(ZoneOffset.UTC).toLocalDate()).append("</lastmod></url>\n");
        }
        xml.append("</urlset>\n");
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic()).body(xml.toString());
    }

    private static String esc(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
