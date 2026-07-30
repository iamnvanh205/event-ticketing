package com.vanh.event_ticketing.common.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleAuthConfig {
    @Bean
    public JsonFactory googleJsonFactory() {
        return GsonFactory.getDefaultInstance();
    }

    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier(
            JsonFactory googleJsonFactory,
            @Value("${google.client-id:}") String googleClientId
    ) {
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), googleJsonFactory)
                .setAudience(List.of(googleClientId))
                .build();
    }
}
