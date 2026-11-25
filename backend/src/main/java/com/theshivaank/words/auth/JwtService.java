package com.theshivaank.words.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.theshivaank.words.account.OwnerAccountService;
import com.theshivaank.words.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

/** Issues and verifies the HS256 session token carried in the httpOnly cookie. */
@Service
public class JwtService {

    static final String ISSUER = "words";
    static final String VERSION_CLAIM = "ver";

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final AppProperties props;
    private final Clock clock;
    private final OwnerAccountService accounts;

    public JwtService(AppProperties props, Clock clock, OwnerAccountService accounts) {
        this.props = props;
        this.clock = clock;
        this.accounts = accounts;
        SecretKey key = new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        nimbus.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        this.decoder = nimbus;
    }

    /** tokenVersion must match the account's current version; bumping it revokes every older token. */
    public String issue(String subject, int tokenVersion) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(subject)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(props.jwt().ttl()))
                .claim(VERSION_CLAIM, tokenVersion)
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    /** Valid, unexpired, issued for the current owner and not revoked; anything else is treated as signed out. */
    public Optional<Jwt> verify(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            var account = accounts.snapshot();
            Object version = jwt.getClaim(VERSION_CLAIM);
            boolean current = version instanceof Number n && n.intValue() == account.tokenVersion();
            return current && account.email().equalsIgnoreCase(jwt.getSubject()) ? Optional.of(jwt) : Optional.empty();
        } catch (JwtException e) {
            return Optional.empty();
        }
    }
}
