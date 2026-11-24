package com.theshivaank.words.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StartupCheckTest {

    private static Map<String, String> valid() {
        Map<String, String> env = new HashMap<>();
        env.put("SPRING_DATASOURCE_URL", "jdbc:postgresql://ep-quiet-sky-123.ap-southeast-1.aws.neon.tech/words?sslmode=require");
        env.put("SPRING_DATASOURCE_USERNAME", "words_owner");
        env.put("SPRING_DATASOURCE_PASSWORD", "secret");
        env.put("OWNER_EMAIL", "me@example.com");
        env.put("OWNER_PASSWORD_HASH", "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW");
        env.put("JWT_SECRET", "0123456789abcdef0123456789abcdef");
        return env;
    }

    @Test
    void validConfigurationPasses() {
        assertThat(StartupCheck.problems(valid()::get)).isEmpty();
    }

    @Test
    void reportsEveryMissingVariable() {
        List<String> problems = StartupCheck.problems(key -> null);
        assertThat(problems).hasSize(6).allMatch(p -> p.endsWith("is not set."));
    }

    @Test
    void explainsHowToConvertANeonConnectionString() {
        Map<String, String> env = valid();
        env.put("SPRING_DATASOURCE_URL", "postgresql://words_owner:pw@ep-quiet-sky-123.aws.neon.tech/words?sslmode=require");
        assertThat(StartupCheck.problems(env::get)).singleElement().asString()
                .contains("jdbc:postgresql://ep-quiet-sky-123.aws.neon.tech/words?sslmode=require")
                .doesNotContain("pw@");
    }

    @Test
    void rejectsPoolerHostWithoutDirectFlywayUrl() {
        Map<String, String> env = valid();
        env.put("SPRING_DATASOURCE_URL", "jdbc:postgresql://ep-quiet-sky-123-pooler.aws.neon.tech/words?sslmode=require");
        assertThat(StartupCheck.problems(env::get)).singleElement().asString().contains("pooler");

        env.put("SPRING_FLYWAY_URL", "jdbc:postgresql://ep-quiet-sky-123.aws.neon.tech/words?sslmode=require");
        assertThat(StartupCheck.problems(env::get)).isEmpty();
    }

    @Test
    void rejectsShortSecretsAndNonBcryptHashes() {
        Map<String, String> env = valid();
        env.put("JWT_SECRET", "short");
        env.put("OWNER_PASSWORD_HASH", "plain-text-password");
        assertThat(StartupCheck.problems(env::get)).hasSize(2);
    }
}
