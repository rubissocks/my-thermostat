import { CryptoUtils, loadEncryptedKeys, saveEncryptedKeys } from './crypto-utils.js';
import crypto from 'crypto';

// KeyManager class handles the encryption and decryption of device keys
// It uses the CryptoUtils class to manage the cryptographic operations
export class KeyManager {
  constructor(masterKey, encryptedKeysPath) {
    const master_key = Buffer.from(masterKey, 'hex'); // Ensure master_key is in hex format
    this.cryptoUtils = new CryptoUtils(master_key);
    this.encryptedKeysPath = encryptedKeysPath;
    this.keys = loadEncryptedKeys(this.encryptedKeysPath, this.cryptoUtils) || {};
  }

  // Gets the key for a specific device ID and formats it from a hex string into a Buffer
  getKeyForDevice(id) {
    const key=this.keys[id];
    if (typeof key === 'string') {
      return Buffer.from(key, 'hex');
    }
    throw new Error(`Key for device ID ${id} is not a valid hex string`);
  }

  // Adds a key for a specific device ID and saves the updated keys
  // The key can be a Buffer, Buffer JSON or a hex string
  addKeyForDevice(id, key) {
    this.keys[id] = key;
    this.saveKeys();
  }

  // Saves the current keys to the encrypted file
  saveKeys() {
    saveEncryptedKeys(this.keys, this.encryptedKeysPath, this.cryptoUtils);
  }

  // Returns all device IDs for which keys are stored
  getAllDeviceIds() {
    return Object.keys(this.keys);
  }
}

/* Function to verify HMAC
It takes the original message, the received HMAC, and the secret key
It calculates the HMAC of the (sanitized) original message using the secret key
and compares it with the received HMAC
Returns true if they match, false otherwise
*/
export function verifyHMAC(message, receivedHmac, secretKey) {
  const messageString = JSON.stringify(message); // Converst the JSON message to a string format
  const hmac = crypto.createHmac('sha256', secretKey).update(messageString).digest('hex'); // Creates HMAC using the same algorithm and secret key
  return hmac === receivedHmac;
}