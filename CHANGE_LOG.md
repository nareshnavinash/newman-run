## 15 January, 2026
### Version 1.6.0
#### New Features
* Added iteration data support (-d flag) for data-driven testing
* Added parallel execution with concurrency control (-p flag)
* Added Windows/cross-platform support
* Added advanced Newman options: globals, timeout, timeoutRequest, timeoutScript, delayRequest, bail, folder
* Added JUnit reporter for CI/CD integration (reports/junit/)
* Added feed file schema validation with clear error messages
* Added improved progress output with collection count and execution time

#### Bug Fixes
* Fixed rimraf v5 API breaking change (async/Promise-based)
* Fixed global variable leak in CLI entry point
* Added proper exit codes for CI/CD (exit 1 on test failures)

#### Improvements
* Test run summary with pass/fail counts displayed at the end
* All Newman options can be specified per-run in feed file
* Global CLI options merge with per-run options (per-run takes precedence)

### Version 1.5.0
* Updated Newman from v5.3.2 to v6.2.1 (breaking: requires Node.js >= 16)
* Updated newman-reporter-allure from v1.0.7 to v3.4.3 (new Allure Framework version)
* Updated allure-commandline from v2.13.0 to v2.36.0
* Updated newman-reporter-allure config option from 'export' to 'resultsDir' for compatibility
* Added newman-reporter-htmlextra as explicit dependency
* Added Node.js engine requirement (>=16) to package.json
* Updated yargs from v15.4.1 to v17.7.2
* Updated inquirer from v7.3.2 to v8.2.6
* Updated rimraf from v3.0.2 to v5.0.10
* Updated figlet from v1.5.0 to v1.8.0
* Updated chalk from v4.1.0 to v4.1.2
* Removed self-referencing newman-run dependency

## 24 July, 2020
### Version 2.0.1
* Adding method to delete the subfolders too, while clearing the results path
