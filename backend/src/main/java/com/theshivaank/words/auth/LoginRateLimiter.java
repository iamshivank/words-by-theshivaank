package com.theshivaank.words.auth;

import com.theshivaank.words.common.RateLimitedException;
import com.theshivaank.words.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Sliding-window limit on failed logins per client address. In memory: fine for a single instance. */
@Component
public class LoginRateLimiter {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration window;
    private final Clock clock;

    public LoginRateLimiter(AppProperties props, Clock clock) {
        this.maxAttempts = props.loginRateLimit().maxAttempts();
        this.window = props.loginRateLimit().window();
        this.clock = clock;
    }

    public void checkAllowed(String key) {
        Deque<Instant> attempts = failures.get(key);
        if (attempts == null) return;
        synchronized (attempts) {
            Instant now = clock.instant();
            prune(attempts, now);
            if (attempts.size() >= maxAttempts) {
                throw new RateLimitedException(Duration.between(now, attempts.peekFirst().plus(window)));
            }
        }
    }

    public void recordFailure(String key) {
        if (failures.size() > MAX_TRACKED_KEYS) evictStale();
        Deque<Instant> attempts = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (attempts) {
            Instant now = clock.instant();
            prune(attempts, now);
            attempts.addLast(now);
        }
    }

    public void reset(String key) {
        failures.remove(key);
    }

    private void prune(Deque<Instant> attempts, Instant now) {
        Instant cutoff = now.minus(window);
        while (!attempts.isEmpty() && !attempts.peekFirst().isAfter(cutoff)) attempts.pollFirst();
    }

    private void evictStale() {
        Instant now = clock.instant();
        failures.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue(), now);
                return e.getValue().isEmpty();
            }
        });
    }
}
