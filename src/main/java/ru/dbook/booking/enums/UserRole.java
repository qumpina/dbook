package ru.dbook.booking.enums;

public enum UserRole {
    ADMIN,
    TRAINER,
    USER;

    public boolean canBookRoom() {
        return this == ADMIN || this == TRAINER;
    }
}
