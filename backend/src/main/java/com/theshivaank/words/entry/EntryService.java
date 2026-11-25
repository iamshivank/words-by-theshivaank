package com.theshivaank.words.entry;

import com.theshivaank.words.common.ConflictException;
import com.theshivaank.words.common.HtmlContent;
import com.theshivaank.words.common.NotFoundException;
import com.theshivaank.words.common.PageResponse;
import com.theshivaank.words.common.Slugs;
import com.theshivaank.words.common.Today;
import com.theshivaank.words.entry.EntryDtos.ArchiveYear;
import com.theshivaank.words.entry.EntryDtos.BulkAction;
import com.theshivaank.words.entry.EntryDtos.EntryDetail;
import com.theshivaank.words.entry.EntryDtos.EntryInput;
import com.theshivaank.words.entry.EntryDtos.EntrySummary;
import com.theshivaank.words.entry.EntryDtos.Neighbor;
import com.theshivaank.words.entry.EntryDtos.PublicEntry;
import com.theshivaank.words.entry.EntryDtos.PublicEntrySummary;
import com.theshivaank.words.entry.EntryDtos.PublicStats;
import com.theshivaank.words.entry.EntryDtos.TagCount;
import com.theshivaank.words.entry.EntryDtos.TagView;
import com.theshivaank.words.stats.DailyStatsWriter;
import jakarta.persistence.criteria.JoinType;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntryService {

    /** Filters for the owner's lists. Any null field means "any". */
    public record Filter(String type, String status, String visibility, String tag, String q, Integer year) {}

    private static final Duration NEW_FOR = Duration.ofDays(14);

    private final EntryRepository entries;
    private final TagRepository tags;
    private final DailyStatsWriter stats;
    private final Today today;

    public EntryService(EntryRepository entries, TagRepository tags, DailyStatsWriter stats, Today today) {
        this.entries = entries;
        this.tags = tags;
        this.stats = stats;
        this.today = today;
    }

    // ---- Owner -------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<EntrySummary> list(Filter f, int page, int size, String sort) {
        Specification<Entry> spec = Specification.allOf(
                eq("type", f.type()), eq("status", f.status()), eq("visibility", f.visibility()),
                hasTag(f.tag()), titleOrTextContains(f.q()), inYear(f.year(), "createdAt"));
        Sort order = switch (sort == null ? "" : sort) {
            case "created" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "date" -> Sort.by(Sort.Direction.DESC, "entryDate", "createdAt");
            case "published" -> Sort.by(Sort.Direction.DESC, "publishedAt");
            case "words" -> Sort.by(Sort.Direction.DESC, "wordCount");
            case "views" -> Sort.by(Sort.Direction.DESC, "viewCount");
            default -> Sort.by(Sort.Direction.DESC, "updatedAt");
        };
        return PageResponse.of(entries.findAll(spec, PageRequest.of(page, clamp(size), order)), this::summary);
    }

    @Transactional(readOnly = true)
    public EntryDetail get(UUID id) {
        return detail(find(id));
    }

    @Transactional
    public EntryDetail create(EntryInput input) {
        return create(input, null);
    }

    /** createdAt lets imports keep their original dates. */
    @Transactional
    public EntryDetail create(EntryInput input, Instant createdAt) {
        Entry e = new Entry(input.type());
        if (createdAt != null) e.setCreatedAt(createdAt);
        apply(e, input);
        entries.save(e);
        stats.add(createdAt == null ? today.date() : today.dateOf(createdAt), 0, 0, 1);
        return detail(e);
    }

    @Transactional
    public EntryDetail update(UUID id, EntryInput input) {
        Entry e = find(id);
        apply(e, input);
        return detail(entries.saveAndFlush(e));
    }

    @Transactional
    public void delete(UUID id) {
        entries.delete(find(id));
    }

    @Transactional
    public int bulk(BulkAction action) {
        List<Entry> found = entries.findAllById(action.ids());
        for (Entry e : found) {
            switch (action.action()) {
                case "publish" -> {
                    e.setStatus(Entry.PUBLISHED);
                    if (e.getPublishedAt() == null) e.setPublishedAt(today.now());
                    ensureSlug(e);
                }
                case "unpublish" -> e.setStatus(Entry.DRAFT);
                case "make-public" -> {
                    e.setVisibility(Entry.PUBLIC);
                    ensureSlug(e);
                }
                case "make-private" -> e.setVisibility(Entry.PRIVATE);
                case "feature" -> e.setFeatured(true);
                case "unfeature" -> e.setFeatured(false);
                case "delete" -> entries.delete(e);
                default -> throw new IllegalArgumentException(action.action());
            }
        }
        return found.size();
    }

    // ---- Public ------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<PublicEntrySummary> publicList(String tag, Integer year, int page, int size) {
        Specification<Entry> spec = Specification.allOf(publicEssays(), hasTag(tag), inYear(year, "publishedAt"));
        var result = entries.findAll(spec, PageRequest.of(page, clamp(size), Sort.by(Sort.Direction.DESC, "publishedAt")));
        return PageResponse.of(result, this::publicSummary);
    }

    /** Featured first, then the newest: the essays that fly across the landing page. */
    @Transactional(readOnly = true)
    public List<PublicEntrySummary> flying(int limit) {
        var page = entries.findAll(publicEssays(), PageRequest.of(0, Math.min(Math.max(limit, 1), 24),
                Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("publishedAt"))));
        return page.getContent().stream().map(this::publicSummary).toList();
    }

    @Transactional(readOnly = true)
    public PublicEntry publicEntry(String slug) {
        Entry e = entries.findBySlug(slug)
                .filter(Entry::isPubliclyReadable)
                .filter(x -> Entry.ESSAY.equals(x.getType()) || Entry.PUBLIC.equals(x.getVisibility())
                        || Entry.UNLISTED.equals(x.getVisibility()))
                .orElseThrow(() -> new NotFoundException("That piece is not here."));
        Neighbor previous = null;
        Neighbor next = null;
        if (Entry.PUBLIC.equals(e.getVisibility())) {
            List<Entry> all = entries.findAllPublicEssays();
            int i = indexOf(all, e.getId());
            // The list is newest first: "next" is the newer essay, "previous" the older one.
            if (i >= 0 && i + 1 < all.size()) previous = neighbor(all.get(i + 1));
            if (i > 0) next = neighbor(all.get(i - 1));
        }
        return new PublicEntry(e.getSlug(), e.getTitle(), e.getExcerpt(), e.getCoverImageUrl(), e.getPublishedAt(),
                e.getUpdatedAt(), e.getReadingTimeMinutes(), e.getWordCount(), tagViews(e), e.getHighlightLabel(),
                e.getViewCount(), e.getContentHtml(), previous, next);
    }

    @Transactional
    public void recordView(String slug) {
        entries.incrementViews(slug);
    }

    @Transactional(readOnly = true)
    public List<ArchiveYear> archive() {
        Map<Integer, List<PublicEntrySummary>> byYear = new LinkedHashMap<>();
        for (Entry e : entries.findAllPublicEssays()) {
            int year = e.getPublishedAt().atZone(today.zone()).getYear();
            byYear.computeIfAbsent(year, y -> new ArrayList<>()).add(publicSummary(e));
        }
        return byYear.entrySet().stream().map(x -> new ArchiveYear(x.getKey(), x.getValue())).toList();
    }

    @Transactional(readOnly = true)
    public List<TagCount> publicTags() {
        Map<String, TagCount> counts = new LinkedHashMap<>();
        for (Entry e : entries.findAllPublicEssays()) {
            for (Tag t : e.getTags()) {
                counts.merge(t.getSlug(), new TagCount(t.getName(), t.getSlug(), 1),
                        (a, b) -> new TagCount(a.name(), a.slug(), a.count() + 1));
            }
        }
        return counts.values().stream().sorted(Comparator.comparingLong(TagCount::count).reversed()).toList();
    }

    @Transactional(readOnly = true)
    public PublicStats publicStats() {
        List<Entry> all = entries.findAllPublicEssays();
        long words = all.stream().mapToLong(Entry::getWordCount).sum();
        Instant since = all.isEmpty() ? null : all.getLast().getPublishedAt();
        return new PublicStats(all.size(), words, since);
    }

    @Transactional(readOnly = true)
    public List<Entry> publicEssaysForFeeds() {
        List<Entry> all = entries.findAllPublicEssays();
        all.forEach(e -> e.getTags().size());
        return all;
    }

    // ---- Mapping and rules -------------------------------------------------

    private void apply(Entry e, EntryInput in) {
        e.setType(in.type());
        e.setTitle(Objects.requireNonNullElse(in.title(), "").strip());
        e.setContentJson(in.contentJson() == null ? Map.of() : in.contentJson());

        HtmlContent.Processed content = HtmlContent.process(in.contentHtml());
        e.setContentHtml(content.html());
        e.setContentText(content.text());
        e.setWordCount(content.wordCount());
        e.setReadingTimeMinutes(content.readingTimeMinutes());
        e.setExcerpt(blankToNull(in.excerpt()) != null ? in.excerpt().strip() : HtmlContent.excerpt(content.text(), 220));

        e.setCoverImageUrl(blankToNull(in.coverImageUrl()));
        e.setVisibility(in.visibility() != null ? in.visibility() : Entry.PRIVATE);
        e.setEntryDate(in.entryDate() != null ? in.entryDate()
                : e.getEntryDate() != null ? e.getEntryDate() : today.date());
        e.setMood(in.mood());
        e.setEnergy(in.energy());
        e.setGratitude(blankToNull(in.gratitude()));
        e.setLessons(blankToNull(in.lessons()));
        e.setHighlightLabel(blankToNull(in.highlightLabel()));
        e.setFeatured(Boolean.TRUE.equals(in.featured()));

        String status = in.status() != null ? in.status() : Entry.DRAFT;
        if (Entry.PUBLISHED.equals(status) && e.getPublishedAt() == null) e.setPublishedAt(today.now());
        e.setStatus(status);

        String slug = blankToNull(in.slug());
        if (slug != null && !slug.equals(e.getSlug())) {
            entries.findBySlug(slug).filter(other -> !other.getId().equals(e.getId())).ifPresent(other -> {
                throw new ConflictException("Another piece already uses the address \"" + slug + "\".");
            });
            e.setSlug(slug);
        }
        ensureSlug(e);
        e.getTags().clear();
        e.getTags().addAll(resolveTags(in.tags()));
    }

    /** Anything that can be read publicly gets an address, made from its title. */
    private void ensureSlug(Entry e) {
        boolean needsOne = Entry.ESSAY.equals(e.getType()) || !Entry.PRIVATE.equals(e.getVisibility());
        if (e.getSlug() != null || !needsOne) return;
        String base = Slugs.slugify(e.getTitle().isBlank() ? "untitled" : e.getTitle());
        String candidate = base;
        for (int n = 2; entries.existsBySlug(candidate); n++) candidate = base + "-" + n;
        e.setSlug(candidate);
    }

    private Set<Tag> resolveTags(List<String> names) {
        Set<Tag> result = new LinkedHashSet<>();
        if (names == null) return result;
        for (String raw : names) {
            String name = raw.strip();
            if (name.isEmpty()) continue;
            String slug = Slugs.slugify(name);
            result.add(tags.findBySlug(slug).orElseGet(() -> tags.save(new Tag(name, slug))));
        }
        return result;
    }

    private Entry find(UUID id) {
        return entries.findById(id).orElseThrow(() -> new NotFoundException("That entry does not exist."));
    }

    private EntrySummary summary(Entry e) {
        return new EntrySummary(e.getId(), e.getType(), e.getTitle(), e.getSlug(), e.getExcerpt(),
                e.getCoverImageUrl(), e.getVisibility(), e.getStatus(), e.getEntryDate(), e.getMood(),
                e.getWordCount(), e.getReadingTimeMinutes(), e.getPublishedAt(), e.getCreatedAt(), e.getUpdatedAt(),
                tagViews(e), e.getHighlightLabel(), e.isFeatured(), e.getViewCount());
    }

    EntryDetail detail(Entry e) {
        return new EntryDetail(e.getId(), e.getType(), e.getTitle(), e.getSlug(), e.getExcerpt(),
                e.getCoverImageUrl(), e.getVisibility(), e.getStatus(), e.getEntryDate(), e.getMood(), e.getEnergy(),
                e.getGratitude(), e.getLessons(), e.getWordCount(), e.getReadingTimeMinutes(), e.getPublishedAt(),
                e.getCreatedAt(), e.getUpdatedAt(), tagViews(e), e.getHighlightLabel(), e.isFeatured(),
                e.getViewCount(), e.getContentJson(), e.getContentHtml());
    }

    private PublicEntrySummary publicSummary(Entry e) {
        List<TagView> tagViews = tagViews(e);
        String label = e.getHighlightLabel() != null ? e.getHighlightLabel()
                : e.getPublishedAt() != null && e.getPublishedAt().isAfter(today.now().minus(NEW_FOR)) ? "New"
                : e.isFeatured() ? "Featured"
                : !tagViews.isEmpty() ? tagViews.getFirst().name() : "Essay";
        return new PublicEntrySummary(e.getSlug(), e.getTitle(), e.getExcerpt(), e.getCoverImageUrl(),
                e.getPublishedAt(), e.getReadingTimeMinutes(), e.getWordCount(), tagViews, e.getHighlightLabel(),
                e.isFeatured(), e.getViewCount(), label);
    }

    private static List<TagView> tagViews(Entry e) {
        return e.getTags().stream().map(t -> new TagView(t.getName(), t.getSlug()))
                .sorted(Comparator.comparing(TagView::name)).toList();
    }

    private static Neighbor neighbor(Entry e) {
        return new Neighbor(e.getSlug(), e.getTitle());
    }

    private static int indexOf(List<Entry> list, UUID id) {
        for (int i = 0; i < list.size(); i++) if (list.get(i).getId().equals(id)) return i;
        return -1;
    }

    private static int clamp(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    // ---- Specifications ----------------------------------------------------

    private static Specification<Entry> publicEssays() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("type"), Entry.ESSAY),
                cb.equal(root.get("status"), Entry.PUBLISHED),
                cb.equal(root.get("visibility"), Entry.PUBLIC));
    }

    private static Specification<Entry> eq(String field, String value) {
        return (root, query, cb) -> value == null || value.isBlank() ? null : cb.equal(root.get(field), value);
    }

    private static Specification<Entry> hasTag(String tagSlug) {
        return (root, query, cb) -> {
            if (tagSlug == null || tagSlug.isBlank()) return null;
            query.distinct(true);
            return cb.equal(root.join("tags", JoinType.INNER).get("slug"), tagSlug);
        };
    }

    private static Specification<Entry> titleOrTextContains(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return null;
            String like = "%" + q.strip().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
            return cb.or(cb.like(cb.lower(root.get("title")), like), cb.like(cb.lower(root.get("contentText")), like));
        };
    }

    private static Specification<Entry> inYear(Integer year, String field) {
        return (root, query, cb) -> {
            if (year == null) return null;
            if ("publishedAt".equals(field) || "createdAt".equals(field)) {
                Instant from = LocalDate.of(year, 1, 1).atStartOfDay().toInstant(ZoneOffset.UTC);
                Instant to = LocalDate.of(year + 1, 1, 1).atStartOfDay().toInstant(ZoneOffset.UTC);
                return cb.and(cb.greaterThanOrEqualTo(root.get(field), from), cb.lessThan(root.get(field), to));
            }
            return null;
        };
    }
}
