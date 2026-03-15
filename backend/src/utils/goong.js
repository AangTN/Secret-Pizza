const https = require('https');
const { URL } = require('url');

function httpsGetJson(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.get(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        protocol: url.protocol,
        headers: {
          'User-Agent': 'shipping-fee-service/1.0',
          'Accept': 'application/json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error('Invalid JSON from Goong API'));
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// Geocode an address string with Goong Geocode API
async function geocodeAddress(address, apiKey) {
  if (!apiKey) throw new Error('Missing MAPS_API_KEY');
  const endpoint = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(address)}&api_key=${encodeURIComponent(apiKey)}`;
  const json = await httpsGetJson(endpoint);
  const results = json && (json.results || json.predictions || []);
  if (!results || results.length === 0) {
    return null;
  }
  // Goong returns results[i].geometry.location { lat, lng }
  const first = results[0];
  const loc = first.geometry && (first.geometry.location || first.geometry.location_raw || first.geometry);
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    return null;
  }
  return { lat: loc.lat, lng: loc.lng, raw: first };
}

module.exports = { geocodeAddress };
