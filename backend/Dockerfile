# Production image for the Words API (Spring Boot, Java 25).
# Build context is this backend/ folder. Locally:  docker build -t words-api backend

# ---- build ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
# The Maven wrapper downloads Maven itself and needs unzip plus curl or wget.
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first, so code-only changes reuse this cached layer.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
# Tests need an embedded Postgres; they are run locally, not in the image build.
RUN ./mvnw -B -q -DskipTests package && cp target/words-*.jar /src/app.jar

# ---- run ----
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /src/app.jar app.jar

# Uploaded images go here. Mount a persistent volume at /data, or uploads vanish on every deploy.
ENV UPLOAD_DIR=/data/uploads
# The platform sets PORT; application.yml reads it (defaults to 8080).
EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
