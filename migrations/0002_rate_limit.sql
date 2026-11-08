-- failed login / join attempts per key (e.g. "name:anna", "ip:1.2.3.4")
CREATE TABLE attempts (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
