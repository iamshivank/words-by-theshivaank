package com.theshivaank.words.common;

import com.theshivaank.words.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

/** "Today" is the owner's calendar day (app.timezone), not the server's or UTC's. */
@Component
public class Today {

    private final Clock clock;
    private final ZoneId zone;

    public Today(Clock clock, AppProperties props) {
        this.clock = clock;
        this.zone = props.timezone();
    }

    public LocalDate date() {
        return LocalDate.now(clock.withZone(zone));
    }

    public LocalDate dateOf(Instant instant) {
        return instant.atZone(zone).toLocalDate();
    }

    public Instant now() {
        return clock.instant();
    }

    public ZoneId zone() {
        return zone;
    }
}
