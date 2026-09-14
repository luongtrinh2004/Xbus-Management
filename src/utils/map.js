function calculateCenter(northEastBound, southWestBound) {
  if (!northEastBound || !southWestBound) return null

  return {
    lat: (Number(northEastBound.lat) + Number(southWestBound.lat)) / 2,
    lng: (Number(northEastBound.lng) + Number(southWestBound.lng)) / 2
  }
}

export { calculateCenter }
