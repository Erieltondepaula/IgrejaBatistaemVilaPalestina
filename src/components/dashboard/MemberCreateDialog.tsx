import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSchema } from '@/lib/validations/member';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';
import { Camera, Loader2, X } from 'lucide-react';

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface MemberCreationResponse {
  id?: string;
  message?: string;
  spreadsheetSync?: {
    success: boolean;
    created: boolean;
  };
}

const initialValues: MemberFormData = {
  nome: '',
  nomeCompleto: '',
  dataNascimento: '',
  sexo: 'M',
  status: 'ativo',
  batizado: false,
  membro: false,
  lider: false,
  professorEBQ: false,
  pequeno_grupo: false,
};

export const MemberCreateDialog = ({ open, onOpenChange, onCreated }: MemberCreateDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
      setPhoto(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [form, open]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  const handleSubmit = async (data: MemberFormData) => {
    const fullName = data.nome.trim();
    const [firstName, ...lastNames] = fullName.split(/\s+/);

    setSaving(true);
    try {
      const response = await fetch(apiUrl('/api/members'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: firstName,
          sobrenome: lastNames.join(' '),
          nome_completo: fullName,
          data_nascimento: data.dataNascimento,
          sexo: data.sexo,
          telefone: data.telefone,
          rua: data.rua || data.endereco,
          numero: data.numero,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
          status_civil: data.statusCivil,
          conjuge: data.conjuge,
          parentesco: data.parentesco,
          observacoes: data.observacoes,
          batizado: data.batizado,
          membro: data.membro,
          situacao_atual: data.status === 'ativo' ? 'Ativo' : 'Desligado',
          lider: data.lider,
          e_professor_ebq: data.professorEBQ,
          pequeno_grupo: data.pequeno_grupo,
          grupo: data.grupo,
        }),
      });

      const result: MemberCreationResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || 'Não foi possível cadastrar o membro.');
      }
      if (!result.spreadsheetSync?.success) {
        throw new Error('O servidor não confirmou a gravação do cadastro no Google Sheets.');
      }

      let photoError = '';
      if (photo) {
        try {
          if (!result.id) throw new Error('O servidor não retornou o ID do novo membro.');
          const uploadData = new FormData();
          uploadData.append('memberId', result.id);
          uploadData.append('avatar', photo);
          const uploadResponse = await fetch(apiUrl('/api/upload-avatar'), {
            method: 'POST',
            body: uploadData,
          });
          const uploadResult: { message?: string } = await uploadResponse.json().catch(() => ({}));
          if (!uploadResponse.ok) {
            throw new Error(uploadResult.message || 'Não foi possível salvar a fotografia.');
          }
        } catch (error) {
          photoError = error instanceof Error ? error.message : 'Não foi possível salvar a fotografia.';
        }
      }

      toast({
        title: photoError
          ? 'Membro cadastrado, mas a fotografia não foi salva'
          : result.spreadsheetSync.created ? 'Membro cadastrado' : 'Cadastro conciliado com a planilha',
        description: photoError
          ? `${fullName} foi cadastrado. ${photoError}`
          : result.spreadsheetSync.created
            ? `${fullName} foi salvo no PostgreSQL e incluído no Google Sheets${photo ? ', com fotografia.' : '.'}`
            : 'O registro existente na planilha foi priorizado e incluído no sistema.',
      });
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast({
        title: 'Erro ao cadastrar membro',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar novo membro</DialogTitle>
          <DialogDescription>
            O cadastro será salvo no PostgreSQL e na planilha Google Sheets configurada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} autoFocus /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataNascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento *</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sexo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="M">Masculino</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="sm:col-span-2">
              <FormLabel>Fotografia</FormLabel>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative h-20 w-20 shrink-0">
                    <img src={photoPreview} alt="Prévia da fotografia do membro" className="h-20 w-20 rounded-full border object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={() => {
                        setPhoto(null);
                        if (photoInputRef.current) photoInputRef.current.value = '';
                      }}
                      aria-label="Remover fotografia"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                    <Camera className="h-7 w-7" />
                  </div>
                )}
                <div className="space-y-1">
                  <Input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0];
                      if (!selectedFile) return;
                      if (selectedFile.size > 5 * 1024 * 1024) {
                        toast({
                          title: 'Fotografia muito grande',
                          description: 'Selecione uma imagem de até 5 MB.',
                          variant: 'destructive',
                        });
                        event.target.value = '';
                        return;
                      }
                      setPhoto(selectedFile);
                    }}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG, GIF ou WebP; até 5 MB.</p>
                </div>
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="desligado">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {([
              ['rua', 'Rua / endereço'],
              ['numero', 'Número'],
              ['bairro', 'Bairro'],
              ['cidade', 'Cidade'],
              ['estado', 'Estado'],
              ['cep', 'CEP'],
            ] as const).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="statusCivil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado civil</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conjuge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cônjuge</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {([
              ['batizado', 'Batizado'],
              ['membro', 'Membro'],
              ['lider', 'Líder'],
              ['professorEBQ', 'Professor EBQ'],
              ['pequeno_grupo', 'Participa de pequeno grupo'],
            ] as const).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">{label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar membro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
