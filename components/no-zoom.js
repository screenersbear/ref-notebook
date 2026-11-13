// Stops the page itself from zooming (runs once, when the app starts).

// A pinch on a photo should never zoom the whole page.
document.addEventListener('gesturestart', (e) => e.preventDefault());

// iOS zooms in on any field with text under 16px and leaves the page
// zoomed. A scale limit stops that.
if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && !/maximum-scale/.test(meta.content)) meta.content += ', maximum-scale=1';
}
