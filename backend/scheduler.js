// MIT License
const Bree = require('bree');
const path = require('path');

const bree = new Bree({
  root: path.join(__dirname, 'jobs'),
  jobs: [
    { name: 'processPosts', cron: process.env.POST_CRON || '0 * * * *' }
  ]
});

bree.start();

module.exports = () => bree;
