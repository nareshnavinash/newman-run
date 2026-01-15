#!/usr/bin/env node

const NewmanConfig = require('../lib/core')
const version = require('../package.json').version
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
			.option("d", { alias: "iteration-data", describe: "Iteration data file path (CSV/JSON) for data-driven testing", type: "string"})
			.option("s", { alias: "synchronous", describe: "Run collections in sync way. Async by default", type: "string"})
			.option("p", { alias: "parallel", describe: "Max parallel collections to run (0 = unlimited)", type: "number", default: 0})
			.option("r", { alias: "remove", describe: "To remove the files from reporting directory"})
			.option("R", { alias: "reporters", describe: "To override reporters list", type: "array"})
			.option("v", { alias: "version", describe: "Current version for the newman-run package"})
			.check(argv => { if(argv.f == undefined && argv.c == undefined && argv.r == undefined) { console.log(file_error_message); return false } else { return true }})
			.argv

	const NC = new NewmanConfig(options.reporters, { concurrency: options.parallel })

	if (options.remove) {
		await NC.clearResultsFolder()
	}
	if (options.version) {
		console.log(version)
	}

	// Determine if we have collections to run
	const hasFeed = options.feed != undefined
	const hasCollection = options.collection != undefined
	const isSync = options.synchronous != undefined

	if (hasFeed || hasCollection) {
		// Run feed file collections
		if (hasFeed) {
			await NC.loopRun(options.feed, isSync)
		}

		// Run single collection
		if (hasCollection) {
			await NC.runCollectionAsync(options.collection, options.environment, {
				iterationData: options['iteration-data']
			})
		}

		// Print summary
		const results = NC.getResults()
		console.log('\n' + chalk.bold('='.repeat(80)))
		console.log(chalk.bold('Test Run Summary:'))
		console.log(chalk.green(`  Passed: ${results.passed}`))
		console.log(chalk.red(`  Failed: ${results.failed}`))
		console.log(chalk.bold('='.repeat(80)) + '\n')

		// Exit with proper code for CI/CD
		if (NC.hasFailures()) {
			console.log(chalk.red.bold('Exiting with code 1 due to test failures'))
			process.exit(1)
		}
	}
})();
