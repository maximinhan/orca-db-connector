import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifySql, stripLiteralsAndComments } from './classify.ts'

test('reads', () => {
  for (const sql of [
    'SELECT * FROM users',
    '  select 1;',
    "SELECT * FROM t WHERE name = 'drop table users'",
    '-- drop table\nSELECT 1',
    '/* insert */ SELECT 1',
    'WITH a AS (SELECT 1) SELECT * FROM a',
    'EXPLAIN SELECT * FROM t',
    'SHOW TABLES',
    'DESCRIBE users',
    'PRAGMA table_info("users")',
    'SELECT 1; SELECT 2',
    "SELECT $$insert into x$$ AS literal",
    'SELECT "insert" FROM `update`'
  ]) {
    assert.equal(classifySql(sql).kind, 'read', sql)
  }
})

test('writes', () => {
  for (const sql of [
    'INSERT INTO t VALUES (1)',
    'update t set a = 1',
    'DELETE FROM t',
    'DROP TABLE t',
    'WITH a AS (SELECT 1) INSERT INTO t SELECT * FROM a',
    'SELECT * INTO new_table FROM t',
    'EXPLAIN ANALYZE DELETE FROM t',
    'SELECT 1; DROP TABLE t',
    'PRAGMA journal_mode = wal',
    'CREATE TABLE t (a int)',
    'BEGIN; SELECT 1; COMMIT',
    'SET search_path TO x',
    'CALL do_things()'
  ]) {
    assert.equal(classifySql(sql).kind, 'write', sql)
  }
})

test('empty and statement counts', () => {
  assert.deepEqual(classifySql('   '), { kind: 'empty', keyword: null, statements: 0 })
  assert.deepEqual(classifySql('-- only a comment'), { kind: 'empty', keyword: null, statements: 0 })
  assert.equal(classifySql('SELECT 1; SELECT 2;').statements, 2)
  assert.equal(classifySql("SELECT ';' ; SELECT 2").statements, 2)
  assert.equal(classifySql('SELECT 1').keyword, 'select')
})

test('stripLiteralsAndComments keeps structure', () => {
  assert.equal(stripLiteralsAndComments("SELECT 'a''b', \"c\" FROM t -- x"), "SELECT '', \"\" FROM t ")
  assert.equal(stripLiteralsAndComments('SELECT /* hi */ 1'), 'SELECT   1')
})
