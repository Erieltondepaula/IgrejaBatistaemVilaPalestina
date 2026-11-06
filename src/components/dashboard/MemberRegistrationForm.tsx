// Componente para gerar ficha de cadastro de membro para impressão
// Local: src/components/dashboard/MemberRegistrationForm.tsx
// ✅ CÓDIGO DEFINITIVO E AJUSTADO MILIMETRICAMENTE PARA IMPRESSÃO EM 1 PÁGINA

import { Member } from '@/types/member';
import { calculateAge } from '@/utils/memberUtils';
import { ChurchSettings } from '@/types/churchSettings';
import { useEffect, useState } from 'react';
import { apiAssetUrl, apiUrl } from '@/lib/api';

interface MemberRegistrationFormProps {
  member: Member;
  churchSettings?: ChurchSettings;
}

export const MemberRegistrationForm = ({ member, churchSettings: propChurchSettings }: MemberRegistrationFormProps) => {
  const [churchSettings, setSettings] = useState<ChurchSettings | null>(propChurchSettings || null);

  useEffect(() => {
    if (!propChurchSettings) {
      fetch(apiUrl('/api/church-settings'))
        .then(res => res.json())
        .then(data => setSettings(data))
        .catch(err => console.error('Erro ao carregar configurações:', err));
    }
  }, [propChurchSettings]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const age = calculateAge(member.dataNascimento);

  const nome = churchSettings?.nome || 'Igreja Evangélica Quadrangular';
  const denominacao = churchSettings?.denominacao || 'Templo Central de Cariacica';
  const telefone = churchSettings?.telefone || '';
  const email = churchSettings?.email || 'cariacica@ieqcariacica.com.br';
  const endereco = churchSettings?.endereco || 'Rua Principal, Centro';
  const cidadeCompleta = churchSettings?.cidade && churchSettings?.estado 
    ? `${churchSettings.cidade}, ${churchSettings.estado}, ${churchSettings.pais || 'Brasil'}`
    : 'Cariacica, ES, Brasil';
  const logoUrl = churchSettings?.logo_url 
    ? apiAssetUrl(churchSettings.logo_url)
    : null;

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      width: '210mm',
      height: '296mm',
      maxHeight: '296mm',
      margin: '0 auto',
      backgroundColor: '#fff',
      border: '3px solid #005b7f',
      display: 'flex',         
      flexDirection: 'column', 
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
      colorAdjust: 'exact',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      boxSizing: 'border-box',
      overflow: 'hidden',
      minHeight: 0
    } as React.CSSProperties}>
      
      {/* Cabeçalho Azul */}
      <div style={{
        background: 'linear-gradient(135deg, #005b7f 0%, #0077a3 100%)',
        backgroundColor: '#005b7f',
        color: '#fff',
        padding: '18px 40px 14px 40px',
        position: 'relative',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorAdjust: 'exact',
        fontWeight: 700,
        fontSize: '18px',
        letterSpacing: '1.5px',
        flexShrink: 0
      } as React.CSSProperties}>
        <div style={{
          position: 'absolute',
          bottom: '-35px',
          left: 0,
          width: '100%',
          height: '60px',
          backgroundColor: '#1aa399',
          borderRadius: '50% 50% 0 0',
          transform: 'scaleX(1.5)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          colorAdjust: 'exact'
        } as React.CSSProperties} />
        
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          letterSpacing: '2px',
          color: '#fff',
          textShadow: '0 2px 6px #00334d88',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '2px', color: '#fff' }}>
            Ficha de Cadastro de Membros
          </div>
        </div>
      </div>

      {/* Informações da Igreja */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '12px 30px',
        backgroundColor: '#fff',
        borderBottom: '2px solid #1aa399',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl ? (
            <img 
              src={logoUrl}
              alt="Logo"
              style={{ width: '45px', height: '45px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ fontSize: '35px' }}>⛪</div>
          )}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#005b7f' }}>
              {nome}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {denominacao}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
          <div>{telefone}</div>
          <div>{email}</div>
          <div>{endereco}</div>
          <div>{cidadeCompleta}</div>
        </div>
      </div>

      {/* Corpo do Formulário */}
      <div style={{ 
        padding: '25px 30px', 
        position: 'relative', 
        flex: 1,                  
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',          
        flexDirection: 'column', 
        gap: '22px' 
      }}>
        
        {/* Dados Pessoais com Foto */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#005b7f',
            borderBottom: '2px solid #005b7f',
            paddingBottom: '4px',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}>
            Dados Pessoais
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flexShrink: 0 }}>
              {member.avatar_url ? (
                <img 
                  src={apiAssetUrl(member.avatar_url)}
                  alt={member.nome}
                  style={{ width: '90px', height: '110px', objectFit: 'cover', border: '2px solid #005b7f', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ width: '90px', height: '110px', backgroundColor: '#f0f0f0', border: '2px solid #005b7f', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#ccc' }}>
                  👤
                </div>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0', width: '50%' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '110px' }}>Nome Completo:</span>
                        <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                          {member.nomeCompleto || member.nome}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 0 6px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '110px' }}>Data de Nascimento:</span>
                        <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px', minWidth: '80px' }}>
                          {formatDate(member.dataNascimento)}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '10px' }}>Idade:</span>
                        <span style={{ borderBottom: '1px solid #333', flexGrow: 0, paddingBottom: '2px', fontSize: '12px', minWidth: '35px', textAlign: 'center' }}>
                          {age} anos
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '110px' }}>Sexo:</span>
                        <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                          {member.sexo === 'M' ? 'Masculino' : 'Feminino'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 0 6px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '110px' }}>Status Civil:</span>
                        <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                          {member.statusCivil || ''}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Contato e Endereço */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#005b7f',
            borderBottom: '2px solid #005b7f',
            paddingBottom: '4px',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}>
            Contato e Endereço
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', width: '50%' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>Telefone:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.telefone || ''}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '6px 0 6px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>Email:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.email || ''}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }} colSpan={2}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>Endereço:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.endereco || ''}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>Cidade:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.cidade || ''}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '6px 0 6px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>Bairro:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.bairro || ''}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '80px' }}>CEP:</span>
                    <span style={{ borderBottom: '1px solid #333', flexGrow: 1, paddingBottom: '2px', fontSize: '12px' }}>
                      {member.cep || ''}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '6px 0 6px 15px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dados Eclesiásticos */}
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#005b7f',
            borderBottom: '2px solid #005b7f',
            paddingBottom: '4px',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}>
            Dados Eclesiásticos
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '12px', minWidth: '130px' }}>Status do Cadastro:</span>
            <span style={{ borderBottom: '1px solid #333', padding: '1px 12px', fontSize: '12px' }}>
              {member.status === 'ativo' ? 'Ativo' : 'Desligado'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '30px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', border: '2px solid #005b7f', backgroundColor: '#fff', borderRadius: '2px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {member.membro && (
                  <div style={{ width: '6px', height: '6px', backgroundColor: '#005b7f', borderRadius: '1px' }} />
                )}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Membro</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', border: '2px solid #005b7f', backgroundColor: '#fff', borderRadius: '2px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {member.batizado && (
                  <div style={{ width: '6px', height: '6px', backgroundColor: '#005b7f', borderRadius: '1px' }} />
                )}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Batizado</span>
            </div>
          </div>
        </div>

        {/* Observações - Se adapta de forma dinâmica e estica até o fim */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#005b7f',
            borderBottom: '2px solid #005b7f',
            paddingBottom: '4px',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}>
            Observações
          </div>
          <div style={{
            fontSize: '12px',
            lineHeight: '24px',
            border: '1.5px solid #ccc',
            borderRadius: '8px',
            padding: '12px 14px',
            background: '#fafcff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            flex: 1,
            minHeight: 0,
            boxSizing: 'border-box',
          }}>
            <div style={{ flex: 1, wordBreak: 'break-word', overflow: 'hidden' }}>
              {member.observacoes || <span style={{ color: '#bbb' }}>[Sem observações]</span>}
            </div>
            {/* Linhas pautadas flexíveis preenchendo o fundo */}
            {(!member.observacoes || member.observacoes.length < 100) && [...Array(6)].map((_, i) => (
              <div key={i} style={{ borderBottom: '1px solid #e0e0e0', height: '22px', margin: '2px 0' }}></div>
            ))}
          </div>
        </div>

        {/* Marca d'água */}
        <div style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.02,
          fontSize: '220px',
          color: '#005b7f',
          pointerEvents: 'none',
          zIndex: 0
        }}>
          ✝
        </div>
      </div>

      {/* Rodapé - Fixo na base sem absolute */}
      <div style={{
        background: 'linear-gradient(135deg, #1aa399 0%, #17c9bb 100%)',
        backgroundColor: '#1aa399',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 8px',
        fontSize: '10px',
        fontWeight: '500',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorAdjust: 'exact',
        flexShrink: 0 
      } as React.CSSProperties}>
        {endereco} - {cidadeCompleta}
      </div>
    </div>
  );
};