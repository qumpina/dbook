package ru.dbook.booking.controllers;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.dbook.booking.enums.Routes;
import ru.dbook.booking.service.StatusService;

@RestController
@RequestMapping
public class TestController {

    private static StatusService statusService;

    TestController(StatusService statusService) {
        TestController.statusService = statusService;
    }

    @RequestMapping(Routes.TEST)
    public ResponseEntity<String> test() {
        return new ResponseEntity<>(statusService.getStatus(), HttpStatus.OK);
    }
}
