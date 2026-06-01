const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../historico.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT NOT NULL,
      role TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      criado_em INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_telefone ON mensagens(telefone, criado_em)`);
  db.run(`
    CREATE TABLE IF NOT EXISTS contatos (
      telefone TEXT PRIMARY KEY,
      canal TEXT NOT NULL DEFAULT 'whatsapp',
      nome TEXT,
      modo_humano INTEGER NOT NULL DEFAULT 0,
      atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    )
  `);
  // Adiciona coluna modo_humano se já existir a tabela sem ela
  db.run(`ALTER TABLE contatos ADD COLUMN modo_humano INTEGER NOT NULL DEFAULT 0`, () => {});
});

function buscarHistorico(telefone, limite = 20) {
  return new Promise((resolve) => {
    db.all(
      `SELECT role, conteudo FROM mensagens WHERE telefone = ? ORDER BY criado_em DESC LIMIT ?`,
      [telefone, limite],
      (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(rows.reverse());
      }
    );
  });
}

function salvarMensagem(telefone, role, conteudo) {
  db.run(
    'INSERT INTO mensagens (telefone, role, conteudo) VALUES (?, ?, ?)',
    [telefone, role, conteudo],
    (err) => { if (err) console.error('[db] Erro ao salvar:', err.message); }
  );
}

function salvarContato(telefone, canal, nome) {
  db.run(
    `INSERT INTO contatos (telefone, canal, nome, atualizado_em) VALUES (?, ?, ?, strftime('%s','now'))
     ON CONFLICT(telefone) DO UPDATE SET canal=excluded.canal, nome=COALESCE(excluded.nome, nome), atualizado_em=excluded.atualizado_em`,
    [telefone, canal || 'whatsapp', nome || null],
    (err) => { if (err) console.error('[db] Erro ao salvar contato:', err.message); }
  );
}

function buscarCanal(telefone) {
  return new Promise((resolve) => {
    db.get(`SELECT canal FROM contatos WHERE telefone = ?`, [telefone], (err, row) => {
      resolve(row?.canal || 'whatsapp');
    });
  });
}

function ativarModoHumano(telefone) {
  db.run(
    `INSERT INTO contatos (telefone, canal, modo_humano, atualizado_em) VALUES (?, 'whatsapp', 1, strftime('%s','now'))
     ON CONFLICT(telefone) DO UPDATE SET modo_humano=1, atualizado_em=strftime('%s','now')`,
    [telefone],
    (err) => { if (err) console.error('[db] Erro ao ativar modo humano:', err.message); }
  );
}

function desativarModoHumano(telefone) {
  return new Promise((resolve) => {
    db.run(
      `UPDATE contatos SET modo_humano=0, atualizado_em=strftime('%s','now') WHERE telefone=?`,
      [telefone],
      (err) => {
        if (err) console.error('[db] Erro ao desativar modo humano:', err.message);
        resolve();
      }
    );
  });
}

function verificarModoHumano(telefone) {
  return new Promise((resolve) => {
    db.get(`SELECT modo_humano FROM contatos WHERE telefone = ?`, [telefone], (err, row) => {
      resolve(row?.modo_humano === 1);
    });
  });
}

module.exports = { buscarHistorico, salvarMensagem, salvarContato, buscarCanal, ativarModoHumano, desativarModoHumano, verificarModoHumano };
