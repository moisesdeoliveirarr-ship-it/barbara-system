const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../historico.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS aviso (id INTEGER PRIMARY KEY, texto TEXT, expira_em INTEGER, criado_em INTEGER)`);
  db.run(`ALTER TABLE aviso ADD COLUMN expira_em INTEGER`, () => {});
});

function getAviso() {
  return new Promise((resolve) => {
    const agora = Math.floor(Date.now() / 1000);
    db.get(`SELECT texto, expira_em FROM aviso WHERE id = 1`, [], (err, row) => {
      if (!row) return resolve(null);
      if (row.expira_em && agora > row.expira_em) {
        db.run(`DELETE FROM aviso WHERE id = 1`);
        return resolve(null);
      }
      resolve(row.texto);
    });
  });
}

function setAviso(texto, expiraEm = null) {
  return new Promise((resolve) => {
    db.run(
      `INSERT OR REPLACE INTO aviso (id, texto, expira_em, criado_em) VALUES (1, ?, ?, strftime('%s','now'))`,
      [texto, expiraEm],
      resolve
    );
  });
}

function limparAviso() {
  return new Promise((resolve) => {
    db.run(`DELETE FROM aviso WHERE id = 1`, resolve);
  });
}

module.exports = { getAviso, setAviso, limparAviso };
