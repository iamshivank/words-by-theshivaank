package com.theshivaank.words.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.theshivaank.words.common.Today;
import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.util.List;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

class StatsTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void streakCountsConsecutiveDaysAndSurvivesUntilTonight() {
        LocalDate today = LocalDate.of(2026, 11, 24);
        var days = new TreeSet<>(List.of(today.minusDays(1), today.minusDays(2), today.minusDays(3),
                today.minusDays(10), today.minusDays(11), today.minusDays(12), today.minusDays(13), today.minusDays(14)));

        var notYetToday = StatsService.streakOf(days, today);
        assertThat(notYetToday.current()).isEqualTo(3);
        assertThat(notYetToday.longest()).isEqualTo(5);
        assertThat(notYetToday.writtenToday()).isFalse();

        days.add(today);
        assertThat(StatsService.streakOf(days, today).current()).isEqualTo(4);

        assertThat(StatsService.streakOf(new TreeSet<>(List.of(today.minusDays(2))), today).current()).isZero();
    }

    @Test
    void sessionReportsAreIdempotent() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        int before = sessionWordsToday();

        String id = JsonPath.read(mvc.perform(post("/api/v1/sessions").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
        for (int i = 0; i < 3; i++) {
            mvc.perform(put("/api/v1/sessions/" + id).cookie(session).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"wordsAdded\":120}"))
                    .andExpect(status().isNoContent());
        }
        mvc.perform(put("/api/v1/sessions/" + id).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"wordsAdded\":150}"));

        // Only the difference between reports is added: 150 in total, not 120 * 3 + 150.
        assertThat(sessionWordsToday()).isEqualTo(before + 150);
        assertThat(todayWords(session)).isGreaterThanOrEqualTo(150);
        mvc.perform(get("/api/v1/stats/heatmap").cookie(session)).andExpect(jsonPath("$.length()").value(371));
    }

    @Test
    void decisionsCalibrateAndGoalsTrackProgress() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        String id = JsonPath.read(mvc.perform(post("/api/v1/decisions").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Take the new job","options":["stay","go"],"choice":"go","confidence":80,
                                 "reviewOn":"2020-01-01"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.options[1]").value("go"))
                .andReturn().getResponse().getContentAsString(), "$.id");
        mvc.perform(get("/api/v1/decisions/due").cookie(session)).andExpect(jsonPath("$[*].id").value(org.hamcrest.Matchers.hasItem(id)));
        mvc.perform(post("/api/v1/decisions/" + id + "/review").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wasRight\":true,\"verdict\":\"good_process_good_outcome\"}"))
                .andExpect(jsonPath("$.status").value("reviewed"));
        mvc.perform(get("/api/v1/decisions/calibration").cookie(session))
                .andExpect(jsonPath("$.buckets[4].count").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));

        mvc.perform(post("/api/v1/goals").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Write a lot\",\"metric\":\"words\",\"target\":1000,\"periodStart\":\"%s\",\"periodEnd\":\"%s\"}"
                                .formatted(today.date().minusDays(30), today.date().plusDays(30))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.progress").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.active").value(true));

        mvc.perform(get("/api/v1/prompts/today").cookie(session)).andExpect(jsonPath("$.text").isNotEmpty());
        mvc.perform(get("/api/v1/stats/month").param("month", "2026-11").cookie(session))
                .andExpect(jsonPath("$.month").value("2026-11"));
    }

    @Autowired
    JdbcClient jdbc;

    @Autowired
    Today today;

    private int sessionWordsToday() {
        return jdbc.sql("SELECT coalesce(sum(words), 0) FROM daily_stats WHERE date = :d")
                .param("d", today.date()).query(Integer.class).single();
    }

    private int todayWords(Cookie session) throws Exception {
        return JsonPath.read(mvc.perform(get("/api/v1/stats/overview").cookie(session))
                .andReturn().getResponse().getContentAsString(), "$.today.words");
    }
}
