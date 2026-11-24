package com.theshivaank.words.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
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

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final AppProperties props;
    private final Clock clock;

    public JwtService(AppProperties props, Clock clock) {
        this.props = props;
        this.clock = clock;
        SecretKey key = new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        nimbus.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        this.decoder = nimbus;
    }

    public String issue(String subject) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(subject)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(props.jwt().ttl()))
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    /** Valid, unexpired, and issued for the current owner; anything else is treated as signed out. */
    public Optional<Jwt> verify(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            return props.owner().email().equalsIgnoreCase(jwt.getSubject()) ? Optional.of(jwt) : Optional.empty();
        } catch (JwtException e) {
            return Optional.empty();
        }
    }
}
