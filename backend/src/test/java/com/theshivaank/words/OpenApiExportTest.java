package com.theshivaank.words;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.PostgresIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Writes the OpenAPI document to target/openapi.json so the frontend can regenerate its types
 * (npm run api:types:offline) without a running server or database.
 */
class OpenApiExportTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void exportsOpenApiSpec() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(spec).contains("/api/v1/auth/login", "/api/v1/public/settings");
        Path out = Path.of("target", "openapi.json");
        Files.createDirectories(out.getParent());
        Files.writeString(out, spec, StandardCharsets.UTF_8);
    }
}
