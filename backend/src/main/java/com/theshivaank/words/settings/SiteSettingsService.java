package com.theshivaank.words.settings;

import com.theshivaank.words.settings.SiteSettingsData.Appearance;
import com.theshivaank.words.settings.SiteSettingsData.Hero;
import com.theshivaank.words.settings.SiteSettingsData.Landing;
import com.theshivaank.words.settings.SiteSettingsData.SocialLink;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteSettingsService {

    /** The subset of settings visitors may see (no writing goals or private reminders). */
    @Schema(requiredProperties = {
            "siteName", "byline", "tagline", "displayName", "about", "social", "hero", "appearance", "landing"})
    public record PublicSettings(
            String siteName,
            String byline,
            String tagline,
            String displayName,
            String about,
            List<SocialLink> social,
            Hero hero,
            Appearance appearance,
            Landing landing) {}

    private final SiteSettingsRepository repository;

    public SiteSettingsService(SiteSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public SiteSettingsData current() {
        SiteSettingsData stored = repository.findBySingletonTrue().map(SiteSettings::getData).orElse(null);
        return withDefaults(stored);
    }

    @Transactional(readOnly = true)
    public PublicSettings publicSettings() {
        SiteSettingsData s = current();
        return new PublicSettings(s.siteName(), s.byline(), s.tagline(), s.displayName(), s.about(),
                s.social(), s.hero(), s.appearance(), s.landing());
    }

    /** Fills any missing top-level section from the defaults, so the UI never has to guard against nulls. */
    static SiteSettingsData withDefaults(SiteSettingsData s) {
        SiteSettingsData d = SiteSettingsData.defaults();
        if (s == null) return d;
        return new SiteSettingsData(
                Objects.requireNonNullElse(s.siteName(), d.siteName()),
                Objects.requireNonNullElse(s.byline(), d.byline()),
                Objects.requireNonNullElse(s.tagline(), d.tagline()),
                Objects.requireNonNullElse(s.displayName(), d.displayName()),
                Objects.requireNonNullElse(s.about(), d.about()),
                Objects.requireNonNullElse(s.social(), d.social()),
                Objects.requireNonNullElse(s.hero(), d.hero()),
                Objects.requireNonNullElse(s.appearance(), d.appearance()),
                Objects.requireNonNullElse(s.writing(), d.writing()),
                Objects.requireNonNullElse(s.landing(), d.landing()));
    }
}
