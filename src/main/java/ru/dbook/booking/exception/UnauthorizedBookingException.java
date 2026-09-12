package ru.dbook.booking.exception;

public class UnauthorizedBookingException extends RuntimeException {

    public UnauthorizedBookingException(String message) {
        super(message);
    }
}
