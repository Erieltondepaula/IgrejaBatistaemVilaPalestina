const db = require('./config/postgresql');
const fs = require('fs');
const path = require('path');
const DatabaseBackupService = require('./services/DatabaseBackupService');

(async () => {
  try {
    const backupDir = DatabaseBackupService.getBackupDirectory();
    
    // Verificar se argumento foi passado
    let backupFile = process.argv[2];
    
    if (!backupFile) {
      // Buscar backup mais recente
      console.log('🔍 Buscando backup mais recente...\n');
      
      if (!fs.existsSync(backupDir)) {
        console.error('❌ Pasta de backups não encontrada!');
        console.log('💡 Execute primeiro: node backup-database.js');
        process.exit(1);
      }
      
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length === 0) {
        console.error('❌ Nenhum backup encontrado!');
        console.log('💡 Execute primeiro: node backup-database.js');
        process.exit(1);
      }
      
      backupFile = files[0].name;
      console.log(`✅ Backup mais recente: ${backupFile}`);
    }
    
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup não encontrado: ${backupFile}`);
      process.exit(1);
    }
    
    console.log(`📂 Restaurando de: ${backupFile}\n`);
    
    // Ler arquivo de backup
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📊 Backup contém: ${backupData.total_membros} membros`);
    console.log(`📅 Criado em: ${new Date(backupData.timestamp).toLocaleString('pt-BR')}`);
    
    await db.connect();
    
    // Verificar estado atual do banco
    const current = await db.query('SELECT COUNT(*) as total FROM membros');
    console.log(`🗄️ Membros no banco atual: ${current[0].total}`);
    
    console.log('\n⚠️ ATENÇÃO: O banco será limpo e os dados do backup serão restaurados!');
    console.log('🔄 Iniciando restauração em 3 segundos...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Limpar banco
    await db.execute('DELETE FROM membros');
    console.log('🗑️ Banco limpo');
    
    // Restaurar membros
    let restored = 0;
    const batchSize = 10;
    
    for (let i = 0; i < backupData.membros.length; i += batchSize) {
      const batch = backupData.membros.slice(i, i + batchSize);
      
      for (const membro of batch) {
        try {
          // Preparar campos
          const campos = Object.keys(membro).filter(k => k !== 'created_at' && k !== 'updated_at');
          const valores = campos.map(k => membro[k]);
          const placeholders = campos.map((_, idx) => `$${idx + 1}`).join(', ');
          
          const sql = `
            INSERT INTO membros (${campos.join(', ')}, created_at, updated_at)
            VALUES (${placeholders}, NOW(), NOW())
          `;
          
          await db.execute(sql, valores);
          restored++;
          
          if (restored % 20 === 0) {
            process.stdout.write(`\r💾 Restaurando: ${restored}/${backupData.total_membros}`);
          }
        } catch (error) {
          console.error(`\n⚠️ Erro ao restaurar ${membro.nome_completo}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Restaurados: ${restored}/${backupData.total_membros} membros`);
    
    // Verificar após restauração
    const after = await db.query('SELECT COUNT(*) as total FROM membros');
    console.log(`🗄️ Membros no banco após restauração: ${after[0].total}`);
    
    // Mostrar alguns exemplos
    if (after[0].total > 0) {
      const exemplos = await db.query('SELECT id, nome_completo, avatar_url FROM membros LIMIT 5');
      console.log('\n👥 Primeiros membros restaurados:');
      exemplos.forEach((m, i) => {
        console.log(`   ${i+1}. ${m.nome_completo} (ID: ${m.id})`);
      });
    }
    
    console.log('\n✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
    
    await db.close();
    process.exit(0);
  } catch(e) {
    console.error('❌ Erro ao restaurar backup:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
