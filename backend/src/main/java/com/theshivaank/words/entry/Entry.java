package com.theshivaank.words.entry;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Essays, journal entries and notes share one table; `type` tells them apart. */
@Entity
@Table(name = "entries")
public class Entry {

    public static final String ESSAY = "essay";
    public static final String JOURNAL = "journal";
    public static final String NOTE = "note";
    public static final String PUBLIC = "public";
    public static final String UNLISTED = "unlisted";
    public static final String PRIVATE = "private";
    public static final String PUBLISHED = "published";
    public static final String DRAFT = "draft";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String title = "";

    private String slug;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> contentJson = Map.of();

    @Column(name = "content_html", nullable = false)
    private String contentHtml = "";

    @Column(name = "content_text", nullable = false)
    private String contentText = "";

    private String excerpt;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(nullable = false)
    private String visibility = PRIVATE;

    @Column(nullable = false)
    private String status = DRAFT;

    @Column(name = "entry_date")
    private LocalDate entryDate;

    private Short mood;
    private Short energy;
    private String gratitude;
    private String lessons;

    @Column(name = "word_count", nullable = false)
    private int wordCount;

    @Column(name = "reading_time_minutes", nullable = false)
    private int readingTimeMinutes;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "highlight_label")
    private String highlightLabel;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "view_count", nullable = false, insertable = false, updatable = false)
    private long viewCount;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "entry_tags",
            joinColumns = @JoinColumn(name = "entry_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Entry() {}

    public Entry(String type) {
        this.type = type;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isPubliclyReadable() {
        return PUBLISHED.equals(status) && (PUBLIC.equals(visibility) || UNLISTED.equals(visibility));
    }

    public UUID getId() { return id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Map<String, Object> getContentJson() { return contentJson; }
    public void setContentJson(Map<String, Object> contentJson) { this.contentJson = contentJson; }
    public String getContentHtml() { return contentHtml; }
    public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
    public String getContentText() { return contentText; }
    public void setContentText(String contentText) { this.contentText = contentText; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }
    public Short getMood() { return mood; }
    public void setMood(Short mood) { this.mood = mood; }
    public Short getEnergy() { return energy; }
    public void setEnergy(Short energy) { this.energy = energy; }
    public String getGratitude() { return gratitude; }
    public void setGratitude(String gratitude) { this.gratitude = gratitude; }
    public String getLessons() { return lessons; }
    public void setLessons(String lessons) { this.lessons = lessons; }
    public int getWordCount() { return wordCount; }
    public void setWordCount(int wordCount) { this.wordCount = wordCount; }
    public int getReadingTimeMinutes() { return readingTimeMinutes; }
    public void setReadingTimeMinutes(int minutes) { this.readingTimeMinutes = minutes; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public String getHighlightLabel() { return highlightLabel; }
    public void setHighlightLabel(String highlightLabel) { this.highlightLabel = highlightLabel; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public long getViewCount() { return viewCount; }
    public Set<Tag> getTags() { return tags; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
