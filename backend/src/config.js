// src/config.js
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('The application requires a JWT_SECRET to sign and verify tokens.');
  console.error('Please add it to your .env file or environment variables and restart the server.');
  process.exit(1); // Exit the process with an error code
}

export default {
  jwtSecret: JWT_SECRET,
};
