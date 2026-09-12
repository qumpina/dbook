package ru.dbook.booking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRoomRequest(
        @NotBlank(message = "Room name is required") String name,
        @NotBlank(message = "Room description is required") String description,
        @NotNull(message = "Capacity is required") @Min(value = 1, message = "Capacity must be at least 1") Integer capacity,
        boolean active
) {
}
