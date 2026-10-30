package ru.dbook.booking;

import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class SecurityMigrationTests {
    @Autowired DataSource dataSource;

    private void migrate(String schema, String contexts) throws Exception {
        SpringLiquibase liquibase = new SpringLiquibase();
        liquibase.setDataSource(dataSource);
        liquibase.setDefaultSchema(schema);
        liquibase.setChangeLog("classpath:db/changelog/db.changelog-master.yaml");
        liquibase.setContexts(contexts);
        liquibase.afterPropertiesSet();
    }

    private int count(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement(); var result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    @Test
    void defaultDatabaseHasNoDemoAccounts() throws Exception {
        String schema = "security_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                migrate(schema, "");
                assertEquals(0, count(connection, "SELECT count(*) FROM " + schema + ".users"));
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void upgradeDisablesOnlyUnchangedDemoCredentialsAndKeepsBookings() throws Exception {
        String schema = "security_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                migrate(schema, "demo");
                assertEquals(4, count(connection, "SELECT count(*) FROM " + schema + ".users"));
                statement.execute("UPDATE " + schema + ".users SET password = 'changed-by-owner' WHERE email = 'trainer@booking.local'");
                statement.execute("INSERT INTO " + schema + ".refresh_tokens (token, user_id, expires_at, created_at) SELECT 'fixture-' || id, id, now() + interval '1 day', now() FROM " + schema + ".users");
                statement.execute("INSERT INTO " + schema + ".bookings (room_id, user_id, starts_at, ends_at, created_at) SELECT (SELECT min(id) FROM " + schema + ".rooms), id, '2035-01-01 08:00', '2035-01-01 09:00', now() FROM " + schema + ".users WHERE email = 'admin@booking.local'");
                migrate(schema, "");
                assertEquals(4, count(connection, "SELECT count(*) FROM " + schema + ".users"));
                assertEquals(3, count(connection, "SELECT count(*) FROM " + schema + ".users WHERE password = '!disabled-demo-account'"));
                assertEquals(1, count(connection, "SELECT count(*) FROM " + schema + ".users WHERE password = 'changed-by-owner'"));
                assertEquals(1, count(connection, "SELECT count(*) FROM " + schema + ".refresh_tokens"));
                assertEquals(1, count(connection, "SELECT count(*) FROM " + schema + ".bookings"));
                migrate(schema, ""); // Updating an already migrated database remains safe.
                assertEquals(1, count(connection, "SELECT count(*) FROM " + schema + ".bookings"));
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }
}
