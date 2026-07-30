package com.vanh.event_ticketing.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vanh.event_ticketing.auth.google.GoogleAccount;
import com.vanh.event_ticketing.auth.google.GoogleTokenVerifier;
import com.vanh.event_ticketing.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class GoogleAuthIntegrationIT extends AbstractIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GoogleTokenVerifier googleTokenVerifier;

    @Test
    void googleLogin_shouldIssueBackendJwtAndRefreshCookie() throws Exception {
        org.mockito.Mockito.when(googleTokenVerifier.verify("valid-id-token"))
                .thenReturn(new GoogleAccount("google-sub-100", "integration@example.com", "Integration User", "https://example.com/avatar.png", true));

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"valid-id-token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("integration@example.com"))
                .andExpect(jsonPath("$.user.provider").value("GOOGLE"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=")));
    }
}
