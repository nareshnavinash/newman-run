const newman = require('newman');
const files = require('../lib/files');
const fs = require('fs')
const path = require('path');
const { rimraf } = require('rimraf');

class NewmanConfig {

    constructor(reporters, options = {}) {
      this.current_path = path.dirname(fs.realpathSync(__filename))
      this.reporters_list = reporters || ['cli', 'json', 'html', 'allure', 'htmlextra']
      this.allure_report_path = './reports/allure'
      this.newman_json_report_path = './reports/json/'
      this.newman_html_report_path = './reports/html/'
      this.newman_htmlextra_report_path = './reports/htmlextra/'
      this.results = { passed: 0, failed: 0, errors: [] }
      this.concurrency = options.concurrency || 0 // 0 = unlimited
      // Global Newman options that apply to all runs
      this.globalNewmanOptions = options.newmanOptions || {}
    }

    resetResults() {
      this.results = { passed: 0, failed: 0, errors: [] }
    }

    getResults() {
      return this.results
    }

    hasFailures() {
      return this.results.failed > 0 || this.results.errors.length > 0
    }

    // Run tasks with concurrency limit
    async runWithConcurrency(tasks, limit) {
      if (limit <= 0) {
        // No limit - run all in parallel
        return Promise.all(tasks.map(task => task()));
      }

      const results = [];
      const executing = [];

      for (const task of tasks) {
        const promise = Promise.resolve().then(() => task());
        results.push(promise);

        if (limit <= tasks.length) {
          const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
          executing.push(e);
          if (executing.length >= limit) {
            await Promise.race(executing);
          }
        }
      }

      return Promise.all(results);
    }

  async loopRun(root_json_file, sync = false) {
    console.log('Feed file taken is: ' + root_json_file);

    const root_json = this.getRelativePath(root_json_file)
    const root_file = require(root_json)
    const run_list = root_file.runs
    const totalCollections = run_list.length;

    console.log("=".repeat(80));
    console.log(`Total collections to run: ${totalCollections}`);
    console.log(`Execution mode: ${sync ? 'Sequential' : 'Parallel'}`);
    if (!sync && this.concurrency > 0) {
      console.log(`Concurrency limit: ${this.concurrency}`);
    }
    console.log("=".repeat(80));

    const startTime = Date.now();

    if (sync) {
      // Run collections sequentially (concurrency = 1)
      for (let i = 0; i < run_list.length; i++) {
        const value = run_list[i];
        console.log(`\n[${i + 1}/${totalCollections}] Starting collection...`);
        await this.runCollectionAsync(value.collection, value.environment, {
          iterationData: value.iterationData,
          globals: value.globals,
          timeout: value.timeout,
          timeoutRequest: value.timeoutRequest,
          timeoutScript: value.timeoutScript,
          delayRequest: value.delayRequest,
          bail: value.bail,
          folder: value.folder
        });
      }
    } else {
      // Run collections in parallel with optional concurrency limit
      let index = 0;
      const tasks = run_list.map(value => () => {
        index++;
        console.log(`\n[${index}/${totalCollections}] Starting collection...`);
        return this.runCollectionAsync(value.collection, value.environment, {
          iterationData: value.iterationData,
          globals: value.globals,
          timeout: value.timeout,
          timeoutRequest: value.timeoutRequest,
          timeoutScript: value.timeoutScript,
          delayRequest: value.delayRequest,
          bail: value.bail,
          folder: value.folder
        });
      });

      await this.runWithConcurrency(tasks, this.concurrency);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`\nAll collections completed in ${duration}s`);

    return this.results;
  }

  async runCollectionAsync(collection, environment = undefined, options = {}) {
    return new Promise((resolve) => {
      console.log('Collection file taken to run: ' + collection);
      if (environment != undefined) {
        console.log('Environment file taken to run: ' + environment);
        environment = this.getRelativePath(environment);
      }
      if (options.iterationData) {
        console.log('Iteration data file taken to run: ' + options.iterationData);
      }

      // Extract filename - works with both Windows and Unix paths
      const file_name = path.basename(collection);
      const resolvedCollection = this.getRelativePath(collection);

      newman.run(this.getNewmanRunOptions(resolvedCollection, environment, file_name, options), (err, summary) => {
        if (err || summary.run.error || summary.run.failures.length) {
          console.log('collection run complete with errors...');
          if (err) console.log("err", err);
          if (summary.run.error) console.log("summary.run.error", summary.run.error);
          if (summary.run.failures.length) console.log("summary.run.failures.length", summary.run.failures.length);

          this.results.failed++;
          this.results.errors.push({
            collection,
            err,
            runError: summary.run.error,
            failures: summary.run.failures
          });
          resolve({ success: false, collection, summary });
        } else {
          console.log('collection run complete!');
          this.results.passed++;
          resolve({ success: true, collection, summary });
        }
      });
    });
  }

  // Backwards compatible wrapper for sync execution
  async runCollectionSync(collection, environment = undefined) {
    const result = await this.runCollectionAsync(collection, environment);
    if (!result.success) {
      const error = new Error('collection run complete with errors...');
      error.collection = collection;
      throw error;
    }
    return result.summary;
  }

  // Backwards compatible wrapper for async execution (now returns Promise)
  runCollection(collection, environment = undefined) {
    return this.runCollectionAsync(collection, environment);
  }

	getNewmanRunOptions(collection, environment, file_name, options = {}) {
		// file_name is now a string (basename), not an array
		const reportFileName = file_name.replace(/\.json$/, '');

		// Merge global options with per-run options (per-run takes precedence)
		const mergedOptions = { ...this.globalNewmanOptions, ...options };

		let opt = {
			collection: require(collection),
			reporters: this.reporters_list,
			reporter: {
				html: {
					// If not specified, the file will be written to `newman/` in the current working directory.
					export: this.newman_html_report_path + reportFileName + '.html'
				},
				htmlextra: {
					export: this.newman_htmlextra_report_path + reportFileName + '.html'
				},
				allure: {
					resultsDir: this.allure_report_path
				},
				json: {
					export: this.newman_json_report_path + reportFileName + '.json'
				}
			},
			insecure: true,
		};

		// Add environment if provided
		if (environment != null) {
			opt.environment = require(environment);
		}

		// Add iteration data support for data-driven testing
		if (mergedOptions.iterationData) {
			opt.iterationData = this.getRelativePath(mergedOptions.iterationData);
		}

		// Add globals file
		if (mergedOptions.globals) {
			opt.globals = require(this.getRelativePath(mergedOptions.globals));
		}

		// Add timeout options
		if (mergedOptions.timeout) {
			opt.timeout = mergedOptions.timeout;
		}
		if (mergedOptions.timeoutRequest) {
			opt.timeoutRequest = mergedOptions.timeoutRequest;
		}
		if (mergedOptions.timeoutScript) {
			opt.timeoutScript = mergedOptions.timeoutScript;
		}

		// Add delay between requests
		if (mergedOptions.delayRequest) {
			opt.delayRequest = mergedOptions.delayRequest;
		}

		// Add bail option (stop on first failure)
		if (mergedOptions.bail) {
			opt.bail = mergedOptions.bail;
		}

		// Add folder filter
		if (mergedOptions.folder) {
			opt.folder = mergedOptions.folder;
		}

		return opt;
	}

	getRelativePath(abs_path) {
        // Normalize the path to handle both Windows and Unix path separators
        const normalizedPath = path.normalize(abs_path);
        const cwd = files.getCurrentDirectoryBase();

        if (normalizedPath.startsWith('.')) {
            // Relative path - resolve from current working directory
            return path.relative(this.current_path, path.join(cwd, normalizedPath.substring(2)))
        } else if (path.isAbsolute(normalizedPath)) {
            // Absolute path - use as-is but make relative to current_path
            return path.relative(this.current_path, normalizedPath)
        } else {
            // Path without ./ prefix - treat as relative to cwd
            return path.relative(this.current_path, path.join(cwd, normalizedPath))
        }
    }

    async removeDirectory(directory) {
        try {
            if (!fs.existsSync(directory)) {
                return;
            }
            console.log('Removing files from: ' + directory);
            const dirFiles = fs.readdirSync(directory);
            for (const file of dirFiles) {
                if (file !== '.keep') {
                    const filePath = path.join(directory, file);
                    await rimraf(filePath);
                }
            }
            console.log('Done clearing: ' + directory);
        } catch (e) {
            console.log('Error clearing directory, using rimraf on entire directory');
            await rimraf(directory + '/*');
        }
    }

    async clearResultsFolder() {
        await this.removeDirectory(files.getCurrentDirectoryBase() + this.allure_report_path);
        await this.removeDirectory(files.getCurrentDirectoryBase() + this.newman_html_report_path);
        await this.removeDirectory(files.getCurrentDirectoryBase() + this.newman_json_report_path);
        await this.removeDirectory(files.getCurrentDirectoryBase() + this.newman_htmlextra_report_path);
    }

}

module.exports = NewmanConfig
