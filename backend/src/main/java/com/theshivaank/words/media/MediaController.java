package com.theshivaank.words.media;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.config.AppProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Image uploads. The type is decided by the file's first bytes, never by its name or the browser's claim.
 * The bytes are stored in the database under a random name and served from /uploads/{name}, so uploads
 * survive redeploys on hosts with no persistent disk. Older uploads (data IS NULL) are read from UPLOAD_DIR.
 */
@RestController
@Tag(name = "Media")
public class MediaController {

    public record MediaItem(UUID id, String url, String originalName, String mimeType, long sizeBytes, Instant createdAt) {}

    private record Kind(String mime, String extension) {}

    private final JdbcClient jdbc;
    private final Path root;

    public MediaController(JdbcClient jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.root = Path.of(props.uploadDir()).toAbsolutePath().normalize();
    }

    @Operation(summary = "Upload an image (JPEG, PNG, GIF, WebP or AVIF, up to 20 MB).")
    @PostMapping(value = "/api/v1/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MediaItem upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new BadRequestException("The file is empty.");
        byte[] head;
        try (InputStream in = file.getInputStream()) {
            head = in.readNBytes(16);
        }
        Kind kind = sniff(head);
        if (kind == null) throw new BadRequestException("Only JPEG, PNG, GIF, WebP and AVIF images can be uploaded.");

        String name = UUID.randomUUID() + "." + kind.extension();
        byte[] data = file.getBytes();
        String original = file.getOriginalFilename() == null ? null
                : file.getOriginalFilename().replaceAll("[\\r\\n]", "").strip();
        if (original != null && original.length() > 200) original = original.substring(0, 200);
        return jdbc.sql("""
                INSERT INTO media (file_name, original_name, path, mime_type, size_bytes, data)
                VALUES (:name, :original, :path, :mime, :size, :data)
                RETURNING id, file_name, original_name, mime_type, size_bytes, created_at""")
                .param("name", name).param("original", original).param("path", "db:" + name)
                .param("mime", kind.mime()).param("size", data.length).param("data", data)
                .query((rs, i) -> item(rs.getObject("id", UUID.class), rs.getString("file_name"),
                        rs.getString("original_name"), rs.getString("mime_type"), rs.getLong("size_bytes"),
                        rs.getTimestamp("created_at").toInstant()))
                .single();
    }

    private record Stored(String mime, byte[] data) {}

    /** Public: names are random UUIDs and never reused, so responses can be cached forever. */
    @GetMapping("/uploads/{name:[A-Za-z0-9._-]+}")
    public ResponseEntity<byte[]> serve(@PathVariable String name) throws IOException {
        Stored stored = jdbc.sql("SELECT mime_type, data FROM media WHERE file_name = :name").param("name", name)
                .query((rs, i) -> new Stored(rs.getString("mime_type"), rs.getBytes("data")))
                .optional()
                .orElseThrow(() -> new NotFoundException("That file does not exist."));
        byte[] body = stored.data();
        if (body == null) {
            Path file = root.resolve(name).normalize();
            if (!file.startsWith(root) || !Files.isRegularFile(file)) {
                throw new NotFoundException("That file does not exist.");
            }
            body = Files.readAllBytes(file);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(stored.mime()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(body);
    }

    @GetMapping("/api/v1/media")
    public List<MediaItem> list() {
        return jdbc.sql("SELECT id, file_name, original_name, mime_type, size_bytes, created_at FROM media ORDER BY created_at DESC")
                .query((rs, i) -> item(rs.getObject("id", UUID.class), rs.getString("file_name"),
                        rs.getString("original_name"), rs.getString("mime_type"), rs.getLong("size_bytes"),
                        rs.getTimestamp("created_at").toInstant()))
                .list();
    }

    @DeleteMapping("/api/v1/media/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) throws IOException {
        String name = jdbc.sql("DELETE FROM media WHERE id = :id RETURNING file_name").param("id", id)
                .query(String.class).optional()
                .orElseThrow(() -> new NotFoundException("That file does not exist."));
        Path file = root.resolve(name).normalize();
        if (file.startsWith(root)) Files.deleteIfExists(file);
    }

    private static MediaItem item(UUID id, String fileName, String original, String mime, long size, Instant created) {
        return new MediaItem(id, "/uploads/" + fileName, original, mime, size, created);
    }

    static Kind sniff(byte[] b) {
        if (starts(b, 0xFF, 0xD8, 0xFF)) return new Kind("image/jpeg", "jpg");
        if (starts(b, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) return new Kind("image/png", "png");
        if (starts(b, 'G', 'I', 'F', '8')) return new Kind("image/gif", "gif");
        if (starts(b, 'R', 'I', 'F', 'F') && b.length >= 12 && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return new Kind("image/webp", "webp");
        }
        if (b.length >= 12 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p'
                && new String(Arrays.copyOfRange(b, 8, 12)).matches("avi[fs]")) {
            return new Kind("image/avif", "avif");
        }
        return null;
    }

    private static boolean starts(byte[] b, int... prefix) {
        if (b.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) if ((b[i] & 0xFF) != prefix[i]) return false;
        return true;
    }
}
