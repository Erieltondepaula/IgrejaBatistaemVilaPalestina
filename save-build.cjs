// Script para salvar cópia da build com timestamp
const fs = require('fs');
const path = require('path');

function formatDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${day}${month}${year}${hour}${minute}${second}`;
}

function copyFolderRecursive(source, target) {
  // Criar pasta de destino se não existir
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Ler conteúdo da pasta origem
  const files = fs.readdirSync(source);

  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      // Se for pasta, copiar recursivamente
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      // Se for arquivo, copiar
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function saveBuild() {
  const distPath = path.join(__dirname, 'dist');
  const buildPath = path.join(__dirname, 'Build');
  
  // Verificar se pasta dist existe
  if (!fs.existsSync(distPath)) {
    console.error('❌ Pasta dist não encontrada! Execute npm run build primeiro.');
    process.exit(1);
  }

  // Criar pasta Build se não existir
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath, { recursive: true });
    console.log('📁 Pasta Build criada');
  }

  // Gerar nome da pasta com timestamp
  const timestamp = formatDateTime();
  const buildName = `dist-${timestamp}`;
  const targetPath = path.join(buildPath, buildName);

  console.log('\n💾 Salvando cópia da build...');
  console.log(`📂 Origem: ${distPath}`);
  console.log(`📂 Destino: ${targetPath}`);

  try {
    const buildInfo = {
      buildId: `${timestamp}-${Date.now()}-${process.pid}`,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(
      path.join(distPath, 'build-info.json'),
      `${JSON.stringify(buildInfo, null, 2)}\n`,
      'utf8'
    );

    // Copiar pasta dist para Build com novo nome
    copyFolderRecursive(distPath, targetPath);

    // Calcular tamanho da build
    let totalSize = 0;
    function calculateSize(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += fs.statSync(filePath).size;
        }
      });
    }
    calculateSize(targetPath);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log('\n✅ Build salva com sucesso!');
    console.log(`📦 Nome: ${buildName}`);
    console.log(`📊 Tamanho: ${sizeMB} MB`);
    console.log(`📍 Local: ${targetPath}`);

    // Listar todas as builds salvas
    const builds = fs.readdirSync(buildPath).filter(name => name.startsWith('dist-'));
    console.log(`\n📚 Total de builds salvas: ${builds.length}`);
    
  } catch (error) {
    console.error('\n❌ Erro ao salvar build:', error.message);
    process.exit(1);
  }
}

function prepareBuild() {
  const buildInfoPath = path.join(__dirname, 'dist', 'build-info.json');
  if (fs.existsSync(buildInfoPath)) {
    fs.unlinkSync(buildInfoPath);
  }
}

if (process.argv.includes('--prepare')) {
  prepareBuild();
} else {
  saveBuild();
}
