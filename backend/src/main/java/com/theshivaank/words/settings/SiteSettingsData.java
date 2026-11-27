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
        Landing landing,
        Preferences preferences) {

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

    /** On/off switches from the admin panel's Preferences tab. A missing switch takes its default. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Preferences(
            Boolean customCursor,
            Boolean grain,
            Boolean smoothScroll,
            Boolean flyingPosts,
            Boolean readingProgress,
            Boolean dropCap,
            Boolean tableOfContents,
            Boolean showReadCounts,
            Boolean showStreakOnLanding,
            Boolean rssFeed,
            Boolean editorQuotes,
            Boolean typewriterScrolling,
            Boolean dictation,
            Boolean dailyPrompt,
            Boolean autocomplete) {

        public static Preferences defaults() {
            return new Preferences(true, true, true, true, true, true, true, false, true, true, true, true, true, true, true);
        }

        Preferences withDefaults() {
            Preferences d = defaults();
            return new Preferences(
                    or(customCursor, d.customCursor), or(grain, d.grain), or(smoothScroll, d.smoothScroll),
                    or(flyingPosts, d.flyingPosts), or(readingProgress, d.readingProgress), or(dropCap, d.dropCap),
                    or(tableOfContents, d.tableOfContents), or(showReadCounts, d.showReadCounts),
                    or(showStreakOnLanding, d.showStreakOnLanding), or(rssFeed, d.rssFeed),
                    or(editorQuotes, d.editorQuotes), or(typewriterScrolling, d.typewriterScrolling),
                    or(dictation, d.dictation), or(dailyPrompt, d.dailyPrompt),
                    or(autocomplete, d.autocomplete));
        }

        private static Boolean or(Boolean value, Boolean fallback) {
            return value != null ? value : fallback;
        }
    }

    public static final List<String> LANDING_SECTION_IDS = List.of("hero", "flying", "latest", "about");

    public static SiteSettingsData defaults() {
        return new SiteSettingsData(
                "Words", "By theshivaank", "A quiet place to think in sentences.", "Shivank", "", List.of(),
                new Hero(null, 0.55, 0.06),
                new Appearance("noir", null, "serif", 19),
                new Writing(500, "A few honest sentences are enough."),
                new Landing(LANDING_SECTION_IDS.stream().map(id -> new LandingSection(id, true)).toList()),
                Preferences.defaults());
    }
}
