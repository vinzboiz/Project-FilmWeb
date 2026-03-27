package com.thungphim.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/countries")
public class CountriesController {

    private static final List<Map<String, String>> COUNTRY_LIST = List.of(
            Map.of("code", "VN", "name", "Việt Nam"),
            Map.of("code", "US", "name", "United States"),
            Map.of("code", "KR", "name", "South Korea"),
            Map.of("code", "CN", "name", "China"),
            Map.of("code", "JP", "name", "Japan"),
            Map.of("code", "GB", "name", "United Kingdom"),
            Map.of("code", "FR", "name", "France"),
            Map.of("code", "IN", "name", "India"),
            Map.of("code", "TH", "name", "Thailand"),
            Map.of("code", "TW", "name", "Taiwan"),
            Map.of("code", "HK", "name", "Hong Kong"),
            Map.of("code", "SG", "name", "Singapore"),
            Map.of("code", "MY", "name", "Malaysia"),
            Map.of("code", "ID", "name", "Indonesia"),
            Map.of("code", "PH", "name", "Philippines"),
            Map.of("code", "AU", "name", "Australia"),
            Map.of("code", "CA", "name", "Canada"),
            Map.of("code", "DE", "name", "Germany"),
            Map.of("code", "IT", "name", "Italy"),
            Map.of("code", "ES", "name", "Spain"),
            Map.of("code", "RU", "name", "Russia"),
            Map.of("code", "BR", "name", "Brazil"),
            Map.of("code", "MX", "name", "Mexico"),
            Map.of("code", "AR", "name", "Argentina"),
            Map.of("code", "AE", "name", "United Arab Emirates"),
            Map.of("code", "TR", "name", "Turkey"),
            Map.of("code", "PL", "name", "Poland"),
            Map.of("code", "NL", "name", "Netherlands"),
            Map.of("code", "BE", "name", "Belgium"),
            Map.of("code", "SE", "name", "Sweden"),
            Map.of("code", "NO", "name", "Norway"),
            Map.of("code", "DK", "name", "Denmark"),
            Map.of("code", "FI", "name", "Finland"),
            Map.of("code", "IE", "name", "Ireland"),
            Map.of("code", "PT", "name", "Portugal"),
            Map.of("code", "AT", "name", "Austria"),
            Map.of("code", "CH", "name", "Switzerland"),
            Map.of("code", "CZ", "name", "Czech Republic"),
            Map.of("code", "GR", "name", "Greece"),
            Map.of("code", "RO", "name", "Romania"),
            Map.of("code", "HU", "name", "Hungary"),
            Map.of("code", "BG", "name", "Bulgaria"),
            Map.of("code", "UA", "name", "Ukraine"),
            Map.of("code", "ZA", "name", "South Africa"),
            Map.of("code", "EG", "name", "Egypt"),
            Map.of("code", "NG", "name", "Nigeria"),
            Map.of("code", "PK", "name", "Pakistan"),
            Map.of("code", "BD", "name", "Bangladesh"),
            Map.of("code", "IR", "name", "Iran"),
            Map.of("code", "IL", "name", "Israel"),
            Map.of("code", "SA", "name", "Saudi Arabia"),
            Map.of("code", "QA", "name", "Qatar"),
            Map.of("code", "LB", "name", "Lebanon"),
            Map.of("code", "JO", "name", "Jordan"),
            Map.of("code", "SY", "name", "Syria"),
            Map.of("code", "IQ", "name", "Iraq"),
            Map.of("code", "KZ", "name", "Kazakhstan"),
            Map.of("code", "UZ", "name", "Uzbekistan"),
            Map.of("code", "GE", "name", "Georgia"),
            Map.of("code", "AM", "name", "Armenia"),
            Map.of("code", "AZ", "name", "Azerbaijan"),
            Map.of("code", "CL", "name", "Chile"),
            Map.of("code", "CO", "name", "Colombia"),
            Map.of("code", "PE", "name", "Peru"),
            Map.of("code", "VE", "name", "Venezuela"),
            Map.of("code", "EC", "name", "Ecuador"),
            Map.of("code", "BO", "name", "Bolivia"),
            Map.of("code", "PY", "name", "Paraguay"),
            Map.of("code", "UY", "name", "Uruguay"),
            Map.of("code", "CU", "name", "Cuba"),
            Map.of("code", "PR", "name", "Puerto Rico"),
            Map.of("code", "JM", "name", "Jamaica"),
            Map.of("code", "NZ", "name", "New Zealand"),
            Map.of("code", "KH", "name", "Cambodia"),
            Map.of("code", "LA", "name", "Laos"),
            Map.of("code", "MM", "name", "Myanmar"),
            Map.of("code", "NP", "name", "Nepal"),
            Map.of("code", "LK", "name", "Sri Lanka"),
            Map.of("code", "MA", "name", "Morocco"),
            Map.of("code", "TN", "name", "Tunisia"),
            Map.of("code", "KE", "name", "Kenya"),
            Map.of("code", "GH", "name", "Ghana"),
            Map.of("code", "ET", "name", "Ethiopia"),
            Map.of("code", "TZ", "name", "Tanzania"),
            Map.of("code", "UG", "name", "Uganda"),
            Map.of("code", "SN", "name", "Senegal"),
            Map.of("code", "CI", "name", "Ivory Coast"),
            Map.of("code", "CM", "name", "Cameroon"),
            Map.of("code", "AO", "name", "Angola"),
            Map.of("code", "MZ", "name", "Mozambique"),
            Map.of("code", "ZW", "name", "Zimbabwe"),
            Map.of("code", "BW", "name", "Botswana"),
            Map.of("code", "NA", "name", "Namibia")
    );

    @GetMapping
    public ResponseEntity<List<Map<String, String>>> list() {
        return ResponseEntity.ok(COUNTRY_LIST);
    }
}

