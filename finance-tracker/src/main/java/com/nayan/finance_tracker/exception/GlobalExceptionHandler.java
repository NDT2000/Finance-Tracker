package com.nayan.finance_tracker.exception;
import com.nayan.finance_tracker.security.ApiErrors;
import com.nayan.finance_tracker.security.LoginRateLimiter.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.context.request.WebRequest;
import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice @Slf4j
public class GlobalExceptionHandler {
    private ResponseEntity<Object> body(HttpStatus status,String message,WebRequest request) {
        return ResponseEntity.status(status).body(ApiErrors.body(status,message,request.getDescription(false).replace("uri=","")));
    }
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> missing(ResourceNotFoundException ex,WebRequest req) { return body(HttpStatus.NOT_FOUND,ex.getMessage(),req); }
    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<Object> forbidden(UnauthorizedAccessException ex,WebRequest req) { return body(HttpStatus.FORBIDDEN,"Access denied",req); }
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Object> conflict(DuplicateResourceException ex,WebRequest req) { return body(HttpStatus.CONFLICT,ex.getMessage(),req); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> constraint(DataIntegrityViolationException ex,WebRequest req) { return body(HttpStatus.CONFLICT,"Request conflicts with existing data",req); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> validation(MethodArgumentNotValidException ex,WebRequest req) {
        String message=ex.getBindingResult().getFieldErrors().stream().map(e -> e.getField()+": "+e.getDefaultMessage())
            .reduce((a,b)->a+", "+b).orElse("Validation failed"); return body(HttpStatus.BAD_REQUEST,message,req);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Object> malformed(Exception ex,WebRequest req) { return body(HttpStatus.BAD_REQUEST,"Invalid request",req); }
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> authentication(AuthenticationException ex,WebRequest req) { return body(HttpStatus.UNAUTHORIZED,"Invalid email, password or session",req); }
    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<Object> rate(RateLimitException ex,WebRequest req) {
        return ResponseEntity.status(429).header("Retry-After","60").body(ApiErrors.body(HttpStatus.TOO_MANY_REQUESTS,"Try again later",req.getDescription(false).replace("uri=","")));
    }
    @ExceptionHandler(SecurityUnavailableException.class)
    public ResponseEntity<Object> unavailable(SecurityUnavailableException ex,WebRequest req) { return body(HttpStatus.SERVICE_UNAVAILABLE,"Authentication temporarily unavailable",req); }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Object> denied(Exception ex,WebRequest req) { return body(HttpStatus.FORBIDDEN,"Access denied",req); }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> invalidValue(IllegalArgumentException ex,WebRequest req) { return body(HttpStatus.BAD_REQUEST,ex.getMessage()==null?"Invalid value":ex.getMessage(),req); }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Object> uploadSize(Exception ex,WebRequest req) { return body(HttpStatus.PAYLOAD_TOO_LARGE,"CSV upload exceeds the size limit",req); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> unexpected(Exception ex,WebRequest req) {
        // Preserve Spring's known HTTP statuses (405, 404, 415, etc.) without exposing details.
        if (ex instanceof org.springframework.web.ErrorResponse response) {
            HttpStatus status=HttpStatus.valueOf(response.getStatusCode().value());
            return body(status,status.getReasonPhrase(),req);
        }
        log.error("Unhandled request failure type={}",ex.getClass().getSimpleName());
        return body(HttpStatus.INTERNAL_SERVER_ERROR,"An unexpected error occurred",req);
    }
}
