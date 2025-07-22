import { CryptoUtils, saveEncryptedKeys } from "./crypto-utils.js";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'; dotenv.config();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Verifies master key exists
if (!process.env.master_key) {
  console.error("Error: master_key environment variable not set");
  console.log("Generate one with: ");
  console.log('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Prepares directory structure
const configDir = path.join(__dirname, 'secrets');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Initialize with device keys
const cryptoUtils = new CryptoUtils(Buffer.from(process.env.master_key, 'hex'));
const initialKeys = {
  "43130": "03e5630c528d1d262c05e4784cf325bb16b0bb91ec0ccf2a1b5fdae3f02b0011"
};

// Saves encrypted file to config directory
saveEncryptedKeys(
  initialKeys,
  path.join(configDir, 'encrypted-keys.enc'),
  cryptoUtils
);

console.log("Key vault initialized successfully at secrets/encrypted-keys.enc");
