const request = require('request');
const striptags = require('striptags');

class Browser {
  cookie = null;

  constructor() {
    this.cookie = request.jar();
  }

  initialize = async (uri) => {
    const { body } = await this.request({
      ...this.defReqOpt,
      uri,
    });

    if (!this.getPreviousNextData(body)) {
      throw new Error('Wrong initial data!');
    }
  };

  request = (opts) => {
    const reqOptions = {
      timeout: 15000,
      method: 'GET',
      jar: this.cookie,
      ...opts,
    };

    return new Promise((resolve, reject) => {
      request(reqOptions, (error, res, body) => {
        if (!error && res.statusCode === 200) {
          resolve({ res, body });
        } else {
          reject(error);
        }
      });
    });
  };

  getPreviousNextData = (body) => {
    const previousYear = body.match(/data-previousyear="(\d{4})"/);
    const previousWeek = body.match(/data-previousweeknumber="(\d{1,2})"/);
    const nextYear = body.match(/data-nextyear="(\d{4})"/);
    const nextWeek = body.match(/data-nextweeknumber="(\d{1,2})"/);
    if (![previousYear, previousWeek, nextYear, nextWeek].some(data => data)) {
      return false;
    }
    return {
      previousYear: previousYear ? previousYear[1] : null,
      previousWeek: previousWeek ? previousWeek[1] : null,
      nextYear: nextYear ? nextYear[1] : null,
      nextWeek: nextWeek ? nextWeek[1] : null,
    };
  };

  getTables = ({ body, year, week }) => {
    const tables = body.match(/(?:<caption>(.*?)<\/caption>.*?<tbody>(.*?)<\/tbody>)/gs);
    return tables.map((table) => {
      const dateMeeting = table.match(/<caption>(.*?)<\/caption>/s)[1].trim();
      const date = dateMeeting.match(/^(.*?)\(/)[1].trim();
      const meeting = parseInt(dateMeeting.match(/\((\d{1,3})/)[1].trim(), 10);
      const tableBody = table.match(/<tbody>(.*?)<\/tbody>/gs)[0];
      const rows = tableBody.match(/<tr>(.*?)<\/tr>/gs);
      const rowData = rows.map((row) => {
        const time = row.match(/<td data-th="Uhrzeit">.*?(\d{1,2}:\d{1,2}).*?<\/td>/)[1].trim();
        const agendaNumber = striptags(row.match(/<td data-th="TOP">(.*?)<\/td>/gs)[0]).trim();
        const topicCell = row.match(/<td data-th="Thema">(.*?)<\/td>/gs)[0];
        let topic = topicCell.match(/<a href="#" .*?>(.*?)<\/a>/gs);
        if (topic) {
          topic = striptags(topic[0]).trim();
        } else {
          topic = striptags(topicCell).trim();
        }
        let topicDetails = topicCell.match(/<p>(.*?)<\/p>/gs);
        let documents = [];
        if (topicDetails) {
          topicDetails = striptags(topicDetails[0]).trim();
          documents = topicDetails.match(/\d{1,3}\/\d{1,10}/gs) || [];
        }

        const status = striptags(row.match(/<td data-th="Status\/ Abstimmung">(.*?)<\/td>/gs)[0])
          .replace('Details einblenden', '')
          .replace('Details ausblenden', '')
          .trim();

        return {
          time,
          agendaNumber,
          topic,
          topicDetails,
          documents,
          status,
        };
      });
      return {
        year,
        week,
        date: new Date(Date.parse(date)),
        meeting,
        rows: rowData,
        ...this.getPreviousNextData(body),
      };
    });
  };
}

export default Browser;
