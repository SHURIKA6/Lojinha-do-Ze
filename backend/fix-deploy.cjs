const { spawn } = require('child_process');

const secrets = {
  DATABASE_URL: 'postgresql://neondb_owner:npg_w6mS2xyaVsZX@ep-blue-bar-ajrpgupt-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  GEMINI_API_KEY: 'AIzaSyAbNgKNK5EFoTpEdhXTeiB-x2yt7yTyT3w',
  JWT_SECRET: 'shura_lojinha_secret_2026_9f8a7b6c5d4e3f2a'
};

async function setSecret(key, value) {
  return new Promise((resolve, reject) => {
    console.log(`\n--- Configurando ${key} ---`);
    const child = spawn('npx.cmd', ['wrangler', 'secret', 'put', key], { 
      stdio: ['pipe', 'pipe', 'inherit'],
      shell: true 
    });
    
    // Capturar saída para ver se pede confirmação
    child.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Output:', output);
      if (output.includes('Enter a secret value')) {
        child.stdin.write(value + '\n');
      }
      if (output.includes('Are you sure you want to overwrite')) {
        child.stdin.write('y\n');
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${key} configurado com sucesso.`);
        resolve();
      } else {
        console.error(`❌ Erro ao configurar ${key} (código ${code})`);
        resolve(); // Continuar para o próximo mesmo se falhar (pode já estar configurado)
      }
    });
  });
}

(async () => {
  try {
    for (const [key, value] of Object.entries(secrets)) {
      await setSecret(key, value);
    }
    
    console.log('\n🚀 Iniciando Deploy Final...');
    const deploy = spawn('npx.cmd', ['wrangler', 'deploy'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('\n✨ DEPLOY CONCLUÍDO COM SUCESSO! Site está online.');
      } else {
        console.error(`\n❌ Falha no deploy (código ${code})`);
      }
    });
  } catch (error) {
    console.error('Falha crítica:', error);
  }
})();
