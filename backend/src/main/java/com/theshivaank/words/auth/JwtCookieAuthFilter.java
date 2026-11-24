package com.theshivaank.words.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

/**
 * Reads the session cookie and, if it holds a valid token, authenticates the request as the owner.
 * An invalid or expired cookie is simply ignored, so public pages never fail because of a stale session.
 */
public class JwtCookieAuthFilter extends OncePerRequestFilter {

    static final String ROLE_OWNER = "ROLE_OWNER";

    private final JwtService jwtService;
    private final String cookieName;

    public JwtCookieAuthFilter(JwtService jwtService, String cookieName) {
        this.jwtService = jwtService;
        this.cookieName = cookieName;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Cookie cookie = WebUtils.getCookie(request, cookieName);
        if (cookie != null && !cookie.getValue().isBlank()) {
            jwtService.verify(cookie.getValue()).ifPresent(jwt -> {
                var auth = UsernamePasswordAuthenticationToken.authenticated(
                        jwt.getSubject(), null, List.of(new SimpleGrantedAuthority(ROLE_OWNER)));
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(auth);
                SecurityContextHolder.setContext(context);
            });
        }
        chain.doFilter(request, response);
    }
}
