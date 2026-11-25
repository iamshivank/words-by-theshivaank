package com.theshivaank.words;

import com.theshivaank.words.config.DotEnv;
import com.theshivaank.words.config.NeonUrl;
import com.theshivaank.words.config.StartupCheck;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WordsApplication {

    public static void main(String[] args) {
        DotEnv.load();
        NeonUrl.normalizeDatasource();
        StartupCheck.verifyOrExit();
        SpringApplication.run(WordsApplication.class, args);
    }
}
