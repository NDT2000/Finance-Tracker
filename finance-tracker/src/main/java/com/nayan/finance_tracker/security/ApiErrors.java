package com.nayan.finance_tracker.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ApiErrors {
    private final ObjectMapper mapper;
    public static Map<String,Object> body(HttpStatus status,String message,String path) {
        return Map.of("timestamp",Instant.now().toString(),"status",status.value(),
            "error",status.getReasonPhrase(),"message",message,"path",path);
    }
    public void send(HttpServletRequest req,HttpServletResponse res,HttpStatus status,String message) throws IOException {
        res.setStatus(status.value()); res.setContentType("application/json");
        mapper.writeValue(res.getOutputStream(),body(status,message,req.getRequestURI()));
    }
}
