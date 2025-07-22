import mysql from 'mysql2'
import { randomBytes } from 'crypto';
import dotenv from 'dotenv'
dotenv.config()


const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()


// Creates new ids in the database (creates one by default)
// Generates a random id (between 10000 and 99999) and creates a new table for each id
export function createIds(numKeys) {
    for (let i = 0; i < numKeys; i++) {
        const id = Math.floor(Math.random() * 90000) + 10000; // Generate a random id between 10000 and 99999
        const key=randomBytes(32).toString('hex'); // Generates a random key in hex format

        console.log(`"${id}": ${key},`); // prints the ids and keys in the format for setup-key-vault.js

        // Creates a unique table based on the id
        const tableName = `thermostat${id}`; 
        pool.query(`
        CREATE TABLE ?? ( 
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
            rf_signal FLOAT NOT NULL
        );`, [tableName])
    }
}

// Check if the id is valid (if there is a table with that id)
export async function tableExists(id) {
    const [result] = await pool.query(`
    SELECT EXISTS( 
    SELECT 1 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = ?
    ) AS table_exists;`, [`thermostat${id}`]);
    const [rows] = result;
    return rows.table_exists === 1; // Returns true if the id is valid, false otherwise
}

// Gets the table data in form of array for specific id
// Amount of records can be specified, fetches latest 100 records by default
export async function getTable(id, qty = 100) {
    const [rows] = await pool.query(`
        SELECT * FROM ??
        ORDER BY num DESC LIMIT ?;`, [`thermostat${id}`, qty])
    if (rows.length === 0) {
        return [] // Returns an empty array if no records are found
    }
    return rows
}

// Gets the latest recorded data for specific id
export async function getLatestData(id) {
    const [rows] = await pool.query(`
        SELECT * FROM ??
        ORDER BY num DESC
        LIMIT 1;`,  
        [`thermostat${id}`]) // Separately sending data for safety reasons
    return rows[0]
}

// Records new data in the table for for specific id
// Returns true if record was made and false if id was invalid
export async function recordData(id, status_on, temp, set_temp, heating, ventilator, set_ventilator, pressure, wifi_signal, rf_signal) {
    if (await tableExists(id)) {
        await pool.query(`
        INSERT INTO ?? (status_on,temp,set_temp, heating, ventilator, set_ventilator, pressure, wifi_signal, rf_signal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`thermostat${id}`, status_on, temp, set_temp, heating, ventilator, set_ventilator, pressure, wifi_signal, rf_signal])
        return true;
    }
    else {
        return false; // Returns false if the id is invalid
    }
}

// Deletes a temperature record from the database by number
// Deletes all records if no number is specified
export async function deleteData(id, num = 0) {
    if (!await tableExists(id)) {
        return `Error: Table thermostat${id} does not exist.`
    }
    else if (num = 0) {
        await pool.query(`
        DELETE FROM ??`, [`thermostat${id}`]);
    }
    else {
        await pool.query(`
        DELETE FROM ??
        WHERE num = ?`,
            [`thermostat${id}`, num]);
    }

}


//createIds(1); // Creates 10 ids for testing purposes