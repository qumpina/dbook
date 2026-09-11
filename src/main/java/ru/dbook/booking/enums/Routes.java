package ru.dbook.booking.enums;

public record Routes() {
    public static final String API = "/api/";
    public static final String V1 = "v1/";
    public static final String AUTH_BASE = API + V1 + "auth";
    public static final String ROOMS = API + V1 + "rooms";
    public static final String BOOKINGS = API + V1 + "bookings";
    public static final String LOGIN = AUTH_BASE + "/login";
    public static final String REGISTER = AUTH_BASE + "/register";
    public static final String LOGOUT = AUTH_BASE + "/logout";
    public static final String REFRESH = AUTH_BASE + "/refresh";
    public static final String ERROR = "/error";
    public static final String TEST = "/test";
}
