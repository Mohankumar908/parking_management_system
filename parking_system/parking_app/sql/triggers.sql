DROP TRIGGER IF EXISTS parking_app_pass_expiry_notification_trigger;

CREATE TRIGGER parking_app_pass_expiry_notification_trigger
AFTER UPDATE ON parking_app_parkingpass
WHEN OLD.is_active = 1 AND NEW.is_active = 0 AND NEW.expiry_date < STRFTIME('%Y-%m-%d %H:%M:%S', 'now')
BEGIN
    INSERT INTO parking_app_notification (recipient_id, pass_notified_id, message, notification_type, created_at, is_read)
    SELECT
        V.owner_id,
        NEW.id,
        'Your parking pass for vehicle ' || V.vehicle_number || ' expired on ' || STRFTIME('%Y-%m-%d', NEW.expiry_date) || '.',
        'pass_expiry',
        STRFTIME('%Y-%m-%d %H:%M:%S', 'now'),
        0
    FROM
        parking_app_vehicle AS V
    WHERE
        V.id = NEW.vehicle_id
        AND NOT EXISTS (
            SELECT 1 FROM parking_app_notification
            WHERE pass_notified_id = NEW.id AND notification_type = 'pass_expiry'
        );
END;