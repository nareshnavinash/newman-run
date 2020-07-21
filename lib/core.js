const newman = require('newman');
const files = require('../lib/files');
const fs = require('fs')
const path = require('path');

class NewmanConfig{

    constructor(){
        this.current_path = path.dirname(fs.realpathSync(__filename))
        this.reporters_list = ['cli', 'json', 'html', 'allure']
        this.allure_report_path = './reports/allure'
        this.newman_json_report_path = './reports/json/'
        this.newman_html_report_path = './reports/html/'
    }

    looprun(root_json_file){
        console.log('Feed file taken is: ' + root_json_file);
        var root_json = files.getCurrentDirectoryBase() + root_json_file
        var root_json = path.relative(path.dirname(fs.realpathSync(__filename)), root_json)
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

    test() {
        console.log("##########################################################################")
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
            }
        }, function (err) {
            if (err) { throw err; }
            console.log('collection run complete!');
        });
    }

    runCollection(collection){
        // call newman.run to pass `options` object and wait for callback
        console.log('Collection file taken to run: ' + collection)
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
            }
        }, function (err) {
            if (err) { throw err; }
            console.log('collection run complete!');
        });

    }

}

module.exports = NewmanConfig
