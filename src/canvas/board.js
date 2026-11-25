const viewport = document.querySelector(".viewport")
const board = document.querySelector(".board")

const margin = 32
const minScale = 0.05
const maxScale = 8
const wheelSpeed = 0.0015
const keyZoom = 1.25
const clickDistance = 4

const view = { x: 0, y: 0, scale: 1 }
const pointers = new Map()
const press = { start: undefined, moved: false }
let asked = false

function show() {
  board.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
}

function zoomAround(point, factor) {
  const scale = Math.min(maxScale, Math.max(minScale, view.scale * factor))
  const applied = scale / view.scale

  view.x = point.x - (point.x - view.x) * applied
  view.y = point.y - (point.y - view.y) * applied
  view.scale = scale
  asked = true
  show()
}

function fit() {
  const width = board.offsetWidth
  const height = board.offsetHeight
  const room = { width: viewport.clientWidth - 2 * margin, height: viewport.clientHeight - 2 * margin }

  view.scale = Math.max(minScale, Math.min(1, room.width / width, room.height / height))
  view.x = (viewport.clientWidth - width * view.scale) / 2
  view.y = margin
  show()
}

function enter(figure) {
  leave()
  figure.classList.add("entered")
  figure.querySelector("iframe").focus()
}

function leave() {
  for (const figure of board.querySelectorAll(".view.entered")) figure.classList.remove("entered")
  viewport.focus()
}

function frameOf(source) {
  return [...board.querySelectorAll(".view iframe")].find((frame) => frame.contentWindow === source)
}

function center() {
  return { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }
}

function positionOf(event) {
  const bounds = viewport.getBoundingClientRect()
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}

function pinch(pointerId, previous, current) {
  const [, other] = [...pointers].find(([id]) => id !== pointerId)
  const before = Math.hypot(previous.x - other.x, previous.y - other.y)
  const after = Math.hypot(current.x - other.x, current.y - other.y)
  if (before === 0) return

  zoomAround({ x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 }, after / before)
}

function release(event) {
  pointers.delete(event.pointerId)
  if (pointers.size === 0) viewport.classList.remove("dragging")
}

viewport.addEventListener("pointerdown", (event) => {
  leave()
  press.start = positionOf(event)
  press.moved = false
  viewport.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, positionOf(event))
  viewport.classList.add("dragging")
})

viewport.addEventListener("pointermove", (event) => {
  const previous = pointers.get(event.pointerId)
  if (previous === undefined) return

  const current = positionOf(event)
  if (Math.hypot(current.x - press.start.x, current.y - press.start.y) > clickDistance) press.moved = true
  if (pointers.size === 1) {
    view.x += current.x - previous.x
    view.y += current.y - previous.y
    asked = true
    show()
  } else if (pointers.size === 2) {
    pinch(event.pointerId, previous, current)
  }
  pointers.set(event.pointerId, current)
})

viewport.addEventListener("pointerup", (event) => {
  release(event)
  if (press.moved) return

  // The pointer is captured by the viewport, so what was clicked is found by where.
  const figure = document.elementsFromPoint(event.clientX, event.clientY).find((element) => element.matches(".view"))
  if (figure !== undefined) enter(figure)
})
viewport.addEventListener("pointercancel", release)

viewport.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault()
    zoomAround(positionOf(event), Math.exp(-event.deltaY * wheelSpeed))
  },
  { passive: false },
)

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return

  if (event.key === "Escape") leave()
  if (event.key === "f") fit()
  if (event.key === "0") zoomAround(center(), 1 / view.scale)
  if (event.key === "+" || event.key === "=") zoomAround(center(), keyZoom)
  if (event.key === "-") zoomAround(center(), 1 / keyZoom)
})

addEventListener("message", (event) => {
  const frame = frameOf(event.source)
  if (frame === undefined || typeof event.data !== "object" || event.data === null) return

  if (event.data.parallax === "height") frame.style.height = `${Math.ceil(event.data.height)}px`
  if (event.data.parallax === "leave") leave()
  if (!asked) fit()
})

fit()
