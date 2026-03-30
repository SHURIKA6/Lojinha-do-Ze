'use client';

import { useState } from 'react';
import { FiDownload, FiFileText, FiTable, FiImage } from 'react-icons/fi';

/**
 * Componente para exportação de relatórios em diferentes formatos
 */
export function ExportButton({ 
  data, 
  filename = 'relatorio',
  formats = ['pdf', 'excel', 'csv'],
  onExport,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    if (exporting || disabled) return;
    
    setExporting(true);
    setIsOpen(false);
    
    try {
      if (onExport) {
        await onExport(format, data);
      } else {
        await defaultExport(format, data, filename);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
    } finally {
      setExporting(false);
    }
  };

  const defaultExport = async (format, exportData, name) => {
    switch (format) {
      case 'pdf':
        await exportToPDF(exportData, name);
        break;
      case 'excel':
        await exportToExcel(exportData, name);
        break;
      case 'csv':
        await exportToCSV(exportData, name);
        break;
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  };

  const exportToPDF = async (exportData, name) => {
    // Implementação futura com biblioteca PDF
    console.log('Exportando para PDF:', { data: exportData, filename: name });
    alert('Exportação PDF será implementada em breve!');
  };

  const exportToExcel = async (exportData, name) => {
    // Implementação futura com biblioteca Excel
    console.log('Exportando para Excel:', { data: exportData, filename: name });
    alert('Exportação Excel será implementada em breve!');
  };

  const exportToCSV = async (exportData, name) => {
    try {
      if (!exportData || !Array.isArray(exportData) || exportData.length === 0) {
        throw new Error('Dados inválidos para exportação');
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escapa aspas e vírgulas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${name}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      throw error;
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf': return <FiFileText />;
      case 'excel': return <FiTable />;
      case 'csv': return <FiTable />;
      default: return <FiDownload />;
    }
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case 'pdf': return 'PDF';
      case 'excel': return 'Excel';
      case 'csv': return 'CSV';
      default: return format.toUpperCase();
    }
  };

  return (
    <div className={`export-button ${className}`}>
      <button
        className={`export-button__trigger ${exporting ? 'export-button__trigger--exporting' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <FiDownload className={exporting ? 'animate-spin' : ''} />
        {exporting ? 'Exportando...' : 'Exportar'}
      </button>
      
      {isOpen && (
        <div className="export-button__dropdown">
          {formats.map((format) => (
            <button
              key={format}
              className="export-button__option"
              onClick={() => handleExport(format)}
              disabled={exporting}
            >
              {getFormatIcon(format)}
              {getFormatLabel(format)}
            </button>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .export-button {
          position: relative;
          display: inline-block;
        }
        
        .export-button__trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--primary-500);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .export-button__trigger:hover:not(:disabled) {
          background: var(--primary-600);
          transform: translateY(-1px);
        }
        
        .export-button__trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .export-button__trigger--exporting {
          background: var(--gray-400);
        }
        
        .export-button__dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          z-index: 50;
          min-width: 120px;
          overflow: hidden;
        }
        
        .export-button__option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .export-button__option:hover:not(:disabled) {
          background: var(--bg-secondary);
        }
        
        .export-button__option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Componente para exportação de relatórios específicos
 */
export function ReportExportButton({ reportType, data, dateRange }) {
  const getFilename = () => {
    const date = new Date().toISOString().split('T')[0];
    return `relatorio-${reportType}-${date}`;
  };

  const handleExport = async (format, exportData) => {
    // Implementação futura com relatórios específicos
    console.log(`Exportando relatório ${reportType}:`, { format, data: exportData, dateRange });
    alert(`Relatório ${reportType} em ${format.toUpperCase()} será implementado em breve!`);
  };

  return (
    <ExportButton
      data={data}
      filename={getFilename()}
      formats={['pdf', 'excel']}
      onExport={handleExport}
    />
  );
}

export default ExportButton;