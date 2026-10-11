package ru.dbook.booking.dto;

import ru.dbook.booking.entity.Room;

import java.time.Instant;

public record RoomResponse(
        Long id,
        String name,
        String description,
        Integer capacity,
        boolean active,
        Instant createdAt
) {

    public static RoomResponse from(Room room) {
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getDescription(),
                room.getCapacity(),
                room.isActive(),
                room.getCreatedAt()
        );
    }
}
