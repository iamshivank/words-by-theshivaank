package com.theshivaank.words.settings;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

class PublicSettingsControllerTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void servesSeededSettingsWithoutPrivateSections() throws Exception {
        mvc.perform(get("/api/v1/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.siteName").value("Words"))
                .andExpect(jsonPath("$.byline").value("By theshivaank"))
                .andExpect(jsonPath("$.appearance.theme").value("noir"))
                .andExpect(jsonPath("$.hero.overlayDarkness").value(0.55))
                .andExpect(jsonPath("$.landing.sections[0].id").value("hero"))
                .andExpect(jsonPath("$.writing").doesNotExist());
    }
}
