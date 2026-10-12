package com.nayan.finance_tracker.repository;
import com.nayan.finance_tracker.entity.AuthSession;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface AuthSessionRepository extends JpaRepository<AuthSession,String> {
    @Modifying @Query("update AuthSession s set s.revoked = true where s.userId = :id")
    void revokeUser(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from AuthSession s where s.id = :id")
    Optional<AuthSession> lockById(String id);
}
