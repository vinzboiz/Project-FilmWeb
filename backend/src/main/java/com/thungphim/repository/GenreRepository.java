package com.thungphim.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thungphim.entity.Genre;

public interface GenreRepository extends JpaRepository<Genre, Integer> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
