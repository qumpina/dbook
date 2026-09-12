package ru.dbook.booking.dto;

import ru.dbook.booking.entity.Booking;

import java.time.Instant;
import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        Long roomId,
        String roomName,
        String userEmail,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        Instant createdAt
) {

    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getRoom().getId(),
                booking.getRoom().getName(),
                booking.getUser().getEmail(),
                booking.getStartsAt(),
                booking.getEndsAt(),
                booking.getCreatedAt()
        );
    }
}
