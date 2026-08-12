const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseMessaging = null;

let serviceAccount = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      './config/firebase-service-account.json';
    const resolvedPath = path.resolve(serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      serviceAccount = require(resolvedPath);
    }
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });

    firebaseMessaging = getMessaging();

    console.log(
      'Firebase Cloud Messaging (FCM) initialized successfully.'
    );
  } else {
    console.warn(
      'FCM Configuration missing (neither env var nor local file found). Push notifications will be simulated in console.'
    );
  }
} catch (err) {
  console.warn(
    'Could not initialize Firebase Admin SDK. Notifications will be logged in developer sandbox.',
    err.message
  );
}

/**
 * Sends a push notification to a user's registered devices
 * @param {string} userId - Target User UUID
 * @param {string} title - Title of notification
 * @param {string} body - Body content
 * @param {Object} [data] - Optional metadata payload
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // 1. Log simulation to terminal
    console.log(`[PUSH NOTIFICATION SIMULATION] to User: ${userId} | Title: "${title}" | Body: "${body}"`);

    // 2. Query target user push tokens
    const tokensRes = await db.query(
      'SELECT token FROM push_tokens WHERE user_id = $1',
      [userId]
    );

    if (tokensRes.rows.length === 0) {
      console.log(`No registered push tokens found for User: ${userId}`);
      return;
    }

    const tokens = tokensRes.rows.map(r => r.token);

    if (firebaseMessaging) {
      // 3. Send using FCM
      const message = {
        notification: { title, body },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens: tokens
      };

      const response = await firebaseMessaging.sendEachForMulticast(message);
      console.log(`FCM multicasts sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    }
  } catch (err) {
    console.error('Error dispatching push notification:', err.message);
  }
};

module.exports = {
  sendPushNotification
};
