package com.theshivaank.words.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NeonUrlTest {

    @Test
    void convertsTheConnectionStringNeonShows() {
        var jdbc = NeonUrl.toJdbc(
                "postgresql://neondb_owner:p%40ss@ep-quiet-sky-123.ap-southeast-1.aws.neon.tech/neondb"
                        + "?sslmode=require&channel_binding=require").orElseThrow();

        assertThat(jdbc.url()).isEqualTo("jdbc:postgresql://ep-quiet-sky-123.ap-southeast-1.aws.neon.tech/neondb"
                + "?sslmode=require&channelBinding=require");
        assertThat(jdbc.username()).isEqualTo("neondb_owner");
        assertThat(jdbc.password()).isEqualTo("p@ss");
    }

    @Test
    void addsSslWhenMissingAndKeepsPorts() {
        assertThat(NeonUrl.toJdbc("postgres://u:p@localhost:5433/words").orElseThrow().url())
                .isEqualTo("jdbc:postgresql://localhost:5433/words?sslmode=require");
    }

    @Test
    void leavesJdbcUrlsAlone() {
        assertThat(NeonUrl.toJdbc("jdbc:postgresql://host/db?sslmode=require")).isEmpty();
        assertThat(NeonUrl.toJdbc(null)).isEmpty();
    }
}
