// server/config/firebase.js
// Firebase Admin SDK initialization
// Supports both service account file and environment variables

const admin = require('firebase-admin');

let db;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  try {
    // Option 1: Use environment variables (recommended for production)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // Option 2: Use default application credentials (for local dev with gcloud)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'leanaxis-accounts',
      });
    }

    db = admin.firestore();
    
    // Configure Firestore settings for better performance
    db.settings({
      ignoreUndefinedProperties: true,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return db;

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
}

function getDb() {
  if (!db) {
    return initializeFirebase();
  }
  return db;
}

// Generic Firestore helpers
const firestoreHelpers = {
  // Get all documents from a collection, sorted by createdAt desc
  async getAll(collectionName, orderByField = 'createdAt', direction = 'desc') {
    const db = getDb();
    try {
      const snapshot = await db.collection(collectionName)
        .orderBy(orderByField, direction)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // If index doesn't exist, fallback to unordered
      const snapshot = await db.collection(collectionName).get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return docs.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return direction === 'desc' ? bTime - aTime : aTime - bTime;
      });
    }
  },

  // Get a single document by ID
  async getById(collectionName, id) {
    const db = getDb();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Create a new document
  async create(collectionName, data) {
    const db = getDb();
    const docData = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection(collectionName).add(docData);
    return { id: docRef.id, ...docData };
  },

  // Update an existing document
  async update(collectionName, id, data) {
    const db = getDb();
    const updateData = {
      ...data,
      lastEditedAt: new Date().toISOString(),
    };
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    await db.collection(collectionName).doc(id).update(updateData);
    const updated = await db.collection(collectionName).doc(id).get();
    return { id: updated.id, ...updated.data() };
  },

  // Delete a document
  async delete(collectionName, id) {
    const db = getDb();
    await db.collection(collectionName).doc(id).delete();
    return { id };
  },

  // Batch write
  async batchWrite(operations) {
    const db = getDb();
    const batch = db.batch();
    
    for (const op of operations) {
      const ref = op.id 
        ? db.collection(op.collection).doc(op.id)
        : db.collection(op.collection).doc();
      
      if (op.type === 'set') batch.set(ref, op.data);
      else if (op.type === 'update') batch.update(ref, op.data);
      else if (op.type === 'delete') batch.delete(ref);
    }
    
    await batch.commit();
    return true;
  },

  // Query with filters
  async query(collectionName, filters = [], orderByField = 'createdAt', direction = 'desc') {
    const db = getDb();
    let q = db.collection(collectionName);
    
    for (const filter of filters) {
      q = q.where(filter.field, filter.op, filter.value);
    }
    
    try {
      q = q.orderBy(orderByField, direction);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },
};

module.exports = { initializeFirebase, getDb, firestoreHelpers, admin };
