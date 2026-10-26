package ru.dbook.booking;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import ru.dbook.booking.entity.Room;
import ru.dbook.booking.entity.User;
import ru.dbook.booking.enums.UserRole;
import ru.dbook.booking.repository.BookingRepository;
import ru.dbook.booking.repository.RoomRepository;
import ru.dbook.booking.repository.UserRepository;
import ru.dbook.booking.service.JwtService;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BookingApiIntegrationTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired RoomRepository rooms;
    @Autowired BookingRepository bookings;
    @Autowired JwtService jwt;
    @MockitoBean Clock bookingClock;
    @Value("${security.jwt.secret}") String secret;

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();
    private final List<User> fixtures = new ArrayList<>();
    private Room room;
    private User trainer;

    @BeforeEach
    void prepare() {
        when(bookingClock.getZone()).thenReturn(ZoneId.of("Europe/Moscow"));
        when(bookingClock.instant()).thenReturn(Instant.parse("2030-01-05T09:00:00Z"));
        room = rooms.save(new Room("api-test-" + UUID.randomUUID(), "Integration fixture", 10, true));
        trainer = user(UserRole.TRAINER);
    }

    @AfterEach
    void cleanup() {
        rooms.deleteById(room.getId()); // FK cascade removes only bookings for this fixture.
        fixtures.forEach(user -> users.deleteById(user.getId()));
        fixtures.clear();
    }

    private User user(UserRole role) {
        User user = users.save(new User(UUID.randomUUID() + "@example.com", "unused", "Test", "Fixture", role));
        fixtures.add(user);
        return user;
    }

    private String day(int offset) {
        return LocalDate.now(bookingClock).plusDays(2 + offset).toString();
    }

    private String payload(String start, String end, int endDay) {
        return "{\"roomId\":" + room.getId() + ",\"startsAt\":\"" + day(0) + "T" + start
                + "\",\"endsAt\":\"" + day(endDay) + "T" + end + "\"}";
    }

    private HttpRequest request(String method, String path, String body, String token) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                .build();
    }

    private HttpResponse<String> send(String method, String path, String body, User user) throws Exception {
        return http.send(request(method, path, body, jwt.generateAccessToken(user)), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void methodSecurityReturnsForbiddenInsteadOfInternalServerError() throws Exception {
        assertEquals(403, send("GET", "/bookings", null, trainer).statusCode());
        assertEquals(403, send("POST", "/bookings", payload("09:00:00", "10:00:00", 0), user(UserRole.USER)).statusCode());
        assertEquals(200, send("GET", "/bookings", null, user(UserRole.ADMIN)).statusCode());
    }

    @ParameterizedTest
    @CsvSource({"07:45:00,08:45:00,0", "21:45:00,22:15:00,0", "21:00:00,08:00:00,1",
            "08:00:01,09:00:01,0", "08:00:00,09:00:00.000000001,0", "08:00:00,20:15:00,0", "08:00:00,08:14:00,0"})
    void rejectsInvalidWorkingHoursAndMisalignedBoundaries(String start, String end, int endDay) throws Exception {
        assertEquals(400, send("POST", "/bookings", payload(start, end, endDay), trainer).statusCode());
    }

    @ParameterizedTest
    @CsvSource({"08:00:00,20:00:00", "21:45:00,22:00:00"})
    void acceptsInclusiveWorkingHoursAndDurationLimits(String start, String end) throws Exception {
        assertEquals(201, send("POST", "/bookings", payload(start, end, 0), trainer).statusCode());
    }

    @Test
    void rejectsPastTimeInMoscowEvenWhenTheHostRunsInUtc() throws Exception {
        LocalDateTime start = LocalDateTime.now(bookingClock).withHour(11).withMinute(0).withSecond(0).withNano(0);
        String body = "{\"roomId\":" + room.getId() + ",\"startsAt\":\"" + start
                + "\",\"endsAt\":\"" + start.plusHours(1) + "\"}";
        assertEquals(400, send("POST", "/bookings", body, trainer).statusCode());
    }

    @Test
    void concurrentOverlapsCreateOnlyOneBooking() {
        String body = payload("10:00:00", "11:00:00", 0);
        String token = jwt.generateAccessToken(trainer);
        var first = http.sendAsync(request("POST", "/bookings", body, token), HttpResponse.BodyHandlers.ofString());
        var second = http.sendAsync(request("POST", "/bookings", body, token), HttpResponse.BodyHandlers.ofString());
        CompletableFuture.allOf(first, second).join();
        assertEquals(List.of(201, 409), List.of(first.join().statusCode(), second.join().statusCode()).stream().sorted().toList());
        assertEquals(1, bookings.findAllByUserIdOrderByStartsAtAsc(trainer.getId()).size());
    }

    @Test
    void onlyOwnerOrAdminCanCancelAndMissingBookingsReturnNotFound() throws Exception {
        var created = send("POST", "/bookings", payload("10:00:00", "11:00:00", 0), trainer);
        assertEquals(201, created.statusCode());
        long id = json.readTree(created.body()).get("id").asLong();
        assertEquals(403, send("DELETE", "/bookings/" + id, null, user(UserRole.TRAINER)).statusCode());
        assertTrue(bookings.findById(id).isPresent());
        assertEquals(204, send("DELETE", "/bookings/" + id, null, trainer).statusCode());
        assertEquals(404, send("DELETE", "/bookings/" + id, null, trainer).statusCode());
        created = send("POST", "/bookings", payload("10:00:00", "11:00:00", 0), trainer);
        id = json.readTree(created.body()).get("id").asLong();
        assertEquals(204, send("DELETE", "/bookings/" + id, null, user(UserRole.ADMIN)).statusCode());
    }

    @Test
    void trainerCannotSelectAnotherBookingOwnerButAdminCan() throws Exception {
        User target = user(UserRole.USER);
        String body = payload("10:00:00", "11:00:00", 0).replace("}", ",\"userId\":" + target.getId() + "}");
        assertEquals(403, send("POST", "/bookings", body, trainer).statusCode());
        assertEquals(201, send("POST", "/bookings", body, user(UserRole.ADMIN)).statusCode());
        assertEquals(1, bookings.findAllByUserIdOrderByStartsAtAsc(target.getId()).size());
    }

    @Test
    void expiredAndMalformedJwtReturnUnauthorizedAndValidJwtStillWorks() throws Exception {
        String expired = new JwtService(secret, -1).generateAccessToken(trainer);
        for (String token : List.of(expired, "not-a-jwt")) {
            var result = http.send(request("GET", "/rooms", null, token), HttpResponse.BodyHandlers.ofString());
            assertEquals(401, result.statusCode());
            assertEquals("Unauthorized", json.readTree(result.body()).get("message").asText());
        }
        assertEquals(200, send("GET", "/rooms", null, trainer).statusCode());
    }
    @ParameterizedTest
    @CsvSource({"a,73", "я,37"})
    void oversizedPasswordsReturnFieldValidationInsteadOfServerError(String character, int count) throws Exception {
        String password = character.repeat(count);
        String body = "{\"email\":\"review-" + UUID.randomUUID() + "@example.com\",\"password\":\""
                + password + "\",\"firstName\":\"Test\",\"lastName\":\"Fixture\"}";
        for (String path : List.of("/auth/register", "/auth/login")) {
            var result = http.send(request("POST", path, body, jwt.generateAccessToken(trainer)), HttpResponse.BodyHandlers.ofString());
            assertEquals(400, result.statusCode());
            assertEquals("Password must not exceed 72 UTF-8 bytes", json.readTree(result.body()).get("errors").get("password").asText());
        }
    }

    @Test
    void bcryptBoundaryAllowsUnicodeRegistrationAndLogin() throws Exception {
        String email = "review-" + UUID.randomUUID() + "@example.com";
        String body = "{\"email\":\"" + email + "\",\"password\":\"" + "я".repeat(36)
                + "\",\"firstName\":\"Test\",\"lastName\":\"Fixture\"}";
        var registered = http.send(request("POST", "/auth/register", body, jwt.generateAccessToken(trainer)), HttpResponse.BodyHandlers.ofString());
        users.findByEmail(email).ifPresent(fixtures::add);
        assertEquals(201, registered.statusCode());
        var loggedIn = http.send(request("POST", "/auth/login", body, jwt.generateAccessToken(trainer)), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, loggedIn.statusCode());
    }

}
