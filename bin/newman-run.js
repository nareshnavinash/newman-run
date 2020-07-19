#!/usr/bin/env node

const NewmanConfig = require('../lib/core')
version = require('../package.json').version
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const files = require('../lib/files');
const inquirer  = require('../lib/inquirer');
const yargs = require("yargs");
const { option } = require('yargs');
var feedFilePath = ""


console.log(
    chalk.rgb(220, 120, 60)(
        figlet.textSync('Newman-Run', { horizontalLayout: 'full' })
    )
);

const options = yargs
        .usage("Usage: newman-run -f <feed_file_path>")
        .option("f", { alias: "feed", describe: "Feed file path", type: "string", required: true})
        .argv

feedFilePath = options.feed
console.log('Feed file taken is: ' + feedFilePath);

new NewmanConfig(feedFilePath)
