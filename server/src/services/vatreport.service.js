/**
 * VAT Report Service
 * Generate separated VAT reports for Germany and Austria
 * For tax compliance and submission
 */

import { query } from '../config/database.js';
import ExcelJS from 'exceljs';

/**
 * Generate VAT Report for a specific country and period
 */
export const generateVatReport = async (country, reportType, periodStart, periodEnd) => {
  // Get all orders for the period
  const ordersResult = await query(`
    SELECT 
      o.id,
      o.order_number,
      o.subtotal,
      o.vat,
      o.total,
      o.vat_rate,
      o.status,
      o.created_at,
      c.country as customer_country,
      c.vat_id as customer_vat_id,
      c.company as customer_company
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.created_at >= $1 
    AND o.created_at < $2
    AND o.status NOT IN ('cancelled', 'refunded')
    ORDER BY o.created_at
  `, [periodStart, periodEnd]);
  
  const orders = ordersResult.rows;
  
  // Initialize report data
  const reportData = {
    country,
    reportType,
    periodStart,
    periodEnd,
    netSales: 0,
    vatCollected: 0,
    reverseChargeSales: 0,
    exportSales: 0,
    breakdown: {},
    commissionPayoutsNet: 0,
    commissionPayoutsVat: 0
  };
  
  // Process orders based on country
  for (const order of orders) {
    if (country === 'DE') {
      // German report: include all German domestic sales
      if (order.customer_country === 'DE') {
        reportData.netSales += parseFloat(order.subtotal);
        reportData.vatCollected += parseFloat(order.vat);
        
        // Breakdown by VAT rate
        const rate = order.vat_rate || 19;
        if (!reportData.breakdown[rate]) {
          reportData.breakdown[rate] = { net: 0, vat: 0 };
        }
        reportData.breakdown[rate].net += parseFloat(order.subtotal);
        reportData.breakdown[rate].vat += parseFloat(order.vat);
      }
      
      // Intra-community supplies (to AT with VAT ID)
      if (order.customer_country === 'AT' && order.customer_vat_id) {
        reportData.reverseChargeSales += parseFloat(order.subtotal);
      }
      
      // Exports (to CH)
      if (order.customer_country === 'CH') {
        reportData.exportSales += parseFloat(order.subtotal);
      }
    } else if (country === 'AT') {
      // Austrian report: include Austrian domestic sales
      if (order.customer_country === 'AT') {
        if (order.customer_vat_id) {
          // B2B with reverse charge
          reportData.reverseChargeSales += parseFloat(order.subtotal);
        } else {
          // B2C with Austrian VAT
          reportData.netSales += parseFloat(order.subtotal);
          reportData.vatCollected += parseFloat(order.vat);
          
          const rate = order.vat_rate || 20;
          if (!reportData.breakdown[rate]) {
            reportData.breakdown[rate] = { net: 0, vat: 0 };
          }
          reportData.breakdown[rate].net += parseFloat(order.subtotal);
          reportData.breakdown[rate].vat += parseFloat(order.vat);
        }
      }
    }
  }
  
  // Get commission payouts for the period (for CLYR Solutions GmbH)
  if (country === 'AT') {
    const payoutsResult = await query(`
      SELECT 
        p.amount,
        u.country as partner_country,
        u.vat_id as partner_vat_id,
        u.is_kleinunternehmer
      FROM payouts p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'completed'
      AND p.completed_at >= $1
      AND p.completed_at < $2
    `, [periodStart, periodEnd]);
    
    for (const payout of payoutsResult.rows) {
      reportData.commissionPayoutsNet += parseFloat(payout.amount);
      
      // VAT on commissions depends on partner status
      if (payout.partner_country === 'AT' && !payout.is_kleinunternehmer && payout.partner_vat_id) {
        // Austrian partner with VAT ID: add 20% VAT
        reportData.commissionPayoutsVat += parseFloat(payout.amount) * 0.20;
      }
    }
  }
  
  // Save report to database
  const result = await query(`
    INSERT INTO vat_reports (
      report_type, country, period_start, period_end,
      net_sales, vat_collected, reverse_charge_sales, export_sales,
      breakdown, commission_payouts_net, commission_payouts_vat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (country, report_type, period_start) 
    DO UPDATE SET
      net_sales = $5,
      vat_collected = $6,
      reverse_charge_sales = $7,
      export_sales = $8,
      breakdown = $9,
      commission_payouts_net = $10,
      commission_payouts_vat = $11,
      updated_at = NOW()
    RETURNING *
  `, [
    reportType,
    country,
    periodStart,
    periodEnd,
    reportData.netSales,
    reportData.vatCollected,
    reportData.reverseChargeSales,
    reportData.exportSales,
    JSON.stringify(reportData.breakdown),
    reportData.commissionPayoutsNet,
    reportData.commissionPayoutsVat
  ]);
  
  return result.rows[0];
};

/**
 * Generate VAT Report Excel file
 */
export const generateVatReportExcel = async (reportId) => {
  const reportResult = await query('SELECT * FROM vat_reports WHERE id = $1', [reportId]);
  
  if (reportResult.rows.length === 0) {
    throw new Error('Bericht nicht gefunden');
  }
  
  const report = reportResult.rows[0];
  const breakdown = typeof report.breakdown === 'string' 
    ? JSON.parse(report.breakdown) 
    : report.breakdown;
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CLYR MLM Platform';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('USt-Bericht');
  
  // Header
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = `USt-Bericht ${report.country} - ${formatPeriod(report.period_start, report.period_end)}`;
  sheet.getCell('A1').font = { bold: true, size: 16 };
  
  sheet.getCell('A3').value = 'Berichtszeitraum:';
  sheet.getCell('B3').value = `${formatDate(report.period_start)} - ${formatDate(report.period_end)}`;
  
  sheet.getCell('A4').value = 'Land:';
  sheet.getCell('B4').value = report.country === 'DE' ? 'Deutschland' : 'Österreich';
  
  sheet.getCell('A5').value = 'Berichtsart:';
  sheet.getCell('B5').value = report.report_type === 'monthly' ? 'Monatlich' : 
                              report.report_type === 'quarterly' ? 'Quartal' : 'Jährlich';
  
  // Sales Summary
  sheet.getCell('A7').value = 'UMSATZÜBERSICHT';
  sheet.getCell('A7').font = { bold: true, size: 14 };
  
  let row = 9;
  
  // Breakdown by VAT rate
  sheet.getCell(`A${row}`).value = 'Steuersatz';
  sheet.getCell(`B${row}`).value = 'Nettoumsatz';
  sheet.getCell(`C${row}`).value = 'MwSt.';
  sheet.getRow(row).font = { bold: true };
  row++;
  
  for (const [rate, data] of Object.entries(breakdown)) {
    sheet.getCell(`A${row}`).value = `${rate}%`;
    sheet.getCell(`B${row}`).value = parseFloat(data.net);
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
    sheet.getCell(`C${row}`).value = parseFloat(data.vat);
    sheet.getCell(`C${row}`).numFmt = '#,##0.00 €';
    row++;
  }
  
  row++;
  sheet.getCell(`A${row}`).value = 'Steuerpflichtige Umsätze gesamt:';
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`B${row}`).value = parseFloat(report.net_sales);
  sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
  sheet.getCell(`C${row}`).value = parseFloat(report.vat_collected);
  sheet.getCell(`C${row}`).numFmt = '#,##0.00 €';
  
  row += 2;
  
  // Special categories
  if (parseFloat(report.reverse_charge_sales) > 0) {
    sheet.getCell(`A${row}`).value = 'Innergemeinschaftliche Lieferungen (Reverse Charge):';
    sheet.getCell(`B${row}`).value = parseFloat(report.reverse_charge_sales);
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
    row++;
  }
  
  if (parseFloat(report.export_sales) > 0) {
    sheet.getCell(`A${row}`).value = 'Steuerfreie Ausfuhrlieferungen (Drittland):';
    sheet.getCell(`B${row}`).value = parseFloat(report.export_sales);
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
    row++;
  }
  
  // Commission payouts (for AT)
  if (report.country === 'AT' && parseFloat(report.commission_payouts_net) > 0) {
    row += 2;
    sheet.getCell(`A${row}`).value = 'PROVISIONSAUSZAHLUNGEN';
    sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;
    
    sheet.getCell(`A${row}`).value = 'Netto Provisionen:';
    sheet.getCell(`B${row}`).value = parseFloat(report.commission_payouts_net);
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
    row++;
    
    sheet.getCell(`A${row}`).value = 'MwSt. auf Provisionen:';
    sheet.getCell(`B${row}`).value = parseFloat(report.commission_payouts_vat);
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 €';
  }
  
  // Auto-width columns
  sheet.columns.forEach(column => {
    column.width = 25;
  });
  
  return workbook;
};

/**
 * Get VAT reports
 */
export const getVatReports = async (filters = {}) => {
  const { country, reportType, year, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  if (country) {
    params.push(country);
    whereClause += ` AND country = $${++paramCount}`;
  }
  
  if (reportType) {
    params.push(reportType);
    whereClause += ` AND report_type = $${++paramCount}`;
  }
  
  if (year) {
    params.push(`${year}-01-01`);
    params.push(`${parseInt(year) + 1}-01-01`);
    whereClause += ` AND period_start >= $${++paramCount} AND period_start < $${++paramCount}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM vat_reports ${whereClause}`,
    params
  );
  
  params.push(limit, offset);
  const result = await query(`
    SELECT * FROM vat_reports ${whereClause}
    ORDER BY period_start DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, params);
  
  return {
    reports: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pages: Math.ceil(countResult.rows[0].count / limit)
  };
};

/**
 * Generate monthly reports for both countries
 */
export const generateMonthlyReports = async (year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  const deReport = await generateVatReport('DE', 'monthly', startDate, endDate);
  const atReport = await generateVatReport('AT', 'monthly', startDate, endDate);
  
  return { deReport, atReport };
};

/**
 * Generate quarterly reports
 */
export const generateQuarterlyReports = async (year, quarter) => {
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 1);
  
  const deReport = await generateVatReport('DE', 'quarterly', startDate, endDate);
  const atReport = await generateVatReport('AT', 'quarterly', startDate, endDate);
  
  return { deReport, atReport };
};

/**
 * Generate annual reports
 */
export const generateAnnualReports = async (year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  
  const deReport = await generateVatReport('DE', 'annual', startDate, endDate);
  const atReport = await generateVatReport('AT', 'annual', startDate, endDate);
  
  return { deReport, atReport };
};

// Helper functions
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatPeriod(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  e.setDate(e.getDate() - 1); // End is exclusive, so show day before
  
  const startMonth = s.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const endMonth = e.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  
  if (startMonth === endMonth) {
    return startMonth;
  }
  return `${s.toLocaleDateString('de-DE', { month: 'short' })} - ${e.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`;
}

export default {
  generateVatReport,
  generateVatReportExcel,
  getVatReports,
  generateMonthlyReports,
  generateQuarterlyReports,
  generateAnnualReports
};
