/**
 * VAT Reports Routes
 * Generate and manage VAT reports for DE/AT
 */

import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import vatReportService from '../services/vatreport.service.js';

const router = express.Router();

// All routes require admin/accounting authentication
router.use(authenticate);
router.use(isAdmin);

// ============================================
// REPORT GENERATION
// ============================================

// Generate monthly reports
router.post('/generate/monthly', asyncHandler(async (req, res) => {
  const { year, month } = req.body;
  
  if (!year || !month) {
    return res.status(400).json({ error: 'Jahr und Monat sind erforderlich' });
  }
  
  const reports = await vatReportService.generateMonthlyReports(year, month);
  res.json(reports);
}));

// Generate quarterly reports
router.post('/generate/quarterly', asyncHandler(async (req, res) => {
  const { year, quarter } = req.body;
  
  if (!year || !quarter) {
    return res.status(400).json({ error: 'Jahr und Quartal sind erforderlich' });
  }
  
  const reports = await vatReportService.generateQuarterlyReports(year, quarter);
  res.json(reports);
}));

// Generate annual reports
router.post('/generate/annual', asyncHandler(async (req, res) => {
  const { year } = req.body;
  
  if (!year) {
    return res.status(400).json({ error: 'Jahr ist erforderlich' });
  }
  
  const reports = await vatReportService.generateAnnualReports(year);
  res.json(reports);
}));

// ============================================
// REPORT RETRIEVAL
// ============================================

// Get all reports
router.get('/', asyncHandler(async (req, res) => {
  const { country, reportType, year, page, limit } = req.query;
  const result = await vatReportService.getVatReports({
    country, reportType, year, page, limit
  });
  res.json(result);
}));

// Download report as Excel
router.get('/:id/excel', asyncHandler(async (req, res) => {
  const workbook = await vatReportService.generateVatReportExcel(req.params.id);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="USt-Bericht-${req.params.id}.xlsx"`);
  
  await workbook.xlsx.write(res);
  res.end();
}));

export default router;
