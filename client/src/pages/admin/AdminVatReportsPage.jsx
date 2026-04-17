/**
 * Admin VAT Reports Page
 * Generate and view VAT reports for DE/AT
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, RefreshCw, 
  Building2, TrendingUp, Euro, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminVatReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    country: '',
    reportType: '',
    year: new Date().getFullYear()
  });
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Januar' }, { value: 2, label: 'Februar' },
    { value: 3, label: 'März' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mai' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Dezember' }
  ];
  
  const [generateForm, setGenerateForm] = useState({
    type: 'monthly',
    year: currentYear,
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3)
  });
  
  useEffect(() => {
    fetchReports();
  }, [filters]);
  
  const fetchReports = async () => {
    try {
      const params = {};
      if (filters.country) params.country = filters.country;
      if (filters.reportType) params.reportType = filters.reportType;
      if (filters.year) params.year = filters.year;
      
      const response = await api.get('/vat-reports', { params });
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateReport = async () => {
    setGenerating(true);
    
    try {
      let endpoint = '/vat-reports/generate/';
      let body = { year: generateForm.year };
      
      switch (generateForm.type) {
        case 'monthly':
          endpoint += 'monthly';
          body.month = generateForm.month;
          break;
        case 'quarterly':
          endpoint += 'quarterly';
          body.quarter = generateForm.quarter;
          break;
        case 'annual':
          endpoint += 'annual';
          break;
      }
      
      const response = await api.post(endpoint, body);
      toast.success('Berichte wurden generiert');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Fehler beim Generieren');
    } finally {
      setGenerating(false);
    }
  };
  
  const downloadExcel = async (reportId) => {
    try {
      const response = await api.get(`/vat-reports/${reportId}/excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `USt-Bericht-${reportId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel heruntergeladen');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR'
  }).format(amount || 0);
  
  const formatPeriod = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    e.setDate(e.getDate() - 1);
    
    const startMonth = s.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    const endMonth = e.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    
    if (startMonth === endMonth) return startMonth;
    return `${s.toLocaleDateString('de-DE', { month: 'short' })} - ${endMonth}`;
  };
  
  const getReportTypeLabel = (type) => {
    switch (type) {
      case 'monthly': return 'Monatlich';
      case 'quarterly': return 'Quartal';
      case 'annual': return 'Jährlich';
      default: return type;
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-700">USt-Berichte</h1>
        <p className="text-secondary-500 mt-1">
          Umsatzsteuer-Berichte für Deutschland und Österreich
        </p>
      </div>
      
      {/* Generate New Report */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-secondary-700 mb-4">Neuen Bericht generieren</h2>
        
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-secondary-600 mb-1">Berichtsart</label>
            <select
              value={generateForm.type}
              onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
            >
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Quartal</option>
              <option value="annual">Jährlich</option>
            </select>
          </div>
          
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-secondary-600 mb-1">Jahr</label>
            <select
              value={generateForm.year}
              onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          {/* Month (for monthly) */}
          {generateForm.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Monat</label>
              <select
                value={generateForm.month}
                onChange={(e) => setGenerateForm({ ...generateForm, month: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Quarter (for quarterly) */}
          {generateForm.type === 'quarterly' && (
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Quartal</label>
              <select
                value={generateForm.quarter}
                onChange={(e) => setGenerateForm({ ...generateForm, quarter: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
              >
                <option value={1}>Q1 (Jan-Mär)</option>
                <option value={2}>Q2 (Apr-Jun)</option>
                <option value={3}>Q3 (Jul-Sep)</option>
                <option value={4}>Q4 (Okt-Dez)</option>
              </select>
            </div>
          )}
          
          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Generieren
            </button>
          </div>
        </div>
        
        <p className="text-sm text-secondary-500">
          Es werden automatisch Berichte für beide Länder (DE & AT) erstellt.
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="">Alle Länder</option>
          <option value="DE">Deutschland</option>
          <option value="AT">Österreich</option>
        </select>
        
        <select
          value={filters.reportType}
          onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="">Alle Arten</option>
          <option value="monthly">Monatlich</option>
          <option value="quarterly">Quartal</option>
          <option value="annual">Jährlich</option>
        </select>
        
        <select
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      
      {/* Reports List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-secondary-300 animate-spin mx-auto" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-secondary-200 mx-auto mb-3" />
          <p className="text-secondary-500">Keine Berichte gefunden</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map(report => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    report.country === 'DE' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <Building2 className={`w-5 h-5 ${
                      report.country === 'DE' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-700">
                      {report.country === 'DE' ? 'Deutschland' : 'Österreich'}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {getReportTypeLabel(report.report_type)} • {formatPeriod(report.period_start, report.period_end)}
                    </p>
                  </div>
                </div>
                
                {report.status === 'final' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Final
                  </span>
                )}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-secondary-50 rounded-lg p-3">
                  <p className="text-xs text-secondary-500 mb-1">Nettoumsatz</p>
                  <p className="font-semibold text-secondary-700">{formatCurrency(report.net_sales)}</p>
                </div>
                <div className="bg-secondary-50 rounded-lg p-3">
                  <p className="text-xs text-secondary-500 mb-1">MwSt.</p>
                  <p className="font-semibold text-secondary-700">{formatCurrency(report.vat_collected)}</p>
                </div>
              </div>
              
              {/* Additional Info */}
              {(parseFloat(report.reverse_charge_sales) > 0 || parseFloat(report.export_sales) > 0) && (
                <div className="text-sm text-secondary-500 space-y-1 mb-4">
                  {parseFloat(report.reverse_charge_sales) > 0 && (
                    <p>Reverse Charge: {formatCurrency(report.reverse_charge_sales)}</p>
                  )}
                  {parseFloat(report.export_sales) > 0 && (
                    <p>Exporte: {formatCurrency(report.export_sales)}</p>
                  )}
                </div>
              )}
              
              {/* Download */}
              <button
                onClick={() => downloadExcel(report.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel herunterladen
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVatReportsPage;
