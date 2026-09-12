--liquibase formatted sql

--changeset qumpina:004_create_bookings
CREATE TABLE bookings (
                          id BIGSERIAL PRIMARY KEY,
                          room_id BIGINT NOT NULL,
                          user_id BIGINT NOT NULL,
                          starts_at TIMESTAMP NOT NULL,
                          ends_at TIMESTAMP NOT NULL,
                          created_at TIMESTAMPTZ NOT NULL,
                          CONSTRAINT fk_bookings_room
                              FOREIGN KEY (room_id) REFERENCES rooms(id)
                                  ON DELETE CASCADE,
                          CONSTRAINT fk_bookings_user
                              FOREIGN KEY (user_id) REFERENCES users(id)
                                  ON DELETE CASCADE
);

CREATE INDEX idx_bookings_room_starts_ends
    ON bookings (room_id, starts_at, ends_at);
