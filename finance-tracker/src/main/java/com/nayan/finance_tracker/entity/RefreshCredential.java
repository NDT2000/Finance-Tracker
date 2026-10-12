package com.nayan.finance_tracker.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="refresh_credentials",indexes=@Index(name="refresh_credentials_session_idx",columnList="session_id")) @Getter @Setter @NoArgsConstructor
public class RefreshCredential {
    @Id @Column(length=64) private String tokenHash;
    @Column(nullable=false) private String sessionId;
    private boolean consumed;
}
