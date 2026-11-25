package com.theshivaank.words.portability;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

/** Converts between the editor's HTML and Markdown with a small YAML-style front matter block. */
final class Markdown {

    record Document(Map<String, String> frontMatter, String body) {}

    private static final Parser PARSER = Parser.builder().build();
    private static final HtmlRenderer RENDERER = HtmlRenderer.builder().escapeHtml(true).build();

    private Markdown() {}

    static String toHtml(String markdown) {
        return RENDERER.render(PARSER.parse(markdown == null ? "" : markdown));
    }

    // ---- HTML -> Markdown --------------------------------------------------

    static String fromHtml(String html) {
        StringBuilder out = new StringBuilder();
        for (Node n : Jsoup.parseBodyFragment(html == null ? "" : html).body().childNodes()) block(n, out, "");
        return out.toString().replaceAll("\n{3,}", "\n\n").strip() + "\n";
    }

    private static void block(Node node, StringBuilder out, String prefix) {
        if (node instanceof TextNode t) {
            if (!t.isBlank()) out.append(prefix).append(t.text().strip()).append("\n\n");
            return;
        }
        if (!(node instanceof Element el)) return;
        switch (el.tagName()) {
            case "h1", "h2", "h3", "h4", "h5", "h6" -> out.append(prefix)
                    .append("#".repeat(el.tagName().charAt(1) - '0')).append(' ').append(inline(el)).append("\n\n");
            case "p" -> out.append(prefix).append(inline(el)).append("\n\n");
            case "blockquote" -> {
                StringBuilder inner = new StringBuilder();
                for (Node c : el.childNodes()) block(c, inner, "");
                for (String line : inner.toString().strip().split("\n")) out.append(prefix).append("> ").append(line).append('\n');
                out.append('\n');
            }
            case "ul", "ol" -> {
                int i = 1;
                for (Element li : el.children()) {
                    String marker = "ol".equals(el.tagName()) ? (i++) + ". " : "- ";
                    out.append(prefix).append(marker).append(inline(li)).append('\n');
                }
                out.append('\n');
            }
            case "pre" -> {
                Element code = el.selectFirst("code");
                String lang = code == null ? "" : code.className().replace("language-", "").strip();
                out.append(prefix).append("```").append(lang).append('\n')
                        .append((code != null ? code : el).wholeText().stripTrailing()).append("\n```\n\n");
            }
            case "hr" -> out.append(prefix).append("---\n\n");
            case "img" -> out.append(prefix).append(image(el)).append("\n\n");
            case "figure" -> {
                for (Node c : el.childNodes()) block(c, out, prefix);
            }
            default -> {
                String text = inline(el);
                if (!text.isBlank()) out.append(prefix).append(text).append("\n\n");
            }
        }
    }

    private static String inline(Element el) {
        StringBuilder sb = new StringBuilder();
        for (Node n : el.childNodes()) {
            if (n instanceof TextNode t) {
                sb.append(t.text().replaceAll("([*_`\\[\\]])", "\\\\$1"));
            } else if (n instanceof Element c) {
                String inner = inline(c);
                switch (c.tagName()) {
                    case "strong", "b" -> sb.append("**").append(inner).append("**");
                    case "em", "i" -> sb.append('*').append(inner).append('*');
                    case "s", "strike", "del" -> sb.append("~~").append(inner).append("~~");
                    case "code" -> sb.append('`').append(c.text()).append('`');
                    case "mark" -> sb.append("==").append(inner).append("==");
                    case "a" -> sb.append('[').append(inner).append("](").append(c.attr("href")).append(')');
                    case "img" -> sb.append(image(c));
                    case "br" -> sb.append("  \n");
                    default -> sb.append(inner);
                }
            }
        }
        return sb.toString().strip();
    }

    private static String image(Element img) {
        return "![" + img.attr("alt") + "](" + img.attr("src") + ")";
    }

    // ---- Front matter ------------------------------------------------------

    static String frontMatter(Map<String, Object> values) {
        StringBuilder sb = new StringBuilder("---\n");
        values.forEach((key, value) -> {
            if (value == null) return;
            sb.append(key).append(": ");
            if (value instanceof List<?> list) {
                sb.append('[');
                for (int i = 0; i < list.size(); i++) sb.append(i > 0 ? ", " : "").append(quote(String.valueOf(list.get(i))));
                sb.append(']');
            } else if (value instanceof Number || value instanceof Boolean) {
                sb.append(value);
            } else {
                sb.append(quote(String.valueOf(value)));
            }
            sb.append('\n');
        });
        return sb.append("---\n\n").toString();
    }

    static Document parse(String text) {
        String normalized = text.replace("\r\n", "\n").replaceFirst("^﻿", "");
        Map<String, String> fm = new LinkedHashMap<>();
        if (!normalized.startsWith("---\n")) return new Document(fm, normalized);
        int end = normalized.indexOf("\n---", 4);
        if (end < 0) return new Document(fm, normalized);
        for (String line : normalized.substring(4, end).split("\n")) {
            int colon = line.indexOf(':');
            if (colon <= 0) continue;
            fm.put(line.substring(0, colon).strip().toLowerCase(), line.substring(colon + 1).strip());
        }
        int bodyStart = normalized.indexOf('\n', end + 4);
        return new Document(fm, bodyStart < 0 ? "" : normalized.substring(bodyStart + 1));
    }

    static String unquote(String v) {
        if (v == null) return null;
        String s = v.strip();
        if (s.length() >= 2 && (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'"))) {
            s = s.substring(1, s.length() - 1).replace("\\\"", "\"").replace("\\\\", "\\");
        }
        return s;
    }

    static List<String> list(String v) {
        if (v == null || v.isBlank()) return List.of();
        String s = v.strip();
        if (s.startsWith("[") && s.endsWith("]")) s = s.substring(1, s.length() - 1);
        return java.util.Arrays.stream(s.split(",")).map(Markdown::unquote).map(String::strip)
                .filter(x -> !x.isEmpty()).toList();
    }

    private static String quote(String s) {
        return '"' + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + '"';
    }
}
