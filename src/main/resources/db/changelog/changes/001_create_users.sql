--liquibase formatted sql

--changeset qumpina:001_create_users
CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password VARCHAR(100) NOT NULL,
                       first_name VARCHAR(255) NOT NULL,
                       last_name VARCHAR(255) NOT NULL,
                       role VARCHAR(20) NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL
);

--changeset qumpina:001_seed_users
INSERT INTO users (email, password, first_name, last_name, role, created_at)
VALUES
    (
        'admin@booking.local',
        '$2a$10$tQcVDn5Np4u2A59P0GR/TurXlvqQtBjMk1ZY0Gtk8ysyKw0P25g5u',
        'System',
        'Admin',
        'ADMIN',
        NOW()
    ),
    (
        'trainer@booking.local',
        '$2a$10$72FfmsiGlWjJvZ3lVMGesODa/amehl4Ln95enRW/U5osf8gciADtK',
        'Main',
        'Trainer',
        'TRAINER',
        NOW()
    ),
    (
        'user1@booking.local',
        '$2a$10$72FfmsiGlWjJvZ3lVMGesODa/amehl4Ln95enRW/U5osf8gciADtK',
        'Regular',
        'UserOne',
        'USER',
        NOW()
    ),
    (
        'user2@booking.local',
        '$2a$10$tQcVDn5Np4u2A59P0GR/TurXlvqQtBjMk1ZY0Gtk8ysyKw0P25g5u',
        'Regular',
        'UserTwo',
        'USER',
        NOW()
    );