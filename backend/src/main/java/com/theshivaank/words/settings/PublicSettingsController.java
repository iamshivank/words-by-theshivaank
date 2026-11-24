package com.theshivaank.words.settings;

import com.theshivaank.words.settings.SiteSettingsService.PublicSettings;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/settings")
@Tag(name = "Settings")
public class PublicSettingsController {

    private final SiteSettingsService service;

    public PublicSettingsController(SiteSettingsService service) {
        this.service = service;
    }

    @Operation(summary = "Public site settings: name, byline, appearance, hero and landing layout.")
    @GetMapping
    public PublicSettings get() {
        return service.publicSettings();
    }
}
