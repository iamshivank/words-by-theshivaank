package com.theshivaank.words.account;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AccountControllerTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    private boolean signedIn(Cookie cookie) throws Exception {
        String body = mvc.perform(get("/api/v1/auth/me").cookie(cookie)).andReturn().getResponse().getContentAsString();
        return body.contains("\"authenticated\":true");
    }

    @Test
    void signOutEverywhereRevokesOtherSessionsButKeepsThisOne() throws Exception {
        Cookie laptop = OwnerSession.signIn(mvc);
        Cookie phone = OwnerSession.signIn(mvc);

        Cookie fresh = mvc.perform(post("/api/v1/account/sign-out-everywhere").cookie(laptop))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("words_session");

        org.assertj.core.api.Assertions.assertThat(signedIn(phone)).isFalse();
        org.assertj.core.api.Assertions.assertThat(signedIn(laptop)).isFalse();
        org.assertj.core.api.Assertions.assertThat(signedIn(fresh)).isTrue();
    }

    @Test
    void changingThePasswordNeedsTheCurrentOneAndTakesEffect() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        String newPassword = "a brand new passphrase";

        mvc.perform(put("/api/v1/account/password").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong one\",\"newPassword\":\"%s\"}".formatted(newPassword)))
                .andExpect(status().isUnauthorized());

        Cookie fresh = mvc.perform(put("/api/v1/account/password").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(OWNER_PASSWORD, newPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordChangedAt").isNotEmpty())
                .andReturn().getResponse().getCookie("words_session");

        Cookie withNew = OwnerSession.signIn(mvc, newPassword);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> OwnerSession.signIn(mvc, OWNER_PASSWORD))
                .isInstanceOf(IllegalStateException.class);

        // Put it back so other test classes (sharing this database) can still sign in.
        mvc.perform(put("/api/v1/account/password").cookie(withNew).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(newPassword, OWNER_PASSWORD)))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(signedIn(fresh)).isFalse();
    }

    @Test
    void tooShortPasswordsAreRefused() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        mvc.perform(put("/api/v1/account/password").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"%s\",\"newPassword\":\"short\"}".formatted(OWNER_PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").exists());
    }

    @Test
    void adminOverviewAndSettingsRoundTrip() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        mvc.perform(get("/api/v1/admin/overview").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.essays").isNumber())
                .andExpect(jsonPath("$.system.databaseVersion").isNotEmpty());
        mvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());

        String settings = mvc.perform(get("/api/v1/settings").cookie(session))
                .andExpect(jsonPath("$.preferences.flyingPosts").value(true))
                .andReturn().getResponse().getContentAsString();
        String changed = settings.replace("\"flyingPosts\":true", "\"flyingPosts\":false");
        mvc.perform(put("/api/v1/settings").cookie(session).contentType(MediaType.APPLICATION_JSON).content(changed))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/settings")).andExpect(jsonPath("$.preferences.flyingPosts").value(false));
        mvc.perform(put("/api/v1/settings").cookie(session).contentType(MediaType.APPLICATION_JSON).content(settings));

        mvc.perform(put("/api/v1/settings").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content(settings.replace("\"siteName\":\"Words\"", "\"siteName\":\"\"")))
                .andExpect(status().isBadRequest());
    }
}
