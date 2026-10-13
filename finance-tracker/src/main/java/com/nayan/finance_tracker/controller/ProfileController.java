package com.nayan.finance_tracker.controller;

import com.nayan.finance_tracker.dto.ProfileResponse;
import com.nayan.finance_tracker.entity.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
  @GetMapping
  public ProfileResponse get(@AuthenticationPrincipal User user) {
    return new ProfileResponse(user.getFullName(), user.getEmail());
  }
}
