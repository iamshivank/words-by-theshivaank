package com.theshivaank.words.entry;

import com.theshivaank.words.common.PageResponse;
import com.theshivaank.words.entry.EntryDtos.BulkAction;
import com.theshivaank.words.entry.EntryDtos.BulkResult;
import com.theshivaank.words.entry.EntryDtos.EntryDetail;
import com.theshivaank.words.entry.EntryDtos.EntryInput;
import com.theshivaank.words.entry.EntryDtos.EntrySummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/entries")
@Tag(name = "Entries")
public class EntryController {

    private final EntryService service;

    public EntryController(EntryService service) {
        this.service = service;
    }

    @Operation(summary = "All entries (owner). Filter by type, status, visibility, tag, year or text.")
    @GetMapping
    public PageResponse<EntrySummary> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return service.list(new EntryService.Filter(type, status, visibility, tag, q, year), page, size, sort);
    }

    @GetMapping("/{id}")
    public EntryDetail get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryDetail create(@Valid @RequestBody EntryInput body) {
        return service.create(body);
    }

    @Operation(summary = "Save the full state of an entry (autosave uses this).")
    @PutMapping("/{id}")
    public EntryDetail update(@PathVariable UUID id, @Valid @RequestBody EntryInput body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @Operation(summary = "Publish, unpublish, change visibility, feature or delete many entries at once.")
    @PostMapping("/bulk")
    public BulkResult bulk(@Valid @RequestBody BulkAction body) {
        return new BulkResult(service.bulk(body));
    }
}
