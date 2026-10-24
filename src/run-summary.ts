import * as L from 'leaflet'
import type { RecordedRun } from './run-tracker'

function summaryDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const prefix = hours > 0 ? `${hours}h ` : ''
  return `${prefix}${minutes}m ${seconds % 60}s`
}

function drawRoute(context: CanvasRenderingContext2D, run: RecordedRun) {
  const worldWidth = 2 * Math.PI * 6378137
  const points = run.points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)).map((point) => {
    const projected = L.CRS.EPSG3857.project(L.latLng(point.lat, point.lng))
    return { x: projected.x, y: -projected.y, segment: point.segment }
  })
  if (!points.length) return
  for (let index = 1; index < points.length; index++) {
    const difference = points[index].x - points[index - 1].x
    points[index].x -= Math.round(difference / worldWidth) * worldWidth
  }
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const scale = Math.min(650 / Math.max(maxX - minX, 1), 520 / Math.max(maxY - minY, 1))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  context.strokeStyle = '#ff755b'
  context.fillStyle = '#ff755b'
  context.lineWidth = 9
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.beginPath()
  for (const [index, point] of points.entries()) {
    const positionX = 540 + (point.x - centerX) * scale
    const positionY = 1170 + (point.y - centerY) * scale
    if (!index || point.segment) context.moveTo(positionX, positionY)
    else context.lineTo(positionX, positionY)
  }
  context.stroke()
  for (const point of [points[0], points.at(-1)!]) {
    context.beginPath()
    context.arc(540 + (point.x - centerX) * scale, 1170 + (point.y - centerY) * scale, 7, 0, Math.PI * 2)
    context.fill()
  }
}

export function drawRunSummary(canvas: HTMLCanvasElement, run: RecordedRun, pace: string) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image export is unavailable on this device.')
  context.fillStyle = '#080b0c'
  context.fillRect(0, 0, 1080, 1920)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const metric = (label: string, value: string, top: number) => {
    context.fillStyle = '#b4c2bf'
    context.font = '500 36px "Barlow Condensed", sans-serif'
    context.fillText(label, 540, top)
    context.fillStyle = '#f5f8f7'
    context.font = '700 84px "Barlow Condensed", sans-serif'
    context.fillText(value, 540, top + 86, 920)
  }
  metric('Distance', `${(run.distanceM / 1000).toFixed(2)} km`, 340)
  metric('Pace', `${pace} /km`, 535)
  metric('Time', summaryDuration(run.elapsedMs), 730)
  drawRoute(context, run)
  context.fillStyle = '#c7f269'
  context.font = '800 66px "Barlow Condensed", sans-serif'
  context.fillText('LEVEL UP', 540, 1540)
}