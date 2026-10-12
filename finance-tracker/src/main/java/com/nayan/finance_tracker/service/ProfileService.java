package com.nayan.finance_tracker.service;

import com.nayan.finance_tracker.dto.ProfileResponse;
import com.nayan.finance_tracker.dto.UpdateProfileRequest;
import com.nayan.finance_tracker.entity.User;
import com.nayan.finance_tracker.repository.UserRepository;
import com.nayan.finance_tracker.exception.ResourceNotFoundException;
import com.nayan.finance_tracker.security.SecurityAudit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository users;
    private final SecurityAudit audit;

    @Transactional
    public ProfileResponse update(User authenticatedUser, UpdateProfileRequest request) {
        // The owner comes exclusively from authentication, not a request ID or email.
        User user = users.lockById(authenticatedUser.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setFullName(request.fullName().strip());
        audit.record("profile_updated", user.getId());
        return new ProfileResponse(user.getFullName(), user.getEmail());
    }
}
