package com.theshivaank.words.entry;

import com.theshivaank.words.auth.AuthController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Full-text search over the tsvector column. The owner searches everything; visitors only public essays.
 * Matches in the snippet are wrapped in [[ and ]] (never HTML), so the client can highlight them safely.
 */
@RestController
@Tag(name = "Search")
public class SearchController {

    public record SearchHit(UUID id, String type, String title, String slug, String status, String visibility,
            LocalDate entryDate, Instant updatedAt, String snippet) {}

    private final JdbcClient jdbc;

    public SearchController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Operation(summary = "Search. Signed in: every entry. Visitors: published public essays only.")
    @GetMapping({"/api/v1/search", "/api/v1/public/search"})
    public List<SearchHit> search(@RequestParam String q, @RequestParam(defaultValue = "12") int limit,
            Authentication authentication) {
        String query = q == null ? "" : q.strip();
        if (query.isEmpty() || query.length() > 200) return List.of();
        boolean owner = AuthController.isOwner(authentication);
        String like = "%" + query.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return jdbc.sql("""
                SELECT e.id, e.type, e.title, e.slug, e.status, e.visibility, e.entry_date, e.updated_at,
                       ts_headline('english', e.content_text, q,
                           'StartSel=[[, StopSel=]], MaxWords=26, MinWords=10, ShortWord=2, MaxFragments=1') AS snippet
                FROM entries e, websearch_to_tsquery('english', :q) q
                WHERE (e.search_vector @@ q OR lower(e.title) LIKE :like)
                  AND (:owner OR (e.type = 'essay' AND e.status = 'published' AND e.visibility = 'public'))
                ORDER BY ts_rank(e.search_vector, q) + CASE WHEN lower(e.title) LIKE :like THEN 1 ELSE 0 END DESC,
                         e.updated_at DESC
                LIMIT :limit""")
                .param("q", query)
                .param("like", like)
                .param("owner", owner)
                .param("limit", Math.min(Math.max(limit, 1), 50))
                .query((rs, i) -> new SearchHit(
                        rs.getObject("id", UUID.class), rs.getString("type"), rs.getString("title"),
                        rs.getString("slug"), rs.getString("status"), rs.getString("visibility"),
                        rs.getObject("entry_date", LocalDate.class),
                        rs.getTimestamp("updated_at").toInstant(), rs.getString("snippet")))
                .list();
    }
}
