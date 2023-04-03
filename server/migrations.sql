CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    live_input TEXT,
    title TEXT,
    thumbnail TEXT
);
INSERT OR IGNORE INTO channels (id, live_input, title, thumbnail) VALUES ('me', NULL, NULL, NULL);
