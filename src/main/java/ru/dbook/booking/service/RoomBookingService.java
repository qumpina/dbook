package ru.dbook.booking.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.dbook.booking.dto.BookRoomRequest;
import ru.dbook.booking.dto.BookingResponse;
import ru.dbook.booking.dto.CreateRoomRequest;
import ru.dbook.booking.dto.RoomResponse;
import ru.dbook.booking.entity.Booking;
import ru.dbook.booking.entity.Room;
import ru.dbook.booking.entity.User;
import ru.dbook.booking.exception.BookingConflictException;
import ru.dbook.booking.exception.InvalidBookingTimeException;
import ru.dbook.booking.exception.RoomAlreadyExistsException;
import ru.dbook.booking.exception.RoomNotFoundException;
import ru.dbook.booking.exception.UnauthorizedBookingException;
import ru.dbook.booking.repository.BookingRepository;
import ru.dbook.booking.repository.RoomRepository;
import ru.dbook.booking.repository.UserRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class RoomBookingService {

    private static final int BOOKING_STEP_MINUTES = 15;
    private static final int MIN_BOOKING_DURATION_MINUTES = 15;
    private static final int MAX_BOOKING_DURATION_MINUTES = 12 * 60;
    private static final String ROOM_NOT_FOUND_MESSAGE = "Room not found";
    private static final String ROOM_INACTIVE_MESSAGE = "Room is not active";
    private static final String ROOM_BOOKING_FORBIDDEN_MESSAGE = "Only admins and trainers can book rooms";
    private static final String ROOM_BOOKING_CONFLICT_MESSAGE = "Room is already booked for the selected time";
    private static final String ROOM_DUPLICATE_NAME_MESSAGE = "Room with this name already exists";
    private static final String USER_NOT_AUTHENTICATED_MESSAGE = "User is not authenticated";
    private static final String INVALID_DURATION_MESSAGE = "Booking duration must be at least 15 minutes and aligned to 15-minute intervals";
    private static final String INVALID_TIME_MESSAGE = "Booking time must be in the future and end after start";

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public RoomBookingService(
            RoomRepository roomRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository
    ) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        if (roomRepository.existsByNameIgnoreCase(request.name())) {
            throw new RoomAlreadyExistsException(ROOM_DUPLICATE_NAME_MESSAGE);
        }

        Room room = new Room(
                request.name().trim(),
                request.description().trim(),
                request.capacity(),
                request.active()
        );

        Room savedRoom = roomRepository.save(room);
        return RoomResponse.from(savedRoom);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAllByActiveTrueOrderByNameAsc()
                .stream()
                .map(RoomResponse::from)
                .toList();
    }

    @Transactional
    public BookingResponse bookRoom(BookRoomRequest request) {
        User user = getCurrentUser();

        if (!user.getRole().canBookRoom()) {
            throw new UnauthorizedBookingException(ROOM_BOOKING_FORBIDDEN_MESSAGE);
        }

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new RoomNotFoundException(ROOM_NOT_FOUND_MESSAGE));

        if (!room.isActive()) {
            throw new InvalidBookingTimeException(ROOM_INACTIVE_MESSAGE);
        }

        validateBookingTime(request.startsAt(), request.endsAt());

        boolean isConflict = bookingRepository.existsOverlappingBooking(
                room.getId(),
                request.startsAt(),
                request.endsAt()
        );

        if (isConflict) {
            throw new BookingConflictException(ROOM_BOOKING_CONFLICT_MESSAGE);
        }

        Booking booking = new Booking(room, user, request.startsAt(), request.endsAt());
        Booking savedBooking = bookingRepository.save(booking);

        return BookingResponse.from(savedBooking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings() {
        User user = getCurrentUser();
        return bookingRepository.findAllByUserIdOrderByStartsAtAsc(user.getId())
                .stream()
                .map(BookingResponse::from)
                .toList();
    }

    private void validateBookingTime(LocalDateTime startsAt, LocalDateTime endsAt) {
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw new InvalidBookingTimeException(INVALID_TIME_MESSAGE);
        }

        if (startsAt.isBefore(LocalDateTime.now())) {
            throw new InvalidBookingTimeException(INVALID_TIME_MESSAGE);
        }

        long durationMinutes = Duration.between(startsAt, endsAt).toMinutes();

        if (durationMinutes < MIN_BOOKING_DURATION_MINUTES || durationMinutes > MAX_BOOKING_DURATION_MINUTES) {
            throw new InvalidBookingTimeException(INVALID_DURATION_MESSAGE);
        }

        if (durationMinutes % BOOKING_STEP_MINUTES != 0) {
            throw new InvalidBookingTimeException(INVALID_DURATION_MESSAGE);
        }

        if (startsAt.getMinute() % BOOKING_STEP_MINUTES != 0 || endsAt.getMinute() % BOOKING_STEP_MINUTES != 0) {
            throw new InvalidBookingTimeException(INVALID_DURATION_MESSAGE);
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException(USER_NOT_AUTHENTICATED_MESSAGE);
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException(USER_NOT_AUTHENTICATED_MESSAGE));
    }
}
