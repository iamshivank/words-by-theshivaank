package com.theshivaank.words.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.theshivaank.words.support.PostgresIntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class AuthControllerTest extends PostgresIntegrationTest {

    private static final AtomicInteger CLIENT = new AtomicInteger(1);

    @Autowired
    MockMvc mvc;

    /** Each test gets its own client address so the login rate limiter never leaks between tests. */
    private static RequestPostProcessor freshClient() {
        String ip = "10.0.0." + CLIENT.getAndIncrement();
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private static String body(String email, String password) {
        return """
                {"email":"%s","password":"%s"}""".formatted(email, password);
    }

    @Test
    void loginSetsHardenedSessionCookieAndMeRecognisesIt() throws Exception {
        var result = mvc.perform(post("/api/v1/auth/login").with(freshClient())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(OWNER_EMAIL, OWNER_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andReturn();

        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("words_session=", "HttpOnly", "Secure", "SameSite=Strict", "Path=/");

        String token = result.getResponse().getCookie("words_session").getValue();
        mvc.perform(get("/api/v1/auth/me").cookie(new Cookie("words_session", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.email").value(OWNER_EMAIL));
    }

    @Test
    void emailIsCaseInsensitive() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(freshClient())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Owner@Example.COM", OWNER_PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void wrongPasswordIsAProblemDetail401() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(freshClient())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(OWNER_EMAIL, "not the password")))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void invalidBodyReportsFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(freshClient())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("not-an-email", "")))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void repeatedFailuresAreRateLimited() throws Exception {
        RequestPostProcessor client = freshClient();
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login").with(client)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(OWNER_EMAIL, "wrong-" + i)))
                    .andExpect(status().isUnauthorized());
        }
        // Even the right password is refused until the window passes.
        mvc.perform(post("/api/v1/auth/login").with(client)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(OWNER_EMAIL, OWNER_PASSWORD)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber());
    }

    @Test
    void visitorsAreNotAuthenticatedAndStaleCookiesAreIgnored() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));

        mvc.perform(get("/api/v1/public/settings").cookie(new Cookie("words_session", "garbage.token.value")))
                .andExpect(status().isOk());
    }

    @Test
    void ownerEndpointsRequireTheSession() throws Exception {
        mvc.perform(get("/api/v1/entries"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void logoutExpiresTheCookie() throws Exception {
        var result = mvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isNoContent())
                .andReturn();
        assertThat(result.getResponse().getHeader("Set-Cookie")).contains("words_session=", "Max-Age=0");
    }
}
