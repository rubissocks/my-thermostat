
import path from 'path';
import fs from 'fs';

// Checks if there is a valid user (from users.json) with credentials that match the input ones
// Return true if such a user is found and undefined false otherwise
export function verifyLogin(esp_id, password) {
  const usersFilePath = path.resolve('./users.json');
  let userData
  try {
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    userData = JSON.parse(fileContent).users;
  } catch (err) {
    console.error("Error reading users.json:", err);
    userData = []; // fallback
  }

  if (userData.find(user => user.esp_id === esp_id && user.password === password)) {
    return true;
  } else {
    return false;
  }
}