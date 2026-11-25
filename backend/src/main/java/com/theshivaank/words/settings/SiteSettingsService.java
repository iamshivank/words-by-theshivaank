package com.theshivaank.words.settings;

import com.theshivaank.words.common.BadRequestException;
import com.theshivaank.words.settings.SiteSettingsData.Appearance;
import com.theshivaank.words.settings.SiteSettingsData.Hero;
import com.theshivaank.words.settings.SiteSettingsData.Landing;
import com.theshivaank.words.settings.SiteSettingsData.LandingSection;
import com.theshivaank.words.settings.SiteSettingsData.Preferences;
import com.theshivaank.words.settings.SiteSettingsData.SocialLink;
import com.theshivaank.words.settings.SiteSettingsData.Writing;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteSettingsService {

    /** The subset of settings visitors may see (no writing goals or private reminders). */
    @Schema(requiredProperties = {
            "siteName", "byline", "tagline", "displayName", "about", "social", "hero", "appearance", "landing",
            "preferences"})
    public record PublicSettings(
            String siteName,
            String byline,
            String tagline,
            String displayName,
            String about,
            List<SocialLink> social,
            Hero hero,
            Appearance appearance,
            Landing landing,
            Preferences preferences) {}

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
                s.social(), s.hero(), s.appearance(), s.landing(), s.preferences());
    }

    @Transactional
    public SiteSettingsData update(SiteSettingsData incoming) {
        SiteSettingsData clean = validate(withDefaults(incoming));
        SiteSettings row = repository.findBySingletonTrue()
                .orElseThrow(() -> new IllegalStateException("site_settings row is missing"));
        row.setData(clean);
        repository.save(row);
        return clean;
    }

    /** Fills any missing section from the defaults, so the UI never has to guard against nulls. */
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
                landingWithAllSections(Objects.requireNonNullElse(s.landing(), d.landing())),
                s.preferences() == null ? d.preferences() : s.preferences().withDefaults());
    }

    /** Keeps the saved order, drops unknown sections and appends any new section the code knows about. */
    private static Landing landingWithAllSections(Landing landing) {
        List<LandingSection> result = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (LandingSection s : landing.sections() == null ? List.<LandingSection>of() : landing.sections()) {
            if (s != null && SiteSettingsData.LANDING_SECTION_IDS.contains(s.id()) && seen.add(s.id())) result.add(s);
        }
        for (String id : SiteSettingsData.LANDING_SECTION_IDS) {
            if (seen.add(id)) result.add(new LandingSection(id, true));
        }
        return new Landing(result);
    }

    private static SiteSettingsData validate(SiteSettingsData s) {
        List<String> problems = new ArrayList<>();
        text(problems, "Site name", s.siteName(), 1, 60);
        text(problems, "Byline", s.byline(), 0, 80);
        text(problems, "Tagline", s.tagline(), 0, 200);
        text(problems, "Display name", s.displayName(), 1, 60);
        text(problems, "About", s.about(), 0, 20_000);
        if (s.social().size() > 12) problems.add("Use at most 12 social links.");
        for (SocialLink link : s.social()) {
            if (link == null || link.label() == null || link.label().isBlank() || link.url() == null
                    || !link.url().matches("^(https?://|mailto:).{1,500}$")) {
                problems.add("Every social link needs a label and an http(s) or mailto address.");
                break;
            }
        }
        Hero h = s.hero();
        if (h.imageUrl() != null && !h.imageUrl().isBlank() && !h.imageUrl().matches("^(https?://|/uploads/|/images/).{1,1000}$")) {
            problems.add("The hero image must be a web address or an upload.");
        }
        if (h.overlayDarkness() == null || h.overlayDarkness() < 0 || h.overlayDarkness() > 0.95) {
            problems.add("Overlay darkness must be between 0 and 0.95.");
        }
        if (h.grainIntensity() == null || h.grainIntensity() < 0 || h.grainIntensity() > 0.3) {
            problems.add("Grain intensity must be between 0 and 0.3.");
        }
        Appearance a = s.appearance();
        if (!List.of("noir", "paper", "system").contains(a.theme())) problems.add("Theme must be noir, paper or system.");
        if (a.accentHue() != null && (a.accentHue() < 0 || a.accentHue() > 359)) problems.add("Accent hue must be 0 to 359.");
        if (!List.of("serif", "sans").contains(a.bodyFont())) problems.add("Body font must be serif or sans.");
        if (a.baseFontSize() == null || a.baseFontSize() < 15 || a.baseFontSize() > 24) {
            problems.add("Base font size must be 15 to 24 px.");
        }
        Writing w = s.writing();
        if (w.dailyWordGoal() == null || w.dailyWordGoal() < 0 || w.dailyWordGoal() > 20_000) {
            problems.add("Daily word goal must be 0 to 20,000.");
        }
        text(problems, "Reminder", w.reminderText(), 0, 200);
        if (!problems.isEmpty()) throw new BadRequestException(String.join(" ", problems));
        return s;
    }

    private static void text(List<String> problems, String name, String value, int min, int max) {
        int len = value == null ? 0 : value.strip().length();
        if (len < min) problems.add(name + " cannot be empty.");
        if (len > max) problems.add(name + " is too long (max " + max + ").");
    }
}
