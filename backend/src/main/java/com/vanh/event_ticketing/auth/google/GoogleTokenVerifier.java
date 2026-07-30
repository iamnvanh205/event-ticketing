package com.vanh.event_ticketing.auth.google;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.JsonFactory;
import com.vanh.event_ticketing.common.exception.BusinessException;
import com.vanh.event_ticketing.common.exception.ErrorCode;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Collection;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GoogleTokenVerifier {
    private final GoogleIdTokenVerifier verifier;
    private final JsonFactory jsonFactory;

    @Value("${google.client-id:}")
    private String googleClientId;

    public GoogleAccount verify(String idTokenValue) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new BusinessException(ErrorCode.GOOGLE_AUTH_NOT_CONFIGURED);
        }

        GoogleIdToken idToken = verifyWithGoogle(idTokenValue);
        if (idToken == null) {
            throw classifiedFailure(idTokenValue);
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String subject = payload.getSubject();
        String email = payload.getEmail();
        if (subject == null || subject.isBlank() || email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BusinessException(ErrorCode.GOOGLE_EMAIL_NOT_VERIFIED);
        }

        return new GoogleAccount(
                subject,
                email,
                (String) payload.get("name"),
                (String) payload.get("picture"),
                true
        );
    }

    private GoogleIdToken verifyWithGoogle(String idTokenValue) {
        try {
            return verifier.verify(idTokenValue);
        } catch (GeneralSecurityException | IOException ex) {
            throw new BusinessException(ErrorCode.GOOGLE_TOKEN_VERIFICATION_FAILED);
        }
    }

    private BusinessException classifiedFailure(String idTokenValue) {
        try {
            GoogleIdToken parsed = GoogleIdToken.parse(jsonFactory, idTokenValue);
            GoogleIdToken.Payload payload = parsed.getPayload();
            if (payload.getExpirationTimeSeconds() != null && payload.getExpirationTimeSeconds() <= Instant.now().getEpochSecond()) {
                return new BusinessException(ErrorCode.EXPIRED_GOOGLE_TOKEN);
            }
            Object audience = payload.getAudience();
            if (!matchesAudience(audience)) {
                return new BusinessException(ErrorCode.GOOGLE_CLIENT_ID_MISMATCH);
            }
        } catch (IOException | RuntimeException ignored) {
            // The untrusted parse is used only to choose an error code, never to authenticate.
        }
        return new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
    }

    private boolean matchesAudience(Object audience) {
        if (audience instanceof Collection<?> collection) {
            return collection.contains(googleClientId);
        }
        return googleClientId.equals(audience);
    }
}
