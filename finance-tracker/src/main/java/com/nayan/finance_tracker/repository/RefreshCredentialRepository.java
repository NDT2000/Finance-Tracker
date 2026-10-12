package com.nayan.finance_tracker.repository;
import com.nayan.finance_tracker.entity.RefreshCredential;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
public interface RefreshCredentialRepository extends JpaRepository<RefreshCredential,String> {
    @Query("select r.sessionId from RefreshCredential r where r.tokenHash = :hash")
    Optional<String> sessionIdForHash(String hash);
}
