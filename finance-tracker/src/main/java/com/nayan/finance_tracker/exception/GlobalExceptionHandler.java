package com.nayan.finance_tracker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Helper to build the consistent error body
    private Map<String, Object> buildBody(HttpStatus status, String message, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return body;
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

    // // 500 — catch-all for anything unhandled (last resort)
    // @ExceptionHandler(Exception.class)
    // public ResponseEntity<Object> handleGeneric(Exception ex, WebRequest request) {
    //     return new ResponseEntity<>(
    //         buildBody(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request),
    //         HttpStatus.INTERNAL_SERVER_ERROR);
    // }
}