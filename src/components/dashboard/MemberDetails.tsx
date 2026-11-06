// Local do arquivo: src/components/dashboard/MemberDetails.tsx

import { useState } from 'react';
import { Member } from '@/types/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Phone, Mail, User, Heart, Users, GraduationCap, Crown, Upload } from 'lucide-react';
import { calculateAge, getStatusColor, getMemberType } from '@/utils/memberUtils';
import { MemberEdit } from './MemberEdit';

interface MemberDetailsProps {
  member: Member;
  onMemberUpdate?: (member: Member) => void;
}

export const MemberDetails = ({ member, onMemberUpdate }: MemberDetailsProps) => {
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onMemberUpdate) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      const updatedMember = { ...member, photoUrl: result, updatedAt: new Date().toISOString() };
      onMemberUpdate(updatedMember);
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleEditComplete = (updatedMember: Member) => {
    if (onMemberUpdate) {
      onMemberUpdate(updatedMember);
      setIsEditModalOpen(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Informações pessoais */}
      <Card className="rounded-xl shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="relative">
              {member.avatar_url ? (
                  <img
                  src={member.avatar_url}
                  alt={member.nome}
                  className="w-20 h-20 aspect-square rounded-full object-cover object-center border-2 border-primary"
                />
              ) : (
                <div className="w-20 h-20 aspect-square rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {onMemberUpdate && (
                <div className="absolute inset-0 hidden rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 md:flex md:cursor-pointer md:items-center md:justify-center">
                  <label htmlFor="photo-upload" className="cursor-pointer flex items-center gap-1 text-white">
                    <Upload className="h-4 w-4" />
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{member.nome}</h3>
              {member.nomeCompleto && (
                <p className="text-sm text-muted-foreground">{member.nomeCompleto}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Informações Pessoais
            </h4>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {member.dataNascimento
                  ? `${new Date(member.dataNascimento + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${calculateAge(member.dataNascimento)} anos`
                  : 'Data de nascimento não informada'}
                {member.faixaEtaria && (
                  <Badge variant="outline" className="ml-2">
                    {member.faixaEtaria}
                  </Badge>
                )}
              </span>
            </div>

            {member.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.telefone}</span>
              </div>
            )}

            {member.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.email}</span>
              </div>
            )}

            {member.statusCivil && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.statusCivil}</span>
                {member.conjuge && (
                  <span className="text-xs text-muted-foreground">({member.conjuge})</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Endereço e Status */}
      <Card className="rounded-xl shadow-md">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Endereço */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Endereço
              </h4>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <div>{member.endereco || 'Endereço não informado'}</div>
                  <div>{member.bairro || ''}{member.bairro && member.cidade ? ', ' : ''}{member.cidade || ''}</div>
                  {(member.estado || member.cep) && (
                    <div>{member.estado || ''}{member.estado && member.cep ? ' - ' : ''}{member.cep || ''}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Status e Funções */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Status e Funções
              </h4>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  style={{ color: getStatusColor(member.status) }}
                  className="rounded-xl"
                >
                  {member.status === 'ativo' ? '🟢 Ativo' : '⚪ Desligado'}
                </Badge>
                <Badge variant="secondary" className="rounded-xl">{getMemberType(member)}</Badge>
                {member.lider && (
                  <Badge variant="secondary" className="bg-warning/10 text-warning-foreground rounded-xl flex items-center">
                    <Crown className="h-3 w-3 mr-1" />
                    Líder
                  </Badge>
                )}
                {member.professorEBQ && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent-foreground rounded-xl flex items-center">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Professor EBQ
                  </Badge>
                )}
              </div>
            </div>

            {/* Observações */}
            {member.observacoes && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Observações
                </h4>
                <p className="text-sm text-muted-foreground">{member.observacoes}</p>
              </div>
            )}

            {/* Botões de ação */}
            {onMemberUpdate && (
              <div className="hidden gap-2 border-t pt-4 md:flex">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-primary text-primary-foreground hover:opacity-95 rounded-xl"
                >
                  Alterar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <MemberEdit
        member={member}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditComplete}
      />
    </div>
  );
};