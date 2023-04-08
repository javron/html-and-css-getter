const axios = require('axios');
const cheerio = require('cheerio');
const purify = require('purify-css');

module.exports = async (req, res) => {
  const url = req.body.url;
  if (!url) {
    return res.status(400).send({ error: 'Please provide a URL.' });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const html = $('body').html();
    const usedClasses = new Set();
    $('[class]').each((_, element) => {
      const classes = $(element).attr('class').split(' ');
      classes.forEach((className) => usedClasses.add(className));
    });

    const cssPromises = [];
    $('link[rel="stylesheet"]').each((_, link) => {
      const href = $(link).attr('href');
      cssPromises.push(axios.get(href));
    });

    const cssResponses = await Promise.all(cssPromises);
    const cssData = cssResponses.map((response) => response.data).join('\n');
    const usedCss = extractUsedCss(cssData, usedClasses);

    res.set('Content-Type', 'text/plain');
    res.send({ html, css: usedCss });
  } catch (error) {
    res.status(500).send({ error: 'Error scraping the webpage.' });
  }
};

function extractUsedCss(cssData, usedClasses) {
  const classNames = Array.from(usedClasses);
  const css = purify(classNames, cssData, { minify: true });
  return css;
}
