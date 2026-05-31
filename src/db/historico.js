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
      atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    )
  `);
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

module.exports = { buscarHistorico, salvarMensagem, salvarContato, buscarCanal };
