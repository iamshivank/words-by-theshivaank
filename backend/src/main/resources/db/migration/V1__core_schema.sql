-- Words by theshivaank: core schema.
-- Hibernate only validates against this (ddl-auto=validate); every change goes through a new migration.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Entries: essays, journal entries and notes share one table.
-- ---------------------------------------------------------------------------
CREATE TABLE entries (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type                 text        NOT NULL CHECK (type IN ('essay', 'journal', 'note')),
    title                text        NOT NULL DEFAULT '',
    slug                 text        UNIQUE,
    content_json         jsonb       NOT NULL DEFAULT '{}'::jsonb,
    content_html         text        NOT NULL DEFAULT '',
    content_text         text        NOT NULL DEFAULT '',
    excerpt              text,
    cover_image_url      text,
    visibility           text        NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
    status               text        NOT NULL DEFAULT 'draft'   CHECK (status IN ('draft', 'published')),
    entry_date           date,
    mood                 smallint    CHECK (mood BETWEEN 1 AND 5),
    energy               smallint    CHECK (energy BETWEEN 1 AND 5),
    gratitude            text,
    lessons              text,
    word_count           integer     NOT NULL DEFAULT 0 CHECK (word_count >= 0),
    reading_time_minutes integer     NOT NULL DEFAULT 0 CHECK (reading_time_minutes >= 0),
    published_at         timestamptz,
    search_vector        tsvector GENERATED ALWAYS AS (
                             setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
                             setweight(to_tsvector('english'::regconfig, coalesce(excerpt, '')), 'B') ||
                             setweight(to_tsvector('english'::regconfig, coalesce(content_text, '')), 'C')
                         ) STORED,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entries_search_idx      ON entries USING gin (search_vector);
CREATE INDEX entries_public_idx      ON entries (published_at DESC) WHERE status = 'published' AND visibility = 'public';
CREATE INDEX entries_type_date_idx   ON entries (type, entry_date DESC);
CREATE INDEX entries_updated_idx     ON entries (updated_at DESC);
CREATE TRIGGER entries_updated_at BEFORE UPDATE ON entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    slug       text        NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE entry_tags (
    entry_id   uuid        NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
    tag_id     uuid        NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX entry_tags_tag_idx ON entry_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Writing sessions and daily rollups (feed streaks, heatmap and stats)
-- ---------------------------------------------------------------------------
CREATE TABLE writing_sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id    uuid        REFERENCES entries (id) ON DELETE SET NULL,
    started_at  timestamptz NOT NULL,
    ended_at    timestamptz,
    words_added integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX writing_sessions_started_idx ON writing_sessions (started_at DESC);
CREATE INDEX writing_sessions_entry_idx   ON writing_sessions (entry_id);
CREATE TRIGGER writing_sessions_updated_at BEFORE UPDATE ON writing_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE daily_stats (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date       date        NOT NULL UNIQUE,
    words      integer     NOT NULL DEFAULT 0 CHECK (words >= 0),
    minutes    integer     NOT NULL DEFAULT 0 CHECK (minutes >= 0),
    entries    integer     NOT NULL DEFAULT 0 CHECK (entries >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER daily_stats_updated_at BEFORE UPDATE ON daily_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Quotes and prompts
-- ---------------------------------------------------------------------------
CREATE TABLE quotes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    text            text        NOT NULL,
    author          text        NOT NULL,
    source          text,
    is_custom       boolean     NOT NULL DEFAULT false,
    is_favorite     boolean     NOT NULL DEFAULT false,
    is_active       boolean     NOT NULL DEFAULT true,
    show_in_editor  boolean     NOT NULL DEFAULT true,
    show_on_landing boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (text, author)
);
CREATE INDEX quotes_active_idx ON quotes (is_active, is_favorite);
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE prompts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    text          text        NOT NULL UNIQUE,
    category      text        NOT NULL DEFAULT 'reflection',
    is_custom     boolean     NOT NULL DEFAULT false,
    is_active     boolean     NOT NULL DEFAULT true,
    last_shown_on date,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prompts_rotation_idx ON prompts (is_active, last_shown_on NULLS FIRST);
CREATE TRIGGER prompts_updated_at BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Decision journal
-- verdict separates decision quality from outcome quality (process x outcome).
-- ---------------------------------------------------------------------------
CREATE TABLE decisions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title            text        NOT NULL,
    context          text,
    options          jsonb       NOT NULL DEFAULT '[]'::jsonb,
    choice           text,
    reasoning        text,
    expected_outcome text,
    confidence       smallint    CHECK (confidence BETWEEN 0 AND 100),
    review_on        date,
    actual_outcome   text,
    lessons          text,
    was_right        boolean,
    verdict          text CHECK (verdict IN ('good_process_good_outcome', 'good_process_bad_outcome',
                                             'bad_process_good_outcome', 'bad_process_bad_outcome')),
    status           text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
    reviewed_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX decisions_review_idx ON decisions (review_on) WHERE status = 'open';
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------
CREATE TABLE goals (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    metric       text        NOT NULL CHECK (metric IN ('words', 'entries', 'journal_days', 'minutes', 'streak_days')),
    target       integer     NOT NULL CHECK (target > 0),
    period_start date        NOT NULL,
    period_end   date        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CHECK (period_end >= period_start)
);
CREATE INDEX goals_period_idx ON goals (period_start, period_end);
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Site settings: exactly one row.
-- ---------------------------------------------------------------------------
CREATE TABLE site_settings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton  boolean     NOT NULL DEFAULT true UNIQUE CHECK (singleton),
    data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Media uploads (files live in UPLOAD_DIR)
-- ---------------------------------------------------------------------------
CREATE TABLE media (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name     text        NOT NULL UNIQUE,
    original_name text,
    path          text        NOT NULL,
    mime_type     text        NOT NULL,
    size_bytes    bigint      NOT NULL CHECK (size_bytes >= 0),
    width         integer,
    height        integer,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION set_updated_at();
