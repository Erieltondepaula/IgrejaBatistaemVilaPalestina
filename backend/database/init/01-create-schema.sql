-- 🎯 SCHEMA POSTGRESQL OTIMIZADO
-- Baseado na estrutura do Access mas com melhorias

-- 🔧 Função para gerar ID personalizado
CREATE OR REPLACE FUNCTION generate_member_id(nome TEXT, nome_completo TEXT)
RETURNS TEXT AS $$
DECLARE
    primeiro_nome TEXT;
    sobrenome TEXT;
    partes_nome TEXT[];
    first_letter CHAR(1);
    second_letter CHAR(1);
    timestamp_str TEXT;
BEGIN
    -- Processar nomes
    partes_nome := string_to_array(COALESCE(nome_completo, nome, ''), ' ');
    primeiro_nome := COALESCE(partes_nome[1], '');
    
    -- Pegar sobrenome (juntar todas as partes exceto a primeira)
    IF array_length(partes_nome, 1) > 1 THEN
        sobrenome := array_to_string(partes_nome[2:], ' ');
    ELSE
        sobrenome := '';
    END IF;
    
    -- Extrair letras
    first_letter := UPPER(COALESCE(SUBSTRING(primeiro_nome FROM 1 FOR 1), 'A'));
    second_letter := UPPER(COALESCE(SUBSTRING(sobrenome FROM 1 FOR 1), 'A'));
    
    -- Gerar timestamp: YYYYMMDDHHMMSS
    timestamp_str := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    
    -- Retornar formato: AA20253010104302
    RETURN first_letter || second_letter || timestamp_str;
END;
$$ LANGUAGE plpgsql;

-- 🗃️ TABELA PRINCIPAL DE MEMBROS
CREATE TABLE IF NOT EXISTS membros (
    -- 🎯 ID PERSONALIZADO (PRIMARY KEY TEXT)
    id TEXT PRIMARY KEY,
    
    -- 👤 INFORMAÇÕES BÁSICAS
    nome VARCHAR(100) NOT NULL,
    nome_completo VARCHAR(200),
    photo_url VARCHAR(500),
    data_nascimento DATE,
    idade INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN data_nascimento IS NOT NULL THEN 
                DATE_PART('year', AGE(data_nascimento))::INTEGER 
            ELSE NULL 
        END
    ) STORED,
    mes VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN data_nascimento IS NOT NULL THEN 
                TO_CHAR(data_nascimento, 'Month') 
            ELSE NULL 
        END
    ) STORED,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    
    -- 📞 CONTATO
    telefone VARCHAR(20),
    email VARCHAR(100),
    
    -- 🏠 ENDEREÇO
    endereco VARCHAR(255),
    rua VARCHAR(150),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(50),
    cep VARCHAR(10),
    
    -- 📊 STATUS
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'desligado', 'inativo')),
    status_civil VARCHAR(20),
    conjuge VARCHAR(100),
    parentesco VARCHAR(50),
    
    -- ⛪ INFORMAÇÕES MINISTERIAIS
    batizado BOOLEAN DEFAULT FALSE,
    membro BOOLEAN DEFAULT FALSE,
    lider BOOLEAN DEFAULT FALSE,
    professor_ebq BOOLEAN DEFAULT FALSE,
    faixa_etaria VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN idade IS NULL THEN NULL
            WHEN idade <= 12 THEN 'Criança'
            WHEN idade <= 17 THEN 'Adolescente'
            WHEN idade <= 30 THEN 'Jovem'
            WHEN idade <= 59 THEN 'Adulto'
            ELSE 'Idoso'
        END
    ) STORED,
    pequeno_grupo BOOLEAN DEFAULT FALSE,
    grupo VARCHAR(100),
    numero_domes INTEGER,
    
    -- 📅 DATAS IMPORTANTES
    data_batismo DATE,
    data_membresia DATE,
    data_desligamento DATE,
    
    -- 📝 OBSERVAÇÕES
    observacoes TEXT,
    
    -- 🕐 AUDITORIA
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔧 TRIGGER para auto-gerar ID se não fornecido
CREATE OR REPLACE FUNCTION auto_generate_member_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se ID não foi fornecido, gerar automaticamente
    IF NEW.id IS NULL OR NEW.id = '' THEN
        NEW.id := generate_member_id(NEW.nome, NEW.nome_completo);
        
        -- Garantir unicidade (caso raro de conflito)
        WHILE EXISTS (SELECT 1 FROM membros WHERE id = NEW.id) LOOP
            NEW.id := generate_member_id(NEW.nome, NEW.nome_completo);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_auto_generate_member_id
    BEFORE INSERT ON membros
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_member_id();

-- 🔧 TRIGGER para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON membros
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 📊 ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_membros_nome ON membros(nome);
CREATE INDEX IF NOT EXISTS idx_membros_status ON membros(status);
CREATE INDEX IF NOT EXISTS idx_membros_data_nascimento ON membros(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_membros_sexo ON membros(sexo);
CREATE INDEX IF NOT EXISTS idx_membros_data_criacao ON membros(data_criacao);

-- 🧪 TESTE DA FUNÇÃO DE ID
DO $$
DECLARE
    test_id TEXT;
BEGIN
    -- Testar geração de ID
    test_id := generate_member_id('ABNER', 'ABNER ABADIS LIMA');
    RAISE NOTICE '🧪 ID gerado para teste: %', test_id;
    
    -- Verificar se está no formato correto (AA + 14 dígitos)
    IF test_id ~ '^[A-Z]{2}[0-9]{14}$' THEN
        RAISE NOTICE '✅ Formato de ID correto!';
    ELSE
        RAISE EXCEPTION '❌ Formato de ID incorreto: %', test_id;
    END IF;
END $$;

RAISE NOTICE '🎉 Schema PostgreSQL criado com sucesso!';
RAISE NOTICE '📋 Recursos implementados:';
RAISE NOTICE '  ✅ ID personalizado AA20253010104302';
RAISE NOTICE '  ✅ Campos calculados (idade, mês, faixa etária)';
RAISE NOTICE '  ✅ Triggers automáticos';
RAISE NOTICE '  ✅ Validações de dados';
RAISE NOTICE '  ✅ Índices de performance';