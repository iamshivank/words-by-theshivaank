package com.theshivaank.words.auth;

import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Prints a bcrypt hash for OWNER_PASSWORD_HASH. No server, no endpoint.
 *
 * <pre>cd backend && ./mvnw -q compile exec:java</pre>
 *
 * Reads the password from the terminal without echoing it (or from stdin when piped), so it never
 * ends up in shell history.
 */
public final class HashPassword {

    private HashPassword() {}

    public static void main(String[] args) throws IOException {
        char[] password;
        Console console = System.console();
        if (console != null && console.isTerminal()) {
            password = console.readPassword("Password: ");
            char[] again = console.readPassword("Again:    ");
            if (password == null || !Arrays.equals(password, again)) {
                System.err.println("Passwords do not match.");
                System.exit(1);
            }
        } else {
            String line = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)).readLine();
            password = line == null ? new char[0] : line.toCharArray();
        }

        if (password.length < 12) {
            System.err.println("Use at least 12 characters.");
            System.exit(1);
        }
        System.out.println(new BCryptPasswordEncoder(12).encode(new String(password)));
        Arrays.fill(password, '\0');
    }
}
