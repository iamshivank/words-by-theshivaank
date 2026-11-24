package com.theshivaank.words.settings;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Shape of the single site_settings.data jsonb document. Unknown keys are ignored so old rows keep loading. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SiteSettingsData(
        String siteName,
        String byline,
        String tagline,
        String displayName,
        String about,
        List<SocialLink> social,
        Hero hero,
        Appearance appearance,
        Writing writing,
        Landing landing) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SocialLink(
            @Schema(requiredMode = REQUIRED) String label,
            @Schema(requiredMode = REQUIRED) String url) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Hero(
            String imageUrl,
            @Schema(requiredMode = REQUIRED) Double overlayDarkness,
            @Schema(requiredMode = REQUIRED) Double grainIntensity) {}

    /** accentHue: null keeps the theme's default orange. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Appearance(
            @Schema(requiredMode = REQUIRED, allowableValues = {"noir", "paper", "system"}) String theme,
            Integer accentHue,
            @Schema(requiredMode = REQUIRED, allowableValues = {"serif", "sans"}) String bodyFont,
            @Schema(requiredMode = REQUIRED) Integer baseFontSize) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Writing(
            @Schema(requiredMode = REQUIRED) Integer dailyWordGoal,
            @Schema(requiredMode = REQUIRED) String reminderText) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Landing(@Schema(requiredMode = REQUIRED) List<LandingSection> sections) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LandingSection(
            @Schema(requiredMode = REQUIRED) String id,
            @Schema(requiredMode = REQUIRED) boolean enabled) {}

    public static SiteSettingsData defaults() {
        return new SiteSettingsData(
                "Words", "By theshivaank", "A quiet place to think in sentences.", "Shivank", "", List.of(),
                new Hero(null, 0.55, 0.06),
                new Appearance("noir", null, "serif", 19),
                new Writing(500, "A few honest sentences are enough."),
                new Landing(List.of(
                        new LandingSection("hero", true),
                        new LandingSection("latest", true),
                        new LandingSection("about", true))));
    }
}
