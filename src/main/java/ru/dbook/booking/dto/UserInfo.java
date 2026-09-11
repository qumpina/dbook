package ru.dbook.booking.dto;

import ru.dbook.booking.entity.User;
import ru.dbook.booking.enums.UserRole;

public record UserInfo(
        Long id,
        String email,
        String firstName,
        String lastName,
        UserRole role
) {

    public static UserInfo from(User user) {
        return new UserInfo(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole()
        );
    }
}