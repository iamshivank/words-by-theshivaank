package com.theshivaank.words.media;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

class MediaControllerTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    private static final byte[] PNG = {
        (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R', 1, 2, 3, 4
    };

    @Test
    void uploadedImagesAreStoredInTheDatabaseAndServedPublicly() throws Exception {
        var session = OwnerSession.signIn(mvc);
        String body = mvc.perform(multipart("/api/v1/media")
                        .file(new MockMultipartFile("file", "photo.png", "image/png", PNG)).cookie(session))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String url = JsonPath.read(body, "$.url");
        String id = JsonPath.read(body, "$.id");

        // Anyone can read it, with no session, and it comes from the database (no file on disk).
        mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")))
                .andExpect(content().bytes(PNG));

        mvc.perform(delete("/api/v1/media/" + id).cookie(session)).andExpect(status().isNoContent());
        mvc.perform(get(url)).andExpect(status().isNotFound());
        mvc.perform(get("/uploads/does-not-exist.png")).andExpect(status().isNotFound());
    }
}
