package com.nayan.finance_tracker.dto;
import lombok.Data;
import jakarta.validation.constraints.*;
@Data
public class LoginRequest {
    @NotBlank @Email @Size(max=254) private String email;
    @NotBlank @Size(max=256) private String password;
}
