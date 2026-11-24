package com.theshivaank.words.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Fails fast with a readable message when required configuration is missing or malformed,
 * instead of letting Spring print a long stack trace.
 */
public final class StartupCheck {

    private static final List<String> REQUIRED = List.of(
            "SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD",
            "OWNER_EMAIL", "OWNER_PASSWORD_HASH", "JWT_SECRET");

    private StartupCheck() {}

    public static void verifyOrExit() {
        List<String> problems = problems(StartupCheck::lookup);
        if (problems.isEmpty()) return;

        StringBuilder out = new StringBuilder("\n")
                .append("  Words cannot start: configuration needs attention.\n")
                .append("  ------------------------------------------------------------\n");
        problems.forEach(p -> out.append("  - ").append(p.replace("\n", "\n    ")).append('\n'));
        out.append("\n  Copy .env.example to .env in the repo root and fill it in.\n");
        System.err.println(out);
        System.exit(1);
    }

    static List<String> problems(Function<String, String> env) {
        List<String> problems = new ArrayList<>();
        for (String key : REQUIRED) {
            String value = env.apply(key);
            if (value == null || value.isBlank()) problems.add(key + " is not set.");
        }

        String url = env.apply("SPRING_DATASOURCE_URL");
        if (url != null && !url.isBlank()) {
            if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
                problems.add("SPRING_DATASOURCE_URL looks like a Neon connection string, but Spring needs JDBC format.\n"
                        + "Use: " + toJdbcHint(url) + "\n"
                        + "and put the user and password in SPRING_DATASOURCE_USERNAME / SPRING_DATASOURCE_PASSWORD.");
            } else if (!url.startsWith("jdbc:postgresql://")) {
                problems.add("SPRING_DATASOURCE_URL must start with jdbc:postgresql://");
            }
            String flywayUrl = env.apply("SPRING_FLYWAY_URL");
            if (url.contains("-pooler.") && (flywayUrl == null || flywayUrl.isBlank())) {
                problems.add("SPRING_DATASOURCE_URL points at the Neon pooler. Flyway migrations need the direct host:\n"
                        + "remove '-pooler' from the hostname, or set SPRING_FLYWAY_URL to the direct JDBC URL.");
            }
        }

        String hash = env.apply("OWNER_PASSWORD_HASH");
        if (hash != null && !hash.isBlank() && !hash.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$")) {
            problems.add("OWNER_PASSWORD_HASH is not a bcrypt hash. Generate one with: cd backend && ./mvnw -q compile exec:java");
        }

        String secret = env.apply("JWT_SECRET");
        if (secret != null && !secret.isBlank() && secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            problems.add("JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48");
        }
        return problems;
    }

    /** Turns postgresql://user:pass@host/db?x=y into jdbc:postgresql://host/db?x=y (credentials dropped). */
    static String toJdbcHint(String url) {
        try {
            URI uri = URI.create(url);
            String query = uri.getRawQuery() == null ? "sslmode=require" : uri.getRawQuery();
            return "jdbc:postgresql://" + uri.getHost() + uri.getRawPath() + "?" + query;
        } catch (IllegalArgumentException e) {
            return "jdbc:postgresql://<host>/<db>?sslmode=require";
        }
    }

    private static String lookup(String key) {
        String value = System.getenv(key);
        return value != null ? value : System.getProperty(key);
    }
}
