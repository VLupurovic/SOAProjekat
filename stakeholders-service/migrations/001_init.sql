CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('guide', 'tourist', 'admin')),
    first_name      VARCHAR(100) NOT NULL DEFAULT '',
    last_name       VARCHAR(100) NOT NULL DEFAULT '',
    profile_picture TEXT         NOT NULL DEFAULT '',
    bio             TEXT         NOT NULL DEFAULT '',
    motto           VARCHAR(255) NOT NULL DEFAULT '',
    is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS tourist_positions (
    user_id    BIGINT PRIMARY KEY REFERENCES users(id),
    latitude   DOUBLE PRECISION NOT NULL,
    longitude  DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),
    followed_id BIGINT NOT NULL REFERENCES users(id),
    PRIMARY KEY (follower_id, followed_id)
);