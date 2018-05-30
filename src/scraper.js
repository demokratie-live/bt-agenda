/* eslint-disable max-len */
/* eslint-disable no-throw-literal */
import events from 'events';

import Browser from './Browser';

process.setMaxListeners(Infinity);

class Scraper {
  options = {
    startYear: 2018,
    startWeek: 3,
    continue: false,
  };

  urls = {
    get: ({ year, week }) =>
      `https://www.bundestag.de/apps/plenar/plenar/conferenceweekDetail.form?year=${year}&week=${week}`,
    start: null,
  };

  browser = null;
  scrapedWeeks = [];
  eventEmitter = new events.EventEmitter();

  async scrape(options) {
    this.options = { ...this.options, ...options };

    this.urls.start = this.urls.get({ year: this.options.startYear, week: this.options.startWeek });

    this.browser = await this.createNewBrowser();

    await this.analyseWeeks({ year: this.options.startYear, week: this.options.startWeek });
    this.eventEmitter.emit('finish', { scrapedWeeks: this.scrapedWeeks });
  }

  analyseWeeks = async ({ year, week }) => {
    let nextWeek = week;
    let nextYear = year;
    while (nextWeek && nextYear) {
      const {
        browser: { browser },
      } = this;
      const { body } = await browser.request({
        uri: this.urls.get({ year: nextYear, week: nextWeek }),
      });
      const weekData = browser.getTables({ year: nextYear, week: nextWeek, body });
      this.eventEmitter.emit('data', weekData);

      if (
        !this.scrapedWeeks.find(({ week: scrapedWeek, year: scrapedYear }) =>
          scrapedWeek === weekData[0].nextWeek && scrapedYear === weekData[0].nextYear) &&
        this.options.continue
      ) {
        this.scrapedWeeks.push({ week: nextWeek, year: nextYear });
        nextWeek = weekData[0].nextWeek; // eslint-disable-line
        nextYear = weekData[0].nextYear; // eslint-disable-line
      } else {
        nextWeek = null;
        nextYear = null;
      }
    }
  };

  createNewBrowser = async ({ browserObject } = {}) => {
    if (browserObject) {
      delete browserObject.browser; // eslint-disable-line
    }
    const browser = new Browser();
    await browser.initialize(this.urls.start);
    return {
      browser,
      used: false,
      scraped: 0,
      errors: 0,
    };
  };

  addListener = (type, callback) => {
    this.eventEmitter.on(type, callback);
  };
}

module.exports = Scraper;
