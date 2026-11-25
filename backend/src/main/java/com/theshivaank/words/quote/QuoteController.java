package com.theshivaank.words.quote;

import com.theshivaank.words.common.ConflictException;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.PageResponse;
import com.theshivaank.words.common.Today;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The quotes library. `showInEditor` and `showOnLanding` choose where a quote may appear;
 * `active` takes it out of rotation everywhere without deleting it.
 */
@RestController
@Tag(name = "Quotes")
public class QuoteController {

    public record Quote(UUID id, String text, String author, String source, boolean custom, boolean favorite,
            boolean active, boolean showInEditor, boolean showOnLanding) {}

    public record PublicQuote(String text, String author, String source) {}

    public record QuoteInput(
            @NotBlank @Size(max = 1000) String text,
            @NotBlank @Size(max = 120) String author,
            @Size(max = 200) String source,
            Boolean favorite, Boolean active, Boolean showInEditor, Boolean showOnLanding) {}

    private static final String COLUMNS =
            "id, text, author, source, is_custom, is_favorite, is_active, show_in_editor, show_on_landing";

    private final JdbcClient jdbc;
    private final Today today;

    public QuoteController(JdbcClient jdbc, Today today) {
        this.jdbc = jdbc;
        this.today = today;
    }

    @Operation(summary = "The library. Filter by text/author, favorites or your own.")
    @GetMapping("/api/v1/quotes")
    public PageResponse<Quote> list(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean favorites,
            @RequestParam(defaultValue = "false") boolean custom,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        int limit = Math.min(Math.max(size, 1), 200);
        String like = q == null || q.isBlank() ? null : "%" + q.strip().toLowerCase() + "%";
        String where = """
                WHERE (CAST(:like AS text) IS NULL OR lower(text) LIKE :like OR lower(author) LIKE :like)
                  AND (NOT :favorites OR is_favorite) AND (NOT :custom OR is_custom)""";
        long total = jdbc.sql("SELECT count(*) FROM quotes " + where)
                .param("like", like).param("favorites", favorites).param("custom", custom)
                .query(Long.class).single();
        List<Quote> items = jdbc.sql("SELECT " + COLUMNS + " FROM quotes " + where
                        + " ORDER BY is_favorite DESC, is_custom DESC, author, text LIMIT :limit OFFSET :offset")
                .param("like", like).param("favorites", favorites).param("custom", custom)
                .param("limit", limit).param("offset", page * limit)
                .query(QuoteController::quote).list();
        return new PageResponse<>(items, page, limit, total, (int) Math.ceil(total / (double) limit));
    }

    @PostMapping("/api/v1/quotes")
    @ResponseStatus(HttpStatus.CREATED)
    public Quote create(@Valid @RequestBody QuoteInput in) {
        try {
            return jdbc.sql("""
                    INSERT INTO quotes (text, author, source, is_custom, is_favorite, is_active, show_in_editor, show_on_landing)
                    VALUES (:text, :author, :source, true, :fav, :active, :editor, :landing) """ + " RETURNING " + COLUMNS)
                    .param("text", in.text().strip()).param("author", in.author().strip())
                    .param("source", blankToNull(in.source()))
                    .param("fav", bool(in.favorite(), false)).param("active", bool(in.active(), true))
                    .param("editor", bool(in.showInEditor(), true)).param("landing", bool(in.showOnLanding(), true))
                    .query(QuoteController::quote).single();
        } catch (DuplicateKeyException e) {
            throw new ConflictException("That quote is already in the library.");
        }
    }

    @PutMapping("/api/v1/quotes/{id}")
    public Quote update(@PathVariable UUID id, @Valid @RequestBody QuoteInput in) {
        return jdbc.sql("""
                UPDATE quotes SET text = :text, author = :author, source = :source, is_favorite = :fav,
                    is_active = :active, show_in_editor = :editor, show_on_landing = :landing
                WHERE id = :id """ + " RETURNING " + COLUMNS)
                .param("id", id).param("text", in.text().strip()).param("author", in.author().strip())
                .param("source", blankToNull(in.source()))
                .param("fav", bool(in.favorite(), false)).param("active", bool(in.active(), true))
                .param("editor", bool(in.showInEditor(), true)).param("landing", bool(in.showOnLanding(), true))
                .query(QuoteController::quote).optional()
                .orElseThrow(() -> new NotFoundException("That quote does not exist."));
    }

    @DeleteMapping("/api/v1/quotes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (jdbc.sql("DELETE FROM quotes WHERE id = :id").param("id", id).update() == 0) {
            throw new NotFoundException("That quote does not exist.");
        }
    }

    @Operation(summary = "A random quote for the editor's blank page (favorites twice as likely).")
    @GetMapping("/api/v1/quotes/random")
    public Quote random(@RequestParam(defaultValue = "editor") String placement) {
        String column = "landing".equals(placement) ? "show_on_landing" : "show_in_editor";
        return jdbc.sql("SELECT " + COLUMNS + " FROM quotes WHERE is_active AND " + column
                        + " ORDER BY random() * CASE WHEN is_favorite THEN 0.5 ELSE 1 END LIMIT 1")
                .query(QuoteController::quote).optional()
                .orElseThrow(() -> new NotFoundException("No quotes are active."));
    }

    @Operation(summary = "Quotes for the landing page to rotate through. The first is the quote of the day.")
    @GetMapping("/api/v1/public/quotes")
    @Transactional(readOnly = true)
    public List<PublicQuote> publicQuotes(@RequestParam(defaultValue = "8") int limit) {
        // Seeded by the date, so everyone sees the same order today and a new one tomorrow.
        return jdbc.sql("""
                SELECT text, author, source FROM quotes WHERE is_active AND show_on_landing
                ORDER BY md5(id::text || :day) LIMIT :limit""")
                .param("day", today.date().toString())
                .param("limit", Math.min(Math.max(limit, 1), 30))
                .query((rs, i) -> new PublicQuote(rs.getString(1), rs.getString(2), rs.getString(3))).list();
    }

    private static Quote quote(ResultSet rs, int i) throws SQLException {
        return new Quote(rs.getObject("id", UUID.class), rs.getString("text"), rs.getString("author"),
                rs.getString("source"), rs.getBoolean("is_custom"), rs.getBoolean("is_favorite"),
                rs.getBoolean("is_active"), rs.getBoolean("show_in_editor"), rs.getBoolean("show_on_landing"));
    }

    private static boolean bool(Boolean value, boolean fallback) {
        return value != null ? value : fallback;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
