package ru.dbook.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record BookRoomRequest(
        @NotNull(message = "Room id is required") Long roomId,
        @NotNull(message = "Start time is required") LocalDateTime startsAt,
        @NotNull(message = "End time is required") LocalDateTime endsAt
) {
}
