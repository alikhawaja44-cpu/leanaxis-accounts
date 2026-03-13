// server/routes/crud.js
// Generic CRUD route factory - creates standard REST endpoints for any collection

const express = require('express');
const { firestoreHelpers } = require('../config/firebase');
const { requireAuth, requireWrite, requireAdmin } = require('../middleware/auth');

/**
 * Creates a router with standard CRUD endpoints for a Firestore collection.
 * 
 * @param {string} collectionName - Firestore collection name
 * @param {object} options - Options
 * @param {function} options.beforeCreate - Hook before creating a record
 * @param {function} options.beforeUpdate - Hook before updating a record
 * @param {function} options.afterCreate - Hook after creating a record
 * @param {boolean} options.adminOnly - Restrict writes/deletes to Admin
 */
function createCrudRouter(collectionName, options = {}) {
  const router = express.Router();
  const writeMiddleware = options.adminOnly ? requireAdmin : requireWrite;

  // GET / - List all records
  router.get('/', requireAuth, async (req, res) => {
    try {
      const records = await firestoreHelpers.getAll(collectionName);
      res.json(records);
    } catch (error) {
      console.error(`GET ${collectionName} error:`, error);
      res.status(500).json({ error: `Failed to fetch ${collectionName}` });
    }
  });

  // GET /:id - Get one record
  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const record = await firestoreHelpers.getById(collectionName, req.params.id);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch record' });
    }
  });

  // POST / - Create record
  router.post('/', requireAuth, writeMiddleware, async (req, res) => {
    try {
      let data = { ...req.body };
      
      // Remove undefined/null id fields
      delete data.id;
      
      // Set audit fields
      data.addedBy = req.user.username;
      
      // Run before-create hook
      if (options.beforeCreate) {
        data = await options.beforeCreate(data, req) || data;
      }

      const record = await firestoreHelpers.create(collectionName, data);
      
      // Run after-create hook
      if (options.afterCreate) {
        await options.afterCreate(record, req);
      }

      res.status(201).json(record);
    } catch (error) {
      console.error(`POST ${collectionName} error:`, error);
      res.status(500).json({ error: 'Failed to create record' });
    }
  });

  // PUT /:id - Update record
  router.put('/:id', requireAuth, writeMiddleware, async (req, res) => {
    try {
      let data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      delete data.addedBy;
      
      data.lastEditedBy = req.user.username;

      if (options.beforeUpdate) {
        data = await options.beforeUpdate(data, req) || data;
      }

      const record = await firestoreHelpers.update(collectionName, req.params.id, data);
      res.json(record);
    } catch (error) {
      console.error(`PUT ${collectionName} error:`, error);
      res.status(500).json({ error: 'Failed to update record' });
    }
  });

  // DELETE /:id - Delete record (Admin only)
  router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await firestoreHelpers.delete(collectionName, req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  return router;
}

module.exports = { createCrudRouter };
