package com.theshivaank.words.settings;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
@Tag(name = "Settings")
public class SettingsController {

    private final SiteSettingsService service;

    public SettingsController(SiteSettingsService service) {
        this.service = service;
    }

    @Operation(summary = "Every setting, including private ones (writing goals, reminder).")
    @GetMapping
    public SiteSettingsData get() {
        return service.current();
    }

    @Operation(summary = "Replace the settings. Missing sections fall back to defaults; values are validated.")
    @PutMapping
    public SiteSettingsData update(@RequestBody SiteSettingsData body) {
        return service.update(body);
    }
}
