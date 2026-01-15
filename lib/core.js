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
    if (`${root_json_file}`.includes('\\')) {
      console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
      this.results.errors.push({ collection: root_json_file, error: 'Windows path not supported' });
      return this.results;
    }

    const root_json = this.getRelativePath(root_json_file)
    const root_file = require(root_json)
    const run_list = root_file.runs
    console.log("!----------------------------------Files Taken to run---------------------------------------!")

    if (sync) {
      // Run collections sequentially (concurrency = 1)
      for (const value of run_list) {
        await this.runCollectionAsync(value.collection, value.environment, { iterationData: value.iterationData });
        console.log("!-------------------------------------------------------------------------------------------!")
      }
    } else {
      // Run collections in parallel with optional concurrency limit
      const tasks = run_list.map(value => () =>
        this.runCollectionAsync(value.collection, value.environment, { iterationData: value.iterationData })
      );

      if (this.concurrency > 0) {
        console.log(`Running with concurrency limit: ${this.concurrency}`);
      }

      await this.runWithConcurrency(tasks, this.concurrency);
      console.log("!-------------------------------------------------------------------------------------------!")
    }

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
      if (`${collection}`.includes('\\')) {
        console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
        this.results.errors.push({ collection, error: 'Windows path not supported' });
        resolve({ success: false, collection });
        return;
      }

      const file_name = collection.split("/");
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
		let opt = {
			collection: require(collection),
			reporters: this.reporters_list,
			reporter: {
				html: {
					// If not specified, the file will be written to `newman/` in the current working directory.
					export: this.newman_html_report_path.concat(file_name[file_name.length - 1]).concat('.html')
				},
				htmlextra: {
					export: this.newman_htmlextra_report_path.concat(file_name[file_name.length - 1]).concat('.html')
				},
				allure: {
					resultsDir: this.allure_report_path
				},
				json: {
					export: this.newman_json_report_path.concat(file_name[file_name.length - 1]).concat('.json')
				}
			},
			insecure: true,
		};
		if (environment != null) {
			opt.environment = require(environment);
		}
		// Add iteration data support for data-driven testing
		if (options.iterationData) {
			opt.iterationData = this.getRelativePath(options.iterationData);
		}
		return opt;
	}

	getRelativePath(abs_path) {
        if (abs_path.startsWith('.')) {
            return path.relative(this.current_path, files.getCurrentDirectoryBase() + abs_path.substring(2))
        } else {
            return path.relative(this.current_path, files.getCurrentDirectoryBase() + abs_path)
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
