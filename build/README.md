# Building vendor/

`../vendor/` is generated: the PostgreSQL (`pg`) and MySQL (`mysql2`) drivers, each bundled into one
CommonJS file that `src/drivers/postgres.ts` and `src/drivers/mysql.ts` load with `createRequire`.
An installed Orca plugin cannot carry `node_modules` (every file is copied and hashed at install),
so the bundles are committed. SQLite needs no bundle: it uses Node's built-in `node:sqlite`.

```sh
cd build
npm ci --ignore-scripts
node build.mjs
```

The build is deterministic: the same lockfile produces the same bytes. It is not minified, because
Orca's listing policy refuses code that cannot be reviewed, and it fails if a file is over 1 MiB
(the catalog's limit). It also rewrites `../THIRD_PARTY_NOTICES.txt` from the licences of every
bundled package.

Shims under `shims/` replace two packages inside `mysql2`:

- `iconv-lite`: Node's `Buffer` decodes utf8, latin1, ascii and ucs2; other MySQL charsets fail with
  a clear message instead of shipping every legacy encoding table.
- `aws-ssl-profiles`: the RDS certificate bundle; pass explicit `ssl` options instead of a profile.

`pg-native` stays external: `pg` loads it lazily and never needs it.

To upgrade a driver, change its version in `package.json`, run `npm install` to refresh the
lockfile, rebuild, run the tests from the plugin root and bump `version` in `../orca-plugin.json`.
