let observer: IntersectionObserver | undefined
let videos: HTMLVideoElement[] = []
const visible = new Set<HTMLVideoElement>()

function updatePlayback(video: HTMLVideoElement) {
  if (document.hidden || !visible.has(video) || !video.isConnected) {
    video.pause()
    return
  }
  if (!video.paused) return
  void video.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return
    console.error('Video playback failed', error)
    video.classList.add('playback-error')
  })
}

export function retainPageVideos() {
  const retained = new Map<string, HTMLVideoElement>()
  observer?.disconnect()
  visible.clear()
  for (const video of videos) {
    video.pause()
    const source = video.querySelector('source')?.src
    if (source && video.isConnected) retained.set(source, video)
  }
  videos = []
  return retained
}

export function mountPageVideos(retained = new Map<string, HTMLVideoElement>()) {
  observer?.disconnect()
  visible.clear()
  for (const slot of document.querySelectorAll<HTMLVideoElement>('video.app-video')) {
    const source = slot.querySelector('source')?.src
    const previous = source ? retained.get(source) : undefined
    if (previous && previous !== slot) {
      slot.pause()
      slot.replaceWith(previous)
    }
  }
  videos = [...document.querySelectorAll<HTMLVideoElement>('video.app-video')]
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) visible.add(video)
      else visible.delete(video)
      updatePlayback(video)
    }
  })
  for (const video of videos) {
    video.autoplay = false
    video.muted = true
    video.playsInline = true
    video.onplaying = () => {
      video.classList.add('is-ready')
      video.classList.remove('playback-error')
    }
    observer.observe(video)
  }
}

document.addEventListener('visibilitychange', () => {
  for (const video of videos) updatePlayback(video)
})
