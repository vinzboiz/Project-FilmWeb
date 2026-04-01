package com.thungphim.repository;

import com.thungphim.entity.Series;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeriesRepository extends JpaRepository<Series, Integer> {}
