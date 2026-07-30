package com.vanh.event_ticketing.auth.google;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.gson.GsonFactory;
import com.vanh.event_ticketing.common.exception.BusinessException;
import com.vanh.event_ticketing.common.exception.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class GoogleTokenVerifierTest {
    @Mock
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    private GoogleTokenVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new GoogleTokenVerifier(googleIdTokenVerifier, GsonFactory.getDefaultInstance());
        ReflectionTestUtils.setField(verifier, "googleClientId", "test-google-client-id");
    }

    @Test
    void verify_shouldReturnAccountWhenTokenIsValid() throws Exception {
        GoogleIdToken idToken = org.mockito.Mockito.mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-1");
        payload.setEmail("alice@example.com");
        payload.setEmailVerified(true);
        payload.put("name", "Alice");
        payload.put("picture", "https://example.com/avatar.png");
        payload.setAudience(List.of("test-google-client-id"));
        when(idToken.getPayload()).thenReturn(payload);
        when(googleIdTokenVerifier.verify("token")).thenReturn(idToken);

        GoogleAccount account = verifier.verify("token");

        assertEquals("google-sub-1", account.subject());
        assertEquals("alice@example.com", account.email());
        assertEquals("Alice", account.name());
        assertEquals("https://example.com/avatar.png", account.picture());
    }

    @Test
    void verify_shouldRejectExpiredToken() throws Exception {
        when(googleIdTokenVerifier.verify(anyString())).thenReturn(null);
        String token = unsignedJwt(1730000000L, "test-google-client-id");

        BusinessException ex = assertThrows(BusinessException.class, () -> verifier.verify(token));

        assertEquals(ErrorCode.EXPIRED_GOOGLE_TOKEN, ex.getErrorCode());
    }

    @Test
    void verify_shouldRejectAudienceMismatch() throws Exception {
        when(googleIdTokenVerifier.verify(anyString())).thenReturn(null);
        String token = unsignedJwt(System.currentTimeMillis() / 1000 + 3600, "other-client-id");

        BusinessException ex = assertThrows(BusinessException.class, () -> verifier.verify(token));

        assertEquals(ErrorCode.GOOGLE_CLIENT_ID_MISMATCH, ex.getErrorCode());
    }

    private static String unsignedJwt(long expSeconds, String aud) {
        String header = base64Json("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        String payload = base64Json("""
                {"sub":"google-sub-1","email":"alice@example.com","email_verified":true,"name":"Alice","picture":"https://example.com/avatar.png","aud":"%s","exp":%d}
                """.formatted(aud, expSeconds));
        return header + "." + payload + ".";
    }

    private static String base64Json(String json) {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
