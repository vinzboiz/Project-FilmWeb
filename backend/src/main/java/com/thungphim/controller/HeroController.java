package com.thungphim.controller;

import com.thungphim.service.HeroService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.http.HttpStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/hero")
public class HeroController {

    private final HeroService heroService;

    public HeroController(HeroService heroService) {
        this.heroService = heroService;
    }

    @GetMapping("/random")
    public ResponseEntity<?> random(@RequestParam(required = false) String type) {
        Map<String, Object> item = heroService.getRandomHero(type != null ? type : "");
        if (item == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có phim hoặc series nào có trailer");
        }
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(item);
    }
}
