/**
 * Shared scroll progress, written by the page's ScrollTriggers and read by the
 * 3D layer every frame. Keeping it outside React avoids re-rendering the
 * canvas tree on scroll.
 */
export const scrollState = {
  hero: 0, // 0..1 — how far the hero has scrolled away
  story: 0, // 0..1 — progress through the pinned story
  services: 0, // 0..1 — services section entering the viewport
  contact: 0, // 0..1 — contact section entering the viewport
}
