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

clear();
console.log(
    chalk.rgb(220, 120, 60)(
        figlet.textSync('Newman-Run', { horizontalLayout: 'full' })
    )
);

const options = yargs
        .usage("Usage: newman-run -f <feed_file_path>")
        .option("f", { alias: "feed", describe: "Feed file path", type: "string" })
        .argv

if (option.feed == undefined) {
    const run = async () => {
        const credentials = await inquirer.askForFeedFile();
        feedFilePath = credentials.feed
        console.log('Feed file taken is: ' + credentials.feed);
    };
    run();
} else {
    feedFilePath = option.feed
    console.log('Feed file taken is: ' + option.feed);
}

new NewmanConfig(feedFilePath)


