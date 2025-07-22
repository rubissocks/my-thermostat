CREATE DATABASE thermostat_history;

USE thermostat_history;
-- Creating the thermostat table
CREATE TABLE thermostat43130 ( 
            num INTEGER AUTO_INCREMENT PRIMARY KEY,
            status_on BOOLEAN NOT NULL,
            temp FLOAT NOT NULL,
            set_temp FLOAT NOT NULL,
            heating BOOLEAN NOT NULL,
            ventilator INTEGER NOT NULL,
            set_ventilator INTEGER NOT NULL,
            pressure FLOAT NOT NULL,
            recorded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            wifi_signal FLOAT NOT NULL,
            rf_signal FLOAT NOT NULL);

-- Createing the secret key table
CREATE TABLE secret_keys (
    id INT PRIMARY KEY,
    key_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM thermostat12345; -- Clear the table
DELETE FROM secret_keys;
DELETE FROM secret_keys WHERE id = 12345 ; -- Delete a specific row 
DELETE FROM thermostat12345 WHERE num = 1; 

-- Insert some test data
INSERT INTO thermostat12345(status_on,temp,set_temp,...) 
VALUES (11.3,13.3),(11.6,13.3);
INSERT INTO secret_keys(id,key_value) 
VALUES (12345,'abcde');

-- Select a specific key for a specific id
SELECT key_value FROM secret_keys WHERE id = 12932;

DROP TABLE thermostat_history.temperature; -- Delete the table
DROP DATABASE thermostat_history; -- Delete the database

-- Check if a table exists
SELECT EXISTS( 
    SELECT 1 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'thermostat12345'
) AS table_exists;

-- Check if a specific id exists in the secret_keys table
SELECT EXISTS (SELECT id FROM secret_keys WHERE id = 12932) AS id_valid;


-- Find key for specific id
SELECT key_value FROM secret_keys WHERE id = 10216;

-- Reset the database
DROP DATABASE thermostat_history;
CREATE DATABASE thermostat_history;
USE thermostat_history;