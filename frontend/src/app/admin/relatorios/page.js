'use client';

import { useState, useEffect } from 'react';
import { getReport, formatCurrency, formatDate, getStatusLabel, getPaymentMethodLabel } from '@/lib/api';
import { FiDownload, FiPrinter, FiFileText } from 'react-icons/fi';

const reportTypes = [
  { value: 'vendas', label: 'Relatório de Vendas' },
  { value: 'estoque', label: 'Relatório de Estoque' },
  { value: 'clientes', label: 'Relatório de Clientes' },
  { value: 'financeiro', label: 'Relatório Financeiro' },
  { value: 'inadimplencia', label: 'Relatório de Inadimplência' },
];

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState('vendas');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(reportType); }, [reportType]);

  const loadReport = async (type) => {
    setLoading(true);
    try { setData(await getReport(type)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csv = '', filename = '';
    if (reportType === 'vendas') {
      csv = 'Cliente,Serviço,Dispositivo,Status,Valor,Data\n';
      data.forEach(s => { csv += `"${s.customer_name}","${s.description}","${s.device}","${getStatusLabel(s.status)}","${s.value}","${formatDate(s.created_at)}"\n`; });
      filename = 'relatorio_vendas.csv';
    } else if (reportType === 'estoque') {
      csv = 'Código,Produto,Categoria,Estoque,Mínimo,Custo,Venda,Fornecedor\n';
      data.forEach(p => { csv += `"${p.code}","${p.name}","${p.category}",${p.quantity},${p.min_stock},${p.cost_price},${p.sale_price},"${p.supplier}"\n`; });
      filename = 'relatorio_estoque.csv';
    } else if (reportType === 'clientes') {
      csv = 'Nome,Telefone,Email,CPF,Serviços,Desde\n';
      data.forEach(c => { csv += `"${c.name}","${c.phone || ''}","${c.email}","${c.cpf || ''}",${c.service_count},"${formatDate(c.created_at)}"\n`; });
      filename = 'relatorio_clientes.csv';
    } else if (reportType === 'financeiro') {
      csv = 'Data,Tipo,Categoria,Descrição,Valor\n';
      data.transactions.forEach(t => { csv += `"${formatDate(t.date)}","${t.type === 'entrada' ? 'Entrada' : 'Saída'}","${t.category}","${t.description}",${t.value}\n`; });
      filename = 'relatorio_financeiro.csv';
    } else if (reportType === 'inadimplencia') {
      csv = 'Cliente,Descrição,Total,Pago,Pendente,Status\n';
      data.payments.forEach(p => { csv += `"${p.customer_name}","${p.description}",${p.total_value},${p.paid_value},${p.remaining_value},"${getStatusLabel(p.status)}"\n`; });
      filename = 'relatorio_inadimplencia.csv';
    }
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const renderReport = () => {
    if (loading || !data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando relatório...</div>;

    switch (reportType) {
      case 'vendas':
        return (
          <table>
            <thead><tr><th>Cliente</th><th>Serviço</th><th>Dispositivo</th><th>Status</th><th>Valor</th><th>Data</th></tr></thead>
            <tbody>
              {data.map(s => (
                <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.customer_name}</td><td>{s.description}</td><td>{s.device}</td>
                  <td><span className={`badge badge--${s.status === 'concluido' || s.status === 'entregue' ? 'success' : s.status === 'em_andamento' ? 'info' : 'warning'}`}>{getStatusLabel(s.status)}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(s.value)}</td><td>{formatDate(s.created_at)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4} style={{ fontWeight: 700, textAlign: 'right' }}>Total:</td><td style={{ fontWeight: 800 }}>{formatCurrency(data.reduce((s, sv) => s + parseFloat(sv.value), 0))}</td><td></td></tr></tfoot>
          </table>
        );
      case 'estoque':
        return (
          <table>
            <thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Custo</th><th>Venda</th><th>Status</th></tr></thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id}>
                  <td><code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontSize: 'var(--font-xs)' }}>{p.code}</code></td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.category}</td>
                  <td style={{ fontWeight: 700, color: p.quantity <= p.min_stock ? 'var(--danger-500)' : 'var(--success-600)' }}>{p.quantity}</td>
                  <td>{formatCurrency(p.cost_price)}</td><td>{formatCurrency(p.sale_price)}</td>
                  <td><span className={`badge ${p.quantity === 0 ? 'badge--danger' : p.quantity <= p.min_stock ? 'badge--warning' : 'badge--success'}`}>{p.quantity === 0 ? 'Esgotado' : p.quantity <= p.min_stock ? 'Baixo' : 'OK'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'clientes':
        return (
          <table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>CPF</th><th>Serviços</th><th>Desde</th></tr></thead>
            <tbody>
              {data.map(c => (
                <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.phone}</td><td>{c.email}</td><td>{c.cpf || '—'}</td>
                  <td><span className="badge badge--info">{c.service_count}</span></td><td>{formatDate(c.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        );
      case 'financeiro':
        return (
          <div>
            <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--success-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>Entradas</div>
                <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--success-600)' }}>{formatCurrency(data.total_income)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--danger-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>Saídas</div>
                <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--danger-500)' }}>{formatCurrency(data.total_expense)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>Lucro</div>
                <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: data.profit >= 0 ? 'var(--success-600)' : 'var(--danger-500)' }}>{formatCurrency(data.profit)}</div>
              </div>
            </div>
            <table>
              <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead>
              <tbody>
                {data.transactions.map(t => (
                  <tr key={t.id}><td>{formatDate(t.date)}</td>
                    <td><span className={`badge ${t.type === 'entrada' ? 'badge--success' : 'badge--danger'}`}>{t.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td>{t.category}</td><td>{t.description}</td>
                    <td style={{ fontWeight: 700, color: t.type === 'entrada' ? 'var(--success-600)' : 'var(--danger-500)' }}>{formatCurrency(t.value)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'inadimplencia':
        return (
          <div>
            <div style={{ background: 'var(--danger-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>Total em Inadimplência</div>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--danger-500)' }}>{formatCurrency(data.total_pending)}</div>
            </div>
            <table>
              <thead><tr><th>Cliente</th><th>Descrição</th><th>Total</th><th>Pago</th><th>Pendente</th><th>Status</th></tr></thead>
              <tbody>
                {data.payments.map(p => (
                  <tr key={p.id}><td style={{ fontWeight: 600 }}>{p.customer_name}</td><td>{p.description}</td>
                    <td>{formatCurrency(p.total_value)}</td><td style={{ color: 'var(--success-600)' }}>{formatCurrency(p.paid_value)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-500)' }}>{formatCurrency(p.remaining_value)}</td>
                    <td><span className={`badge badge--${p.status === 'parcial' ? 'warning' : 'danger'}`}>{getStatusLabel(p.status)}</span></td></tr>
                ))}
                {data.payments.length === 0 && <tr><td colSpan={6} className="table-empty">Nenhuma inadimplência 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div><h1>Relatórios</h1><p className="page-header__subtitle">Gere relatórios detalhados do seu negócio</p></div>
        <div className="page-header__actions">
          <button className="btn btn--secondary" onClick={() => window.print()}><FiPrinter /> Imprimir</button>
          <button className="btn btn--primary" onClick={handleExportCSV}><FiDownload /> Exportar CSV</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {reportTypes.map(r => (
          <button key={r.value} className={`tab ${reportType === r.value ? 'active' : ''}`} onClick={() => setReportType(r.value)}>{r.label}</button>
        ))}
      </div>

      <div className="table-container" id="report-content">
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <FiFileText /><h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{reportTypes.find(r => r.value === reportType)?.label}</h3>
          </div>
          <div className="table-responsive">{renderReport()}</div>
        </div>
      </div>
    </div>
  );
}
