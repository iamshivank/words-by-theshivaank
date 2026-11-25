package com.theshivaank.words.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import jakarta.servlet.http.Cookie;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Signs in as the test owner and returns the session cookie. Each call uses its own client address. */
public final class OwnerSession {

    private static final AtomicInteger CLIENT = new AtomicInteger(1);

    private OwnerSession() {}

    public static Cookie signIn(MockMvc mvc) throws Exception {
        return signIn(mvc, PostgresIntegrationTest.OWNER_PASSWORD);
    }

    public static Cookie signIn(MockMvc mvc, String password) throws Exception {
        String ip = "10.9." + (CLIENT.get() / 250) + "." + (CLIENT.getAndIncrement() % 250);
        var response = mvc.perform(post("/api/v1/auth/login")
                        .with(r -> {
                            r.setRemoteAddr(ip);
                            return r;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}"
                                .formatted(PostgresIntegrationTest.OWNER_EMAIL, password)))
                .andReturn().getResponse();
        if (response.getStatus() != 200) throw new IllegalStateException("Sign in failed: " + response.getStatus());
        return response.getCookie("words_session");
    }
}
