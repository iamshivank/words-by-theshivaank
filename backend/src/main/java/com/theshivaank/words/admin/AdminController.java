package com.theshivaank.words.admin;

import com.theshivaank.words.account.OwnerAccount;
import com.theshivaank.words.account.OwnerAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The admin panel's overview: what is in the database, what is read most, and how the system is doing. */
@RestController
@Tag(name = "Admin")
public class AdminController {

    public record Counts(long essays, long journals, long notes, long published, long drafts, long publicEntries,
            long privateEntries, long words, long reads, long tags, long quotes, long customQuotes, long prompts,
            long decisionsOpen, long decisionsReviewed, long goals, long media, long mediaBytes, long sessions) {}

    public record TopEssay(String slug, String title, long views, Instant publishedAt) {}

    public record SystemInfo(String version, String javaVersion, long uptimeSeconds, String databaseSize,
            String databaseVersion) {}

    public record Overview(Counts counts, List<TopEssay> topEssays, Instant lastLoginAt, Instant lastWriteAt,
            SystemInfo system) {}

    private final JdbcClient jdbc;
    private final OwnerAccountService accounts;
    private final String version;

    public AdminController(JdbcClient jdbc, OwnerAccountService accounts, @Value("${app.version:dev}") String version) {
        this.jdbc = jdbc;
        this.accounts = accounts;
        this.version = version.startsWith("@") ? "dev" : version;
    }

    @Operation(summary = "Counts, most-read essays and system health for the admin panel.")
    @GetMapping("/api/v1/admin/overview")
    @Transactional(readOnly = true)
    public Overview overview() {
        Counts counts = jdbc.sql("""
                SELECT
                  (SELECT count(*) FROM entries WHERE type = 'essay'),
                  (SELECT count(*) FROM entries WHERE type = 'journal'),
                  (SELECT count(*) FROM entries WHERE type = 'note'),
                  (SELECT count(*) FROM entries WHERE status = 'published'),
                  (SELECT count(*) FROM entries WHERE status = 'draft'),
                  (SELECT count(*) FROM entries WHERE visibility <> 'private'),
                  (SELECT count(*) FROM entries WHERE visibility = 'private'),
                  (SELECT coalesce(sum(word_count), 0) FROM entries),
                  (SELECT coalesce(sum(view_count), 0) FROM entries),
                  (SELECT count(*) FROM tags),
                  (SELECT count(*) FROM quotes),
                  (SELECT count(*) FROM quotes WHERE is_custom),
                  (SELECT count(*) FROM prompts),
                  (SELECT count(*) FROM decisions WHERE status = 'open'),
                  (SELECT count(*) FROM decisions WHERE status = 'reviewed'),
                  (SELECT count(*) FROM goals),
                  (SELECT count(*) FROM media),
                  (SELECT coalesce(sum(size_bytes), 0) FROM media),
                  (SELECT count(*) FROM writing_sessions)""")
                .query((rs, i) -> {
                    long[] v = new long[19];
                    for (int c = 0; c < v.length; c++) v[c] = rs.getLong(c + 1);
                    return new Counts(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11],
                            v[12], v[13], v[14], v[15], v[16], v[17], v[18]);
                })
                .single();
        List<TopEssay> top = jdbc.sql("""
                SELECT slug, title, view_count, published_at FROM entries
                WHERE type = 'essay' AND status = 'published' AND visibility = 'public'
                ORDER BY view_count DESC, published_at DESC LIMIT 5""")
                .query((rs, i) -> new TopEssay(rs.getString(1), rs.getString(2), rs.getLong(3),
                        rs.getTimestamp(4).toInstant()))
                .list();
        Instant lastWrite = jdbc.sql("SELECT max(updated_at) FROM entries").query(java.sql.Timestamp.class)
                .optional().map(java.sql.Timestamp::toInstant).orElse(null);
        Map<String, Object> db = jdbc.sql(
                        "SELECT pg_size_pretty(pg_database_size(current_database())) AS size, current_setting('server_version') AS version")
                .query().singleRow();
        OwnerAccount account = accounts.account();
        SystemInfo system = new SystemInfo(version, Runtime.version().toString(),
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000, (String) db.get("size"), (String) db.get("version"));
        return new Overview(counts, top, account.getLastLoginAt(), lastWrite, system);
    }
}
