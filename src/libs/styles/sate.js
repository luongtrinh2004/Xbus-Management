const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8

const MenuProps = {
  PaperProps: {
    sx: {
      width: 600,
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP
    }
  }
}

// Hàm tạo polygon từ 2 điểm NE và SW
const createRectangleFromTwoPoints = (point1, point2) => {
  const [lat1, lng1] = point1
  const [lat2, lng2] = point2

  const latNE = Math.max(lat1, lat2)
  const lngNE = Math.max(lng1, lng2)
  const latSW = Math.min(lat1, lat2)
  const lngSW = Math.min(lng1, lng2)

  const rectangle = [
    [lngSW, latSW], // SW
    [lngSW, latNE], // NW
    [lngNE, latNE], // NE
    [lngNE, latSW], // SE
    [lngSW, latSW] // Đóng lại polygon
  ]

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [rectangle]
    },
    properties: {}
  }
}

const genPoints = (point1, point2) => {
  const [lat1, lng1] = point1
  const [lat2, lng2] = point2
  const latNE = Math.max(lat1, lat2)
  const lngNE = Math.max(lng1, lng2)
  const latSW = Math.min(lat1, lat2)
  const lngSW = Math.min(lng1, lng2)

  return {
    latNE,
    lngNE,
    latSW,
    lngSW
  }
}

const polygonLayer = {
  id: 'polygon-layer',
  type: 'fill',
  paint: {
    'fill-color': '#088',
    'fill-opacity': 0.4
  }
}

export { MenuProps, createRectangleFromTwoPoints, polygonLayer, genPoints }
