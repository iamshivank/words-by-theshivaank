package com.theshivaank.words.settings;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, UUID> {

    Optional<SiteSettings> findBySingletonTrue();
}
