package com.theshivaank.words.auth;

import com.theshivaank.words.account.OwnerAccountService;
import com.theshivaank.words.account.SessionCookies;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth")
public class AuthController {

    public record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 200) String password) {}

    public record Me(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean authenticated, String email) {}

    private final AuthService authService;
    private final OwnerAccountService accounts;
    private final SessionCookies cookies;

    public AuthController(AuthService authService, OwnerAccountService accounts, SessionCookies cookies) {
        this.authService = authService;
        this.accounts = accounts;
        this.cookies = cookies;
    }

    @Operation(summary = "Sign in as the owner. Sets the httpOnly session cookie.")
    @PostMapping("/login")
    public ResponseEntity<Me> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        String token = authService.login(body.email(), body.password(), request.getRemoteAddr());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(token))
                .body(new Me(true, accounts.snapshot().email()));
    }

    @Operation(summary = "Sign out. Clears the session cookie.")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear()).build();
    }

    @Operation(summary = "Who is signed in. Always 200; `authenticated` is false for visitors.")
    @GetMapping("/me")
    public Me me(Authentication authentication) {
        return isOwner(authentication) ? new Me(true, accounts.snapshot().email()) : new Me(false, null);
    }

    public static boolean isOwner(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> JwtCookieAuthFilter.ROLE_OWNER.equals(a.getAuthority()));
    }
}
