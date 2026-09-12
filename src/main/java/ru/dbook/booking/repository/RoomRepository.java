package ru.dbook.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.dbook.booking.entity.Room;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    List<Room> findAllByActiveTrueOrderByNameAsc();
}
