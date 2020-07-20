const newman = require('newman');
const files = require('../lib/files');
const fs = require('fs')
const path = require('path');

class NewmanConfig{

    constructor(root_json_file){
        this.root_json = files.getCurrentDirectoryBase() + root_json_file
        this.root_json = path.relative(path.dirname(fs.realpathSync(__filename)), this.root_json)
    }

    looprun(){
        var root_file = require(this.root_json)
        var run_list = root_file.runs
        console.log("!----------------------------------Files Taken to run---------------------------------------!")
        run_list.forEach(parseAndRun);
        
        function parseAndRun(value, index, array) {
            console.log(index)
            console.log(value)
            if (value.environment == undefined) {
                var collection_relative_path = path.relative(NewmanConfig.current_path(), files.getCurrentDirectoryBase() + value.collection.substring(2))
                NewmanConfig.runCollection(collection_relative_path)
            } else {
                var collection_relative_path = path.relative(NewmanConfig.current_path(), files.getCurrentDirectoryBase() + value.collection.substring(2))
                var environment_relative_path = path.relative(NewmanConfig.current_path(), files.getCurrentDirectoryBase() + value.environment.substring(2))
                NewmanConfig.runCollectionWithEnv(collection_relative_path, environment_relative_path)
            }
        }
        console.log("!-------------------------------------------------------------------------------------------!")
    }

    static current_path() {
        return path.dirname(fs.realpathSync(__filename))
    }

    static reporters_list() {
        return ['cli', 'json', 'html', 'allure']
    }

    static allure_report_path() {
        return './reports/allure'
    }

    static newman_json_report_path() {
        return './reports/json/'
    }

    static newman_html_report_path() {
        return './reports/html/'
    }

    static runCollectionWithEnv(collection, environment){
        // call newman.run to pass `options` object and wait for callback
        var file_name = collection.split("/")
        newman.run({
            collection: require(collection),
            environment: require(environment),
            reporters: NewmanConfig.reporters_list(),
            reporter: {
                html: {
                    export: NewmanConfig.newman_html_report_path().concat(file_name[file_name.length - 1]).concat('.html') // If not specified, the file will be written to `newman/` in the current working directory.
                },
                allure: {
                    export: NewmanConfig.allure_report_path()
                },
                json: {
                    export: NewmanConfig.newman_json_report_path().concat(file_name[file_name.length - 1]).concat('.json')
                }
            }
        }, function (err) {
            if (err) { throw err; }
            console.log('collection run complete!');
        });
    }

    static runCollection(collection){
        // call newman.run to pass `options` object and wait for callback
        var file_name = collection.split("/")
        newman.run({
            collection: require(collection),
            reporters: NewmanConfig.reporters_list(),
            reporter: {
                html: {
                    export: NewmanConfig.newman_html_report_path().concat(file_name[file_name.length - 1]).concat('.html') // If not specified, the file will be written to `newman/` in the current working directory.
                },
                allure: {
                    export: NewmanConfig.allure_report_path()
                },
                json: {
                    export: NewmanConfig.newman_json_report_path().concat(file_name[file_name.length - 1]).concat('.json')
                }
            }
        }, function (err) {
            if (err) { throw err; }
            console.log('collection run complete!');
        });

    }

}

module.exports = NewmanConfig
