package com.theshivaank.words.entry;

import com.theshivaank.words.auth.AuthController;
import com.theshivaank.words.common.PageResponse;
import com.theshivaank.words.entry.EntryDtos.ArchiveYear;
import com.theshivaank.words.entry.EntryDtos.PublicEntry;
import com.theshivaank.words.entry.EntryDtos.PublicEntrySummary;
import com.theshivaank.words.entry.EntryDtos.PublicStats;
import com.theshivaank.words.entry.EntryDtos.TagCount;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** What visitors can read: published essays only. Private journals never leave through here. */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Public")
public class PublicEntryController {

    private final EntryService service;

    public PublicEntryController(EntryService service) {
        this.service = service;
    }

    @Operation(summary = "Published public essays, newest first. Filter by tag slug or year.")
    @GetMapping("/entries")
    public PageResponse<PublicEntrySummary> list(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.publicList(tag, year, page, size);
    }

    @Operation(summary = "Essays for the landing page's flying cards, each with its highlight label.")
    @GetMapping("/entries/flying")
    public List<PublicEntrySummary> flying(@RequestParam(defaultValue = "6") int limit) {
        return service.flying(limit);
    }

    @Operation(summary = "One essay (public or unlisted) by its address, with its neighbours.")
    @GetMapping("/entries/{slug}")
    public ResponseEntity<PublicEntry> get(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                .body(service.publicEntry(slug));
    }

    @Operation(summary = "Count a read. The owner's own visits are not counted.")
    @PostMapping("/entries/{slug}/view")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void view(@PathVariable String slug, Authentication authentication) {
        if (!AuthController.isOwner(authentication)) service.recordView(slug);
    }

    @GetMapping("/archive")
    public List<ArchiveYear> archive() {
        return service.archive();
    }

    @GetMapping("/tags")
    public List<TagCount> tags() {
        return service.publicTags();
    }

    @Operation(summary = "Issue number and totals for the landing page frame.")
    @GetMapping("/stats")
    public PublicStats stats() {
        return service.publicStats();
    }
}
