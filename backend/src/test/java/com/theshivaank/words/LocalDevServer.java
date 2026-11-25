package com.theshivaank.words;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Runs the whole API against a throwaway local Postgres (real binaries, no Docker, no Neon), so the app
 * can be tried without touching the real database. Data lives in backend/target/local-db and is wiped by
 * `mvnw clean`.
 *
 * <pre>npm run dev:local                     (from the repo root: API + web)
 * cd backend && ./mvnw -q test-compile exec:java@local</pre>
 *
 * Sign in with local@words.test / local-password-123.
 */
public final class LocalDevServer {

    public static final String EMAIL = "local@words.test";
    public static final String PASSWORD = "local-password-123";

    private LocalDevServer() {}

    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of("target", "local-db").toAbsolutePath();
        Files.createDirectories(dataDir);
        EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                .setDataDirectory(dataDir)
                .setCleanDataDirectory(false)
                .setPort(54329)
                .start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                postgres.close();
            } catch (Exception ignored) {
                // Shutting down anyway.
            }
        }));

        // System properties win over .env, so the real Neon settings are never used here.
        System.setProperty("SPRING_DATASOURCE_URL", postgres.getJdbcUrl("postgres", "postgres"));
        System.setProperty("SPRING_DATASOURCE_USERNAME", "postgres");
        System.setProperty("SPRING_DATASOURCE_PASSWORD", "postgres");
        System.setProperty("SPRING_FLYWAY_URL", postgres.getJdbcUrl("postgres", "postgres"));
        System.setProperty("OWNER_EMAIL", EMAIL);
        System.setProperty("OWNER_PASSWORD_HASH", new BCryptPasswordEncoder(10).encode(PASSWORD));
        System.setProperty("OWNER_RESET_FROM_ENV", "true");
        System.setProperty("JWT_SECRET", "local-only-secret-local-only-secret-0123456789");
        System.setProperty("APP_PUBLIC_URL", "http://localhost:5173");
        System.setProperty("UPLOAD_DIR", Path.of("target", "local-uploads").toAbsolutePath().toString());

        System.out.println("\n  Local mode: embedded Postgres on 54329. Sign in with " + EMAIL + " / " + PASSWORD + "\n");
        WordsApplication.main(args);
    }
}
