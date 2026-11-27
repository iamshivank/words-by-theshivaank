package com.theshivaank.words.entry;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AutocompleteControllerTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void theOwnerGetsTheirWritingAsPlainTextAndVisitorsGetNothing() throws Exception {
        var session = OwnerSession.signIn(mvc);
        mvc.perform(post("/api/v1/entries").cookie(session).contentType(MediaType.APPLICATION_JSON).content("""
                        {"type":"journal","title":"Morning pages","contentHtml":"<p>I want to <b>write</b> every day.</p>",
                         "visibility":"private","status":"draft"}"""))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/autocomplete/corpus").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.texts", hasItem(containsString("I want to write every day."))))
                .andExpect(jsonPath("$.texts", hasItem(containsString("Morning pages"))));

        // Private journals are in the corpus, so it must never be public.
        mvc.perform(get("/api/v1/autocomplete/corpus")).andExpect(status().isUnauthorized());
    }
}
