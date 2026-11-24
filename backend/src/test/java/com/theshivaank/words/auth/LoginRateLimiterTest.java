package com.theshivaank.words.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.theshivaank.words.common.RateLimitedException;
import com.theshivaank.words.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginRateLimiterTest {

    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private static AppProperties props(int max, Duration window) {
        return new AppProperties("http://localhost:5173", "./uploads", ZoneId.of("Asia/Kolkata"),
                new AppProperties.Owner("me@example.com", "hash"),
                new AppProperties.Jwt("x".repeat(32), Duration.ofDays(1)),
                new AppProperties.Cookie("words_session", true),
                new AppProperties.LoginRateLimit(max, window));
    }

    @Test
    void blocksAfterMaxFailuresAndRecoversAfterTheWindow() {
        MutableClock clock = new MutableClock();
        LoginRateLimiter limiter = new LoginRateLimiter(props(3, Duration.ofMinutes(15)), clock);

        for (int i = 0; i < 3; i++) {
            limiter.checkAllowed("ip");
            limiter.recordFailure("ip");
        }
        assertThatThrownBy(() -> limiter.checkAllowed("ip")).isInstanceOf(RateLimitedException.class);
        assertThatCode(() -> limiter.checkAllowed("other-ip")).doesNotThrowAnyException();

        clock.now = clock.now.plus(Duration.ofMinutes(15)).plusSeconds(1);
        assertThatCode(() -> limiter.checkAllowed("ip")).doesNotThrowAnyException();
    }

    @Test
    void successResetsTheCounter() {
        LoginRateLimiter limiter = new LoginRateLimiter(props(2, Duration.ofMinutes(15)), new MutableClock());
        limiter.recordFailure("ip");
        limiter.reset("ip");
        limiter.recordFailure("ip");
        assertThatCode(() -> limiter.checkAllowed("ip")).doesNotThrowAnyException();
    }
}
