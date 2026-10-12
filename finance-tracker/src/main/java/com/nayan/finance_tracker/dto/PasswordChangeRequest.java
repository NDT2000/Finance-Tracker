package com.nayan.finance_tracker.dto;
import lombok.Data;
import jakarta.validation.constraints.*;
import com.nayan.finance_tracker.security.StrongPassword;
@Data
public class PasswordChangeRequest {
    @NotBlank @Size(max=256) private String currentPassword;
    @StrongPassword private String newPassword;
}
