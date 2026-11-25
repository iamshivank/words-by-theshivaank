package com.theshivaank.words.stats;

import com.theshivaank.words.settings.SiteSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import com.theshivaank.words.common.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Stats")
public class StatsController {

    public record SessionStart(UUID entryId) {}

    public record SessionStarted(UUID id) {}

    public record SessionReport(@Min(0) @Max(200_000) int wordsAdded) {}

    private final StatsService stats;
    private final SessionService sessions;
    private final SiteSettingsService settings;

    public StatsController(StatsService stats, SessionService sessions, SiteSettingsService settings) {
        this.stats = stats;
        this.sessions = sessions;
        this.settings = settings;
    }

    @Operation(summary = "Today, the streak, the last seven days and lifetime totals.")
    @GetMapping("/api/v1/stats/overview")
    public StatsService.Overview overview() {
        return stats.overview(settings.current().writing().dailyWordGoal());
    }

    @Operation(summary = "Words per day for the heatmap (default: the last 53 weeks).")
    @GetMapping("/api/v1/stats/heatmap")
    public List<StatsService.Day> heatmap(@RequestParam(defaultValue = "371") int days) {
        return stats.heatmap(days);
    }

    @Operation(summary = "A month in numbers, for the monthly review. month=YYYY-MM.")
    @GetMapping("/api/v1/stats/month")
    public StatsService.Month month(@RequestParam String month) {
        try {
            return stats.month(YearMonth.parse(month));
        } catch (DateTimeParseException e) {
            throw new BadRequestException("month must look like 2026-11");
        }
    }

    @GetMapping("/api/v1/stats/streak")
    public StatsService.Streak streak() {
        return stats.streak();
    }

    @Operation(summary = "Open a writing session (the editor does this when you start typing).")
    @PostMapping("/api/v1/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionStarted start(@RequestBody SessionStart body) {
        return new SessionStarted(sessions.start(body.entryId()));
    }

    @Operation(summary = "Report a session's running total of words added. Idempotent.")
    @PutMapping("/api/v1/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(@PathVariable UUID id, @Valid @RequestBody SessionReport body) {
        sessions.report(id, body.wordsAdded());
    }
}
