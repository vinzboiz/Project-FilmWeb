# FilmWeb Backend

J2EE (Jakarta EE 10) backend project.

## Tech Stack

- Java 17
- Jakarta EE 10 (JAX-RS, CDI, etc.)
- Maven

## Build

```bash
mvn clean package
```

## Run

Deploy the generated `target/backend.war` to a Jakarta EE 10 compatible server (e.g. WildFly, Payara, TomEE).

## API

- `GET /api/health` - Health check endpoint
