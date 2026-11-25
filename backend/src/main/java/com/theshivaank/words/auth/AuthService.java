package com.theshivaank.words.auth;

import com.theshivaank.words.account.OwnerAccountService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final OwnerAccountService accounts;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;

    public AuthService(OwnerAccountService accounts, JwtService jwtService, LoginRateLimiter rateLimiter) {
        this.accounts = accounts;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
    }

    /** Returns a session token for the owner, or throws. */
    public String login(String email, String password, String clientKey) {
        rateLimiter.checkAllowed(clientKey);
        if (!accounts.credentialsMatch(email, password)) {
            rateLimiter.recordFailure(clientKey);
            throw new BadCredentialsException("Bad credentials");
        }
        rateLimiter.reset(clientKey);
        accounts.recordLogin();
        var account = accounts.snapshot();
        return jwtService.issue(account.email(), account.tokenVersion());
    }
}
