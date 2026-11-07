-- Manufaktur initial schema
CREATE TABLE villages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX players_village ON players(village_id);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_player ON sessions(player_id);

CREATE TABLE workshops (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  version INTEGER NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
