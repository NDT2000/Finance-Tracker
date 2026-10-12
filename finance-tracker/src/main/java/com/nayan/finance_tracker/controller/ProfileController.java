package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.dto.ProfileResponse;
import com.nayan.finance_tracker.dto.UpdateProfileRequest;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profiles;

    @GetMapping
    public ProfileResponse get(@AuthenticationPrincipal User user) {
        return new ProfileResponse(user.getFullName(), user.getEmail());
    }

    @PutMapping
    public ProfileResponse update(@AuthenticationPrincipal User user,
                                  @Valid @RequestBody UpdateProfileRequest request) {
        return profiles.update(user, request);
    }
}
