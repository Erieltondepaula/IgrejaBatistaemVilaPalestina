// Local do arquivo: src/components/dashboard/MemberList.tsx
// ✅ CÓDIGO ATUALIZADO - Otimizado com Índice Alfabético de A a Z

import { useState, useMemo } from 'react';
import { Member, MemberFilters } from '@/types/member';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ActiveNoAvatarModal from '@/components/ActiveNoAvatarModal';
import { useToast } from '@/hooks/use-toast';
import { MemberDetails } from './MemberDetails';
import { MemberEdit } from './MemberEdit';
import { getMemberType } from '@/utils/memberUtils';
import { exportToPDF } from '@/utils/pdfUtils';
import { apiUrl } from '@/lib/api';

const ITEMS_PER_PAGE = 25;

interface MemberListProps {
  members: Member[];
  onMemberUpdate: (member: Member) => void;
  onMemberDelete: (memberId: string) => void;
  onRefresh: () => void;
  sortField: keyof Member | 'idade' | 'tipo' | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Member | 'idade' | 'tipo') => void;
  filters?: MemberFilters; 
}

const MemberTypeBadge = ({ type }: { type: string }) => {
  const getVariantClass = () => {
    switch (type) {
      case 'Membro':
        return 'bg-success/10 text-success border-success/20 hover:bg-success/10';
      case 'Batizado Congregado':
        return 'text-primary font-semibold';
      case 'Congregado':
        return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/10';
      case 'Desligado':
        return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10';
      default:
        return 'bg-muted text-muted-foreground border-border hover:bg-muted';
    }
  };

  if (type === 'Batizado Congregado') {
    return <span className={getVariantClass()}>{type}</span>
  }
  
  return <Badge className={getVariantClass()}>{type}</Badge>;
};

const getMemberFunctions = (member: Member): string => [
  member.lider ? 'Líder' : null,
  member.professorEBQ ? 'Professor EBQ' : null
].filter(Boolean).join(' · ') || 'Sem funções atribuídas';

export const MemberList = ({ members, onMemberUpdate, onMemberDelete, onRefresh, sortField, sortDirection, onSort, filters = {} }: MemberListProps) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const [isPdfConfigOpen, setIsPdfConfigOpen] = useState(false);
  const [activeNoAvatarOpen, setActiveNoAvatarOpen] = useState(false);
  const [showAge, setShowAge] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [showBirthdayWeekday, setShowBirthdayWeekday] = useState(true);
  const [showType, setShowType] = useState(true);
  const [showFunctions, setShowFunctions] = useState(() => localStorage.getItem('show-member-functions') !== 'false');
  const [showDisconnectionDetails, setShowDisconnectionDetails] = useState(true);

  const letrasAtivas = useMemo(() => {
    const conjunto = new Set<string>();
    members.forEach(m => {
      const letra = (m.nomeCompleto || m.nome || '').trim().charAt(0).toUpperCase();
      if (letra) conjunto.add(letra);
    });
    return conjunto;
  }, [members]);

  const handleLetterSelect = (letter: string | null) => {
    setSelectedLetter(letter);
    setCurrentPage(1); 
  };

  const membersFiltradosPorLetra = useMemo(() => {
    if (!selectedLetter) return members;
    return members.filter(member => {
      const nomeParaChecar = (member.nomeCompleto || member.nome || '').trim().toUpperCase();
      return nomeParaChecar.startsWith(selectedLetter);
    });
  }, [members, selectedLetter]);

  const handleOpenPdfConfig = () => {
    setIsPdfConfigOpen(true);
  };

  const handleExportPDF = async () => {
    const logoUrlRaw = localStorage.getItem('church-logo');
    const churchNameRaw = localStorage.getItem('church-name');
    const logoUrl = logoUrlRaw ? JSON.parse(logoUrlRaw) : null;
    const churchName = churchNameRaw ? JSON.parse(churchNameRaw) : 'Relatório de Membros';
    
    await exportToPDF(membersFiltradosPorLetra, filters, logoUrl, churchName, 'relatorio-membros', showAge, showPhoto, showBirthdayWeekday, showType, showDisconnectionDetails && filters.statusGeral === 'desligado');
    setIsPdfConfigOpen(false);
  };

  const totalPages = Math.ceil(membersFiltradosPorLetra.length / ITEMS_PER_PAGE);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return membersFiltradosPorLetra.slice(startIndex, endIndex);
  }, [membersFiltradosPorLetra, currentPage]);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };
  
  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setIsEditOpen(true);
  };
  
  const handleSaveEdit = (updatedMember: Member) => {
    onMemberUpdate(updatedMember);
    setIsEditOpen(false);
    setEditingMember(null);
  };

  const handleDeleteMember = async (member: Member) => {
    const name = member.nomeCompleto || member.nome || 'este membro';
    if (!window.confirm(`Deseja realmente remover o cadastro de ${name}?`)) return;

    setDeletingMemberId(member.id);
    try {
      const response = await fetch(apiUrl(`/api/members/${member.id}`), { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível remover o cadastro.');

      onMemberDelete(member.id);
      toast({ title: 'Cadastro removido', description: `${name} foi removido com sucesso.` });
    } catch (error) {
      toast({
        title: 'Erro ao remover cadastro',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setDeletingMemberId(null);
    }
  };

  return (
    <Card className="min-w-0 rounded-xl shadow-md">
      <CardHeader className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-foreground sm:text-lg">
            <span className="sm:hidden">Membros</span>
            <span className="hidden sm:inline">Lista de Membros</span>
            <span className="text-sm font-normal text-muted-foreground">{membersFiltradosPorLetra.length} registros</span>
            {totalPages > 1 && (
              <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                {currentPage}/{totalPages}
              </span>
            )}
          </CardTitle>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button variant="outline" size="icon" onClick={handleOpenPdfConfig} className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3" aria-label="Exportar para PDF" title="Exportar para PDF">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar para PDF</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setActiveNoAvatarOpen(true)} className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3" aria-label="Ativos sem avatar" title="Ativos sem avatar">
              {/* simple icon */}
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM11 6h2v6h-2V6zm0 8h2v2h-2v-2z" fill="currentColor"/></svg>
              <span className="hidden sm:inline">Ativos sem avatar</span>
            </Button>
            <Button variant="outline" size="icon" onClick={onRefresh} className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3" aria-label="Atualizar lista" title="Atualizar lista">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Atualizar Lista</span>
            </Button>
          </div>
          <div className="hidden w-full items-center justify-between gap-3 rounded-md border px-3 py-2 md:flex md:w-auto md:justify-start">
            <Label htmlFor="show-member-functions" className="cursor-pointer text-sm">Exibir funções</Label>
            <Switch
              id="show-member-functions"
              checked={showFunctions}
              onCheckedChange={(checked) => {
                setShowFunctions(checked);
                localStorage.setItem('show-member-functions', String(checked));
              }}
            />
          </div>
        </div>
        <ActiveNoAvatarModal open={activeNoAvatarOpen} onOpenChange={setActiveNoAvatarOpen} />

        <div className="md:hidden">
          <Label htmlFor="member-letter">Filtrar por inicial</Label>
          <Select value={selectedLetter || 'all'} onValueChange={value => handleLetterSelect(value === 'all' ? null : value)}>
            <SelectTrigger id="member-letter" className="mt-2 w-full">
              <SelectValue placeholder="Todas as letras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as letras</SelectItem>
              {alfabeto.map(letter => <SelectItem key={letter} value={letter}>{letter}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-2 md:flex">
          <Button
            variant={selectedLetter === null ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs font-bold rounded-md"
            onClick={() => handleLetterSelect(null)}
          >
            TODOS
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <div className="flex flex-wrap gap-1 flex-1">
            {alfabeto.map(letter => {
              const possuiMembros = letrasAtivas.has(letter);
              return (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 text-xs font-semibold rounded-md ${
                    !possuiMembros && selectedLetter !== letter ? 'opacity-35' : ''
                  }`}
                  onClick={() => handleLetterSelect(letter)}
                >
                  {letter}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead className="cursor-pointer" onClick={() => onSort('nome')}>
                  <div className="flex items-center gap-1">Nome {getSortIcon('nome')}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => onSort('dataNascimento')}>
                  <div className="flex items-center gap-1">Data Nasc. {getSortIcon('dataNascimento')}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => onSort('tipo')}>
                  <div className="flex items-center gap-1">Tipo {getSortIcon('tipo')}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => onSort('status')}>
                  <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="w-16">
                    <div className="flex items-center justify-center">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.nome}
                          className="h-10 w-10 aspect-square rounded-full object-cover object-center shadow-sm border border-gray-200"
                          style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div 
                        className={`h-10 w-10 aspect-square rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-sm ${member.avatar_url ? 'hidden' : ''}`}
                        style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
                      >
                        <span className="text-lg font-bold">
                          {member.nome?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{(member.nomeCompleto || member.nome || 'N/A').toUpperCase()}</div>
                    {showFunctions && (member.lider || member.professorEBQ) && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">{getMemberFunctions(member)}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {member.dataNascimento && (
                      <span>{new Date(member.dataNascimento).toLocaleDateString('pt-BR')}</span>
                    )}
                  </TableCell>
                  <TableCell><MemberTypeBadge type={getMemberType(member)} /></TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'ativo' ? 'default' : 'secondary'}>
                      {member.status === 'ativo' ? 'Ativo' : 'Desligado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(member)} aria-label={`Ver ${member.nomeCompleto || member.nome}`}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(member)} aria-label={`Editar ${member.nomeCompleto || member.nome}`}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(member)} disabled={deletingMemberId === member.id} aria-label={`Remover ${member.nomeCompleto || member.nome}`} title="Remover cadastro">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y md:hidden">
          {paginatedMembers.map(member => {
            const name = member.nomeCompleto || member.nome || 'Nome não informado';

            return (
              <article key={member.id} className="flex items-center gap-2 border-b border-border/70 py-2 last:border-b-0">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => handleViewDetails(member)} aria-label={`Ver detalhes de ${name}`}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {member.nome?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 max-w-[20ch] break-words text-sm font-semibold leading-tight">{name}</h3>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs leading-4 text-muted-foreground">
                      <span>{getMemberType(member)}</span>
                      <span className="mx-1">·</span>
                      <span className={member.status === 'ativo' ? 'text-emerald-700' : 'text-muted-foreground'}>
                        {member.status === 'ativo' ? 'Ativo' : 'Desligado'}
                      </span>
                    </p>
                    {member.dataNascimento && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Nascimento: {new Date(member.dataNascimento).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                </button>
              </article>
            );
          })}
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, membersFiltradosPorLetra.length)} de {membersFiltradosPorLetra.length} registros
            </div>
            <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="hidden sm:inline-flex"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="hidden items-center gap-1 sm:flex">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <span className="min-w-12 text-center text-sm tabular-nums sm:hidden">{currentPage} / {totalPages}</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="hidden sm:inline-flex"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {membersFiltradosPorLetra.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro encontrado com a letra inicial selecionada ou filtros aplicados.
          </div>
        )}
        
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Detalhes do Membro</DialogTitle></DialogHeader>
            {selectedMember && <MemberDetails member={selectedMember} onMemberUpdate={onMemberUpdate} />}
          </DialogContent>
        </Dialog>
        
        <MemberEdit member={editingMember} isOpen={isEditOpen} onClose={() => setEditingMember(null)} onSave={handleSaveEdit} />
        
        <Dialog open={isPdfConfigOpen} onOpenChange={setIsPdfConfigOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Configurações de Exportação PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="show-age" checked={showAge} onCheckedChange={(checked) => setShowAge(!!checked)} />
                <Label htmlFor="show-age" className="cursor-pointer">Incluir coluna de Idade</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-photo" checked={showPhoto} onCheckedChange={(checked) => setShowPhoto(!!checked)} />
                <Label htmlFor="show-photo" className="cursor-pointer">Incluir fotos dos membros</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-birthday-weekday" checked={showBirthdayWeekday} onCheckedChange={(checked) => setShowBirthdayWeekday(!!checked)} />
                <Label htmlFor="show-birthday-weekday" className="cursor-pointer">Incluir próximo aniversário (dia da semana)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-type" checked={showType} onCheckedChange={(checked) => setShowType(!!checked)} />
                <Label htmlFor="show-type" className="cursor-pointer">Incluir tipo de membro</Label>
              </div>
              {filters.statusGeral === 'desligado' && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-disconnection-details" checked={showDisconnectionDetails} onCheckedChange={(checked) => setShowDisconnectionDetails(!!checked)} />
                  <Label htmlFor="show-disconnection-details" className="cursor-pointer">Incluir motivo e data de desligamento</Label>
                </div>
              )}
              <div className="text-sm text-muted-foreground border-t pt-3">
                <p>📊 Total de registros filtrados: <strong>{membersFiltradosPorLetra.length}</strong></p>
                <p>📄 A ordenação e o filtro alfabético atuais serão mantidos no PDF</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPdfConfigOpen(false)}>Cancelar</Button>
              <Button onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />Exportar PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};