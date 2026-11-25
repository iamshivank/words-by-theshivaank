package com.theshivaank.words.goal;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.Today;
import com.theshivaank.words.stats.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.TreeSet;
import java.util.UUID;
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

/** Goals for a period ("Write 20,000 words in November"), with progress computed from what was written. */
@RestController
@Tag(name = "Goals")
public class GoalController {

    public record Goal(UUID id, String title, String metric, int target, LocalDate periodStart, LocalDate periodEnd,
            int progress, boolean active) {}

    public record GoalInput(
            @NotBlank @Size(max = 160) String title,
            @NotNull @Pattern(regexp = "words|entries|journal_days|minutes|streak_days") String metric,
            @Min(1) @Max(10_000_000) int target,
            @NotNull LocalDate periodStart,
            @NotNull LocalDate periodEnd) {}

    private final JdbcClient jdbc;
    private final StatsService stats;
    private final Today today;

    public GoalController(JdbcClient jdbc, StatsService stats, Today today) {
        this.jdbc = jdbc;
        this.stats = stats;
        this.today = today;
    }

    @Operation(summary = "Goals with progress. Default: the ones whose period includes today.")
    @GetMapping("/api/v1/goals")
    @Transactional(readOnly = true)
    public List<Goal> list(@RequestParam(defaultValue = "current") String scope) {
        boolean all = "all".equals(scope);
        return jdbc.sql("SELECT id, title, metric, target, period_start, period_end FROM goals "
                        + "WHERE :all OR (:today BETWEEN period_start AND period_end) ORDER BY period_end DESC, title")
                .param("all", all).param("today", today.date())
                .query(this::goal).list();
    }

    @PostMapping("/api/v1/goals")
    @ResponseStatus(HttpStatus.CREATED)
    public Goal create(@Valid @RequestBody GoalInput in) {
        check(in);
        return jdbc.sql("""
                INSERT INTO goals (title, metric, target, period_start, period_end)
                VALUES (:title, :metric, :target, :start, :end)
                RETURNING id, title, metric, target, period_start, period_end""")
                .param("title", in.title().strip()).param("metric", in.metric()).param("target", in.target())
                .param("start", in.periodStart()).param("end", in.periodEnd())
                .query(this::goal).single();
    }

    @PutMapping("/api/v1/goals/{id}")
    public Goal update(@PathVariable UUID id, @Valid @RequestBody GoalInput in) {
        check(in);
        return jdbc.sql("""
                UPDATE goals SET title = :title, metric = :metric, target = :target, period_start = :start, period_end = :end
                WHERE id = :id RETURNING id, title, metric, target, period_start, period_end""")
                .param("id", id).param("title", in.title().strip()).param("metric", in.metric())
                .param("target", in.target()).param("start", in.periodStart()).param("end", in.periodEnd())
                .query(this::goal).optional()
                .orElseThrow(() -> new NotFoundException("That goal does not exist."));
    }

    @DeleteMapping("/api/v1/goals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (jdbc.sql("DELETE FROM goals WHERE id = :id").param("id", id).update() == 0) {
            throw new NotFoundException("That goal does not exist.");
        }
    }

    private static void check(GoalInput in) {
        if (in.periodEnd().isBefore(in.periodStart())) throw new BadRequestException("The period ends before it starts.");
        if (in.periodStart().plusYears(5).isBefore(in.periodEnd())) throw new BadRequestException("Keep goals under five years.");
    }

    private Goal goal(ResultSet rs, int i) throws SQLException {
        LocalDate start = rs.getObject("period_start", LocalDate.class);
        LocalDate end = rs.getObject("period_end", LocalDate.class);
        String metric = rs.getString("metric");
        LocalDate now = today.date();
        return new Goal(rs.getObject("id", UUID.class), rs.getString("title"), metric, rs.getInt("target"),
                start, end, progress(metric, start, end.isAfter(now) ? now : end),
                !now.isBefore(start) && !now.isAfter(end));
    }

    private int progress(String metric, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) return 0;
        return switch (metric) {
            case "entries" -> jdbc.sql("SELECT count(*) FROM entries WHERE entry_date BETWEEN :from AND :to")
                    .param("from", from).param("to", to).query(Integer.class).single();
            case "journal_days" -> jdbc.sql(
                            "SELECT count(DISTINCT entry_date) FROM entries WHERE type = 'journal' AND entry_date BETWEEN :from AND :to")
                    .param("from", from).param("to", to).query(Integer.class).single();
            default -> {
                List<StatsService.Day> days = stats.days(from, to);
                yield switch (metric) {
                    case "words" -> days.stream().mapToInt(StatsService.Day::words).sum();
                    case "minutes" -> days.stream().mapToInt(StatsService.Day::minutes).sum();
                    case "streak_days" -> {
                        TreeSet<LocalDate> active = new TreeSet<>();
                        days.stream().filter(StatsService.Day::active).forEach(d -> active.add(d.date()));
                        yield StatsService.longestStreak(active);
                    }
                    default -> 0;
                };
            }
        };
    }
}
