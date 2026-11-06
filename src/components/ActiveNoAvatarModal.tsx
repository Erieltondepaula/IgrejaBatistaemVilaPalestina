import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/api';

interface MemberBrief {
  id: string;
  nomeCompleto?: string;
  telefone?: string;
}

export const ActiveNoAvatarModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [members, setMembers] = useState<MemberBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const url = apiUrl('/api/members/ativos-sem-avatar');
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Falha ao carregar: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const list = data.map((m: any) => ({ id: m.id, nomeCompleto: m.nomeCompleto || m.nome_completo, telefone: m.telefone }));
        setMembers(list);
      })
      .catch(err => setError(err.message || 'Erro desconhecido'))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros ATIVOS sem avatar</DialogTitle>
          <DialogDescription>Lista atualizada — apenas membros com status <strong>ativo</strong>.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading && <div>Carregando...</div>}
          {error && <div className="text-destructive">Erro: {error}</div>}
          {!loading && !error && (
            <div className="space-y-2 max-h-80 overflow-auto">
              <div className="text-sm text-muted-foreground">Total: {members.length}</div>
              <ul className="list-none divide-y">
                {members.map(m => (
                  <li key={m.id} className="py-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{m.nomeCompleto || '(sem nome)'}</div>
                      <div className="text-xs text-muted-foreground">ID: {m.id} {m.telefone ? `• ${m.telefone}` : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              window.open(apiUrl('/api/members/ativos-sem-avatar/pdf'), '_blank');
            }}>Baixar PDF</Button>
            <Button onClick={() => {
              const csv = ['nome,id,telefone', ...members.map(m => `"${(m.nomeCompleto||'').replace(/"/g,'""')}",${m.id},${m.telefone||''}`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'active_members_without_avatar.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}>Exportar CSV</Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveNoAvatarModal;
