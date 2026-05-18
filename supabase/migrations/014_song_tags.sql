-- Migration 014: song categorization tags
--
-- Adds a flat `tags text[]` column to songs. Each tag is a lowercase
-- kebab-case slug; a single song can carry tags from multiple axes:
--
--   GENRE      bhajan, classical-stotra, vedic-chant, metal-fusion,
--              vedic-metal, progressive-rock, meditative-chant, daily-prayer
--   TRADITION  vedic, upanishadic, puranic, bhakti, advaita-vedanta,
--              contemporary
--   DEITY      shiva, vishnu, hanuman, agni, devi, ganesha, multi-deity
--   THEME      om, turiya, brahman, liberation, sacred-sound, mahavakya
--   SOURCE     rigveda, isha-upanishad, mandukya-upanishad, ramcaritmanas,
--              bhagavad-gita, ashtavakra-gita
--   AUTHOR     tulsidas, adi-shankara, swami-brahmananda
--
-- The frontend Library page reads the distinct set of tags across all
-- verified songs at runtime and renders them as multi-select filter
-- chips — so adding a new tag is just inserting it on a song row;
-- the UI updates automatically.

alter table songs
  add column if not exists tags text[] not null default '{}';

-- GIN index for "songs containing any/all of these tags" filtering.
-- Postgres can answer `tags && ARRAY[…]::text[]` (overlap) in O(log n) with this.
create index if not exists songs_tags_idx
  on songs using gin (tags);

-- Reload PostgREST so the new column is visible immediately.
notify pgrst, 'reload schema';
