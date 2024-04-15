#!/usr/bin/env node

const NewmanConfig = require('../lib/core')
version = require('../package.json').version
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const files = require('../lib/files');
const inquirer  = require('../lib/inquirer');
const yargs = require("yargs");

(async () => {
	clear()
	console.log(
		chalk.rgb(220, 120, 60)(
			figlet.textSync('Newman-Run', { 
				font: 'Doom', 
				horizontalLayout: 'full', 
				whitespaceBreak: true 
			})
		)
	);

	const file_error_message = chalk.red.bold('Need either feed file (-f) or collections (-c) file to run the tests or at least (-r) to remove the files from reports directory!!!\n')

	const options = yargs
			.usage("Usage: newman-run -f <feed_file_path>")
			.option("f", { alias: "feed", describe: "Feed file path", type: "string"})
			.option("c", { alias: "collection", describe: "Collection file path", type: "string"})
			.option("e", { alias: "environment", describe: "Environment file path", type: "string"})
			.option("s", { alias: "synchronous", describe: "Run collections in sync way. Async by default", type: "string"})
			.option("r", { alias: "remove", describe: "To remove the files from reporting directory"})
			.option("v", { alias: "version", describe: "Current version for the newman-run package"})
			.check(argv => { if(argv.f == undefined && argv.c == undefined && argv.r == undefined) { console.log(file_error_message); return false } else { return true }})
			.argv

	const NC = new NewmanConfig()

	if (options.remove) {
		NC.clearResultsFolder()
	}
	if (options.version) {
		console.log(version)
	}
	if (options.feed != undefined && options.collection == undefined && options.synchronous != undefined) {
		await NC.loopRun(options.feed, true)
	} else if (options.feed != undefined && options.collection == undefined && options.synchronous == undefined) {
		NC.loopRun(options.feed, false)
	} else if (options.collection != undefined && options.feed == undefined && options.synchronous != undefined) {
		await NC.runCollectionSync(options.collection, options.environment)
	} else if (options.collection != undefined && options.feed == undefined && options.synchronous == undefined) {
		NC.runCollection(options.collection, options.environment)
	} else if (options.feed != undefined && options.collection != undefined && options.synchronous != undefined) {
		await NC.loopRun(options.feed, true)
		await NC.runCollectionSync(options.collection, options.environment)
	} else if (options.feed != undefined && options.collection != undefined && options.synchronous == undefined) {
		NC.loopRun(options.feed, false)
		NC.runCollection(options.collection, options.environment)
	}
})();
