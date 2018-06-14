#!/usr/bin/env node
/* eslint-disable no-mixed-operators */

const Scraper = require('./scraper');
const program = require('commander');
const util = require('util');

program
  .version('0.1.0')
  .description('Bundestag scraper')
  .option('--week [Week]', 'Week of Agenda', 1)
  .option('--year [Year]', 'Year of Agenda', 1)
  .option('--continue [Continue]', 'Scrape until last Agenda', 1)
  .parse(process.argv);

const scraper = new Scraper();

process.on('SIGINT', async () => {
  process.exit(1);
});

scraper.addListener('data', data => console.log('new data', util.inspect(data, false, null)));
scraper.addListener('finish', data => console.log('FINISH', util.inspect(data, false, null)));

scraper
  .scrape({
    startWeek: program.week,
    startYear: program.year,
    continue:
      program.continue === '1' ||
      program.continue === 'true' ||
      program.continue === 'yes' ||
      program.continue === 'y',
  })
  .catch((error) => {
    console.error(error);
  });
