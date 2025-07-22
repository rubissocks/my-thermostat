// The fields input JSONs are required to have
const requiredFields = ['id', 'status_on', 'temp', 'set_temp', 'heating', 'ventilator', 'set_ventilator', 'pressure', 'wifi_signal', 'rf_signal'];

/* Function to validate JSON data
 It checks if the received JSON is an object, if all required fields are present
 and not undefined or null, and if all fields are of the correct type.
 Returns true if the JSON is valid, false otherwise.
*/
export function validateJSON(recievedJson) {
  // Check if the JSON is an object
  if (typeof recievedJson !== 'object' || recievedJson === null) {
    return false;
  }
  // Check if all required fields are present and not undefined or null
  for (const field of requiredFields) {
    if (!(field in recievedJson)) {
      return false;
    }
    if (recievedJson[field] === undefined || recievedJson[field] === null) {
      return false;
    }
  }
  // Check if all fields are of the correct type
  if (typeof recievedJson.id !== 'string' || typeof recievedJson.status_on !== 'boolean' ||
    typeof recievedJson.temp !== 'number' || typeof recievedJson.set_temp !== 'number' ||
    typeof recievedJson.heating !== 'boolean' || typeof recievedJson.ventilator !== 'number' ||
    typeof recievedJson.set_ventilator !== 'number' || typeof recievedJson.pressure !== 'number' ||
    typeof recievedJson.wifi_signal !== 'number' || typeof recievedJson.rf_signal !== 'number') {
    return false;
  }
  return true;
}

/*Function to sanitize JSON data
 It removes any fields that are not in the requiredFields list
 and returns a new JSON object with only the required fields.
*/
export function sanitizeJSON(recievedJson) {
  // Remove extra fields
  const sanitizedJson = {};
  for (const field of requiredFields) {
    if (field in recievedJson) {
      sanitizedJson[field] = recievedJson[field];
    }
  }
  return sanitizedJson;
}

