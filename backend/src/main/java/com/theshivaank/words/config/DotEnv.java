package com.theshivaank.words.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal .env loader. Looks for {@code .env} in the working directory, then the repo root
 * (one level up, since the backend usually runs from {@code /backend}).
 *
 * <p>Real environment variables and -D system properties always win. Values are taken literally
 * (no ${} interpolation), so bcrypt hashes containing '$' survive untouched.
 */
public final class DotEnv {

    private DotEnv() {}

    public static void load() {
        for (Path candidate : List.of(Path.of(".env"), Path.of("..", ".env"))) {
            if (Files.isRegularFile(candidate)) {
                try {
                    parse(Files.readAllLines(candidate, StandardCharsets.UTF_8)).forEach((key, value) -> {
                        if (System.getenv(key) == null && System.getProperty(key) == null) {
                            System.setProperty(key, value);
                        }
                    });
                } catch (IOException e) {
                    System.err.println("Could not read " + candidate.toAbsolutePath() + ": " + e.getMessage());
                }
                return;
            }
        }
    }

    static Map<String, String> parse(List<String> lines) {
        Map<String, String> values = new LinkedHashMap<>();
        for (String raw : lines) {
            String line = raw.strip();
            if (line.isEmpty() || line.startsWith("#")) continue;
            if (line.startsWith("export ")) line = line.substring(7).strip();
            int eq = line.indexOf('=');
            if (eq <= 0) continue;

            String key = line.substring(0, eq).strip();
            String value = line.substring(eq + 1).strip();
            if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"")
                    || value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length() - 1);
            } else {
                int comment = value.indexOf(" #");
                if (comment >= 0) value = value.substring(0, comment).strip();
            }
            values.put(key, value);
        }
        return values;
    }
}
