package com.theshivaank.words.account;

import com.theshivaank.words.auth.JwtService;
import com.theshivaank.words.auth.LoginRateLimiter;
import com.theshivaank.words.config.AppProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.function.Supplier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account")
@Tag(name = "Account")
public class AccountController {

    public record AccountView(String email, Instant lastLoginAt, Instant passwordChangedAt, Instant createdAt,
            long sessionDays) {}

    public record PasswordChange(@NotBlank @Size(max = 200) String currentPassword,
            @NotBlank @Size(min = 12, max = 200) String newPassword) {}

    public record EmailChange(@NotBlank @Size(max = 200) String currentPassword,
            @NotBlank @Email @Size(max = 320) String email) {}

    private final OwnerAccountService accounts;
    private final JwtService jwt;
    private final SessionCookies cookies;
    private final LoginRateLimiter rateLimiter;
    private final AppProperties props;

    public AccountController(OwnerAccountService accounts, JwtService jwt, SessionCookies cookies,
            LoginRateLimiter rateLimiter, AppProperties props) {
        this.accounts = accounts;
        this.jwt = jwt;
        this.cookies = cookies;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @Operation(summary = "The owner account.")
    @GetMapping
    public AccountView get() {
        OwnerAccount a = accounts.account();
        return new AccountView(a.getEmail(), a.getLastLoginAt(), a.getPasswordChangedAt(), a.getCreatedAt(),
                props.jwt().ttl().toDays());
    }

    @Operation(summary = "Change the password. Signs out every other device; this one stays signed in.")
    @PutMapping("/password")
    public ResponseEntity<AccountView> changePassword(@Valid @RequestBody PasswordChange body, HttpServletRequest req) {
        return withFreshCookie(guarded(req, () -> accounts.changePassword(body.currentPassword(), body.newPassword())));
    }

    @Operation(summary = "Change the sign-in email. Signs out every other device.")
    @PutMapping("/email")
    public ResponseEntity<AccountView> changeEmail(@Valid @RequestBody EmailChange body, HttpServletRequest req) {
        return withFreshCookie(guarded(req, () -> accounts.changeEmail(body.currentPassword(), body.email())));
    }

    @Operation(summary = "Sign out every other device. This one stays signed in.")
    @PostMapping("/sign-out-everywhere")
    public ResponseEntity<AccountView> signOutEverywhere() {
        return withFreshCookie(accounts.signOutEverywhere());
    }

    /** Wrong current passwords count toward the same lockout as failed logins. */
    private OwnerAccountService.Snapshot guarded(HttpServletRequest req, Supplier<OwnerAccountService.Snapshot> action) {
        String key = "account:" + req.getRemoteAddr();
        rateLimiter.checkAllowed(key);
        try {
            var result = action.get();
            rateLimiter.reset(key);
            return result;
        } catch (BadCredentialsException e) {
            rateLimiter.recordFailure(key);
            throw e;
        }
    }

    private ResponseEntity<AccountView> withFreshCookie(OwnerAccountService.Snapshot snapshot) {
        String token = jwt.issue(snapshot.email(), snapshot.tokenVersion());
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookies.issue(token)).body(get());
    }
}
