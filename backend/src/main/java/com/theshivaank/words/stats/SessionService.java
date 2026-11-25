package com.theshivaank.words.stats;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.Today;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writing sessions. The editor opens a session, then reports running totals (words added, end time)
 * every so often. Updates are idempotent: only the difference from the last report reaches daily_stats,
 * so a retried or repeated report never double counts.
 */
@Service
public class SessionService {

    /** Generous ceilings that only stop nonsense (a clock jump, a paste of a whole book is still fine). */
    private static final Duration MAX_SESSION = Duration.ofHours(12);
    private static final int MAX_WORDS = 200_000;

    private final JdbcClient jdbc;
    private final DailyStatsWriter stats;
    private final Today today;

    public SessionService(JdbcClient jdbc, DailyStatsWriter stats, Today today) {
        this.jdbc = jdbc;
        this.stats = stats;
        this.today = today;
    }

    @Transactional
    public UUID start(UUID entryId) {
        Instant now = today.now();
        return jdbc.sql("""
                INSERT INTO writing_sessions (entry_id, started_at, ended_at, words_added)
                VALUES (:entry, :now, :now, 0) RETURNING id""")
                .param("entry", entryId)
                .param("now", Timestamp.from(now))
                .query(UUID.class).single();
    }

    @Transactional
    public void report(UUID id, int wordsAdded) {
        Map<String, Object> row = jdbc.sql(
                        "SELECT started_at, ended_at, words_added FROM writing_sessions WHERE id = :id FOR UPDATE")
                .param("id", id).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> new NotFoundException("That writing session does not exist."));
        if (wordsAdded < 0 || wordsAdded > MAX_WORDS) throw new BadRequestException("Word count is out of range.");

        Instant started = ((Timestamp) row.get("started_at")).toInstant();
        Instant oldEnd = ((Timestamp) row.get("ended_at")).toInstant();
        int oldWords = ((Number) row.get("words_added")).intValue();
        Instant newEnd = today.now();
        if (Duration.between(started, newEnd).compareTo(MAX_SESSION) > 0) newEnd = started.plus(MAX_SESSION);
        if (newEnd.isBefore(oldEnd)) newEnd = oldEnd;

        jdbc.sql("UPDATE writing_sessions SET ended_at = :end, words_added = :words WHERE id = :id")
                .param("end", Timestamp.from(newEnd)).param("words", wordsAdded).param("id", id).update();

        int minuteDelta = (int) (Duration.between(started, newEnd).toMinutes() - Duration.between(started, oldEnd).toMinutes());
        stats.add(today.dateOf(started), wordsAdded - oldWords, minuteDelta, 0);
    }
}
