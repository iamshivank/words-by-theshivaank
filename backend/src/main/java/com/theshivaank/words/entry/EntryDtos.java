package com.theshivaank.words.entry;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Request and response shapes for entries. */
public final class EntryDtos {

    private EntryDtos() {}

    public record TagView(String name, String slug) {}

    public record TagCount(String name, String slug, long count) {}

    public record EntrySummary(
            UUID id, String type, String title, String slug, String excerpt, String coverImageUrl,
            String visibility, String status, LocalDate entryDate, Short mood, int wordCount,
            int readingTimeMinutes, Instant publishedAt, Instant createdAt, Instant updatedAt,
            List<TagView> tags, String highlightLabel, boolean featured, long viewCount) {}

    public record EntryDetail(
            UUID id, String type, String title, String slug, String excerpt, String coverImageUrl,
            String visibility, String status, LocalDate entryDate, Short mood, Short energy,
            String gratitude, String lessons, int wordCount, int readingTimeMinutes, Instant publishedAt,
            Instant createdAt, Instant updatedAt, List<TagView> tags, String highlightLabel, boolean featured,
            long viewCount, Map<String, Object> contentJson, String contentHtml) {}

    /** Full state of an entry as the editor saves it. Missing optional fields mean "empty". */
    public record EntryInput(
            @NotNull @Pattern(regexp = "essay|journal|note") String type,
            @Size(max = 300) String title,
            @Size(max = 120) @Pattern(regexp = "^$|^[a-z0-9]+(?:-[a-z0-9]+)*$",
                    message = "use lowercase letters, numbers and hyphens") String slug,
            Map<String, Object> contentJson,
            @Size(max = 3_000_000) String contentHtml,
            @Size(max = 600) String excerpt,
            @Size(max = 1000) @Pattern(regexp = "^$|^(https?://|/uploads/).*", message = "must be a web address or an upload")
            String coverImageUrl,
            @Pattern(regexp = "private|unlisted|public") String visibility,
            @Pattern(regexp = "draft|published") String status,
            LocalDate entryDate,
            @Min(1) @Max(5) Short mood,
            @Min(1) @Max(5) Short energy,
            @Size(max = 5000) String gratitude,
            @Size(max = 5000) String lessons,
            @Size(max = 12) List<@Size(min = 1, max = 40) String> tags,
            @Size(max = 40) String highlightLabel,
            Boolean featured) {}

    public record BulkAction(
            @NotEmpty @Size(max = 500) List<UUID> ids,
            @NotNull @Pattern(regexp = "publish|unpublish|make-public|make-private|feature|unfeature|delete") String action) {}

    public record BulkResult(int affected) {}

    // ---- Public ------------------------------------------------------------

    /** `label` is what the landing page pins to a flying card: the custom highlight, "New", or the first tag. */
    public record PublicEntrySummary(
            String slug, String title, String excerpt, String coverImageUrl, Instant publishedAt,
            int readingTimeMinutes, int wordCount, List<TagView> tags, String highlightLabel, boolean featured,
            long viewCount, String label) {}

    public record Neighbor(String slug, String title) {}

    public record PublicEntry(
            String slug, String title, String excerpt, String coverImageUrl, Instant publishedAt, Instant updatedAt,
            int readingTimeMinutes, int wordCount, List<TagView> tags, String highlightLabel, long viewCount,
            String contentHtml, Neighbor previous, Neighbor next) {}

    public record ArchiveYear(int year, List<PublicEntrySummary> entries) {}

    public record PublicStats(long published, long words, Instant since) {}
}
