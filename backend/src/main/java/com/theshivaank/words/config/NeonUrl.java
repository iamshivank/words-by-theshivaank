package com.theshivaank.words.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Accepts the connection string exactly as Neon shows it (postgresql://user:pass@host/db?sslmode=require)
 * and exposes it to Spring in JDBC form, with the user and password split out. A URL that is already
 * JDBC is left alone.
 */
public final class NeonUrl {

    public record Jdbc(String url, String username, String password) {}

    private NeonUrl() {}

    /** Rewrites SPRING_DATASOURCE_URL (and SPRING_FLYWAY_URL) as system properties when given in Neon form. */
    public static void normalizeDatasource() {
        Function<String, String> env = key -> {
            String value = System.getProperty(key);
            return value != null ? value : System.getenv(key);
        };

        toJdbc(env.apply("SPRING_DATASOURCE_URL")).ifPresent(jdbc -> {
            System.setProperty("SPRING_DATASOURCE_URL", jdbc.url());
            setIfBlank(env, "SPRING_DATASOURCE_USERNAME", jdbc.username());
            setIfBlank(env, "SPRING_DATASOURCE_PASSWORD", jdbc.password());
        });
        toJdbc(env.apply("SPRING_FLYWAY_URL"))
                .ifPresent(jdbc -> System.setProperty("SPRING_FLYWAY_URL", jdbc.url()));
    }

    static Optional<Jdbc> toJdbc(String url) {
        if (url == null || !(url.startsWith("postgresql://") || url.startsWith("postgres://"))) {
            return Optional.empty();
        }
        URI uri;
        try {
            uri = URI.create(url.strip());
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (uri.getHost() == null) return Optional.empty();

        String username = null;
        String password = null;
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            int colon = userInfo.indexOf(':');
            username = decode(colon >= 0 ? userInfo.substring(0, colon) : userInfo);
            password = colon >= 0 ? decode(userInfo.substring(colon + 1)) : null;
        }

        Map<String, String> params = new LinkedHashMap<>();
        if (uri.getRawQuery() != null) {
            for (String pair : uri.getRawQuery().split("&")) {
                if (pair.isBlank()) continue;
                int eq = pair.indexOf('=');
                String key = eq >= 0 ? pair.substring(0, eq) : pair;
                String value = eq >= 0 ? pair.substring(eq + 1) : "";
                // libpq spells it channel_binding; the JDBC driver calls it channelBinding.
                params.put("channel_binding".equals(key) ? "channelBinding" : key, value);
            }
        }
        params.putIfAbsent("sslmode", "require");

        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) jdbc.append(':').append(uri.getPort());
        jdbc.append(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath());
        String sep = "?";
        for (var e : params.entrySet()) {
            jdbc.append(sep).append(e.getKey()).append('=').append(e.getValue());
            sep = "&";
        }
        return Optional.of(new Jdbc(jdbc.toString(), username, password));
    }

    private static void setIfBlank(Function<String, String> env, String key, String value) {
        String current = env.apply(key);
        if ((current == null || current.isBlank()) && value != null) System.setProperty(key, value);
    }

    private static String decode(String s) {
        return URLDecoder.decode(s.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
