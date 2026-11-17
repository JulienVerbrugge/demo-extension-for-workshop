require('dotenv').config();
const axios = require('axios');
const { getAkeneoToken } = require('./getAkeneoToken');

const BATCH_SIZE = 100;

/**
 * Set the release_date of the given products for one channel, 100 products per API request.
 * @returns {Promise<{updated: number, failures: object[], seconds: number}>}
 */
async function scheduleRelease(productUuids, channel, releaseDate) {
  const startedAt = Date.now();
  const token = await getAkeneoToken();
  const baseURL = process.env.AKENEO_BASE_URL;
  const failures = [];

  for (let start = 0; start < productUuids.length; start += BATCH_SIZE) {
    const lines = productUuids.slice(start, start + BATCH_SIZE).map((uuid) => JSON.stringify({
      uuid,
      values: { release_date: [{ scope: channel, locale: null, data: releaseDate }] },
    }));

    const response = await axios.patch(`${baseURL}/api/rest/v1/products-uuid`, lines.join('\n'), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.akeneo.collection+json',
      },
      responseType: 'text',
    });

    response.data.split('\n').filter(Boolean).map(JSON.parse)
      .filter((line) => line.status_code >= 300)
      .forEach((line) => failures.push(line));
  }

  return {
    updated: productUuids.length - failures.length,
    failures,
    seconds: (Date.now() - startedAt) / 1000,
  };
}

module.exports = { scheduleRelease };
