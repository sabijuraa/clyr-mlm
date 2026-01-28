import { query } from '../config/database.js';
import * as payoutService from '../services/payout.service.js';

/**
 * CLYR Payout Controller
 * Handles payout management for partners and admin
 */

/**
 * Get partner's own payout history
 */
export const getMyPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const result = await payoutService.getPartnerPayoutHistory(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Auszahlungen'
    });
  }
};

/**
 * Request a payout (partner)
 */
export const requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const result = await payoutService.createPayoutRequest(req.user.id, amount);

    res.status(201).json({
      success: true,
      message: 'Auszahlungsanfrage wurde erstellt',
      data: result.payout
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler bei der Auszahlungsanfrage'
    });
  }
};

/**
 * Get payout details with commissions
 */
export const getPayoutDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get payout
    const payoutResult = await query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.company,
              u.country, u.vat_id, u.is_kleinunternehmer
       FROM payouts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auszahlung nicht gefunden'
      });
    }

    const payout = payoutResult.rows[0];

    // Check permission
    if (req.user.role !== 'admin' && payout.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    // Get linked commissions
    const commissionsResult = await query(
      `SELECT c.*, o.order_number
       FROM commissions c
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.payout_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...payout,
        commissions: commissionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error getting payout details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Auszahlungsdetails'
    });
  }
};

/**
 * Download payout statement PDF
 */
export const downloadStatement = async (req, res) => {
  try {
    const { id } = req.params;

    // Check permission
    const payoutResult = await query(
      'SELECT user_id FROM payouts WHERE id = $1',
      [id]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auszahlung nicht gefunden'
      });
    }

    const payout = payoutResult.rows[0];
    if (req.user.role !== 'admin' && payout.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    const { pdfBuffer, filename } = await payoutService.generatePayoutStatement(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating statement:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Abrechnung'
    });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all pending payouts (admin)
 */
export const getPendingPayouts = async (req, res) => {
  try {
    const payouts = await payoutService.getPendingPayouts();

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('Error getting pending payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Auszahlungen'
    });
  }
};

/**
 * Get eligible partners for payout (admin)
 */
export const getEligiblePartners = async (req, res) => {
  try {
    const partners = await payoutService.getEligiblePayouts();

    res.json({
      success: true,
      data: partners
    });
  } catch (error) {
    console.error('Error getting eligible partners:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der berechtigten Partner'
    });
  }
};

/**
 * Approve payout (admin)
 */
export const approvePayout = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payout = await payoutService.approvePayout(id, req.user.id);

    res.json({
      success: true,
      message: 'Auszahlung genehmigt',
      data: payout
    });
  } catch (error) {
    console.error('Error approving payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Genehmigen'
    });
  }
};

/**
 * Cancel payout (admin)
 */
export const cancelPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const payout = await payoutService.cancelPayout(id, reason, req.user.id);

    res.json({
      success: true,
      message: 'Auszahlung storniert',
      data: payout
    });
  } catch (error) {
    console.error('Error cancelling payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Stornieren'
    });
  }
};

/**
 * Process approved payouts (admin) - generates SEPA batch
 */
export const processPayouts = async (req, res) => {
  try {
    const result = await payoutService.processPayouts();

    res.json({
      success: true,
      message: `${result.processedCount} Auszahlungen verarbeitet`,
      data: result
    });
  } catch (error) {
    console.error('Error processing payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten der Auszahlungen'
    });
  }
};

/**
 * Mark payout as completed (admin)
 */
export const completePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    
    const payout = await payoutService.completePayout(id, transactionId);

    res.json({
      success: true,
      message: 'Auszahlung abgeschlossen',
      data: payout
    });
  } catch (error) {
    console.error('Error completing payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Abschließen'
    });
  }
};

/**
 * Get payout statistics (admin)
 */
export const getPayoutStats = async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 'pending' THEN gross_amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        SUM(CASE WHEN status = 'approved' THEN gross_amount ELSE 0 END) as approved_amount,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
        SUM(CASE WHEN status = 'processing' THEN gross_amount ELSE 0 END) as processing_amount,
        COUNT(CASE WHEN status = 'completed' AND completed_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month_count,
        SUM(CASE WHEN status = 'completed' AND completed_at >= date_trunc('month', CURRENT_DATE) THEN gross_amount ELSE 0 END) as this_month_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        SUM(CASE WHEN status = 'completed' THEN gross_amount ELSE 0 END) as total_paid
      FROM payouts
    `);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        pending: {
          count: parseInt(stats.pending_count) || 0,
          amount: parseFloat(stats.pending_amount) || 0
        },
        approved: {
          count: parseInt(stats.approved_count) || 0,
          amount: parseFloat(stats.approved_amount) || 0
        },
        processing: {
          count: parseInt(stats.processing_count) || 0,
          amount: parseFloat(stats.processing_amount) || 0
        },
        thisMonth: {
          count: parseInt(stats.this_month_count) || 0,
          amount: parseFloat(stats.this_month_amount) || 0
        },
        total: {
          count: parseInt(stats.total_completed) || 0,
          amount: parseFloat(stats.total_paid) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting payout stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
};

/**
 * Run monthly payout cycle (admin/cron)
 */
export const runPayoutCycle = async (req, res) => {
  try {
    const result = await payoutService.runMonthlyPayoutCycle();

    res.json({
      success: true,
      message: `Monatlicher Auszahlungszyklus abgeschlossen`,
      data: result
    });
  } catch (error) {
    console.error('Error running payout cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen des Auszahlungszyklus'
    });
  }
};
