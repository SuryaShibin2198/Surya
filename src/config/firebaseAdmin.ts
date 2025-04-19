import admin from 'firebase-admin';
import * as path from 'path';

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, './my-shoppify-project-firebase-adminsdk-2cqr9-e142d83d5b.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export default admin;
