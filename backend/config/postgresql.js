// 🐘 CONFIGURAÇÃO POSTGRESQL
// Substituindo o Access por PostgreSQL para melhor performance e flexibilidade

const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is required. Configure it in backend/.env.');
}

class PostgreSQLDatabase {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dashboard_membros',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      // Configurações de performance
      max: 20, // Máximo de conexões no pool
      idleTimeoutMillis: 30000, // Timeout para conexões ociosas
      connectionTimeoutMillis: 5000, // ✅ Aumentado para 5 segundos
      query_timeout: 10000, // ✅ Timeout de 10 segundos para queries
      statement_timeout: 10000, // ✅ Timeout de 10 segundos para statements
    });

    // Event handlers para debugging
    this.pool.on('connect', (client) => {
      console.log('🐘 Nova conexão PostgreSQL estabelecida');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Erro inesperado na conexão PostgreSQL:', err);
    });
  }

  // ===================================
  // CONECTAR AO BANCO
  // ===================================
  async connect() {
    try {
      // Testar conexão
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      console.log('✅ PostgreSQL conectado com sucesso!');
      console.log(`🕐 Timestamp do servidor: ${result.rows[0].current_time}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar PostgreSQL:', error);
      throw error;
    }
  }

  // ===================================
  // EXECUTAR QUERY COM RETORNO
  // ===================================
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      console.log('🔍 Executando query:', sql.substring(0, 100) + '...');
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Erro na query:', error);
      console.error('📝 SQL:', sql);
      console.error('📋 Parâmetros:', params);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===================================
  // EXECUTAR COMANDO (INSERT/UPDATE/DELETE)
  // ===================================
  async execute(sql, params = []) {
    const client = await this.pool.connect();
    try {
      console.log('⚡ Executando comando:', sql.substring(0, 100) + '...');
      const result = await client.query(sql, params);
      console.log(`✅ Comando executado: ${result.rowCount} linha(s) afetada(s)`);
      return result;
    } catch (error) {
      console.error('❌ Erro no comando:', error);
      console.error('📝 SQL:', sql);
      console.error('📋 Parâmetros:', params);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===================================
  // EXECUTAR TRANSAÇÃO
  // ===================================
  async transaction(operations) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      console.log('🔄 Iniciando transação...');
      
      const results = [];
      for (const operation of operations) {
        const result = await client.query(operation.sql, operation.params || []);
        results.push(result);
      }
      
      await client.query('COMMIT');
      console.log('✅ Transação commitada com sucesso!');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erro na transação, rollback executado:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===================================
  // FECHAR POOL DE CONEXÕES
  // ===================================
  async close() {
    await this.pool.end();
    console.log('🔒 Pool de conexões PostgreSQL fechado');
  }

  // ===================================
  // VERIFICAR SAÚDE DA CONEXÃO
  // ===================================
  async healthCheck() {
    try {
      // Simplificado: apenas verifica se consegue conectar e executar uma query leve
      const client = await this.pool.connect();
      const res = await client.query('SELECT 1 as healthy');
      client.release();
      if (!res || !res.rows) {
        return { status: 'unhealthy', timestamp: new Date().toISOString() };
      }
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Criar instância singleton
const database = new PostgreSQLDatabase();

module.exports = database;