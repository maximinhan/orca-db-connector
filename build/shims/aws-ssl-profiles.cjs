// Stands in for aws-ssl-profiles inside the mysql2 bundle (a large bundle of RDS CA
// certificates). Pass your own `ssl` options instead of a profile name.
'use strict'

module.exports = new Proxy(
  {},
  {
    get(_target, name) {
      throw new Error(`SSL profile "${String(name)}" is not bundled; give the connection explicit ssl options`)
    }
  }
)
