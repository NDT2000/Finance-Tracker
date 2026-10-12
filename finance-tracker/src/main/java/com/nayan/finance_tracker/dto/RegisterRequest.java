package com.nayan.finance_tracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @Size(max=100)
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Size(max=254)
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @com.nayan.finance_tracker.security.StrongPassword
    @NotBlank(message = "Password is required")
    private String password;
    
}
