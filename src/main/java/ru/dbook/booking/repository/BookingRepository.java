package ru.dbook.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.dbook.booking.entity.Booking;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
            select case when count(b) > 0 then true else false end
            from Booking b
            where b.room.id = :roomId
              and b.startsAt < :endsAt
              and b.endsAt > :startsAt
            """)
    boolean existsOverlappingBooking(
            @Param("roomId") Long roomId,
            @Param("startsAt") LocalDateTime startsAt,
            @Param("endsAt") LocalDateTime endsAt
    );

    List<Booking> findAllByUserIdOrderByStartsAtAsc(Long userId);

    List<Booking> findAllByOrderByStartsAtAsc();
}
