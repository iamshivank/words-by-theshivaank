package com.theshivaank.words.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Boots the full app against a real Postgres (embedded binaries, no Docker needed), so Flyway migrations
 * and Hibernate's schema validation are exercised exactly as they run against Neon.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class PostgresIntegrationTest {

    protected static final String OWNER_EMAIL = "owner@example.com";
    protected static final String OWNER_PASSWORD = "correct horse battery staple";

    private static final EmbeddedPostgres POSTGRES;

    static {
        try {
            POSTGRES = EmbeddedPostgres.builder().start();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        String url = POSTGRES.getJdbcUrl("postgres", "postgres");
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.flyway.url", () -> url);
        registry.add("spring.flyway.user", () -> "postgres");
        registry.add("spring.flyway.password", () -> "postgres");
        registry.add("app.owner.email", () -> OWNER_EMAIL);
        registry.add("app.owner.password-hash", () -> new BCryptPasswordEncoder(4).encode(OWNER_PASSWORD));
        registry.add("app.jwt.secret", () -> "test-secret-test-secret-test-secret-0123456789");
    }
}
