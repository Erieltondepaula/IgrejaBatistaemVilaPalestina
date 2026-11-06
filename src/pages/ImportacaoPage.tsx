import React, { useEffect, useState } from 'react';
import ImportacaoInterativa from '@/components/ImportacaoInterativa';
import { GoogleSheetsSync } from '@/components/dashboard/GoogleSheetsSync';
import { ImportExport } from '@/components/dashboard/ImportExport';
import { useAppContext } from '@/contexts/useAppContext';

const ImportacaoPage: React.FC = () => {
  const { members, filters, onImport, onReplaceAll } = useAppContext();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const updateDeviceMode = () => setIsMobile(mobileQuery.matches);
    mobileQuery.addEventListener('change', updateDeviceMode);
    return () => mobileQuery.removeEventListener('change', updateDeviceMode);
  }, []);

  if (isMobile) {
    return (
      <div className="mx-auto max-w-xl p-4">
        <div className="rounded-lg border bg-card p-5 text-center">
          <h1 className="text-lg font-semibold">Importação disponível no desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Importar, editar e remover cadastros fica restrito ao computador. No celular, você pode consultar os dados.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* 🔄 Sincronização Google Sheets */}
        <GoogleSheetsSync />
        
        {/* 📤 Importação Manual (XLSX/CSV) */}
        <ImportExport 
          members={members}
          filters={filters}
          onImport={onImport}
          onReplaceAll={onReplaceAll}
        />
        
        {/* 📋 Importação Interativa Manual */}
        <ImportacaoInterativa />
      </div>
    </div>
  );
};

export default ImportacaoPage;