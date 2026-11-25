package com.theshivaank.words.stats;

import java.time.LocalDate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Keeps the daily_stats rollup in step with sessions and new entries. Totals never go below zero. */
@Component
public class DailyStatsWriter {

    private final JdbcClient jdbc;

    public DailyStatsWriter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void add(LocalDate date, int words, int minutes, int entries) {
        if (words == 0 && minutes == 0 && entries == 0) return;
        jdbc.sql("""
                INSERT INTO daily_stats (date, words, minutes, entries)
                VALUES (:date, greatest(0, :words), greatest(0, :minutes), greatest(0, :entries))
                ON CONFLICT (date) DO UPDATE SET
                    words   = greatest(0, daily_stats.words + :words),
                    minutes = greatest(0, daily_stats.minutes + :minutes),
                    entries = greatest(0, daily_stats.entries + :entries)""")
                .param("date", date)
                .param("words", words)
                .param("minutes", minutes)
                .param("entries", entries)
                .update();
    }
}
