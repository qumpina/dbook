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
import ru.dbook.booking.dto.CreateRoomRequest;
import ru.dbook.booking.dto.RoomResponse;
import ru.dbook.booking.enums.Routes;
import ru.dbook.booking.service.RoomBookingService;

import java.util.List;

@RestController
@RequestMapping(Routes.ROOMS)
public class RoomController {

    private final RoomBookingService roomBookingService;

    public RoomController(RoomBookingService roomBookingService) {
        this.roomBookingService = roomBookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoomResponse response = roomBookingService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RoomResponse>> getAllRooms() {
        return ResponseEntity.ok(roomBookingService.getAllRooms());
    }
}
