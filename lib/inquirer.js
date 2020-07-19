const inquirer = require('inquirer');

module.exports = {
  askForFeedFile: () => {
    const questions = [
      {
        name: 'feed',
        type: 'input',
        message: 'Enter your feed file path',
        validate: function( value ) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your feed file path';
          }
        }
      }
    ];
    return inquirer.prompt(questions);
  }
};