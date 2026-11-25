-- Blog extras: the flying highlight label on the landing page, featuring, and simple read counts.
ALTER TABLE entries
    ADD COLUMN highlight_label text CHECK (highlight_label IS NULL OR length(highlight_label) <= 40),
    ADD COLUMN featured        boolean NOT NULL DEFAULT false,
    ADD COLUMN view_count      bigint  NOT NULL DEFAULT 0 CHECK (view_count >= 0);

CREATE INDEX entries_featured_idx ON entries (featured, published_at DESC)
    WHERE status = 'published' AND visibility = 'public';

-- ---------------------------------------------------------------------------
-- The owner's account. Seeded from OWNER_EMAIL / OWNER_PASSWORD_HASH on first start; after that the
-- admin panel can change the email or password here. token_version is embedded in every session token,
-- so bumping it signs out every device at once.
-- ---------------------------------------------------------------------------
CREATE TABLE owner_account (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton           boolean     NOT NULL DEFAULT true UNIQUE CHECK (singleton),
    email               text        NOT NULL,
    password_hash       text        NOT NULL,
    token_version       integer     NOT NULL DEFAULT 1,
    password_changed_at timestamptz,
    last_login_at       timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER owner_account_updated_at BEFORE UPDATE ON owner_account FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Feature switches for the admin panel's Preferences tab, and the "In flight" landing section.
UPDATE site_settings
SET data = jsonb_set(
        data || jsonb_build_object('preferences', jsonb_build_object(
            'customCursor', true,
            'grain', true,
            'smoothScroll', true,
            'flyingPosts', true,
            'readingProgress', true,
            'dropCap', true,
            'tableOfContents', true,
            'showReadCounts', false,
            'showStreakOnLanding', true,
            'rssFeed', true,
            'editorQuotes', true,
            'typewriterScrolling', true,
            'dictation', true,
            'dailyPrompt', true
        )),
        '{landing,sections}',
        '[{"id":"hero","enabled":true},{"id":"flying","enabled":true},{"id":"latest","enabled":true},{"id":"about","enabled":true}]'::jsonb);

-- Counting a read must not make an essay look "updated".
DROP TRIGGER entries_updated_at ON entries;
CREATE TRIGGER entries_updated_at BEFORE UPDATE ON entries FOR EACH ROW
    WHEN (OLD.view_count IS NOT DISTINCT FROM NEW.view_count)
    EXECUTE FUNCTION set_updated_at();
