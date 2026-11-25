package com.theshivaank.words.account;

import com.theshivaank.words.config.AppProperties;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** The httpOnly, Secure, SameSite=Strict session cookie. */
@Component
public class SessionCookies {

    private final AppProperties props;

    public SessionCookies(AppProperties props) {
        this.props = props;
    }

    public String issue(String token) {
        return build(token, props.jwt().ttl());
    }

    public String clear() {
        return build("", Duration.ZERO);
    }

    private String build(String value, Duration maxAge) {
        return ResponseCookie.from(props.cookie().name(), value)
                .httpOnly(true)
                .secure(props.cookie().secure())
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
