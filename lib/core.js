const newman = require('newman');
const files = require('../lib/files');
const fs = require('fs')
const path = require('path');
const rimraf = require('rimraf');

class NewmanConfig{

    constructor(){
        this.current_path = path.dirname(fs.realpathSync(__filename))
        this.reporters_list = ['cli', 'json', 'html', 'allure', 'htmlextra']
        this.allure_report_path = './reports/allure'
        this.newman_json_report_path = './reports/json/'
        this.newman_html_report_path = './reports/html/'
    }

    looprun(root_json_file){
        console.log('Feed file taken is: ' + root_json_file);
        if (`${root_json_file}`.includes('\\')) {
            console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
            process.exit(1);
        }
        var root_json = this.get_relative_path(root_json_file)
        var root_file = require(root_json)
        var run_list = root_file.runs
        console.log("!----------------------------------Files Taken to run---------------------------------------!")
        run_list.map(value => {
            console.log(value)
            if (value.environment == undefined) {
                this.runCollection(value.collection)
            } else {
                this.runCollectionWithEnv(value.collection, value.environment)
            }
        })
        console.log("!-------------------------------------------------------------------------------------------!")
    }

    get_relative_path(abs_path) {
        if (abs_path.startsWith('.')) {
            return path.relative(this.current_path, files.getCurrentDirectoryBase() + abs_path.substring(2))
        } else {
            return path.relative(this.current_path, files.getCurrentDirectoryBase() + abs_path)
        }
    }

    runCollectionWithEnv(collection, environment){
        // call newman.run to pass `options` object and wait for callback
        console.log('Collection file taken to run: ' + collection)
        console.log('Environment file taken to run: ' + environment)
        if (`${collection}`.includes('\\')) {
            console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
            process.exit(1);
        }
        collection = this.get_relative_path(collection)
        environment = this.get_relative_path(environment)
        var file_name = collection.split("/")
        newman.run({
            collection: require(collection),
            environment: require(environment),
            reporters: this.reporters_list,
            reporter: {
                html: {
                    export: this.newman_html_report_path.concat(file_name[file_name.length - 1]).concat('.html') // If not specified, the file will be written to `newman/` in the current working directory.
                },
                allure: {
                    export: this.allure_report_path
                },
                json: {
                    export: this.newman_json_report_path.concat(file_name[file_name.length - 1]).concat('.json')
                }
            },
            insecure: true,
        }, function(err, summary) { 
            if (err || summary.run.error || summary.run.failures.length) {
                console.log('collection run complete!');
                process.exit(1);
            } else {
                console.log('collection run complete!');
            }
        });
    }

    runCollection(collection){
        // call newman.run to pass `options` object and wait for callback
        console.log('Collection file taken to run: ' + collection)
        if (`${collection}`.includes('\\')) {
            console.log('newman-run is supported only in mac and linux environments, please try to use the package directly in a CI environment by mentioning the file path in linux format.')
            process.exit(1);
        }
        collection = this.get_relative_path(collection)
        var file_name = collection.split("/")
        newman.run({
            collection: require(collection),
            reporters: this.reporters_list,
            reporter: {
                html: {
                    export: this.newman_html_report_path.concat(file_name[file_name.length - 1]).concat('.html') // If not specified, the file will be written to `newman/` in the current working directory.
                },
                allure: {
                    export: this.allure_report_path
                },
                json: {
                    export: this.newman_json_report_path.concat(file_name[file_name.length - 1]).concat('.json')
                }
            },
            insecure: true,
        }, function(err, summary) { 
            if (err || summary.run.error || summary.run.failures.length) { 
                console.log('collection run complete!');
                process.exit(1);
            }
        });
    }

    removeDirectory(directory) {
        // directory = this.get_relative_path(directory)
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
