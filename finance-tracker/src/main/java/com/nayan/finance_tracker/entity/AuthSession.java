package com.nayan.finance_tracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="auth_sessions",indexes=@Index(name="auth_sessions_user_idx",columnList="user_id")) @Getter @Setter @NoArgsConstructor
public class AuthSession {
    @Id private String id;
    @Column(nullable=false) private Long userId;
    @Column(nullable=false) private Instant expiresAt;
    private boolean revoked;
}
