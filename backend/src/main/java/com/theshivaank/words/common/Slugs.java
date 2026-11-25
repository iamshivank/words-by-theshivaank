package com.theshivaank.words.common;

import java.text.Normalizer;
import java.util.Locale;

public final class Slugs {

    private Slugs() {}

    /** "Deciding Slowly: Notes!" -> "deciding-slowly-notes". Never empty. */
    public static String slugify(String text) {
        String ascii = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (ascii.length() > 80) ascii = ascii.substring(0, 80).replaceAll("-+$", "");
        return ascii.isEmpty() ? "untitled" : ascii;
    }
}
