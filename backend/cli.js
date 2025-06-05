#!/usr/bin/env node
// MIT License
const inquirer = require('inquirer');
const processPosts = require('./jobs/processPosts');

(async () => {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        { name: 'Run pending posts now', value: 'run' },
        { name: 'Start scheduler', value: 'schedule' }
      ]
    }
  ]);

  if (action === 'run') {
    await processPosts();
  } else {
    console.log('Scheduler running...');
    // requiring scheduler starts Bree automatically
    require('./scheduler');
  }
})();
