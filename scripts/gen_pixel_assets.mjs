import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

const writePng = (filePath, w, h, rgba) => {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const compressed = zlib.deflateSync(raw, { level: 9 })
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))

  const out = Buffer.concat([header, chunk('IHDR', ihdr), idat, iend])
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, out)
}

const makeImage = (w, h, fill = [0, 0, 0, 0]) => {
  const buf = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = fill[0]
    buf[i * 4 + 1] = fill[1]
    buf[i * 4 + 2] = fill[2]
    buf[i * 4 + 3] = fill[3]
  }
  return buf
}

const setPx = (buf, w, x, y, c) => {
  if (x < 0 || y < 0 || x >= w) return
  const idx = (y * w + x) * 4
  buf[idx] = c[0]
  buf[idx + 1] = c[1]
  buf[idx + 2] = c[2]
  buf[idx + 3] = c[3]
}

const fillRect = (buf, w, x0, y0, ww, hh, c) => {
  for (let y = y0; y < y0 + hh; y++) {
    for (let x = x0; x < x0 + ww; x++) setPx(buf, w, x, y, c)
  }
}

const line = (buf, w, x0, y0, x1, y1, c) => {
  let dx = Math.abs(x1 - x0)
  let sx = x0 < x1 ? 1 : -1
  let dy = -Math.abs(y1 - y0)
  let sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  while (true) {
    setPx(buf, w, x0, y0, c)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

const rand = (seed) => {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const palette = {
  bg: [0, 0, 0, 255],
  asphalt: [60, 66, 77, 255],
  asphalt2: [54, 59, 69, 255],
  asphalt3: [70, 78, 92, 255],
  curb: [150, 154, 160, 255],
  curbDark: [110, 114, 120, 255],
  lane: [206, 214, 221, 255],
  laneDim: [168, 176, 184, 255],
  cross: [235, 238, 242, 255],
  grime: [42, 46, 54, 255],
  roof1: [106, 94, 86, 255],
  roof2: [92, 83, 78, 255],
  wall1: [120, 112, 104, 255],
  wall2: [86, 90, 100, 255],
  glass1: [82, 130, 150, 255],
  glass2: [58, 94, 110, 255]
}

const drawAsphaltNoise = (buf, w, x0, y0, ww, hh, seed) => {
  const r = rand(seed)
  for (let y = y0; y < y0 + hh; y++) {
    for (let x = x0; x < x0 + ww; x++) {
      const v = r()
      if (v < 0.04) setPx(buf, w, x, y, palette.asphalt3)
      else if (v < 0.07) setPx(buf, w, x, y, palette.grime)
    }
  }
}

const drawRoadStamp = (sheet, sw, x0, y0, kind, seed) => {
  const r = rand(seed)
  fillRect(sheet, sw, x0, y0, 80, 80, palette.bg)

  const curb = 10
  fillRect(sheet, sw, x0, y0, 80, 80, palette.curbDark)
  fillRect(sheet, sw, x0 + 1, y0 + 1, 78, 78, palette.curb)

  const roadX = x0 + curb
  const roadY = y0 + curb
  const roadW = 80 - curb * 2
  const roadH = 80 - curb * 2

  const drawRectRoad = (rx, ry, rw, rh) => {
    fillRect(sheet, sw, rx, ry, rw, rh, palette.asphalt)
    drawAsphaltNoise(sheet, sw, rx, ry, rw, rh, seed + 11)
    fillRect(sheet, sw, rx, ry, rw, 2, palette.asphalt2)
    fillRect(sheet, sw, rx, ry + rh - 2, rw, 2, palette.asphalt2)
    fillRect(sheet, sw, rx, ry, 2, rh, palette.asphalt2)
    fillRect(sheet, sw, rx + rw - 2, ry, 2, rh, palette.asphalt2)
  }

  if (kind === 'STRAIGHT') {
    drawRectRoad(roadX + 18, y0, 24, 80)
    for (let y = y0 + 8; y < y0 + 80 - 8; y += 10) {
      fillRect(sheet, sw, roadX + 29, y, 2, 6, palette.lane)
    }
  } else if (kind === 'TURN') {
    drawRectRoad(roadX + 18, y0, 24, roadY + 42 - y0)
    drawRectRoad(roadX + 18, roadY + 18, roadX + 62 - (roadX + 18), 24)
    for (let y = y0 + 8; y < roadY + 22; y += 10) {
      fillRect(sheet, sw, roadX + 29, y, 2, 6, palette.lane)
    }
    for (let x = roadX + 44; x < x0 + 72; x += 10) {
      fillRect(sheet, sw, x, roadY + 29, 6, 2, palette.lane)
    }
    for (let i = 0; i < 38; i++) {
      const a = (i / 38) * (Math.PI / 2)
      const rr = 26
      const px = Math.round(roadX + 18 + rr + Math.cos(Math.PI - a) * rr)
      const py = Math.round(roadY + 18 + rr + Math.sin(Math.PI - a) * rr)
      if (i % 3 === 0) setPx(sheet, sw, px, py, palette.laneDim)
    }
  } else if (kind === 'CROSS') {
    drawRectRoad(roadX + 18, y0, 24, 80)
    drawRectRoad(x0, roadY + 18, 80, 24)
    for (let y = y0 + 8; y < y0 + 80 - 8; y += 10) {
      fillRect(sheet, sw, roadX + 29, y, 2, 6, palette.laneDim)
    }
    for (let x = x0 + 8; x < x0 + 80 - 8; x += 10) {
      fillRect(sheet, sw, x, roadY + 29, 6, 2, palette.laneDim)
    }
    const zW = 6
    const zGap = 4
    for (let i = 0; i < 7; i++) {
      const xx = x0 + 18 + i * (zW + zGap)
      fillRect(sheet, sw, xx, roadY + 12, zW, 3, palette.cross)
      fillRect(sheet, sw, xx, roadY + 65, zW, 3, palette.cross)
    }
    for (let i = 0; i < 7; i++) {
      const yy = y0 + 18 + i * (zW + zGap)
      fillRect(sheet, sw, roadX + 12, yy, 3, zW, palette.cross)
      fillRect(sheet, sw, roadX + 65, yy, 3, zW, palette.cross)
    }
  }

  for (let i = 0; i < 120; i++) {
    const x = x0 + Math.floor(r() * 80)
    const y = y0 + Math.floor(r() * 80)
    if (r() < 0.06) setPx(sheet, sw, x, y, [0, 0, 0, 255])
  }

  for (let i = 0; i < 18; i++) {
    const x = x0 + 4 + Math.floor(r() * 72)
    const y = y0 + 4 + Math.floor(r() * 72)
    if (r() < 0.14) setPx(sheet, sw, x, y, palette.grime)
  }
}

const genStreets2 = (outPath) => {
  const w = 400
  const h = 400
  const sheet = makeImage(w, h, palette.bg)

  const pad = 16
  const step = 96

  drawRoadStamp(sheet, w, pad + 0 * step, pad + 0 * step, 'STRAIGHT', 1201)
  drawRoadStamp(sheet, w, pad + 2 * step, pad + 2 * step, 'TURN', 1202)
  drawRoadStamp(sheet, w, pad + 2 * step, pad + 3 * step, 'CROSS', 1203)

  writePng(outPath, w, h, sheet)
}

const drawBuildingTile = (buf, w, x0, y0, seed, base, accent) => {
  const r = rand(seed)
  fillRect(buf, w, x0, y0, 16, 16, base)
  for (let i = 0; i < 60; i++) {
    const x = x0 + (r() * 16) | 0
    const y = y0 + (r() * 16) | 0
    if (r() < 0.12) setPx(buf, w, x, y, accent)
  }
  fillRect(buf, w, x0, y0, 16, 1, palette.grime)
  fillRect(buf, w, x0, y0 + 15, 16, 1, palette.grime)
  fillRect(buf, w, x0, y0, 1, 16, palette.grime)
  fillRect(buf, w, x0 + 15, y0, 1, 16, palette.grime)

  const glassA = palette.glass1
  const glassB = palette.glass2
  for (let yy = 3; yy <= 12; yy += 4) {
    for (let xx = 3; xx <= 12; xx += 4) {
      setPx(buf, w, x0 + xx, y0 + yy, glassA)
      setPx(buf, w, x0 + xx + 1, y0 + yy, glassB)
      setPx(buf, w, x0 + xx, y0 + yy + 1, glassB)
    }
  }

  line(buf, w, x0 + 2, y0 + 2, x0 + 13, y0 + 2, palette.grime)
  line(buf, w, x0 + 2, y0 + 13, x0 + 13, y0 + 13, palette.grime)
}

const genBuildings = (outPath) => {
  const w = 64
  const h = 16
  const sheet = makeImage(w, h, [0, 0, 0, 0])

  drawBuildingTile(sheet, w, 0, 0, 2101, palette.roof2, palette.roof1)
  drawBuildingTile(sheet, w, 16, 0, 2102, palette.wall2, palette.roof2)
  drawBuildingTile(sheet, w, 32, 0, 2103, palette.wall1, palette.roof1)
  drawBuildingTile(sheet, w, 48, 0, 2104, palette.roof1, palette.wall2)

  writePng(outPath, w, h, sheet)
}

const root = process.cwd()
genStreets2(path.join(root, 'public/assets/sprites/streets_2.png'))
genBuildings(path.join(root, 'public/assets/sprites/buildings.png'))

