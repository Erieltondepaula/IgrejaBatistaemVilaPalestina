import { useEffect, useState } from 'react';
import { Member } from '@/types/member';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { memberSchema } from '@/lib/validations/member';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Printer, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AvatarCropDialog } from '@/components/ui/AvatarCropDialog';
import { MemberRegistrationForm } from './MemberRegistrationForm';
import { createRoot } from 'react-dom/client';
import { generateMemberCard, CardData } from '@/utils/cardGenerator';
import { API_ORIGIN, apiAssetUrl, apiUrl } from '@/lib/api';

interface MemberEditProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Member) => void;
}

type MemberFormData = z.infer<typeof memberSchema>;

const formatPhone = (phone: string | undefined): string => {
  if (!phone) return '';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return phone;
};

const formatCEP = (cep: string | undefined): string => {
  if (!cep) return '';
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length === 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}-${numbers.slice(5)}`;
  }
  return cep;
};

const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Erro ao formatar data:', e);
  }
  return '';
};

export const MemberEdit = ({ member, isOpen, onClose, onSave }: MemberEditProps) => {
  const { toast } = useToast();
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Estados para o Modal de Personalização da Carteirinha
  const [isCardConfigOpen, setIsCardConfigOpen] = useState(false);
  const [cardConfigData, setCardConfigData] = useState<CardData | null>(null);

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member || {},
  });

  useEffect(() => {
    if (member) {
      const memberWithFormattedData = {
        ...member,
        telefone: formatPhone(member.telefone),
        cep: formatCEP(member.cep),
        dataNascimento: formatDateForInput(member.dataNascimento)
      };
      form.reset(memberWithFormattedData);
    }
  }, [member, form]);

  if (!member) return null;

  const handleSave = async (data: MemberFormData) => {
    try {
      const phoneNumbers = data.telefone?.replace(/\D/g, '') || '';
      const cepNumbers = data.cep?.replace(/\D/g, '') || '';
      
      let avatarUrl = data.avatar_url;
      if (avatarUrl?.startsWith(API_ORIGIN)) {
        avatarUrl = avatarUrl.replace(API_ORIGIN, '');
      }
      
      const updatedMember = {
        ...member,
        ...data,
        telefone: phoneNumbers,
        cep: cepNumbers,
        avatar_url: avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      
      const response = await fetch(apiUrl(`/api/members/${member.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_completo: updatedMember.nomeCompleto,
          data_nascimento: updatedMember.dataNascimento,
          telefone: updatedMember.telefone,
          rua: updatedMember.endereco,
          bairro: updatedMember.bairro,
          cidade: updatedMember.cidade,
          cep: updatedMember.cep,
          status_civil: updatedMember.statusCivil,
          observacoes: updatedMember.observacoes,
          motivo_desligamento: updatedMember.motivoDesligamento,
          data_desligamento: updatedMember.dataDesligamento,
          data_batismo: updatedMember.dataBatismo,
          avatar_url: updatedMember.avatar_url,
          membro: updatedMember.membro,
          batizado: updatedMember.batizado,
          situacao_atual: updatedMember.status === 'ativo' ? 'Ativo' : 'Desligado',
          lider: updatedMember.lider,
          professor_ebq: updatedMember.professorEBQ,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao atualizar membro');
      }

      onSave(updatedMember);
      toast({
        title: "Membro atualizado",
        description: "Os dados do membro foram atualizados com sucesso."
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o membro. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleInvalidSubmit = (errors: typeof form.formState.errors) => {
    const missingFields = [
      errors.batizado && 'batizado',
      errors.membro && 'membro',
      errors.status && 'situacao_atual'
    ].filter(Boolean);

    if (missingFields.length > 0) {
      toast({
        title: 'Campos obrigatórios em branco',
        description: `Preencha: ${missingFields.join(', ')}.`,
        variant: 'destructive'
      });
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.jpg');
      formData.append('memberId', member!.id.toString());
      
      const res = await fetch(apiUrl('/api/upload-avatar'), {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro HTTP: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.avatar_url) {
        const fullUrl = apiAssetUrl(data.avatar_url);
        form.setValue('avatar_url', fullUrl);
        
        toast({
          title: "Avatar atualizado!",
          description: "A foto foi salva com sucesso.",
        });
      }
    } catch (err) {
      console.error('❌ Erro ao fazer upload do avatar:', err);
      toast({
        title: "Erro ao fazer upload",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive"
      });
    }
  };
  
  const status = form.watch('status');
  const isMembro = form.watch('membro');
  const isDesligado = status === 'desligado';

  const handlePrintForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Erro ao abrir janela",
        description: "Por favor, permita pop-ups para imprimir a ficha.",
        variant: "destructive"
      });
      return;
    }

    const currentMember = form.getValues();
    const memberData: Member = {
      ...member,
      ...currentMember
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ficha de Cadastro - ${memberData.nome}</title>
        <style>
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          @media print {
            html, body {
              height: 100% !important;
              overflow: hidden !important;
            }
            body { 
              padding: 0;
              background: white !important;
              margin: 0;
            }
            .print-controls { 
              display: none !important; 
            }
            @page {
              margin: 0;
              size: A4 portrait;
            }
            #root {
              width: 210mm !important;
              height: 296mm !important;
              max-height: 296mm !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              break-after: avoid-page !important;
            }
          }
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 9999;
          }
          .print-button, .close-button {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s;
          }
          .print-button {
            background: #10b981;
            color: white;
          }
          .print-button:hover {
            background: #059669;
          }
          .close-button {
            background: #ef4444;
            color: white;
          }
          .close-button:hover {
            background: #dc2626;
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button class="close-button" onclick="window.close()">✖ Fechar</button>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
        </div>
        <div id="root"></div>
      </body>
      </html>
    `);
    
    printWindow.document.close();

    setTimeout(() => {
      const container = printWindow.document.getElementById('root');
      if (container) {
        const root = createRoot(container);
        root.render(<MemberRegistrationForm member={memberData} />);
      }
    }, 100);
  };

  // Abre o modal de edição para impressão da carteirinha
  const openCardConfigModal = async () => {
    const currentMember = form.getValues();
    const memberData: Member = {
      ...member,
      ...currentMember
    };

    let logoUrl = '';
    let churchName = 'IGREJA BATISTA EM VILA PALESTINA';
    try {
      const res = await fetch(apiUrl('/api/church-settings'));
      if (res.ok) {
        const settings = await res.json();
        if (settings.logo_url) logoUrl = apiAssetUrl(settings.logo_url);
        if (settings.nome) churchName = settings.nome;
      }
    } catch (e) {
      console.warn('Falha ao buscar logo da igreja', e);
    }

    let ordenacaoFinal = 'Congregado';
    if (memberData.membro) {
      ordenacaoFinal = 'Membro';
    } else if (memberData.batizado) {
      ordenacaoFinal = 'Batizado Congregado';
    }

    // Identificar a função inicial baseado nas chaves
    let funcaoDefault = '';
    if (memberData.lider) funcaoDefault = 'Líder';
    else if (memberData.professorEBQ) funcaoDefault = 'Professor EBQ';

    let dataNasc = memberData.dataNascimento;
    if (dataNasc && dataNasc.includes('-')) {
      const [y, m, d] = dataNasc.split('T')[0].split('-');
      dataNasc = `${d}/${m}/${y}`;
    }

    setCardConfigData({
      nome: memberData.nomeCompleto || memberData.nome || '',
      id: memberData.id || '',
      dataNascimento: dataNasc || '',
      status: memberData.status === 'ativo' ? 'Ativo' : 'Desligado',
      statusCivil: memberData.statusCivil || '',
      batizado: memberData.batizado ? 'Sim' : 'Não',
      funcao: funcaoDefault, // Carregado do Lider/Professor ou em branco
      observacoes: memberData.observacoes || '',
      ordenao: ordenacaoFinal,
      avatar_url: memberData.avatar_url,
      logo_url: logoUrl,
      Igreja: churchName
    });

    setIsCardConfigOpen(true);
  };

  // Executa de fato a geração após a confirmação no modal
  const confirmPrintCard = async () => {
    if (!cardConfigData) return;

    try {
      toast({
        title: "Gerando carteirinha...",
        description: "Processando layout da carteirinha.",
      });

      const pdfBytes = await generateMemberCard(cardConfigData);
      
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `carteirinha-${cardConfigData.nome.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: "Carteirinha gerada e baixada com sucesso.",
      });
      
      setIsCardConfigOpen(false); // Fecha o modal após imprimir
    } catch (error) {
      console.error('Erro ao gerar carteirinha:', error);
      toast({
        title: "Erro ao gerar carteirinha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl shadow-md">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave, handleInvalidSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">

              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto/Avatar</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          {typeof field.value === 'string' && field.value ? (
                            <img
                              src={field.value}
                              alt="Avatar"
                              className="w-16 h-16 aspect-square rounded-full object-cover object-center border"
                            />
                          ) : (
                            <div className="w-16 h-16 aspect-square rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border">
                              <span className="text-xs">Selecionar</span>
                            </div>
                          )}
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSelectedImageFile(file);
                            setIsCropDialogOpen(true);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="nomeCompleto" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                  <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="sexo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
              )} />

              <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} value={field.value ?? ''} placeholder="(27) 9 9999-9999"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          if (value.length > 6) value = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3, 7)}-${value.slice(7)}`;
                          else if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                          else if (value.length > 0) value = `(${value}`;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="bairro" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        if (value.length >= 5) {
                          formatted = `${value.slice(0, 2)}.${value.slice(2, 5)}`;
                          if (value.length > 5) formatted += `-${value.slice(5, 8)}`;
                        }
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

               <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="desligado">Desligado</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
              )} />

              {isDesligado && (
                <>
                  <FormField control={form.control} name="motivoDesligamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo Desligamento</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ''} placeholder="Informe o motivo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dataDesligamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Desligamento</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              
              <FormField control={form.control} name="statusCivil" render={({ field }) => (<FormItem><FormLabel>Status Civil</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

              <FormField control={form.control} name="dataBatismo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Batismo</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="md:col-span-2">
                  <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Digite observações..." /></FormControl><FormMessage /></FormItem>)} />
              </div>

              {!isDesligado && (
                <>
                  <FormField control={form.control} name="membro" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Membro</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )} />
                   <FormField control={form.control} name="batizado" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Batizado</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isMembro} /></FormControl>
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="lider" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Líder</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="professorEBQ" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Professor EBQ</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )} />
                </>
              )}

              <DialogFooter className="md:col-span-2">
                <div className="flex justify-between w-full">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handlePrintForm} className="gap-2">
                      <Printer className="h-4 w-4" />
                      Imprimir Ficha
                    </Button>
                    <Button type="button" variant="outline" onClick={openCardConfigModal} className="gap-2 text-primary border-primary hover:bg-primary hover:text-white">
                      <CreditCard className="h-4 w-4" />
                      Imprimir Carteirinha
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar Alterações</Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
        
        <AvatarCropDialog
          isOpen={isCropDialogOpen}
          onClose={() => setIsCropDialogOpen(false)}
          imageFile={selectedImageFile}
          onCropComplete={handleCropComplete}
        />
      </Dialog>

      {/* NOVO MODAL PARA PRÉ-VISUALIZAÇÃO/EDIÇÃO DA CARTEIRINHA */}
      <Dialog open={isCardConfigOpen} onOpenChange={setIsCardConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Personalizar Carteirinha</DialogTitle>
            <DialogDescription>
              Edite os campos abaixo. Essas alterações serão aplicadas <strong>apenas na impressão</strong> da carteirinha.
            </DialogDescription>
          </DialogHeader>
          
          {cardConfigData && (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <Label>Nome Impresso</Label>
                <Input 
                  value={cardConfigData.nome} 
                  onChange={e => setCardConfigData({...cardConfigData, nome: e.target.value})} 
                />
              </div>
              
              <div>
                <Label>Data de Nascimento</Label>
                <Input 
                  value={cardConfigData.dataNascimento} 
                  onChange={e => setCardConfigData({...cardConfigData, dataNascimento: e.target.value})} 
                />
              </div>

              <div>
                <Label>Batismo</Label>
                <Input 
                  value={cardConfigData.batizado} 
                  onChange={e => setCardConfigData({...cardConfigData, batizado: e.target.value})} 
                />
              </div>
              
              <div>
                <Label>Status</Label>
                <Input 
                  value={cardConfigData.status} 
                  onChange={e => setCardConfigData({...cardConfigData, status: e.target.value})} 
                />
              </div>

              <div>
                <Label>Situação Civil</Label>
                <Input 
                  value={cardConfigData.statusCivil} 
                  onChange={e => setCardConfigData({...cardConfigData, statusCivil: e.target.value})} 
                />
              </div>

              <div>
                <Label>Função</Label>
                <Input 
                  value={cardConfigData.funcao} 
                  onChange={e => setCardConfigData({...cardConfigData, funcao: e.target.value})} 
                  placeholder="Ex: Pastor, Líder..."
                />
              </div>

              <div>
                <Label>Ordenação</Label>
                <Input 
                  value={cardConfigData.ordenao} 
                  onChange={e => setCardConfigData({...cardConfigData, ordenao: e.target.value})} 
                />
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Input 
                  value={cardConfigData.observacoes} 
                  onChange={e => setCardConfigData({...cardConfigData, observacoes: e.target.value})} 
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCardConfigOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPrintCard} className="bg-primary text-white">
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};