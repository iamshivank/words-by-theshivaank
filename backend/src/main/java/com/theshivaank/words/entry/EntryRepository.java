package com.theshivaank.words.entry;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntryRepository extends JpaRepository<Entry, UUID>, JpaSpecificationExecutor<Entry> {

    Optional<Entry> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("""
            select e from Entry e
            where e.type = 'essay' and e.status = 'published' and e.visibility = 'public'
            order by e.publishedAt desc""")
    List<Entry> findAllPublicEssays();

    @Modifying
    @Query(value = """
            UPDATE entries SET view_count = view_count + 1
            WHERE slug = :slug AND status = 'published' AND visibility IN ('public', 'unlisted')""",
            nativeQuery = true)
    int incrementViews(@Param("slug") String slug);
}
