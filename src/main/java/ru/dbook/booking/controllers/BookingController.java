package ru.dbook.booking.controllers;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.dbook.booking.dto.BookRoomRequest;
import ru.dbook.booking.dto.BookingResponse;
import ru.dbook.booking.enums.Routes;
import ru.dbook.booking.service.RoomBookingService;

import java.util.List;

@RestController
@RequestMapping(Routes.BOOKINGS)
public class BookingController {

    private final RoomBookingService roomBookingService;

    public BookingController(RoomBookingService roomBookingService) {
        this.roomBookingService = roomBookingService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TRAINER')")
    public ResponseEntity<BookingResponse> bookRoom(@Valid @RequestBody BookRoomRequest request) {
        BookingResponse response = roomBookingService.bookRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BookingResponse>> getMyBookings() {
        return ResponseEntity.ok(roomBookingService.getMyBookings());
    }
}
