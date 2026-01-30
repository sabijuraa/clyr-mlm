/**
 * Credit Notes Routes
 * Manage credit notes (Gutschriften) for refunds
 */

import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import creditNoteService from '../services/creditnote.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all credit notes
router.get('/', isAdmin, asyncHandler(async (req, res) => {
  const { status, customerId, startDate, endDate, page, limit } = req.query;
  const result = await creditNoteService.getCreditNotes({
    status, customerId, startDate, endDate, page, limit
  });
  res.json(result);
}));

// Get credit note by ID
router.get('/:id', isAdmin, asyncHandler(async (req, res) => {
  const creditNote = await creditNoteService.getCreditNoteById(req.params.id);
  
  if (!creditNote) {
    return res.status(404).json({ error: 'Gutschrift nicht gefunden' });
  }
  
  res.json(creditNote);
}));

// Create credit note for an order
router.post('/', isAdmin, asyncHandler(async (req, res) => {
  const { orderId, reason, lineItems } = req.body;
  
  if (!orderId || !reason) {
    return res.status(400).json({ error: 'Bestellung und Grund sind erforderlich' });
  }
  
  const creditNote = await creditNoteService.createCreditNote(
    orderId, reason, lineItems, req.user.id
  );
  
  res.status(201).json(creditNote);
}));

// Download credit note PDF
router.get('/:id/pdf', isAdmin, asyncHandler(async (req, res) => {
  const creditNote = await creditNoteService.getCreditNoteById(req.params.id);
  
  if (!creditNote) {
    return res.status(404).json({ error: 'Gutschrift nicht gefunden' });
  }
  
  const pdfBuffer = await creditNoteService.generateCreditNotePDF(creditNote);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Gutschrift-${creditNote.credit_note_number}.pdf"`);
  res.send(pdfBuffer);
}));

// Get credit notes for an order
router.get('/order/:orderId', isAdmin, asyncHandler(async (req, res) => {
  const creditNotes = await creditNoteService.getCreditNotesByOrder(req.params.orderId);
  res.json(creditNotes);
}));

export default router;
