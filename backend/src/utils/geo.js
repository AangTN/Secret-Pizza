// Geospatial helpers: distance and ETA

const toRad = (deg) => (deg * Math.PI) / 180;

// Haversine distance between two lat/lng points in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate ETA in minutes given distance in km
// Assumptions: average speed 30km/h, add 10 minutes prep buffer
function estimateEtaMinutes(distanceKm, avgSpeedKmh = 30, prepMinutes = 10) {
  const travelMinutes = (distanceKm / avgSpeedKmh) * 60;
  return Math.max(0, Math.round(travelMinutes + prepMinutes));
}

module.exports = { haversineKm, estimateEtaMinutes };
