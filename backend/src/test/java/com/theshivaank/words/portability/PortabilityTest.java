package com.theshivaank.words.portability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.OwnerSession;
import com.theshivaank.words.support.PostgresIntegrationTest;
import jakarta.servlet.http.Cookie;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

class PortabilityTest extends PostgresIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void importsMarkdownWithFrontMatter() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        String md = """
                ---
                type: essay
                title: "Imported *thoughts*"
                status: published
                visibility: public
                date: 2025-03-14
                tags: [Imported, "Old notes"]
                ---

                ## A heading

                Some **bold** words and a [link](https://example.com).
                """;
        mvc.perform(multipart("/api/v1/import").file(new MockMultipartFile("files", "old.md", "text/markdown",
                        md.getBytes(StandardCharsets.UTF_8))).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1));

        mvc.perform(get("/api/v1/public/entries").param("tag", "old-notes"))
                .andExpect(jsonPath("$.items[0].title").value("Imported *thoughts*"))
                .andExpect(jsonPath("$.items[0].publishedAt").isNotEmpty());
    }

    @Test
    void exportsEveryEntryAsMarkdown() throws Exception {
        Cookie session = OwnerSession.signIn(mvc);
        var async = mvc.perform(get("/api/v1/export").cookie(session)).andReturn();
        byte[] zip = mvc.perform(asyncDispatch(async)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        List<String> names = new ArrayList<>();
        String sample = null;
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (var e = in.getNextEntry(); e != null; e = in.getNextEntry()) {
                names.add(e.getName());
                String content = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                if (e.getName().contains("deciding-slowly")) sample = content;
            }
        }
        assertThat(names).contains("data/quotes.json", "data/decisions.json").anyMatch(n -> n.startsWith("journals/"));
        assertThat(sample).startsWith("---\n").contains("title: \"Deciding slowly\"", "## Process and outcome", "> A decision is a bet");
    }

    @Test
    void htmlAndMarkdownRoundTrip() {
        String md = Markdown.fromHtml("<h2>Title</h2><p>A <strong>bold</strong> <em>move</em>.</p><ul><li>one</li><li>two</li></ul>");
        assertThat(md).isEqualTo("## Title\n\nA **bold** *move*.\n\n- one\n- two\n");
        assertThat(Markdown.toHtml(md)).contains("<h2>Title</h2>", "<strong>bold</strong>", "<li>two</li>");
        var doc = Markdown.parse("---\ntitle: \"Hi \\\"there\\\"\"\ntags: [a, b]\n---\nBody");
        assertThat(Markdown.unquote(doc.frontMatter().get("title"))).isEqualTo("Hi \"there\"");
        assertThat(Markdown.list(doc.frontMatter().get("tags"))).containsExactly("a", "b");
        assertThat(doc.body()).isEqualTo("Body");
        assertThat(Markdown.frontMatter(Map.of("mood", 4))).isEqualTo("---\nmood: 4\n---\n\n");
    }
}
