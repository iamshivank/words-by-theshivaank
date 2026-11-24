package com.theshivaank.words.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class DotEnvTest {

    @Test
    void parsesValuesLiterally() {
        var values = DotEnv.parse(List.of(
                "# comment",
                "",
                "SPRING_DATASOURCE_URL=jdbc:postgresql://host/db?sslmode=require",
                "OWNER_PASSWORD_HASH=$2a$12$abcdefghijklmnopqrstuv",
                "QUOTED=\"has # hash\"",
                "SINGLE='single'",
                "export EXPORTED=yes",
                "INLINE=value # trailing comment",
                "EMPTY="));

        assertThat(values)
                .containsEntry("SPRING_DATASOURCE_URL", "jdbc:postgresql://host/db?sslmode=require")
                .containsEntry("OWNER_PASSWORD_HASH", "$2a$12$abcdefghijklmnopqrstuv")
                .containsEntry("QUOTED", "has # hash")
                .containsEntry("SINGLE", "single")
                .containsEntry("EXPORTED", "yes")
                .containsEntry("INLINE", "value")
                .containsEntry("EMPTY", "")
                .hasSize(7);
    }
}
