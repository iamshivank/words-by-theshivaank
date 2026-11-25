package com.theshivaank.words.portability;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.common.Slugs;
import com.theshivaank.words.common.Today;
import com.theshivaank.words.entry.EntryDtos.EntryDetail;
import com.theshivaank.words.entry.EntryDtos.EntryInput;
import com.theshivaank.words.entry.EntryRepository;
import com.theshivaank.words.entry.EntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/**
 * Your words are yours: export everything as Markdown files (with front matter) plus JSON for the
 * rest, and import Markdown back, from single files or a zip (including this export).
 */
@RestController
@Tag(name = "Export and import")
public class PortabilityController {

    public record ImportResult(int imported, int skipped, List<String> errors) {}

    private static final int MAX_FILES = 5000;
    private static final int MAX_FILE_BYTES = 5 * 1024 * 1024;

    private final EntryService entries;
    private final EntryRepository repository;
    private final JdbcClient jdbc;
    private final Today today;

    public PortabilityController(EntryService entries, EntryRepository repository, JdbcClient jdbc, Today today) {
        this.entries = entries;
        this.repository = repository;
        this.jdbc = jdbc;
        this.today = today;
    }

    @Operation(summary = "Download everything as a zip of Markdown and JSON files.")
    @GetMapping("/api/v1/export")
    public ResponseEntity<StreamingResponseBody> export() {
        String name = "words-export-" + today.date() + ".zip";
        StreamingResponseBody body = out -> writeZip(out);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(body);
    }

    @Transactional(readOnly = true)
    void writeZip(OutputStream out) throws IOException {
        try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            List<UUID> ids = jdbc.sql("SELECT id FROM entries ORDER BY created_at").query(UUID.class).list();
            for (UUID id : ids) {
                EntryDetail e = entries.get(id);
                Map<String, Object> fm = new LinkedHashMap<>();
                fm.put("id", e.id().toString());
                fm.put("type", e.type());
                fm.put("title", e.title());
                fm.put("slug", e.slug());
                fm.put("status", e.status());
                fm.put("visibility", e.visibility());
                fm.put("date", e.entryDate() == null ? null : e.entryDate().toString());
                fm.put("created_at", e.createdAt().toString());
                fm.put("published_at", e.publishedAt() == null ? null : e.publishedAt().toString());
                fm.put("tags", e.tags().stream().map(t -> t.name()).toList());
                fm.put("excerpt", e.excerpt());
                fm.put("cover", e.coverImageUrl());
                fm.put("highlight", e.highlightLabel());
                fm.put("featured", e.featured() ? true : null);
                fm.put("mood", e.mood());
                fm.put("energy", e.energy());
                fm.put("gratitude", e.gratitude());
                fm.put("lessons", e.lessons());
                String file = e.type() + "s/" + (e.entryDate() == null ? "undated" : e.entryDate()) + "-"
                        + (e.slug() != null ? e.slug() : Slugs.slugify(e.title())) + "-" + e.id().toString().substring(0, 8) + ".md";
                put(zip, file, Markdown.frontMatter(fm) + Markdown.fromHtml(e.contentHtml()));
            }
            for (String table : List.of("quotes", "prompts", "decisions", "goals", "site_settings", "daily_stats")) {
                String json = jdbc.sql("SELECT coalesce(json_agg(t), '[]'::json)::text FROM " + table + " t")
                        .query(String.class).single();
                put(zip, "data/" + table + ".json", json);
            }
            put(zip, "README.txt", """
                    Words export.
                    entries: one Markdown file per entry, with front matter (type, status, visibility, tags, dates...).
                    data: quotes, prompts, decisions, goals, settings and daily stats as JSON.
                    Import the zip (or any Markdown files) from the admin panel, under Data.
                    """);
        }
    }

    private static void put(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    @Operation(summary = "Import Markdown files or a zip of them. Entries already present (same id) are skipped.")
    @PostMapping(value = "/api/v1/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult importFiles(@RequestParam("files") List<MultipartFile> files) throws IOException {
        if (files.isEmpty()) throw new BadRequestException("Choose at least one file.");
        Counter c = new Counter();
        for (MultipartFile file : files) {
            String name = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
            if (name.toLowerCase().endsWith(".zip")) {
                try (ZipInputStream zip = new ZipInputStream(file.getInputStream(), StandardCharsets.UTF_8)) {
                    ZipEntry ze;
                    int seen = 0;
                    while ((ze = zip.getNextEntry()) != null && seen++ < MAX_FILES) {
                        if (ze.isDirectory() || !ze.getName().toLowerCase().endsWith(".md")) continue;
                        importOne(ze.getName(), readLimited(zip), c);
                    }
                }
            } else if (name.toLowerCase().matches(".*\\.(md|markdown|txt)$")) {
                try (InputStream in = file.getInputStream()) {
                    importOne(name, readLimited(in), c);
                }
            } else {
                c.errors.add(name + ": not a Markdown or zip file.");
            }
        }
        return new ImportResult(c.imported, c.skipped, c.errors.stream().limit(50).toList());
    }

    private static final class Counter {
        int imported;
        int skipped;
        final List<String> errors = new ArrayList<>();
    }

    private void importOne(String name, String text, Counter c) {
        if (text == null) {
            c.errors.add(name + ": larger than 5 MB, skipped.");
            return;
        }
        try {
            Markdown.Document doc = Markdown.parse(text);
            Map<String, String> fm = doc.frontMatter();
            String id = Markdown.unquote(fm.get("id"));
            if (id != null && isUuid(id) && repository.existsById(UUID.fromString(id))) {
                c.skipped++;
                return;
            }
            String type = orDefault(Markdown.unquote(fm.get("type")), "journal");
            if (!List.of("essay", "journal", "note").contains(type)) type = "journal";
            String title = orDefault(Markdown.unquote(fm.get("title")), titleFromFileName(name));
            String slug = Markdown.unquote(fm.get("slug"));
            if (slug != null && (!slug.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$") || repository.existsBySlug(slug))) slug = null;
            String status = Markdown.unquote(fm.get("status"));
            String visibility = Markdown.unquote(fm.get("visibility"));
            LocalDate date = parseDate(Markdown.unquote(fm.get("date")));
            Instant createdAt = parseInstant(Markdown.unquote(fm.get("created_at")));
            EntryInput input = new EntryInput(type, title, slug, Map.of(), Markdown.toHtml(doc.body()),
                    Markdown.unquote(fm.get("excerpt")), cover(Markdown.unquote(fm.get("cover"))),
                    List.of("private", "unlisted", "public").contains(visibility) ? visibility : "private",
                    "published".equals(status) ? "published" : "draft", date,
                    rating(fm.get("mood")), rating(fm.get("energy")),
                    Markdown.unquote(fm.get("gratitude")), Markdown.unquote(fm.get("lessons")),
                    Markdown.list(fm.get("tags")).stream().limit(12).map(t -> t.length() > 40 ? t.substring(0, 40) : t).toList(),
                    trim(Markdown.unquote(fm.get("highlight")), 40), "true".equals(fm.get("featured")));
            entries.create(input, createdAt != null ? createdAt : date != null ? date.atStartOfDay(today.zone()).toInstant() : null);
            c.imported++;
        } catch (RuntimeException e) {
            c.errors.add(name + ": " + (e.getMessage() == null ? "could not be read" : e.getMessage()));
        }
    }

    private static String readLimited(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int total = 0;
        int n;
        while ((n = in.read(chunk)) > 0) {
            total += n;
            if (total > MAX_FILE_BYTES) return null;
            buf.write(chunk, 0, n);
        }
        return buf.toString(StandardCharsets.UTF_8);
    }

    private static String titleFromFileName(String name) {
        String base = name.replaceAll(".*/", "").replaceAll("\\.[^.]+$", "").replaceAll("^\\d{4}-\\d{2}-\\d{2}-?", "");
        return base.replace('-', ' ').replace('_', ' ').strip();
    }

    private static Short rating(String v) {
        try {
            int n = Integer.parseInt(Markdown.unquote(v));
            return n >= 1 && n <= 5 ? (short) n : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String cover(String v) {
        return v != null && v.matches("^(https?://|/uploads/).*") ? v : null;
    }

    private static LocalDate parseDate(String v) {
        try {
            return v == null || v.isBlank() ? null : LocalDate.parse(v.length() > 10 ? v.substring(0, 10) : v);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static Instant parseInstant(String v) {
        try {
            return v == null || v.isBlank() ? null : Instant.parse(v);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static boolean isUuid(String s) {
        return s.matches("^[0-9a-fA-F-]{36}$");
    }

    private static String orDefault(String v, String fallback) {
        return v == null || v.isBlank() ? fallback : v;
    }

    private static String trim(String v, int max) {
        return v == null ? null : v.length() > max ? v.substring(0, max) : v;
    }
}
