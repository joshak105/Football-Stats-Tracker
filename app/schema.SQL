-- ============================================================
-- FOOTBALL STATS TRACKER — PostgreSQL Database Schema
-- ============================================================
-- Recommended: PostgreSQL 15+
-- Run with: psql -U <user> -d <dbname> -f schema.sql
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram indexing for fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";        -- Accent-insensitive search (e.g. "Munez" → "Muñez")


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE match_status AS ENUM (
    'scheduled',
    'live',
    'half_time',
    'finished',
    'postponed',
    'cancelled',
    'abandoned'
);

CREATE TYPE player_position AS ENUM (
    'goalkeeper',
    'defender',
    'midfielder',
    'forward'
);

CREATE TYPE event_type AS ENUM (
    'goal',
    'own_goal',
    'penalty_scored',
    'penalty_missed',
    'yellow_card',
    'red_card',
    'yellow_red_card',   -- Second yellow
    'substitution_in',
    'substitution_out',
    'var_decision'
);

CREATE TYPE standing_group AS ENUM (
    'overall',
    'home',
    'away'
);


-- ============================================================
-- COUNTRIES
-- ============================================================

CREATE TABLE countries (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        CHAR(3) NOT NULL UNIQUE,     -- ISO 3166-1 alpha-3 (e.g. ENG, ESP, DEU)
    flag_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON countries(code);


-- ============================================================
-- COMPETITIONS (Leagues, Cups, Tournaments)
-- ============================================================

CREATE TABLE competitions (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,              -- ID from your data provider (e.g. API-Football)
    name            VARCHAR(150) NOT NULL,
    short_name      VARCHAR(50),                 -- e.g. "PL", "UCL"
    country_id      INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    type            VARCHAR(30) NOT NULL DEFAULT 'league',  -- 'league', 'cup', 'tournament'
    logo_url        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitions_country ON competitions(country_id);
CREATE INDEX idx_competitions_active  ON competitions(is_active);


-- ============================================================
-- SEASONS
-- ============================================================

CREATE TABLE seasons (
    id              SERIAL PRIMARY KEY,
    competition_id  INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    external_id     INTEGER,
    label           VARCHAR(20) NOT NULL,        -- e.g. "2024/25"
    year_start      SMALLINT NOT NULL,
    year_end        SMALLINT NOT NULL,
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(competition_id, label)
);

-- Only one current season per competition (enforced with partial unique index)
CREATE UNIQUE INDEX idx_seasons_one_current_per_comp
    ON seasons(competition_id)
    WHERE is_current = TRUE;

CREATE INDEX idx_seasons_competition ON seasons(competition_id);


-- ============================================================
-- STADIUMS / VENUES
-- ============================================================

CREATE TABLE venues (
    id          SERIAL PRIMARY KEY,
    external_id INTEGER UNIQUE,
    name        VARCHAR(150) NOT NULL,
    city        VARCHAR(100),
    country_id  INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    capacity    INTEGER,
    latitude    NUMERIC(9, 6),
    longitude   NUMERIC(9, 6),
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE teams (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,
    name            VARCHAR(150) NOT NULL,
    short_name      VARCHAR(50),                 -- e.g. "Man City"
    tla             CHAR(3),                     -- Three-Letter Abbreviation e.g. "MCI"
    country_id      INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    venue_id        INTEGER REFERENCES venues(id) ON DELETE SET NULL,
    logo_url        TEXT,
    founded_year    SMALLINT,
    website         TEXT,
    is_national     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_country  ON teams(country_id);
CREATE INDEX idx_teams_tla      ON teams(tla);

-- Full-text search vector for team name
ALTER TABLE teams ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(short_name, '') || ' ' || coalesce(tla, ''))) STORED;

CREATE INDEX idx_teams_search ON teams USING GIN(search_vector);


-- ============================================================
-- COMPETITION ↔ TEAM (many-to-many via season)
-- ============================================================

CREATE TABLE season_teams (
    season_id   INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (season_id, team_id)
);


-- ============================================================
-- PLAYERS
-- ============================================================

CREATE TABLE players (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,
    name            VARCHAR(150) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    date_of_birth   DATE,
    nationality_id  INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    position        player_position,
    shirt_number    SMALLINT,
    height_cm       SMALLINT,
    weight_kg       SMALLINT,
    photo_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_nationality ON players(nationality_id);
CREATE INDEX idx_players_active      ON players(is_active);

-- Full-text search vector for player name
ALTER TABLE players ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED;

CREATE INDEX idx_players_search ON players USING GIN(search_vector);

-- Trigram index for fuzzy matching (handles typos)
CREATE INDEX idx_players_name_trgm ON players USING GIN(name gin_trgm_ops);


-- ============================================================
-- PLAYER ↔ TEAM (transfers / squad history)
-- ============================================================

CREATE TABLE player_teams (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    shirt_number    SMALLINT,
    joined_date     DATE,
    left_date       DATE,                        -- NULL means still at the club
    is_loan         BOOLEAN NOT NULL DEFAULT FALSE,
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT no_overlap_current
        UNIQUE NULLS NOT DISTINCT (player_id, is_current)  -- Only one current team per player
);

CREATE INDEX idx_player_teams_player ON player_teams(player_id);
CREATE INDEX idx_player_teams_team   ON player_teams(team_id);
CREATE INDEX idx_player_teams_current ON player_teams(player_id) WHERE is_current = TRUE;


-- ============================================================
-- MATCHES
-- ============================================================

CREATE TABLE matches (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,
    season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    home_team_id    INTEGER NOT NULL REFERENCES teams(id),
    away_team_id    INTEGER NOT NULL REFERENCES teams(id),
    venue_id        INTEGER REFERENCES venues(id) ON DELETE SET NULL,
    kickoff_at      TIMESTAMPTZ NOT NULL,
    status          match_status NOT NULL DEFAULT 'scheduled',
    matchweek       SMALLINT,
    home_score      SMALLINT,
    away_score      SMALLINT,
    home_score_ht   SMALLINT,                    -- Half-time score
    away_score_ht   SMALLINT,
    home_score_et   SMALLINT,                    -- Extra-time score
    away_score_et   SMALLINT,
    home_score_pen  SMALLINT,                    -- Penalty shootout score
    away_score_pen  SMALLINT,
    attendance      INTEGER,
    referee         VARCHAR(100),
    minute          SMALLINT,                    -- Current minute (for live matches)
    raw_api_payload JSONB,                       -- Store the raw API response for re-processing
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT different_teams CHECK (home_team_id <> away_team_id)
);

CREATE INDEX idx_matches_season     ON matches(season_id);
CREATE INDEX idx_matches_home_team  ON matches(home_team_id);
CREATE INDEX idx_matches_away_team  ON matches(away_team_id);
CREATE INDEX idx_matches_kickoff    ON matches(kickoff_at);
CREATE INDEX idx_matches_status     ON matches(status);
CREATE INDEX idx_matches_live       ON matches(status) WHERE status = 'live';


-- ============================================================
-- MATCH TEAM STATS (one row per team per match)
-- ============================================================

CREATE TABLE match_team_stats (
    id                      SERIAL PRIMARY KEY,
    match_id                INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id                 INTEGER NOT NULL REFERENCES teams(id),

    -- Possession & Passing
    possession_pct          NUMERIC(4,1),        -- e.g. 62.5
    passes                  SMALLINT,
    passes_accurate         SMALLINT,
    pass_accuracy_pct       NUMERIC(4,1),
    passes_progressive      SMALLINT,
    passes_into_final_third SMALLINT,

    -- Shooting
    shots                   SMALLINT,
    shots_on_target         SMALLINT,
    shots_off_target        SMALLINT,
    shots_blocked           SMALLINT,
    xg                      NUMERIC(5,2),        -- Expected goals
    xg_on_target            NUMERIC(5,2),        -- Post-shot xG

    -- Defending
    tackles                 SMALLINT,
    tackles_won             SMALLINT,
    interceptions           SMALLINT,
    blocks                  SMALLINT,
    clearances              SMALLINT,
    errors_leading_to_shot  SMALLINT,

    -- Duels
    duels_total             SMALLINT,
    duels_won               SMALLINT,
    aerial_duels_won        SMALLINT,

    -- Set Pieces & Discipline
    corners                 SMALLINT,
    fouls_committed         SMALLINT,
    fouls_drawn             SMALLINT,
    offsides                SMALLINT,
    yellow_cards            SMALLINT,
    red_cards               SMALLINT,

    -- Goalkeeping (for this team's keeper aggregate)
    saves                   SMALLINT,
    save_pct                NUMERIC(4,1),

    -- Pressure
    pressures               SMALLINT,
    pressure_success_rate   NUMERIC(4,1),

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(match_id, team_id)
);

CREATE INDEX idx_mts_match  ON match_team_stats(match_id);
CREATE INDEX idx_mts_team   ON match_team_stats(team_id);


-- ============================================================
-- MATCH EVENTS (goals, cards, subs — the timeline)
-- ============================================================

CREATE TABLE match_events (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,
    match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    player_id       INTEGER REFERENCES players(id) ON DELETE SET NULL,
    related_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,  -- Assist or player off (for sub)
    event_type      event_type NOT NULL,
    minute          SMALLINT NOT NULL,
    extra_minute    SMALLINT,                    -- Stoppage time e.g. 90+4
    detail          VARCHAR(100),               -- e.g. "Header", "Left foot", "Direct free kick"
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_match   ON match_events(match_id);
CREATE INDEX idx_events_player  ON match_events(player_id);
CREATE INDEX idx_events_type    ON match_events(event_type);


-- ============================================================
-- LINEUPS
-- ============================================================

CREATE TABLE match_lineups (
    id              SERIAL PRIMARY KEY,
    match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    player_id       INTEGER NOT NULL REFERENCES players(id),
    shirt_number    SMALLINT,
    position        player_position,
    grid_position   VARCHAR(10),                 -- e.g. "4:3" for pitch grid coords
    is_starter      BOOLEAN NOT NULL DEFAULT TRUE,
    is_captain      BOOLEAN NOT NULL DEFAULT FALSE,
    subbed_in_minute  SMALLINT,
    subbed_out_minute SMALLINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(match_id, team_id, player_id)
);

CREATE INDEX idx_lineups_match  ON match_lineups(match_id);
CREATE INDEX idx_lineups_player ON match_lineups(player_id);


-- ============================================================
-- PLAYER MATCH STATS
-- ============================================================

CREATE TABLE player_match_stats (
    id                      SERIAL PRIMARY KEY,
    match_id                INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id               INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id                 INTEGER NOT NULL REFERENCES teams(id),

    -- Time
    minutes_played          SMALLINT NOT NULL DEFAULT 0,
    is_starter              BOOLEAN NOT NULL DEFAULT FALSE,

    -- Attack
    goals                   SMALLINT NOT NULL DEFAULT 0,
    assists                 SMALLINT NOT NULL DEFAULT 0,
    shots                   SMALLINT NOT NULL DEFAULT 0,
    shots_on_target         SMALLINT NOT NULL DEFAULT 0,
    xg                      NUMERIC(4,2),
    xa                      NUMERIC(4,2),        -- Expected assists
    key_passes              SMALLINT,
    big_chances_created     SMALLINT,
    big_chances_missed      SMALLINT,

    -- Passing
    passes                  SMALLINT,
    passes_accurate         SMALLINT,
    pass_accuracy_pct       NUMERIC(4,1),
    passes_progressive      SMALLINT,
    crosses                 SMALLINT,
    crosses_accurate        SMALLINT,
    long_balls              SMALLINT,
    long_balls_accurate     SMALLINT,
    through_balls           SMALLINT,

    -- Dribbling
    dribbles_attempted      SMALLINT,
    dribbles_succeeded      SMALLINT,

    -- Defending
    tackles                 SMALLINT,
    tackles_won             SMALLINT,
    interceptions           SMALLINT,
    blocks                  SMALLINT,
    clearances              SMALLINT,
    duels_total             SMALLINT,
    duels_won               SMALLINT,
    aerial_duels_won        SMALLINT,
    recoveries              SMALLINT,

    -- Discipline
    fouls_committed         SMALLINT NOT NULL DEFAULT 0,
    fouls_drawn             SMALLINT NOT NULL DEFAULT 0,
    yellow_cards            SMALLINT NOT NULL DEFAULT 0,
    red_cards               SMALLINT NOT NULL DEFAULT 0,
    offsides                SMALLINT NOT NULL DEFAULT 0,

    -- Goalkeeping (NULL for outfield players)
    saves                   SMALLINT,
    goals_conceded          SMALLINT,
    clean_sheet             BOOLEAN,
    punches                 SMALLINT,
    high_claims             SMALLINT,
    xg_faced                NUMERIC(4,2),        -- xG faced by keeper

    -- Rating
    rating                  NUMERIC(3,1),        -- e.g. 7.4 out of 10

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(match_id, player_id)
);

CREATE INDEX idx_pms_match  ON player_match_stats(match_id);
CREATE INDEX idx_pms_player ON player_match_stats(player_id);
CREATE INDEX idx_pms_team   ON player_match_stats(team_id);


-- ============================================================
-- STANDINGS (pre-computed, updated after each match)
-- ============================================================

CREATE TABLE standings (
    id              SERIAL PRIMARY KEY,
    season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    group_type      standing_group NOT NULL DEFAULT 'overall',
    position        SMALLINT NOT NULL,
    played          SMALLINT NOT NULL DEFAULT 0,
    won             SMALLINT NOT NULL DEFAULT 0,
    drawn           SMALLINT NOT NULL DEFAULT 0,
    lost            SMALLINT NOT NULL DEFAULT 0,
    goals_for       SMALLINT NOT NULL DEFAULT 0,
    goals_against   SMALLINT NOT NULL DEFAULT 0,
    goal_difference SMALLINT GENERATED ALWAYS AS (goals_for - goals_against) STORED,
    points          SMALLINT NOT NULL DEFAULT 0,
    -- Last 5 matches form string e.g. "WDWLW"
    form            CHAR(5),
    -- Points per game
    ppg             NUMERIC(4,2) GENERATED ALWAYS AS (
                        CASE WHEN played = 0 THEN 0
                        ELSE ROUND(points::NUMERIC / played, 2) END
                    ) STORED,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(season_id, team_id, group_type)
);

CREATE INDEX idx_standings_season   ON standings(season_id);
CREATE INDEX idx_standings_team     ON standings(team_id);
CREATE INDEX idx_standings_position ON standings(season_id, group_type, position);


-- ============================================================
-- PLAYER SEASON STATS (aggregated, updated after each match)
-- ============================================================

CREATE TABLE player_season_stats (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season_id           INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id             INTEGER NOT NULL REFERENCES teams(id),

    -- Appearances
    appearances         SMALLINT NOT NULL DEFAULT 0,
    starts              SMALLINT NOT NULL DEFAULT 0,
    minutes_played      INTEGER NOT NULL DEFAULT 0,

    -- Attack
    goals               SMALLINT NOT NULL DEFAULT 0,
    assists             SMALLINT NOT NULL DEFAULT 0,
    shots               SMALLINT NOT NULL DEFAULT 0,
    shots_on_target     SMALLINT NOT NULL DEFAULT 0,
    xg                  NUMERIC(6,2) NOT NULL DEFAULT 0,
    xa                  NUMERIC(6,2) NOT NULL DEFAULT 0,
    key_passes          SMALLINT NOT NULL DEFAULT 0,
    big_chances_created SMALLINT NOT NULL DEFAULT 0,

    -- Passing
    passes              INTEGER NOT NULL DEFAULT 0,
    passes_accurate     INTEGER NOT NULL DEFAULT 0,

    -- Defending
    tackles             SMALLINT NOT NULL DEFAULT 0,
    tackles_won         SMALLINT NOT NULL DEFAULT 0,
    interceptions       SMALLINT NOT NULL DEFAULT 0,
    clearances          SMALLINT NOT NULL DEFAULT 0,
    aerial_duels_won    SMALLINT NOT NULL DEFAULT 0,

    -- Discipline
    yellow_cards        SMALLINT NOT NULL DEFAULT 0,
    red_cards           SMALLINT NOT NULL DEFAULT 0,
    fouls_committed     SMALLINT NOT NULL DEFAULT 0,

    -- Goalkeeping
    saves               SMALLINT,
    clean_sheets        SMALLINT,
    goals_conceded      SMALLINT,
    xg_faced            NUMERIC(6,2),

    -- Rating
    avg_rating          NUMERIC(3,1),

    -- Per-90 computed columns
    goals_per90         NUMERIC(5,2) GENERATED ALWAYS AS (
                            CASE WHEN minutes_played = 0 THEN 0
                            ELSE ROUND((goals::NUMERIC / minutes_played) * 90, 2) END
                        ) STORED,
    assists_per90       NUMERIC(5,2) GENERATED ALWAYS AS (
                            CASE WHEN minutes_played = 0 THEN 0
                            ELSE ROUND((assists::NUMERIC / minutes_played) * 90, 2) END
                        ) STORED,
    xg_per90            NUMERIC(5,2) GENERATED ALWAYS AS (
                            CASE WHEN minutes_played = 0 THEN 0
                            ELSE ROUND((xg / minutes_played) * 90, 2) END
                        ) STORED,

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(player_id, season_id, team_id)
);

CREATE INDEX idx_pss_player     ON player_season_stats(player_id);
CREATE INDEX idx_pss_season     ON player_season_stats(season_id);
CREATE INDEX idx_pss_team       ON player_season_stats(team_id);
CREATE INDEX idx_pss_goals      ON player_season_stats(season_id, goals DESC);   -- Fast top scorer queries


-- ============================================================
-- BOOKMARKS / USER FAVOURITES
-- (For when you add user authentication)
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_favourites (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL,    -- 'team', 'player', 'competition'
    entity_id   INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_favourites_user ON user_favourites(user_id);


-- ============================================================
-- SYNC / DATA INGESTION LOG
-- ============================================================

CREATE TABLE sync_log (
    id              SERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,        -- 'matches', 'standings', 'player_stats'
    entity_id       INTEGER,                     -- e.g. match_id or season_id being synced
    status          VARCHAR(20) NOT NULL,        -- 'success', 'error', 'partial'
    records_fetched INTEGER,
    records_updated INTEGER,
    error_message   TEXT,
    duration_ms     INTEGER,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX idx_sync_log_time   ON sync_log(synced_at DESC);


-- ============================================================
-- TRIGGERS — auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_competitions_updated_at  BEFORE UPDATE ON competitions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated_at         BEFORE UPDATE ON teams         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_players_updated_at       BEFORE UPDATE ON players       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated_at       BEFORE UPDATE ON matches       FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Current season standings with team info
CREATE VIEW v_current_standings AS
SELECT
    s.position,
    t.name AS team,
    t.logo_url,
    t.tla,
    s.played,
    s.won,
    s.drawn,
    s.lost,
    s.goals_for,
    s.goals_against,
    s.goal_difference,
    s.points,
    s.form,
    s.ppg,
    se.label AS season,
    c.name AS competition
FROM standings s
JOIN teams t         ON t.id = s.team_id
JOIN seasons se      ON se.id = s.season_id
JOIN competitions c  ON c.id = se.competition_id
WHERE se.is_current = TRUE
  AND s.group_type = 'overall'
ORDER BY c.name, s.position;


-- Top scorers across current season
CREATE VIEW v_top_scorers AS
SELECT
    p.id AS player_id,
    p.name AS player,
    p.photo_url,
    p.position,
    t.name AS team,
    t.logo_url AS team_logo,
    pss.goals,
    pss.assists,
    pss.xg,
    pss.minutes_played,
    pss.goals_per90,
    pss.appearances,
    se.label AS season,
    c.name AS competition
FROM player_season_stats pss
JOIN players p       ON p.id = pss.player_id
JOIN teams t         ON t.id = pss.team_id
JOIN seasons se      ON se.id = pss.season_id
JOIN competitions c  ON c.id = se.competition_id
WHERE se.is_current = TRUE
ORDER BY pss.goals DESC, pss.xg DESC;


-- Upcoming and live matches
CREATE VIEW v_live_and_upcoming AS
SELECT
    m.id,
    m.kickoff_at,
    m.status,
    m.minute,
    m.home_score,
    m.away_score,
    m.home_score_ht,
    m.away_score_ht,
    m.matchweek,
    ht.name AS home_team,
    ht.logo_url AS home_logo,
    ht.tla AS home_tla,
    at.name AS away_team,
    at.logo_url AS away_logo,
    at.tla AS away_tla,
    v.name AS venue,
    se.label AS season,
    c.name AS competition, 
    c.logo_url AS competition_logo 
FROM matches m
JOIN teams ht        ON ht.id = m.home_team_id
JOIN teams at_team   ON at_team.id = m.away_team_id  -- alias to avoid reserved keyword
JOIN teams at        ON at.id = m.away_team_id
JOIN seasons se      ON se.id = m.season_id
JOIN competitions c  ON c.id = se.competition_id
LEFT JOIN venues v   ON v.id = m.venue_id
WHERE m.status IN ('scheduled', 'live', 'half_time')
  AND m.kickoff_at >= NOW() - INTERVAL '3 hours'
ORDER BY m.kickoff_at ASC;
