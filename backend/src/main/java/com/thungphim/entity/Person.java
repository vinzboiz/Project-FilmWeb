package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "persons")
@Data
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(columnDefinition = "TEXT")
    private String biography;

    @Column(name = "person_type", length = 20)
    private String personType;
}
