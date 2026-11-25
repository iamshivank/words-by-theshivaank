package com.theshivaank.words.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app")
public record AppProperties(
        @NotBlank String publicUrl,
        @NotBlank String uploadDir,
        @NotNull ZoneId timezone,
        @Valid @NotNull Owner owner,
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Cookie cookie,
        @Valid @NotNull LoginRateLimit loginRateLimit) {

    /** resetFromEnv: on the next start, overwrite the stored account with these values. */
    public record Owner(@NotBlank String email, @NotBlank String passwordHash, boolean resetFromEnv) {}

    public record Jwt(@NotBlank String secret, @NotNull Duration ttl) {}

    public record Cookie(@NotBlank String name, boolean secure) {}

    public record LoginRateLimit(@Min(1) int maxAttempts, @NotNull Duration window) {}
}
