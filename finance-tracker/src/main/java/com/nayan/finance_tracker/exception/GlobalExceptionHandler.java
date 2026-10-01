package com.nayan.finance_tracker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j 
public class GlobalExceptionHandler {

    // Helper to build the consistent error body
    private Map<String, Object> buildBody(HttpStatus status, String message, WebRequest request) {
        return ErrorBody.of(status, message, request.getDescription(false).replace("uri=", ""));
    }

    // 404 — resource not found
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(ResourceNotFoundException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.NOT_FOUND, ex.getMessage(), request),
            HttpStatus.NOT_FOUND);
    }

    // 403 — user tried to access something they don't own
    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<Object> handleForbidden(UnauthorizedAccessException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.FORBIDDEN, ex.getMessage(), request),
            HttpStatus.FORBIDDEN);
    }

    // 409 — duplicate resource (THE budget bug you just hit)
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Object> handleConflict(DuplicateResourceException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.CONFLICT, ex.getMessage(), request),
            HttpStatus.CONFLICT);
    }

    // 400 — bean validation failures (@Valid on DTOs)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .reduce((a, b) -> a + ", " + b)
            .orElse("Validation failed");
        return new ResponseEntity<>(
            buildBody(HttpStatus.BAD_REQUEST, message, request),
            HttpStatus.BAD_REQUEST);
    }

        // 400 — request body is not valid JSON
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Object> handleUnreadable(HttpMessageNotReadableException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.BAD_REQUEST, "Malformed request body", request),
            HttpStatus.BAD_REQUEST);
    }

    // 400 — a URL value has the wrong type, e.g. /api/budgets/abc
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Object> handleTypeMismatch(MethodArgumentTypeMismatchException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.BAD_REQUEST, "Invalid value for '" + ex.getName() + "'", request),
            HttpStatus.BAD_REQUEST);
    }

    // 500 — catch-all for anything unhandled (last resort)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
        // Spring's own web errors (unknown URL, wrong HTTP method...) already know their status
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
            return new ResponseEntity<>(buildBody(status, status.getReasonPhrase(), request), status);
        }

        // A real bug or outage: full details to the logs, nothing to the client
        log.error("Unexpected error on {}", request.getDescription(false), ex);
        return new ResponseEntity<>(
            buildBody(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request),
            HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    // 401 — wrong email or password at login
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException ex, WebRequest request) {
        return new ResponseEntity<>(
            buildBody(HttpStatus.UNAUTHORIZED, "Invalid email or password", request),
            HttpStatus.UNAUTHORIZED);
    }
}