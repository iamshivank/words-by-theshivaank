package com.theshivaank.words.entry;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The owner's own writing, as plain text, for the editor's autocomplete. The browser builds a small word
 * prediction model from it, so suggestions sound like the owner and nothing leaves the app. Owner only
 * (not under /public), newest first, capped so the payload stays small.
 */
@RestController
@Tag(name = "Autocomplete")
public class AutocompleteController {

    static final int MAX_ENTRIES = 300;
    static final int MAX_CHARS = 400_000;

    public record Corpus(List<String> texts) {}

    private final JdbcClient jdbc;

    public AutocompleteController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Operation(summary = "Plain text of the most recent entries, used to train the editor's word predictions.")
    @GetMapping("/api/v1/autocomplete/corpus")
    public ResponseEntity<Corpus> corpus() {
        List<String> rows = jdbc.sql("""
                SELECT trim(both from title || E'.\\n' || content_text) FROM entries
                WHERE content_text <> '' ORDER BY updated_at DESC LIMIT :limit""")
                .param("limit", MAX_ENTRIES)
                .query(String.class)
                .list();
        List<String> texts = new ArrayList<>();
        int total = 0;
        for (String text : rows) {
            if (total >= MAX_CHARS) break;
            String piece = text.length() > MAX_CHARS - total ? text.substring(0, MAX_CHARS - total) : text;
            texts.add(piece);
            total += piece.length();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Corpus(texts));
    }
}
