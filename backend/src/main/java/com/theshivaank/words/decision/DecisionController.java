package com.theshivaank.words.decision;

import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.Today;
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
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * The decision journal. A decision is logged with its options, reasoning, expected outcome and a
 * confidence; on its review date it comes back asking what happened. The verdict separates the quality
 * of the process from the luck of the outcome.
 */
@RestController
@Tag(name = "Decisions")
public class DecisionController {

    public record Decision(UUID id, String title, String context, List<String> options, String choice,
            String reasoning, String expectedOutcome, Short confidence, LocalDate reviewOn, String actualOutcome,
            String lessons, Boolean wasRight, String verdict, String status, Instant reviewedAt, Instant createdAt) {}

    public record DecisionInput(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 10_000) String context,
            @Size(max = 12) List<@Size(max = 300) String> options,
            @Size(max = 1000) String choice,
            @Size(max = 10_000) String reasoning,
            @Size(max = 5000) String expectedOutcome,
            @Min(0) @Max(100) Short confidence,
            LocalDate reviewOn) {}

    public record ReviewInput(
            @Size(max = 10_000) String actualOutcome,
            @Size(max = 10_000) String lessons,
            @NotNull Boolean wasRight,
            @Pattern(regexp = "good_process_good_outcome|good_process_bad_outcome|bad_process_good_outcome|bad_process_bad_outcome")
            String verdict) {}

    /** One confidence band: how often decisions made at that confidence turned out right. */
    public record CalibrationBucket(int from, int to, int count, int right, Double rate) {}

    public record Calibration(List<CalibrationBucket> buckets, int reviewed, Double brierScore) {}

    private static final String COLUMNS = """
            id, title, context, options, choice, reasoning, expected_outcome, confidence, review_on, actual_outcome,
            lessons, was_right, verdict, status, reviewed_at, created_at""";

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final Today today;

    public DecisionController(JdbcClient jdbc, JsonMapper json, Today today) {
        this.jdbc = jdbc;
        this.json = json;
        this.today = today;
    }

    @GetMapping("/api/v1/decisions")
    public List<Decision> list(@RequestParam(required = false) String status) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM decisions WHERE (CAST(:status AS text) IS NULL OR status = :status) "
                        + "ORDER BY (status = 'open') DESC, review_on NULLS LAST, created_at DESC")
                .param("status", status == null || status.isBlank() ? null : status)
                .query(this::decision).list();
    }

    @Operation(summary = "Open decisions whose review date has arrived.")
    @GetMapping("/api/v1/decisions/due")
    public List<Decision> due() {
        return jdbc.sql("SELECT " + COLUMNS + " FROM decisions WHERE status = 'open' AND review_on <= :today ORDER BY review_on")
                .param("today", today.date()).query(this::decision).list();
    }

    @GetMapping("/api/v1/decisions/{id}")
    public Decision get(@PathVariable UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM decisions WHERE id = :id").param("id", id)
                .query(this::decision).optional().orElseThrow(DecisionController::notFound);
    }

    @PostMapping("/api/v1/decisions")
    @ResponseStatus(HttpStatus.CREATED)
    public Decision create(@Valid @RequestBody DecisionInput in) {
        return bind(jdbc.sql("""
                INSERT INTO decisions (title, context, options, choice, reasoning, expected_outcome, confidence, review_on)
                VALUES (:title, :context, CAST(:options AS jsonb), :choice, :reasoning, :expected, :confidence, :reviewOn)
                """ + " RETURNING " + COLUMNS), in).query(this::decision).single();
    }

    @PutMapping("/api/v1/decisions/{id}")
    public Decision update(@PathVariable UUID id, @Valid @RequestBody DecisionInput in) {
        return bind(jdbc.sql("""
                UPDATE decisions SET title = :title, context = :context, options = CAST(:options AS jsonb), choice = :choice,
                    reasoning = :reasoning, expected_outcome = :expected, confidence = :confidence, review_on = :reviewOn
                WHERE id = :id """ + " RETURNING " + COLUMNS), in).param("id", id)
                .query(this::decision).optional().orElseThrow(DecisionController::notFound);
    }

    @Operation(summary = "Record what actually happened. Closes the decision.")
    @PostMapping("/api/v1/decisions/{id}/review")
    public Decision review(@PathVariable UUID id, @Valid @RequestBody ReviewInput in) {
        return jdbc.sql("""
                UPDATE decisions SET actual_outcome = :outcome, lessons = :lessons, was_right = :right, verdict = :verdict,
                    status = 'reviewed', reviewed_at = :now
                WHERE id = :id """ + " RETURNING " + COLUMNS)
                .param("id", id).param("outcome", blank(in.actualOutcome())).param("lessons", blank(in.lessons()))
                .param("right", in.wasRight()).param("verdict", blank(in.verdict()))
                .param("now", Timestamp.from(today.now()))
                .query(this::decision).optional().orElseThrow(DecisionController::notFound);
    }

    @DeleteMapping("/api/v1/decisions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (jdbc.sql("DELETE FROM decisions WHERE id = :id").param("id", id).update() == 0) throw notFound();
    }

    @Operation(summary = "Confidence versus how often you were right, in bands of ten.")
    @GetMapping("/api/v1/decisions/calibration")
    public Calibration calibration() {
        record Point(int confidence, boolean right) {}
        List<Point> points = jdbc.sql("SELECT confidence, was_right FROM decisions WHERE status = 'reviewed' "
                        + "AND confidence IS NOT NULL AND was_right IS NOT NULL")
                .query((rs, i) -> new Point(rs.getInt(1), rs.getBoolean(2))).list();
        int[][] bands = {{0, 49}, {50, 59}, {60, 69}, {70, 79}, {80, 89}, {90, 100}};
        List<CalibrationBucket> buckets = new ArrayList<>();
        for (int[] band : bands) {
            int count = 0;
            int right = 0;
            for (Point p : points) {
                if (p.confidence() >= band[0] && p.confidence() <= band[1]) {
                    count++;
                    if (p.right()) right++;
                }
            }
            buckets.add(new CalibrationBucket(band[0], band[1], count, right,
                    count == 0 ? null : Math.round(right * 1000.0 / count) / 1000.0));
        }
        Double brier = points.isEmpty() ? null : Math.round(points.stream()
                .mapToDouble(p -> Math.pow(p.confidence() / 100.0 - (p.right() ? 1 : 0), 2))
                .average().orElse(0) * 1000) / 1000.0;
        return new Calibration(buckets, points.size(), brier);
    }

    private JdbcClient.StatementSpec bind(JdbcClient.StatementSpec spec, DecisionInput in) {
        List<String> options = in.options() == null ? List.of()
                : in.options().stream().map(String::strip).filter(s -> !s.isEmpty()).toList();
        return spec.param("title", in.title().strip()).param("context", blank(in.context()))
                .param("options", json.writeValueAsString(options)).param("choice", blank(in.choice()))
                .param("reasoning", blank(in.reasoning())).param("expected", blank(in.expectedOutcome()))
                .param("confidence", in.confidence()).param("reviewOn", in.reviewOn());
    }

    private Decision decision(ResultSet rs, int i) throws SQLException {
        Timestamp reviewedAt = rs.getTimestamp("reviewed_at");
        Object wasRight = rs.getObject("was_right");
        Object confidence = rs.getObject("confidence");
        return new Decision(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("context"),
                json.readValue(rs.getString("options"), new TypeReference<List<String>>() {}),
                rs.getString("choice"), rs.getString("reasoning"), rs.getString("expected_outcome"),
                confidence == null ? null : ((Number) confidence).shortValue(),
                rs.getObject("review_on", LocalDate.class), rs.getString("actual_outcome"), rs.getString("lessons"),
                (Boolean) wasRight, rs.getString("verdict"), rs.getString("status"),
                reviewedAt == null ? null : reviewedAt.toInstant(), rs.getTimestamp("created_at").toInstant());
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("That decision does not exist.");
    }
}
