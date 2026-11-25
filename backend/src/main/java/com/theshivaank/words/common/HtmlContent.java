package com.theshivaank.words.common;

import java.util.HashSet;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

/**
 * Everything the server derives from editor HTML: the sanitized markup that is stored and rendered,
 * plain text for search, word count, reading time and an excerpt. Headings get stable ids for the
 * table of contents; outside links open safely.
 */
public final class HtmlContent {

    public record Processed(String html, String text, int wordCount, int readingTimeMinutes) {}

    private static final int WORDS_PER_MINUTE = 230;
    private static final String BASE_URI = "https://words.invalid/";

    private static final Safelist SAFELIST = Safelist.relaxed()
            .addTags("hr", "mark", "figure", "figcaption", "s", "section", "aside")
            .addAttributes("pre", "class")
            .addAttributes("code", "class")
            .addAttributes("p", "class")
            .addAttributes("mark", "class")
            .addAttributes("a", "href", "title", "target", "rel")
            .addAttributes("img", "src", "alt", "title", "width", "height", "loading")
            .addProtocols("a", "href", "http", "https", "mailto", "#")
            .addProtocols("img", "src", "http", "https")
            .preserveRelativeLinks(true);

    private HtmlContent() {}

    public static Processed process(String rawHtml) {
        String clean = Jsoup.clean(rawHtml == null ? "" : rawHtml, BASE_URI, SAFELIST);
        Document doc = Jsoup.parseBodyFragment(clean, BASE_URI);
        doc.outputSettings().prettyPrint(false);

        // Keep relative links relative (cleaning resolved them against the placeholder base).
        for (Element el : doc.select("[href], [src]")) {
            for (String attr : new String[] {"href", "src"}) {
                if (el.hasAttr(attr) && el.attr(attr).startsWith(BASE_URI)) {
                    el.attr(attr, "/" + el.attr(attr).substring(BASE_URI.length()));
                }
            }
        }
        for (Element a : doc.select("a[href]")) {
            if (a.attr("href").startsWith("http")) {
                a.attr("target", "_blank").attr("rel", "noopener noreferrer nofollow");
            } else {
                a.removeAttr("target").removeAttr("rel");
            }
        }
        for (Element img : doc.select("img")) img.attr("loading", "lazy");

        Set<String> ids = new HashSet<>();
        for (Element h : doc.select("h2, h3")) {
            String base = Slugs.slugify(h.text());
            String id = base;
            for (int n = 2; !ids.add(id); n++) id = base + "-" + n;
            h.attr("id", id);
        }

        String html = doc.body().html();
        String text = doc.body().text().strip();
        int words = countWords(text);
        int minutes = words == 0 ? 0 : Math.max(1, (int) Math.ceil(words / (double) WORDS_PER_MINUTE));
        return new Processed(html, text, words, minutes);
    }

    public static int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.strip().split("\\s+").length;
    }

    /** First sentences of the text, cut at a word boundary. */
    public static String excerpt(String text, int max) {
        if (text == null) return "";
        String t = text.strip().replaceAll("\\s+", " ");
        if (t.length() <= max) return t;
        int cut = t.lastIndexOf(' ', max);
        return t.substring(0, cut > max / 2 ? cut : max).replaceAll("[,;:.\\s]+$", "") + "…";
    }
}
