package com.theshivaank.words.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI wordsOpenApi(AppProperties props) {
        return new OpenAPI()
                .info(new Info().title("Words API").version("v1")
                        .description("Words by theshivaank. Owner endpoints authenticate with the httpOnly session cookie."))
                .components(new Components().addSecuritySchemes("session", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name(props.cookie().name())));
    }
}
