package com.theshivaank.words.account;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The single owner account. Created from OWNER_EMAIL / OWNER_PASSWORD_HASH the first time it is needed;
 * from then on the database row is the source of truth, so the admin panel can change the password.
 * Set OWNER_RESET_FROM_ENV=true for one start to reset it back to the .env values (lost password).
 *
 * <p>A small in-memory snapshot (refreshed every 30 seconds, and immediately after changes) keeps
 * session checks off the database on every request.
 */
@Service
public class OwnerAccountService {

    public record Snapshot(String email, String passwordHash, int tokenVersion) {}

    private static final Duration CACHE_TTL = Duration.ofSeconds(30);

    private final OwnerAccountRepository repository;
    private final AppProperties props;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate tx;
    private final Clock clock;

    private volatile Snapshot snapshot;
    private volatile Instant loadedAt = Instant.EPOCH;
    private volatile boolean resetApplied;

    public OwnerAccountService(OwnerAccountRepository repository, AppProperties props,
            PasswordEncoder passwordEncoder, TransactionTemplate tx, Clock clock) {
        this.repository = repository;
        this.props = props;
        this.passwordEncoder = passwordEncoder;
        this.tx = tx;
        this.clock = clock;
    }

    public Snapshot snapshot() {
        Snapshot s = snapshot;
        if (s == null || Duration.between(loadedAt, clock.instant()).compareTo(CACHE_TTL) > 0) s = reload();
        return s;
    }

    public OwnerAccount account() {
        return tx.execute(status -> loadOrCreate());
    }

    /** Always runs bcrypt, whether or not the email matched, so timing does not reveal which was wrong. */
    public boolean credentialsMatch(String email, String password) {
        Snapshot s = snapshot();
        boolean emailMatches = MessageDigest.isEqual(
                normalize(email).getBytes(StandardCharsets.UTF_8),
                normalize(s.email()).getBytes(StandardCharsets.UTF_8));
        boolean passwordMatches = passwordEncoder.matches(password == null ? "" : password, s.passwordHash());
        return emailMatches && passwordMatches;
    }

    public void recordLogin() {
        tx.executeWithoutResult(status -> loadOrCreate().setLastLoginAt(clock.instant()));
    }

    public Snapshot changePassword(String currentPassword, String newPassword) {
        requireCurrentPassword(currentPassword);
        if (newPassword == null || newPassword.length() < 12) {
            throw new BadRequestException("Use at least 12 characters for the new password.");
        }
        tx.executeWithoutResult(status -> {
            OwnerAccount a = loadOrCreate();
            a.setPasswordHash(passwordEncoder.encode(newPassword));
            a.setPasswordChangedAt(clock.instant());
            a.bumpTokenVersion();
        });
        return reload();
    }

    public Snapshot changeEmail(String currentPassword, String newEmail) {
        requireCurrentPassword(currentPassword);
        tx.executeWithoutResult(status -> {
            OwnerAccount a = loadOrCreate();
            a.setEmail(newEmail.strip());
            a.bumpTokenVersion();
        });
        return reload();
    }

    public Snapshot signOutEverywhere() {
        tx.executeWithoutResult(status -> loadOrCreate().bumpTokenVersion());
        return reload();
    }

    private void requireCurrentPassword(String currentPassword) {
        if (!passwordEncoder.matches(currentPassword == null ? "" : currentPassword, snapshot().passwordHash())) {
            throw new BadCredentialsException("Current password is wrong");
        }
    }

    private synchronized Snapshot reload() {
        OwnerAccount a = tx.execute(status -> loadOrCreate());
        snapshot = new Snapshot(a.getEmail(), a.getPasswordHash(), a.getTokenVersion());
        loadedAt = clock.instant();
        return snapshot;
    }

    private OwnerAccount loadOrCreate() {
        OwnerAccount account = repository.findBySingletonTrue()
                .orElseGet(() -> repository.saveAndFlush(
                        new OwnerAccount(props.owner().email(), props.owner().passwordHash())));
        if (props.owner().resetFromEnv() && !resetApplied) {
            resetApplied = true;
            account.setEmail(props.owner().email());
            account.setPasswordHash(props.owner().passwordHash());
            account.bumpTokenVersion();
        }
        return account;
    }

    private static String normalize(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }
}
