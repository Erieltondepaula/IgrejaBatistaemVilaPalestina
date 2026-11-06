const fs = require('fs');
const path = require('path');
const DatabaseBackupService = require('./services/DatabaseBackupService');

console.log('📋 BACKUPS DISPONÍVEIS\n');

const backupDir = DatabaseBackupService.getBackupDirectory();

if (!fs.existsSync(backupDir)) {
  console.log('❌ Pasta de backups não encontrada!');
  console.log('💡 Execute primeiro: node backup-database.js');
  process.exit(1);
}

const files = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
  .map(f => {
    const filePath = path.join(backupDir, f);
    const stats = fs.statSync(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    return {
      name: f,
      size: stats.size,
      time: stats.mtime,
      membros: data.total_membros,
      timestamp: data.timestamp
    };
  })
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.log('❌ Nenhum backup encontrado!');
  console.log('💡 Execute primeiro: node backup-database.js');
  process.exit(0);
}

console.log(`✅ Total de backups: ${files.length}\n`);

files.forEach((f, i) => {
  const isRecent = i === 0;
  const icon = isRecent ? '🆕' : '📦';
  const tag = isRecent ? ' (MAIS RECENTE)' : '';
  
  console.log(`${icon} ${f.name}${tag}`);
  console.log(`   📅 Data: ${new Date(f.time).toLocaleString('pt-BR')}`);
  console.log(`   👥 Membros: ${f.membros}`);
  console.log(`   💾 Tamanho: ${(f.size / 1024).toFixed(2)} KB`);
  console.log('');
});

console.log('💡 Para restaurar o backup mais recente:');
console.log('   node restore-database.js');
console.log('');
console.log('💡 Para restaurar um backup específico:');
console.log(`   node restore-database.js ${files[0].name}`);
