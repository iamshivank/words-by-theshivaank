package com.theshivaank.words.stats;

import com.theshivaank.words.common.Today;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Streaks, the year heatmap, weekly and monthly numbers. A day counts as written when it has session
 * words, a new entry, or an entry dated that day (so imported and back-dated journals count too).
 */
@Service
public class StatsService {

    public record Day(LocalDate date, int words, int minutes, int entries, Double mood) {
        public boolean active() {
            return words > 0 || entries > 0;
        }
    }

    public record Streak(int current, int longest, boolean writtenToday) {}

    public record Totals(long words, long entries, long essays, long journals, long notes, long published) {}

    public record Overview(Day today, Streak streak, int dailyWordGoal, List<Day> week, Totals totals) {}

    public record TagUse(String name, long count) {}

    public record Month(String month, List<Day> days, int words, int minutes, int entries, int activeDays,
            Double averageMood, Streak streak, Day bestDay, long decisionsLogged, long decisionsReviewed,
            List<TagUse> topTags) {}

    private final JdbcClient jdbc;
    private final Today today;

    public StatsService(JdbcClient jdbc, Today today) {
        this.jdbc = jdbc;
        this.today = today;
    }

    @Transactional(readOnly = true)
    public List<Day> days(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                WITH days AS (SELECT generate_series(CAST(:from AS date), CAST(:to AS date), interval '1 day')::date AS d),
                e AS (
                    SELECT entry_date, sum(word_count) AS words, count(*) AS n,
                           avg(mood) FILTER (WHERE type = 'journal' AND mood IS NOT NULL) AS mood
                    FROM entries WHERE entry_date BETWEEN :from AND :to GROUP BY entry_date)
                SELECT days.d,
                       greatest(coalesce(ds.words, 0), coalesce(e.words, 0)) AS words,
                       coalesce(ds.minutes, 0) AS minutes,
                       greatest(coalesce(ds.entries, 0), coalesce(e.n, 0)) AS entries,
                       e.mood
                FROM days
                LEFT JOIN daily_stats ds ON ds.date = days.d
                LEFT JOIN e ON e.entry_date = days.d
                ORDER BY days.d""")
                .param("from", from)
                .param("to", to)
                .query((rs, i) -> new Day(rs.getObject(1, LocalDate.class), rs.getInt(2), rs.getInt(3), rs.getInt(4),
                        rs.getObject(5) == null ? null : Math.round(rs.getDouble(5) * 10) / 10.0))
                .list();
    }

    @Transactional(readOnly = true)
    public Streak streak() {
        LocalDate now = today.date();
        TreeSet<LocalDate> active = new TreeSet<>(jdbc.sql("""
                SELECT date FROM daily_stats WHERE (words > 0 OR entries > 0) AND date <= :today
                UNION SELECT entry_date FROM entries WHERE entry_date IS NOT NULL AND entry_date <= :today""")
                .param("today", now)
                .query(LocalDate.class).list());
        return streakOf(active, now);
    }

    public static int longestStreak(TreeSet<LocalDate> active) {
        int longest = 0;
        int run = 0;
        LocalDate prev = null;
        for (LocalDate d : active) {
            run = prev != null && prev.plusDays(1).equals(d) ? run + 1 : 1;
            longest = Math.max(longest, run);
            prev = d;
        }
        return longest;
    }

    static Streak streakOf(TreeSet<LocalDate> active, LocalDate now) {
        int longest = longestStreak(active);
        boolean writtenToday = active.contains(now);
        // A streak stays alive until the end of today: yesterday's run still counts this morning.
        LocalDate cursor = writtenToday ? now : now.minusDays(1);
        int current = 0;
        while (active.contains(cursor)) {
            current++;
            cursor = cursor.minusDays(1);
        }
        return new Streak(current, longest, writtenToday);
    }

    @Transactional(readOnly = true)
    public Overview overview(int dailyWordGoal) {
        LocalDate now = today.date();
        List<Day> week = days(now.minusDays(6), now);
        Totals totals = jdbc.sql("""
                SELECT coalesce(sum(word_count), 0), count(*),
                       count(*) FILTER (WHERE type = 'essay'), count(*) FILTER (WHERE type = 'journal'),
                       count(*) FILTER (WHERE type = 'note'),
                       count(*) FILTER (WHERE type = 'essay' AND status = 'published' AND visibility = 'public')
                FROM entries""")
                .query((rs, i) -> new Totals(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4),
                        rs.getLong(5), rs.getLong(6)))
                .single();
        return new Overview(week.getLast(), streak(), dailyWordGoal, week, totals);
    }

    @Transactional(readOnly = true)
    public List<Day> heatmap(int days) {
        LocalDate now = today.date();
        return days(now.minusDays(Math.min(Math.max(days, 7), 731) - 1L), now);
    }

    @Transactional(readOnly = true)
    public Month month(YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        List<Day> days = days(from, to);
        int words = 0;
        int minutes = 0;
        int entries = 0;
        double moodSum = 0;
        int moodDays = 0;
        Day best = null;
        TreeSet<LocalDate> active = new TreeSet<>();
        for (Day d : days) {
            words += d.words();
            minutes += d.minutes();
            entries += d.entries();
            if (d.mood() != null) {
                moodSum += d.mood();
                moodDays++;
            }
            if (d.active()) active.add(d.date());
            if (best == null || d.words() > best.words()) best = d;
        }
        Streak streak = streakOf(active, to.isAfter(today.date()) ? today.date() : to);
        Map<String, Object> decisions = jdbc.sql("""
                SELECT count(*) FILTER (WHERE created_at::date BETWEEN :from AND :to) AS logged,
                       count(*) FILTER (WHERE reviewed_at::date BETWEEN :from AND :to) AS reviewed
                FROM decisions""")
                .param("from", from).param("to", to)
                .query().singleRow();
        List<TagUse> topTags = jdbc.sql("""
                SELECT t.name, count(*) FROM entry_tags et
                JOIN tags t ON t.id = et.tag_id JOIN entries e ON e.id = et.entry_id
                WHERE e.entry_date BETWEEN :from AND :to
                GROUP BY t.name ORDER BY count(*) DESC, t.name LIMIT 5""")
                .param("from", from).param("to", to)
                .query((rs, i) -> new TagUse(rs.getString(1), rs.getLong(2))).list();
        return new Month(month.toString(), new ArrayList<>(days), words, minutes, entries, active.size(),
                moodDays == 0 ? null : Math.round(moodSum / moodDays * 10) / 10.0, streak,
                best != null && best.words() > 0 ? best : null,
                ((Number) decisions.get("logged")).longValue(), ((Number) decisions.get("reviewed")).longValue(),
                topTags);
    }
}
