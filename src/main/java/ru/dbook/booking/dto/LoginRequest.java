package ru.dbook.booking.dto;

import ru.dbook.booking.validation.Utf8Size;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        String email,

        @NotBlank(message = "Password is required")
        @Utf8Size(max = 72, message = "Password must not exceed 72 UTF-8 bytes")
        String password
) {
}