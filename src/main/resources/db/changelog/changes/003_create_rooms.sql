--liquibase formatted sql

--changeset qumpina:003_create_rooms
CREATE TABLE rooms (
                       id BIGSERIAL PRIMARY KEY,
                       name VARCHAR(100) NOT NULL UNIQUE,
                       description VARCHAR(1000) NOT NULL,
                       capacity INT NOT NULL,
                       active BOOLEAN NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO rooms (name, description, capacity, active, created_at) VALUES
    ('Deluxe Suite', 'Comfortable room with king-size bed and city view.', 2, true, NOW()),
    ('Conference Room', 'Large meeting room with a projector and whiteboard.', 12, true, NOW()),
    ('Garden Room', 'Cozy room overlooking the garden and terrace.', 3, true, NOW());