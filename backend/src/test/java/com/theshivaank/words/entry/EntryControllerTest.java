package com.theshivaank.words.entry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class EntryControllerTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    Cookie session;

    @BeforeEach
    void signIn() throws Exception {
        session = OwnerSession.signIn(mvc);
    }

    private String create(String json) throws Exception {
        String body = mvc.perform(post("/api/v1/entries").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void privateJournalsNeverReachPublicEndpoints() throws Exception {
        String id = create("""
                {"type":"journal","title":"Secret thoughts","contentHtml":"<p>nobody should read this zebra</p>",
                 "visibility":"private","status":"published"}""");

        mvc.perform(get("/api/v1/public/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Secret thoughts"))));
        mvc.perform(get("/api/v1/public/search").param("q", "zebra"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/public/archive"))
                .andExpect(jsonPath("$[*].entries[*].title", not(hasItem("Secret thoughts"))));
        mvc.perform(get("/rss.xml")).andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).doesNotContain("zebra"));

        // The owner finds it.
        mvc.perform(get("/api/v1/search").param("q", "zebra").cookie(session))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].snippet").value(org.hamcrest.Matchers.containsString("[[zebra]]")));
        // Visitors cannot list or read entries directly.
        mvc.perform(get("/api/v1/entries/" + id)).andExpect(status().isUnauthorized());
    }

    @Test
    void publishingAnEssayGivesItAnAddressSanitizedHtmlAndStats() throws Exception {
        create("""
                {"type":"essay","title":"On Small Rooms","status":"published","visibility":"public",
                 "contentHtml":"<h2>First</h2><p onclick=\\"steal()\\">Hello <script>alert(1)</script>world, friend.</p><p><a href=\\"https://example.com\\">link</a></p>",
                 "tags":["Writing","Craft"],"highlightLabel":"Fresh ink"}""");

        mvc.perform(get("/api/v1/public/entries/on-small-rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("On Small Rooms"))
                .andExpect(jsonPath("$.wordCount").value(5))
                .andExpect(jsonPath("$.readingTimeMinutes").value(1))
                .andExpect(jsonPath("$.highlightLabel").value("Fresh ink"))
                .andExpect(jsonPath("$.tags[*].slug", hasItem("craft")))
                .andExpect(result -> {
                    String html = JsonPath.read(result.getResponse().getContentAsString(), "$.contentHtml");
                    assertThat(html).doesNotContain("script", "onclick", "alert")
                            .contains("<h2 id=\"first\">", "rel=\"noopener noreferrer nofollow\"");
                });

        mvc.perform(get("/api/v1/public/entries/flying"))
                .andExpect(jsonPath("$[?(@.slug == 'on-small-rooms')].label").value(hasItem("Fresh ink")));
        mvc.perform(get("/api/v1/public/tags")).andExpect(jsonPath("$[*].slug", hasItem("writing")));
    }

    @Test
    void draftsAndPrivateEssaysAre404ForVisitors() throws Exception {
        String id = create("""
                {"type":"essay","title":"Unfinished thing","status":"draft","visibility":"public","contentHtml":"<p>wip</p>"}""");
        mvc.perform(get("/api/v1/public/entries/unfinished-thing")).andExpect(status().isNotFound());

        // Publishing it makes it readable; making it private takes it away again.
        mvc.perform(post("/api/v1/entries/bulk").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[\"" + id + "\"],\"action\":\"publish\"}"))
                .andExpect(jsonPath("$.affected").value(1));
        mvc.perform(get("/api/v1/public/entries/unfinished-thing")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/entries/bulk").cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":[\"" + id + "\"],\"action\":\"make-private\"}"));
        mvc.perform(get("/api/v1/public/entries/unfinished-thing")).andExpect(status().isNotFound());
    }

    @Test
    void slugsMustBeUniqueAndUpdatesReplaceTheEntry() throws Exception {
        String first = create("""
                {"type":"essay","title":"Same","slug":"same-address","contentHtml":"<p>a</p>"}""");
        mvc.perform(post("/api/v1/entries").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"essay\",\"title\":\"Other\",\"slug\":\"same-address\"}"))
                .andExpect(status().isConflict());

        mvc.perform(put("/api/v1/entries/" + first).cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"essay\",\"title\":\"Renamed\",\"slug\":\"same-address\",\"contentHtml\":\"<p>one two three</p>\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed"))
                .andExpect(jsonPath("$.wordCount").value(3));

        mvc.perform(delete("/api/v1/entries/" + first).cookie(session)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/entries/" + first).cookie(session)).andExpect(status().isNotFound());
    }

    @Test
    void readsAreCountedForVisitorsOnly() throws Exception {
        create("""
                {"type":"essay","title":"Counted","status":"published","visibility":"public","contentHtml":"<p>x</p>"}""");
        mvc.perform(post("/api/v1/public/entries/counted/view")).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/public/entries/counted/view").cookie(session)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/public/entries/counted")).andExpect(jsonPath("$.viewCount").value(1));
    }

    @Test
    void seededSampleContentIsThere() throws Exception {
        mvc.perform(get("/api/v1/public/entries/deciding-slowly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.highlightLabel").value("Editor's pick"));
        mvc.perform(get("/api/v1/public/quotes")).andExpect(jsonPath("$.length()").value(8));
    }
}
