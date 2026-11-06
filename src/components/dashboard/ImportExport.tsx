// Local do arquivo: src/components/dashboard/ImportExport.tsx
// ✅ CÓDIGO CORRIGIDO E SIMPLIFICADO

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Member, MemberFilters } from '@/types/member';
import { importFromExcel, exportToExcel } from '@/utils/excelUtils';
import { Upload, Download, Database } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImportExportProps {
  members: Member[];
  filteredMembers?: Member[];
  filters?: MemberFilters;
  onImport: (members: Partial<Member>[]) => Promise<boolean>;
  onReplaceAll: (members: Partial<Member>[]) => Promise<boolean>;
}

export const ImportExport = ({ members, filteredMembers, filters, onImport, onReplaceAll }: ImportExportProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      console.log('📁 Iniciando importação do arquivo:', file.name);
      
      // Importa diretamente do Excel usando a função do excelUtils
      const importedMembers = await importFromExcel(file);
      
      console.log('✅ Membros importados do Excel:', importedMembers.length);
      console.log('📊 Primeiros 3 membros:', importedMembers.slice(0, 3));
      
      if (importedMembers.length === 0) {
        throw new Error('Nenhum membro foi encontrado no arquivo');
      }

      // 🐘 Envia para PostgreSQL via contexto (retorna Promise)
      console.log('🔄 Enviando para PostgreSQL via API...');
      const success = await onReplaceAll(importedMembers);
      
      if (!success) {
        throw new Error('Falha ao enviar dados para o servidor');
      }
      
      console.log('✅ Importação concluída com sucesso!');

    } catch (error: unknown) {
      console.error('❌ Erro na importação:', error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({
        title: "Erro ao importar",
        description: `Falha ao importar planilha. Detalhe: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Importar e Exportar Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ✅ AGORA SÓ TEMOS UM BOTÃO DE IMPORTAR QUE SUBSTITUI */}
            <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={loading} className="md:col-span-1">
              <Upload className="h-4 w-4 mr-2" />
              {loading ? 'Processando...' : 'Importar Planilha (Substitui Tudo)'}
            </Button>
            <Button size="lg" onClick={() => exportToExcel(filteredMembers ?? members, 'membros-exportados')} variant="outline" className="md:col-span-1">
              <Download className="h-4 w-4 mr-2" />
              Exportar para Excel (XLSX)
            </Button>
        </div>
        <Input
            id="upload-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            ref={fileInputRef}
            className="hidden"
        />
      </CardContent>
    </Card>
  );
};