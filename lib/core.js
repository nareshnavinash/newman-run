const newman = require('newman');
const files = require('../lib/files');
const fs = require('fs')
const path = require('path');
const rimraf = require('rimraf');

class NewmanConfig {

    constructor(reporters) {
      this.current_path = path.dirname(fs.realpathSync(__filename))
      this.reporters_list = reporters || ['cli', 'json', 'html', 'allure', 'htmlextra']
      this.allure_report_path = './reports/allure'
      this.newman_json_report_path = './reports/json/'
      this.newman_html_report_path = './reports/html/'
      this.newman_htmlextra_report_path = './reports/htmlextra/'
    }

  async loopRun(root_json_file, sync = false) {
		return (async () => {
			console.log('Feed file taken is: ' + root_json_file);
			if (`${root_json_file}`.includes('\\')) {
				console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
				process.exit(1);
			}
			
			var root_json = this.getRelativePath(root_json_file)
			var root_file = require(root_json)
			var run_list = root_file.runs
			console.log("!----------------------------------Files Taken to run---------------------------------------!")
	
			for( let value of run_list ) {
				try {
					if(sync)
						await this.runCollectionSync(value.collection, value.environment);
					else
						this.runCollection(value.collection, value.environment);
				} catch(e) {
					if(e.err != undefined)
						console.error(e.err);
				}
				console.log("!-------------------------------------------------------------------------------------------!")
			}

		})();
  }

    runCollection(collection, environment = undefined) {
      // call newman.run to pass `options` object and wait for callback
      console.log("Collection file taken to run: " + collection);
      if (environment != undefined) {
        console.log("Environment file taken to run: " + environment);
        environment = this.getRelativePath(environment);
      }
      if (`${collection}`.includes("\\")) {
        console.log(
          "newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format."
        );
        return -1;
      }
      var file_name = collection.split("/");
      collection = this.getRelativePath(collection);

      newman.run(
        this.getNewmanRunOptions(collection, environment, file_name),
        function (err, summary) {
          if (err || summary.run.error || summary.run.failures.length) {
            console.log("collection run complete with errors...");
            console.log("err", err);
            console.log("summary.run.error", summary.run.error);
            console.log("summary.run.failures.length", summary.run.failures.length);
          } else {
            console.log("collection run complete!");
          }
        }
      );
    }

  async runCollectionSync(collection, environment = undefined) {
		return new Promise((resolve, reject) => {
			// call newman.run to pass `options` object and wait for callback
			console.log('Collection file taken to run: ' + collection);
			if(environment != undefined){
				console.log('Environment file taken to run: ' + environment);
				environment = this.getRelativePath(environment);
			}
			if (`${collection}`.includes('\\')) {
				console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
				reject(1);
			}

			var file_name = collection.split("/");
			collection = this.getRelativePath(collection);
			
			newman.run(this.getNewmanRunOptions(collection, environment, file_name), function(err, summary) { 
				if (err || summary.run.error || summary.run.failures.length) {
					console.log('collection run complete with errors...');
					console.log("err", err);
					console.log("summary.run.error", summary.run.error);
					console.log("summary.run.failures.length", summary.run.failures.length);

					const error = new Error('collection run complete with errors...');
					error.err = err;
					error.summary_error = summary.run.error;
					error.summary_failures = summary.run.failures;
					reject(error);
				} else {
					console.log('collection run complete!');
					resolve(summary);
				}
			});
		});
  }

	getNewmanRunOptions(collection, environment, file_name) {
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
					export: this.allure_report_path
				},
				json: {
					export: this.newman_json_report_path.concat(file_name[file_name.length - 1]).concat('.json')
				}
			},
			insecure: true,
		};
		if(environment != null) {
			opt.environment = require(environment);
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

    removeDirectory(directory) {
        // directory = this.getRelativePath(directory)
        try {
            fs.readdir(directory, (err, files) => {
                if (err) throw err;
                console.log('Removing files from: ' + directory)
                for (const file of files) {
                    if (file != '.keep') {
                        fs.unlink(path.join(directory, file), err => {
                            if (err) {
                                console.log("Cannot clear the files from the directory using rimraf");
                                rimraf(directory + '/*', function () { console.log('done'); });
                            }
                        });
                    }
                }
            });
        }
        catch (e) {
            console.log("Cannot clear the files from the directory using rimraf");
            rimraf(directory + '/*', function () { console.log('done'); });
        }
    }

    clearResultsFolder() {
        this.removeDirectory(files.getCurrentDirectoryBase() + this.allure_report_path)
        this.removeDirectory(files.getCurrentDirectoryBase() + this.newman_html_report_path)
        this.removeDirectory(files.getCurrentDirectoryBase() + this.newman_json_report_path)
    }

}

module.exports = NewmanConfig
