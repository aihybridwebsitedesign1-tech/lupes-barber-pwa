import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type ClientCSVImportModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type ParsedRow = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  error?: string;
};

export default function ClientCSVImportModal({ onClose, onSuccess }: ClientCSVImportModalProps) {
  const { language } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<{ valid: number; invalid: number } | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const detectColumns = (headers: string[]): { name?: number; firstName?: number; lastName?: number; phone?: number; email?: number } => {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
    const result: { name?: number; firstName?: number; lastName?: number; phone?: number; email?: number } = {};

    for (let i = 0; i < lowerHeaders.length; i++) {
      const h = lowerHeaders[i];
      if (h.includes('first') && h.includes('name')) result.firstName = i;
      else if (h.includes('last') && h.includes('name')) result.lastName = i;
      else if (h.includes('phone') || h.includes('tel') || h.includes('móvil')) result.phone = i;
      else if (h.includes('email') || h.includes('e-mail') || h.includes('correo')) result.email = i;
      else if ((h === 'name' || h === 'nombre' || h === 'client' || h === 'cliente') && !result.name) result.name = i;
    }

    return result;
  };

  const splitFullName = (fullName: string): { first: string; last: string } => {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { first: parts[0], last: '' };
    }
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[^\d+]/g, '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedRows([]);
      setSummary(null);
      setImportResult(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setParsing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);

      if (lines.length < 2) {
        alert(language === 'en' ? 'CSV file must have at least a header and one data row.' : 'El archivo CSV debe tener al menos un encabezado y una fila de datos.');
        setParsing(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const cols = detectColumns(headers);

      if (!cols.phone || (!cols.firstName && !cols.name)) {
        alert(
          language === 'en'
            ? 'CSV must contain at least a Name (or First Name) column and a Phone column.'
            : 'El CSV debe contener al menos una columna de Nombre (o Primer Nombre) y una columna de Teléfono.'
        );
        setParsing(false);
        return;
      }

      const rows: ParsedRow[] = [];
      let validCount = 0;
      let invalidCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

        let firstName = '';
        let lastName = '';
        let phone = '';
        let email = '';

        if (cols.firstName !== undefined) {
          firstName = cells[cols.firstName] || '';
        }
        if (cols.lastName !== undefined) {
          lastName = cells[cols.lastName] || '';
        }

        if (!firstName && cols.name !== undefined) {
          const fullName = cells[cols.name] || '';
          const { first, last } = splitFullName(fullName);
          firstName = first;
          lastName = last;
        }

        if (cols.phone !== undefined) {
          phone = normalizePhone(cells[cols.phone] || '');
        }

        if (cols.email !== undefined) {
          email = cells[cols.email] || '';
        }

        let error = '';
        if (!firstName) {
          error = language === 'en' ? 'Missing name' : 'Falta nombre';
          invalidCount++;
        } else if (!phone) {
          error = language === 'en' ? 'Missing phone' : 'Falta teléfono';
          invalidCount++;
        } else {
          validCount++;
        }

        rows.push({ first_name: firstName, last_name: lastName, phone, email, error });
      }

      setParsedRows(rows);
      setSummary({ valid: validCount, invalid: invalidCount });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert(language === 'en' ? 'Failed to parse CSV file.' : 'Error al analizar el archivo CSV.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let created = 0;
    let updated = 0;
    let failed = 0;

    try {
      const validRows = parsedRows.filter((row) => !row.error);

      for (const row of validRows) {
        try {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email')
            .eq('phone', row.phone)
            .maybeSingle();

          if (existingClient) {
            const updates: any = {};
            if (row.first_name) updates.first_name = row.first_name;
            if (row.last_name) updates.last_name = row.last_name;
            if (row.email) updates.email = row.email;

            if (Object.keys(updates).length > 0) {
              const { error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', existingClient.id);

              if (error) {
                console.error('Update error:', error);
                failed++;
              } else {
                updated++;
              }
            } else {
              updated++;
            }
          } else {
            const { error } = await supabase.from('clients').insert({
              first_name: row.first_name,
              last_name: row.last_name,
              phone: row.phone,
              email: row.email || null,
              language: 'es',
            });

            if (error) {
              console.error('Insert error:', error);
              failed++;
            } else {
              created++;
            }
          }
        } catch (err) {
          console.error('Row import error:', err);
          failed++;
        }
      }

      setImportResult({ created, updated, failed });
    } catch (error) {
      console.error('Import error:', error);
      alert(language === 'en' ? 'Import failed.' : 'Falló la importación.');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importResult && (importResult.created > 0 || importResult.updated > 0)) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Import Clients from CSV' : 'Importar Clientes desde CSV'}
        </h3>

        {!importResult && (
          <>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                borderLeft: '4px solid #0369a1',
                borderRadius: '4px',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '0.5rem' }}>
                <strong>{language === 'en' ? 'CSV Requirements:' : 'Requisitos del CSV:'}</strong>
              </p>
              <ul style={{ fontSize: '14px', color: '#0c4a6e', marginLeft: '1.5rem' }}>
                <li>
                  {language === 'en'
                    ? 'Must contain at least Name and Phone columns'
                    : 'Debe contener al menos columnas de Nombre y Teléfono'}
                </li>
                <li>{language === 'en' ? 'Email is optional' : 'Email es opcional'}</li>
                <li>
                  {language === 'en'
                    ? 'Duplicate phones will update existing clients'
                    : 'Teléfonos duplicados actualizarán clientes existentes'}
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Select CSV File' : 'Seleccionar Archivo CSV'}
              </label>
              <input type="file" accept=".csv" onChange={handleFileChange} style={{ fontSize: '14px' }} />
            </div>

            {file && !parsedRows.length && (
              <button
                onClick={handleParse}
                disabled={parsing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: parsing ? '#ccc' : '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: parsing ? 'not-allowed' : 'pointer',
                  marginBottom: '1.5rem',
                }}
              >
                {parsing
                  ? language === 'en'
                    ? 'Parsing...'
                    : 'Analizando...'
                  : language === 'en'
                  ? 'Parse & Preview'
                  : 'Analizar y Previsualizar'}
              </button>
            )}

            {summary && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Import Summary' : 'Resumen de Importación'}
                </p>
                <p style={{ fontSize: '14px', color: '#059669' }}>
                  {language === 'en' ? `Valid rows: ${summary.valid}` : `Filas válidas: ${summary.valid}`}
                </p>
                <p style={{ fontSize: '14px', color: '#dc2626' }}>
                  {language === 'en' ? `Invalid rows: ${summary.invalid}` : `Filas inválidas: ${summary.invalid}`}
                </p>
              </div>
            )}

            {parsedRows.length > 0 && (
              <>
                <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>{language === 'en' ? 'First Name' : 'Primer Nombre'}</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>{language === 'en' ? 'Last Name' : 'Apellido'}</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>{language === 'en' ? 'Phone' : 'Teléfono'}</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>{language === 'en' ? 'Status' : 'Estado'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 20).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: row.error ? '#fee' : 'white' }}>
                          <td style={{ padding: '0.5rem' }}>{row.first_name}</td>
                          <td style={{ padding: '0.5rem' }}>{row.last_name}</td>
                          <td style={{ padding: '0.5rem' }}>{row.phone}</td>
                          <td style={{ padding: '0.5rem' }}>{row.email}</td>
                          <td style={{ padding: '0.5rem', color: row.error ? '#dc2626' : '#059669' }}>
                            {row.error || (language === 'en' ? 'Valid' : 'Válido')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 20 && (
                    <p style={{ padding: '0.5rem', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                      {language === 'en'
                        ? `Showing first 20 of ${parsedRows.length} rows`
                        : `Mostrando primeras 20 de ${parsedRows.length} filas`}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing || summary?.valid === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: importing || summary?.valid === 0 ? '#ccc' : '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: importing || summary?.valid === 0 ? 'not-allowed' : 'pointer',
                    marginRight: '0.75rem',
                  }}
                >
                  {importing
                    ? language === 'en'
                      ? 'Importing...'
                      : 'Importando...'
                    : language === 'en'
                    ? 'Import Valid Rows'
                    : 'Importar Filas Válidas'}
                </button>
              </>
            )}
          </>
        )}

        {importResult && (
          <div>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                borderLeft: '4px solid #16a34a',
                borderRadius: '4px',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem', color: '#166534' }}>
                {language === 'en' ? 'Import Complete!' : '¡Importación Completa!'}
              </p>
              <p style={{ fontSize: '14px', color: '#166534' }}>
                {language === 'en' ? `Created: ${importResult.created}` : `Creados: ${importResult.created}`}
              </p>
              <p style={{ fontSize: '14px', color: '#166534' }}>
                {language === 'en' ? `Updated: ${importResult.updated}` : `Actualizados: ${importResult.updated}`}
              </p>
              {importResult.failed > 0 && (
                <p style={{ fontSize: '14px', color: '#dc2626' }}>
                  {language === 'en' ? `Failed: ${importResult.failed}` : `Fallidos: ${importResult.failed}`}
                </p>
              )}
            </div>

            <button
              onClick={handleClose}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Close' : 'Cerrar'}
            </button>
          </div>
        )}

        {!importResult && (
          <button
            onClick={handleClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#fff',
              color: '#000',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
        )}
      </div>
    </div>
  );
}
