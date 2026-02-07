/**
 * Admin Import Page
 * Bulk CSV import for partners, customers, products, downlines
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Download, FileText, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, Users, Package, Link2, 
  ChevronRight, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminImportPage = () => {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('partners');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [currentImport, setCurrentImport] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: false,
    updateExisting: false
  });
  
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');
  
  const importTypes = [
    { id: 'partners', label: 'Partner', icon: Users, description: 'Partner-Accounts importieren' },
    { id: 'customers', label: 'Kunden', icon: Users, description: 'Kundendaten importieren' },
    { id: 'products', label: 'Produkte', icon: Package, description: 'Produktkatalog importieren' },
    { id: 'downlines', label: 'Downlines', icon: Link2, description: 'Partner-Strukturen importieren' }
  ];
  
  const requiredFields = {
    partners: ['email', 'first_name', 'last_name'],
    customers: ['email', 'first_name', 'last_name'],
    products: ['sku', 'name', 'price'],
    downlines: ['partner_email', 'upline_email']
  };
  
  useEffect(() => {
    fetchImports();
  }, []);
  
  const fetchImports = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/imports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setImports(data.imports || []);
    } catch (error) {
      console.error('Failed to fetch imports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = async (type) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/imports/template/${type}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-template.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template heruntergeladen');
    } catch (error) {
      toast.error('Download fehlgeschlagen');
    }
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('Nur CSV-Dateien sind erlaubt');
      return;
    }
    
    setUploadProgress({ status: 'uploading', percent: 0 });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', selectedType);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/imports`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }
      
      setCurrentImport(data);
      setUploadProgress({ status: 'mapping', percent: 100 });
      
      // Auto-map columns if names match
      const autoMapping = {};
      data.headers.forEach(header => {
        const normalized = header.toLowerCase().replace(/\s+/g, '_');
        if (requiredFields[selectedType].some(f => f === normalized || header.toLowerCase() === f.replace('_', ' '))) {
          autoMapping[normalized] = header;
        } else {
          autoMapping[normalized] = header;
        }
      });
      setColumnMapping(autoMapping);
      
    } catch (error) {
      toast.error(error.message);
      setUploadProgress(null);
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const startImport = async () => {
    if (!currentImport) return;
    
    // Validate required fields are mapped
    const missing = requiredFields[selectedType].filter(
      field => !columnMapping[field]
    );
    
    if (missing.length > 0) {
      toast.error(`Fehlende Pflichtfelder: ${missing.join(', ')}`);
      return;
    }
    
    setUploadProgress({ status: 'importing', percent: 0 });
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/imports/${currentImport.importId}/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            columnMapping,
            options: importOptions
          })
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import fehlgeschlagen');
      }
      
      toast.success('Import gestartet');
      setCurrentImport(null);
      setUploadProgress(null);
      setColumnMapping({});
      
      // Poll for status
      pollImportStatus(currentImport.importId);
      
    } catch (error) {
      toast.error(error.message);
      setUploadProgress(null);
    }
  };
  
  const pollImportStatus = async (importId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/imports/${importId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        
        if (data.import.status === 'completed' || data.import.status === 'failed') {
          clearInterval(interval);
          fetchImports();
          
          if (data.import.status === 'completed') {
            toast.success(`Import abgeschlossen: ${data.import.success_count} erfolgreich`);
          } else {
            toast.error('Import fehlgeschlagen');
          }
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 2000);
  };
  
  const cancelImport = () => {
    setCurrentImport(null);
    setUploadProgress(null);
    setColumnMapping({});
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };
  
  const formatDate = (date) => new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-700">Daten-Import</h1>
        <p className="text-secondary-500 mt-1">
          Importieren Sie Partner, Kunden, Produkte oder Downline-Strukturen per CSV
        </p>
      </div>
      
      {/* Import Type Selection */}
      {!currentImport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {importTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedType === type.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-secondary-300'
              }`}
            >
              <type.icon className={`w-8 h-8 mb-2 ${
                selectedType === type.id ? 'text-primary-500' : 'text-secondary-400'
              }`} />
              <p className="font-medium text-secondary-700">{type.label}</p>
              <p className="text-xs text-secondary-500 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      )}
      
      {/* Upload Area */}
      {!currentImport && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-700">
              {importTypes.find(t => t.id === selectedType)?.label} importieren
            </h2>
            <button
              onClick={() => downloadTemplate(selectedType)}
              className="flex items-center gap-2 text-primary-500 hover:text-primary-600"
            >
              <Download className="w-4 h-4" />
              Template herunterladen
            </button>
          </div>
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-secondary-200 rounded-xl p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all"
          >
            <Upload className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-600 font-medium">
              CSV-Datei hierher ziehen oder klicken
            </p>
            <p className="text-secondary-400 text-sm mt-2">
              Max. 10MB, UTF-8 kodiert
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}
      
      {/* Column Mapping */}
      {currentImport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary-700">Spalten zuordnen</h2>
              <p className="text-secondary-500 text-sm mt-1">
                {currentImport.totalRows} Datensätze gefunden in "{currentImport.fileName}"
              </p>
            </div>
            <button
              onClick={cancelImport}
              className="text-secondary-500 hover:text-secondary-700"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Preview */}
          <div className="bg-secondary-50 rounded-lg p-4 mb-6 overflow-x-auto">
            <p className="text-sm font-medium text-secondary-600 mb-2">Vorschau:</p>
            <table className="text-sm">
              <thead>
                <tr>
                  {currentImport.headers?.map(h => (
                    <th key={h} className="px-3 py-1 text-left text-secondary-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentImport.preview?.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {currentImport.headers?.map(h => (
                      <td key={h} className="px-3 py-1 text-secondary-700">{row[h] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mapping */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {requiredFields[selectedType].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-secondary-600 mb-1">
                  {field.replace('_', ' ')} *
                </label>
                <select
                  value={columnMapping[field] || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">-- Spalte wählen --</option>
                  {currentImport.headers?.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          {/* Options */}
          <div className="flex items-center gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importOptions.skipDuplicates}
                onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-600">Duplikate überspringen</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importOptions.updateExisting}
                onChange={(e) => setImportOptions({ ...importOptions, updateExisting: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-600">Bestehende aktualisieren</span>
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={startImport}
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg flex items-center gap-2"
            >
              Import starten
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={cancelImport}
              className="px-6 py-2.5 text-secondary-600 hover:text-secondary-700"
            >
              Abbrechen
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Import History */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-secondary-700">Import-Verlauf</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-secondary-300 animate-spin mx-auto" />
          </div>
        ) : imports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-secondary-200 mx-auto mb-3" />
            <p className="text-secondary-500">Noch keine Imports vorhanden</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {imports.map(imp => (
              <div key={imp.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(imp.status)}
                  <div>
                    <p className="font-medium text-secondary-700">{imp.file_name}</p>
                    <p className="text-sm text-secondary-500">
                      {imp.type} • {formatDate(imp.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-secondary-700">
                    {imp.success_count}/{imp.total_rows} erfolgreich
                  </p>
                  {imp.error_count > 0 && (
                    <p className="text-sm text-red-500">{imp.error_count} Fehler</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminImportPage;
