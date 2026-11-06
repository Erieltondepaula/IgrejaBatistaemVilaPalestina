const db = require('../config/postgresql');
const fs = require('fs');
const path = require('path');

/**
 * Serviço de limpeza automática de avatars não utilizados
 */
class AvatarCleanupService {
  constructor() {
    this.avatarsDir = path.join(__dirname, '../../public/avatars');
    this.cleanupInterval = null;
  }

  /**
   * Executa a limpeza de avatars não utilizados
   */
  async cleanup() {
    try {
      console.log('🧹 Iniciando limpeza de avatars não utilizados...');
      
      // Buscar avatars em uso no banco de dados
      const result = await db.query(
        "SELECT DISTINCT avatar_url FROM membros WHERE avatar_url IS NOT NULL AND avatar_url != ''"
      );
      
      const avatarsEmUso = new Set();
      result.forEach(r => {
        const filename = r.avatar_url.replace('/avatars/', '');
        avatarsEmUso.add(filename);
      });
      
      console.log(`📊 Avatars em uso no banco: ${avatarsEmUso.size}`);
      
      // Verificar se o diretório existe
      if (!fs.existsSync(this.avatarsDir)) {
        console.log('⚠️  Diretório de avatars não existe ainda');
        return { removidos: 0, mantidos: 0 };
      }
      
      // Listar todos os arquivos na pasta avatars
      const arquivos = fs.readdirSync(this.avatarsDir);
      
      const removidos = [];
      const mantidos = [];
      
      arquivos.forEach(arquivo => {
        if (!avatarsEmUso.has(arquivo)) {
          // Arquivo não está em uso, remover
          const filePath = path.join(this.avatarsDir, arquivo);
          try {
            fs.unlinkSync(filePath);
            removidos.push(arquivo);
            console.log(`🗑️  Removido: ${arquivo}`);
          } catch (err) {
            console.error(`❌ Erro ao remover ${arquivo}:`, err);
          }
        } else {
          mantidos.push(arquivo);
        }
      });
      
      console.log(`✅ Limpeza concluída: ${removidos.length} removidos, ${mantidos.length} mantidos`);
      
      return {
        removidos: removidos.length,
        mantidos: mantidos.length,
        detalhes: {
          arquivosRemovidos: removidos,
          arquivosMantidos: mantidos
        }
      };
    } catch (error) {
      console.error('❌ Erro durante limpeza de avatars:', error);
      throw error;
    }
  }

  /**
   * Inicia limpeza automática periódica
   * @param {number} intervalHours - Intervalo em horas (padrão: 24h)
   */
  startAutoCleanup(intervalHours = 24) {
    if (this.cleanupInterval) {
      console.log('⚠️  Limpeza automática já está rodando');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`🤖 Limpeza automática de avatars ativada (a cada ${intervalHours}h)`);
    
    // Executar limpeza imediatamente
    this.cleanup().catch(err => {
      console.error('❌ Erro na limpeza inicial:', err);
    });
    
    // Agendar limpezas periódicas
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(err => {
        console.error('❌ Erro na limpeza periódica:', err);
      });
    }, intervalMs);
  }

  /**
   * Para a limpeza automática periódica
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Limpeza automática de avatars desativada');
    }
  }

  /**
   * Remove avatar antigo ao atualizar
   * @param {string} oldAvatarUrl - URL do avatar antigo
   * @param {string} newAvatarUrl - URL do avatar novo
   */
  async removeOldAvatar(oldAvatarUrl, newAvatarUrl) {
    try {
      if (!oldAvatarUrl || oldAvatarUrl === newAvatarUrl) {
        return false;
      }

      const oldFilename = oldAvatarUrl.replace('/avatars/', '');
      const newFilename = newAvatarUrl.replace('/avatars/', '');
      
      // Se os nomes são diferentes, remover o antigo
      if (oldFilename !== newFilename) {
        const oldFilePath = path.join(this.avatarsDir, oldFilename);
        
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`🗑️  Avatar antigo removido: ${oldFilename}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao remover avatar antigo:', error);
      return false;
    }
  }
}

// Exportar instância única (singleton)
module.exports = new AvatarCleanupService();
