package com.theshivaank.words.auth;

import com.theshivaank.words.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppProperties props;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;

    public AuthService(AppProperties props, PasswordEncoder passwordEncoder, JwtService jwtService,
            LoginRateLimiter rateLimiter) {
        this.props = props;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
    }

    /** Returns a session token for the owner, or throws. Always runs bcrypt so timing doesn't leak which field was wrong. */
    public String login(String email, String password, String clientKey) {
        rateLimiter.checkAllowed(clientKey);

        boolean emailMatches = MessageDigest.isEqual(
                normalize(email).getBytes(StandardCharsets.UTF_8),
                normalize(props.owner().email()).getBytes(StandardCharsets.UTF_8));
        boolean passwordMatches = passwordEncoder.matches(password, props.owner().passwordHash());

        if (!(emailMatches && passwordMatches)) {
            rateLimiter.recordFailure(clientKey);
            throw new BadCredentialsException("Bad credentials");
        }
        rateLimiter.reset(clientKey);
        return jwtService.issue(props.owner().email());
    }

    private static String normalize(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }
}
