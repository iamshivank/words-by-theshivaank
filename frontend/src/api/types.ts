/**
 * API shapes, mirroring the backend's DTO records (see the Java `*Dtos` records and controllers).
 * Auth and public settings still come from the generated OpenAPI schema; the rest are written by hand
 * because the generator marks every record field optional, which would weaken strict typing here.
 * Fields the backend may send as null are typed `| null`.
 */
import type { components } from './schema';

type Schemas = components['schemas'];

export type Me = Schemas['Me'];
export type LoginRequest = Schemas['LoginRequest'];

// ---- Settings ---------------------------------------------------------------

export type SocialLink = { label: string; url: string };
export type Hero = { imageUrl?: string | null; overlayDarkness: number; grainIntensity: number };
export type Appearance = {
  theme: 'noir' | 'paper' | 'system';
  accentHue?: number | null;
  bodyFont: 'serif' | 'sans';
  baseFontSize: number;
};
export type LandingSectionId = 'hero' | 'flying' | 'latest' | 'about';
export type LandingSection = { id: LandingSectionId; enabled: boolean };
export type Preferences = {
  customCursor: boolean;
  grain: boolean;
  smoothScroll: boolean;
  flyingPosts: boolean;
  readingProgress: boolean;
  dropCap: boolean;
  tableOfContents: boolean;
  showReadCounts: boolean;
  showStreakOnLanding: boolean;
  rssFeed: boolean;
  editorQuotes: boolean;
  typewriterScrolling: boolean;
  dictation: boolean;
  dailyPrompt: boolean;
};
export type Writing = { dailyWordGoal: number; reminderText: string };

export type PublicSettings = {
  siteName: string;
  byline: string;
  tagline: string;
  displayName: string;
  about: string;
  social: SocialLink[];
  hero: Hero;
  appearance: Appearance;
  landing: { sections: LandingSection[] };
  preferences: Preferences;
};

export type SiteSettings = PublicSettings & { writing: Writing };

// ---- Entries ------------------------------------------------------------------

export type EntryType = 'essay' | 'journal' | 'note';
export type Visibility = 'private' | 'unlisted' | 'public';
export type Status = 'draft' | 'published';
export type TagView = { name: string; slug: string };
export type TagCount = TagView & { count: number };

export type EntrySummary = {
  id: string;
  type: EntryType;
  title: string;
  slug: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  visibility: Visibility;
  status: Status;
  entryDate: string | null;
  mood: number | null;
  wordCount: number;
  readingTimeMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagView[];
  highlightLabel: string | null;
  featured: boolean;
  viewCount: number;
};

export type JSONContent = { type?: string; content?: JSONContent[]; [key: string]: unknown };

export type EntryDetail = EntrySummary & {
  energy: number | null;
  gratitude: string | null;
  lessons: string | null;
  contentJson: JSONContent;
  contentHtml: string;
};

export type EntryInput = {
  type: EntryType;
  title?: string;
  slug?: string | null;
  contentJson?: JSONContent;
  contentHtml?: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  visibility?: Visibility;
  status?: Status;
  entryDate?: string | null;
  mood?: number | null;
  energy?: number | null;
  gratitude?: string | null;
  lessons?: string | null;
  tags?: string[];
  highlightLabel?: string | null;
  featured?: boolean;
};

export type BulkActionName =
  'publish' | 'unpublish' | 'make-public' | 'make-private' | 'feature' | 'unfeature' | 'delete';

export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type PublicEntrySummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string;
  readingTimeMinutes: number;
  wordCount: number;
  tags: TagView[];
  highlightLabel: string | null;
  featured: boolean;
  viewCount: number;
  label: string;
};

export type Neighbor = { slug: string; title: string };

export type PublicEntry = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  wordCount: number;
  tags: TagView[];
  highlightLabel: string | null;
  viewCount: number;
  contentHtml: string;
  previous: Neighbor | null;
  next: Neighbor | null;
};

export type ArchiveYear = { year: number; entries: PublicEntrySummary[] };
export type PublicStats = { published: number; words: number; since: string | null };

export type SearchHit = {
  id: string;
  type: EntryType;
  title: string;
  slug: string | null;
  status: Status;
  visibility: Visibility;
  entryDate: string | null;
  updatedAt: string;
  snippet: string | null;
};

// ---- Stats ------------------------------------------------------------------

export type Day = {
  date: string;
  words: number;
  minutes: number;
  entries: number;
  mood: number | null;
};
export type Streak = { current: number; longest: number; writtenToday: boolean };
export type Totals = {
  words: number;
  entries: number;
  essays: number;
  journals: number;
  notes: number;
  published: number;
};
export type Overview = {
  today: Day;
  streak: Streak;
  dailyWordGoal: number;
  week: Day[];
  totals: Totals;
};
export type MonthStats = {
  month: string;
  days: Day[];
  words: number;
  minutes: number;
  entries: number;
  activeDays: number;
  averageMood: number | null;
  streak: Streak;
  bestDay: Day | null;
  decisionsLogged: number;
  decisionsReviewed: number;
  topTags: { name: string; count: number }[];
};

// ---- Quotes and prompts -----------------------------------------------------

export type Quote = {
  id: string;
  text: string;
  author: string;
  source: string | null;
  custom: boolean;
  favorite: boolean;
  active: boolean;
  showInEditor: boolean;
  showOnLanding: boolean;
};
export type QuoteInput = Omit<Quote, 'id' | 'custom'>;
export type PublicQuote = { text: string; author: string; source: string | null };

export type Prompt = {
  id: string;
  text: string;
  category: string;
  custom: boolean;
  active: boolean;
  lastShownOn: string | null;
};
export type PromptInput = { text: string; category?: string; active?: boolean };

// ---- Decisions and goals ----------------------------------------------------

export type Verdict =
  | 'good_process_good_outcome'
  | 'good_process_bad_outcome'
  | 'bad_process_good_outcome'
  | 'bad_process_bad_outcome';

export type Decision = {
  id: string;
  title: string;
  context: string | null;
  options: string[];
  choice: string | null;
  reasoning: string | null;
  expectedOutcome: string | null;
  confidence: number | null;
  reviewOn: string | null;
  actualOutcome: string | null;
  lessons: string | null;
  wasRight: boolean | null;
  verdict: Verdict | null;
  status: 'open' | 'reviewed';
  reviewedAt: string | null;
  createdAt: string;
};
export type DecisionInput = {
  title: string;
  context?: string | null;
  options?: string[];
  choice?: string | null;
  reasoning?: string | null;
  expectedOutcome?: string | null;
  confidence?: number | null;
  reviewOn?: string | null;
};
export type ReviewInput = {
  actualOutcome?: string | null;
  lessons?: string | null;
  wasRight: boolean;
  verdict?: Verdict | null;
};
export type CalibrationBucket = {
  from: number;
  to: number;
  count: number;
  right: number;
  rate: number | null;
};
export type Calibration = {
  buckets: CalibrationBucket[];
  reviewed: number;
  brierScore: number | null;
};

export type GoalMetric = 'words' | 'entries' | 'journal_days' | 'minutes' | 'streak_days';
export type Goal = {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  periodStart: string;
  periodEnd: string;
  progress: number;
  active: boolean;
};
export type GoalInput = Omit<Goal, 'id' | 'progress' | 'active'>;

// ---- Account, admin, media --------------------------------------------------

export type Account = {
  email: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  sessionDays: number;
};

export type AdminOverview = {
  counts: {
    essays: number;
    journals: number;
    notes: number;
    published: number;
    drafts: number;
    publicEntries: number;
    privateEntries: number;
    words: number;
    reads: number;
    tags: number;
    quotes: number;
    customQuotes: number;
    prompts: number;
    decisionsOpen: number;
    decisionsReviewed: number;
    goals: number;
    media: number;
    mediaBytes: number;
    sessions: number;
  };
  topEssays: { slug: string; title: string; views: number; publishedAt: string }[];
  lastLoginAt: string | null;
  lastWriteAt: string | null;
  system: {
    version: string;
    javaVersion: string;
    uptimeSeconds: number;
    databaseSize: string;
    databaseVersion: string;
  };
};

export type MediaItem = {
  id: string;
  url: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ImportResult = { imported: number; skipped: number; errors: string[] };
