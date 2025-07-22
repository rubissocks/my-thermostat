import crypto from 'crypto';
import fs from 'fs';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

export class CryptoUtils {
  // Checks master key validity
  constructor(masterKey) {
    if (!masterKey || masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes long for AES-256');
    }
    this.masterKey = masterKey;
  }

  // Encrypts the given text using AES-256-CBC (no idea how this works, but it does)
  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(this.masterKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }
  // Decrypts the given text using AES-256-CBC -- returns the text as a buffer
  decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(this.masterKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

// Key management functions
// Loads encrypted keys from a file, decrypts them, and returns the keys as a JSON object
export function loadEncryptedKeys(encryptedFilePath, cryptoUtils) {
  try {
    const encryptedData = fs.readFileSync(encryptedFilePath, 'utf8');
    const decryptedData = cryptoUtils.decrypt(encryptedData);
    return JSON.parse(decryptedData);

  } catch (err) {
    console.error('Error loading encrypted keys:', err);
    return null;
  }
}

// Saves the given keys to an encrypted file
// The keys are first converted to a JSON string, then encrypted, and written to the file
// The file is created if it does not exist, or overwritten if it does
export function saveEncryptedKeys(keys, encryptedFilePath, cryptoUtils) {
  const dataToEncrypt = JSON.stringify(keys);
  const encryptedData = cryptoUtils.encrypt(dataToEncrypt);
  fs.writeFileSync(encryptedFilePath, encryptedData);
  console.log('Keys encrypted and saved successfully');
}