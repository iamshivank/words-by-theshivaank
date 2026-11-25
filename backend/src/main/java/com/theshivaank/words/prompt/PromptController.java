package com.theshivaank.words.prompt;

import com.theshivaank.words.common.ConflictException;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.Today;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Daily writing prompts: one per day, least recently shown first, so the whole set rotates. */
@RestController
@Tag(name = "Prompts")
public class PromptController {

    public record Prompt(UUID id, String text, String category, boolean custom, boolean active, LocalDate lastShownOn) {}

    public record PromptInput(@NotBlank @Size(max = 500) String text, @Size(max = 40) String category, Boolean active) {}

    private static final String COLUMNS = "id, text, category, is_custom, is_active, last_shown_on";

    private final JdbcClient jdbc;
    private final Today today;

    public PromptController(JdbcClient jdbc, Today today) {
        this.jdbc = jdbc;
        this.today = today;
    }

    @Operation(summary = "Today's prompt. Picks one the first time it is asked for each day.")
    @GetMapping("/api/v1/prompts/today")
    @Transactional
    public Prompt today() {
        LocalDate day = today.date();
        return jdbc.sql("SELECT " + COLUMNS + " FROM prompts WHERE is_active AND last_shown_on = :day ORDER BY updated_at DESC LIMIT 1")
                .param("day", day).query(PromptController::prompt).optional()
                .orElseGet(() -> pickNext(day));
    }

    @Operation(summary = "Show a different prompt today.")
    @PostMapping("/api/v1/prompts/today/shuffle")
    @Transactional
    public Prompt shuffle() {
        return pickNext(today.date());
    }

    private Prompt pickNext(LocalDate day) {
        UUID id = jdbc.sql("""
                SELECT id FROM prompts WHERE is_active AND last_shown_on IS DISTINCT FROM :day
                ORDER BY last_shown_on NULLS FIRST, random() LIMIT 1""")
                .param("day", day).query(UUID.class).optional()
                .orElseThrow(() -> new NotFoundException("No prompts are active."));
        return jdbc.sql("UPDATE prompts SET last_shown_on = :day WHERE id = :id RETURNING " + COLUMNS)
                .param("day", day).param("id", id).query(PromptController::prompt).single();
    }

    @GetMapping("/api/v1/prompts")
    public List<Prompt> list() {
        return jdbc.sql("SELECT " + COLUMNS + " FROM prompts ORDER BY is_custom DESC, category, text")
                .query(PromptController::prompt).list();
    }

    @PostMapping("/api/v1/prompts")
    @ResponseStatus(HttpStatus.CREATED)
    public Prompt create(@Valid @RequestBody PromptInput in) {
        try {
            return jdbc.sql("INSERT INTO prompts (text, category, is_custom, is_active) VALUES (:text, :cat, true, :active) RETURNING " + COLUMNS)
                    .param("text", in.text().strip()).param("cat", category(in.category()))
                    .param("active", in.active() == null || in.active())
                    .query(PromptController::prompt).single();
        } catch (DuplicateKeyException e) {
            throw new ConflictException("That prompt already exists.");
        }
    }

    @PutMapping("/api/v1/prompts/{id}")
    public Prompt update(@PathVariable UUID id, @Valid @RequestBody PromptInput in) {
        return jdbc.sql("UPDATE prompts SET text = :text, category = :cat, is_active = :active WHERE id = :id RETURNING " + COLUMNS)
                .param("id", id).param("text", in.text().strip()).param("cat", category(in.category()))
                .param("active", in.active() == null || in.active())
                .query(PromptController::prompt).optional()
                .orElseThrow(() -> new NotFoundException("That prompt does not exist."));
    }

    @DeleteMapping("/api/v1/prompts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (jdbc.sql("DELETE FROM prompts WHERE id = :id").param("id", id).update() == 0) {
            throw new NotFoundException("That prompt does not exist.");
        }
    }

    private static String category(String c) {
        return c == null || c.isBlank() ? "reflection" : c.strip().toLowerCase();
    }

    private static Prompt prompt(ResultSet rs, int i) throws SQLException {
        return new Prompt(rs.getObject("id", UUID.class), rs.getString("text"), rs.getString("category"),
                rs.getBoolean("is_custom"), rs.getBoolean("is_active"), rs.getObject("last_shown_on", LocalDate.class));
    }
}
