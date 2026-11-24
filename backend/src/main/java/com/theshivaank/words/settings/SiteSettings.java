package com.theshivaank.words.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "site_settings")
public class SiteSettings {

    @Id
    private UUID id;

    @Column(nullable = false)
    private boolean singleton = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private SiteSettingsData data;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    protected SiteSettings() {}

    public UUID getId() {
        return id;
    }

    public SiteSettingsData getData() {
        return data;
    }

    public void setData(SiteSettingsData data) {
        this.data = data;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
