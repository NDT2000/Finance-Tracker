package com.nayan.finance_tracker.dto;

/** Only public account details; never serialize UserDetails or password hashes. */
public record ProfileResponse(String fullName, String email) {}
