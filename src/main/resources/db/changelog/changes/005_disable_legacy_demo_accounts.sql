--liquibase formatted sql

--changeset qumpina:005_disable_legacy_demo_accounts context:!demo
-- Invalidate only unchanged demo credentials, preserving users and their bookings.
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('admin@booking.local', 'trainer@booking.local', 'user1@booking.local', 'user2@booking.local') AND password IN ('$2a$10$72FfmsiGlWjJvZ3lVMGesODa/amehl4Ln95enRW/U5osf8gciADtK', '$2a$10$tQcVDn5Np4u2A59P0GR/TurXlvqQtBjMk1ZY0Gtk8ysyKw0P25g5u'));
UPDATE users SET password = '!disabled-demo-account' WHERE email IN ('admin@booking.local', 'trainer@booking.local', 'user1@booking.local', 'user2@booking.local') AND password IN ('$2a$10$72FfmsiGlWjJvZ3lVMGesODa/amehl4Ln95enRW/U5osf8gciADtK', '$2a$10$tQcVDn5Np4u2A59P0GR/TurXlvqQtBjMk1ZY0Gtk8ysyKw0P25g5u');
