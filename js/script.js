// Fetch the APOD dataset and build an interactive gallery with a modal view.
// Beginner-friendly comments included.

// URL that returns the JSON dataset
const DATA_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Example video entry the user provided — we'll inject this so it appears in the gallery.
// This ensures the specific APOD video you showed is included.
const EXTRA_VIDEO = {
  date: "2024-06-30",
  explanation: "About 12 seconds into the clip, Earth rises above the Moon's limb—an event first witnessed by Apollo 8 in 1968. The crew hurried to capture photographs, and this modern reconstruction shows how it would have appeared at real-time speed from the spacecraft. The colorful Earth lifting over a stark lunar horizon became a symbol of our shared home; months later, Apollo 11 would journey on to the first lunar landing.",
  media_type: "video",
  service_version: "v1",
  title: "Earthrise: A Video Reconstruction",
  url: "https://www.youtube.com/embed/1R5QqhPq1Ik",
  thumbnail_url: "https://img.youtube.com/vi/1R5QqhPq1Ik/hqdefault.jpg"
};

// Simple array of fun space facts for the "Did you know?" section.
// Add or edit facts here — one will be shown at random each page load.
const SPACE_FACTS = [
  "Did you know? A day on Venus is longer than a year on Venus.",
  "Did you know? There are more stars in the observable universe than grains of sand on all Earth's beaches.",
  "Did you know? A teaspoon of a neutron star would weigh about 6 billion tons on Earth.",
  "Did you know? The footprints on the Moon will likely stay there for millions of years — no wind to erase them.",
  "Did you know? Jupiter's magnetic field is 20,000 times stronger than Earth's."
];

// UI elements
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalOverlay = document.getElementById('modalOverlay');
const randomFactEl = document.getElementById('randomFact');

// When the "Fetch Space Images" button is clicked, load images
getImageBtn.addEventListener('click', () => {
  fetchImages();
});

// Show a random space fact on page load
function showRandomFact() {
  if (!randomFactEl) return;
  // Pick a random fact from the array
  const idx = Math.floor(Math.random() * SPACE_FACTS.length);
  const fact = SPACE_FACTS[idx];
  // Use textContent to avoid inserting HTML
  randomFactEl.textContent = fact;
}

// Call immediately — script is loaded at the end of the page so DOM elements exist
showRandomFact();

// Small helper to pause for a given number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch JSON, handle errors, and render the gallery
async function fetchImages() {
  try {
    // keep the loading message visible for at least MIN_LOADING_MS
    const MIN_LOADING_MS = 1800; // adjust this value to make the loading message stay longer
    const startTime = Date.now();

    // Show a clear loading message while the fetch runs
    gallery.innerHTML = `<p class="loading">🔄 Loading space photos…</p>`;

    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    const data = await response.json();

    // If EXTRA_VIDEO exists and isn't already present, add it to the front
    if (typeof EXTRA_VIDEO !== 'undefined') {
      const exists = data.some(item => item.url === EXTRA_VIDEO.url || item.title === EXTRA_VIDEO.title);
      if (!exists) data.unshift(EXTRA_VIDEO);
    }

    // Ensure the loading message stays visible for the minimum duration
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_LOADING_MS) {
      await sleep(MIN_LOADING_MS - elapsed);
    }

    // Render only the first page (4x2 layout = 8 items) after data loads
    renderGallery(data);
  } catch (error) {
    gallery.innerHTML = `<p class="error">Could not load images: ${escapeHtml(error.message)}</p>`;
    console.error(error);
  }
}

// Create gallery markup from the array of items
function renderGallery(items) {
  // If no items, show placeholder
  if (!items || items.length === 0) {
    gallery.innerHTML = `<div class="placeholder"><div class="placeholder-icon">🔭</div><p>No images found.</p></div>`;
    return;
  }

  // Show image/video items and limit to first 8 for the 4x2 layout
  const mediaItems = items
    .filter(item => !item.media_type || item.media_type === 'image' || item.media_type === 'video')
    .slice(0, 8);

  // Debug: inspect the items we will render (open Console to view)
  console.log('mediaItems for gallery:', mediaItems);

  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();

  mediaItems.forEach((item, index) => {
    // Create a card element for each item
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.tabIndex = 0; // make it focusable
    card.setAttribute('data-index', index);

    // Determine thumbnail and whether it's a video
    const isVideo = item.media_type === 'video';
    let thumbUrl = item.url || '';

    // Prefer explicit thumbnail_url for videos, otherwise try to build YouTube thumbnail
    if (isVideo) {
      if (item.thumbnail_url) {
        thumbUrl = item.thumbnail_url;
      } else {
        const ytMatch = (item.url || '').match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
        if (ytMatch && ytMatch[1]) {
          thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        } else {
          // fallback tiny SVG placeholder
          thumbUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="%23020b18"/><text x="50%" y="50%" fill="%23ffffff" font-size="18" font-family="Arial" text-anchor="middle" dominant-baseline="middle">Video</text></svg>';
        }
      }
    }

    // Build card markup. Video cards show a play overlay.
    card.innerHTML = `
      <div class="thumb-wrap" style="position:relative;">
        <img class="thumb" src="${thumbUrl}" alt="${escapeHtml(item.title || (isVideo ? 'Space video' : 'Space image'))}" loading="lazy" />
        ${isVideo ? `<span class="play-overlay" aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:34px;pointer-events:none;color:rgba(255,255,255,0.95)">▶</span>` : ''}
      </div>
      <div class="meta">
        <h3 class="title">${escapeHtml(item.title || 'Untitled')}</h3>
        <p class="date">${escapeHtml(item.date || '')}</p>
      </div>
    `;

    // Open modal on click
    card.addEventListener('click', () => openModal(item));

    // Open modal on keyboard (Enter or Space)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });

    fragment.appendChild(card);
  });

  // Replace gallery contents with the new grid
  gallery.innerHTML = '';
  gallery.appendChild(fragment);
}

// Open the modal and populate it with the larger image/video + details
function openModal(item) {
  // Common metadata
  const title = item.title || 'Untitled';
  const date = item.date || '';
  const explanation = item.explanation || '';
  const isVideo = item.media_type === 'video';

  if (isVideo) {
    // Best-effort: normalize common video URLs to an embeddable form
    let embedSrc = item.url || '';

    // Convert YouTube watch/share urls to embed form
    if (/youtube\.com\/watch\?v=/.test(embedSrc)) {
      embedSrc = embedSrc.replace('watch?v=', 'embed/');
    } else if (/youtu\.be\//.test(embedSrc)) {
      embedSrc = embedSrc.replace('youtu.be/', 'www.youtube.com/embed/');
      if (!/^https?:\/\//.test(embedSrc)) embedSrc = 'https://' + embedSrc;
    }

    // Decide whether we can safely embed the video in an iframe.
    // Only allow embedding when the URL looks like a known embed provider.
    const embeddableProviders = ['youtube.com/embed/', 'youtube-nocookie.com/embed/', 'player.vimeo.com'];
    const isEmbeddable = /^https?:\/\//.test(embedSrc) && embeddableProviders.some(p => embedSrc.includes(p));

    if (isEmbeddable) {
      // Embed the video in an iframe inside the modal
      modalBody.innerHTML = `
        <div class="modal-image-wrap">
          <div style="position:relative;padding-top:56.25%;width:100%;height:0;">
            <iframe src="${embedSrc}" title="${escapeHtml(title)}" style="position:absolute;left:0;top:0;width:100%;height:100%;border:0;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
        <div class="modal-meta">
          <h2 id="modalTitle">${escapeHtml(title)}</h2>
          <p class="modal-date">${escapeHtml(date)}</p>
          <p class="modal-explanation">${escapeHtml(explanation)}</p>
        </div>
      `;
    } else {
      // Not embeddable: show a large thumbnail (if available) and a clear link to open the video in a new tab
      let thumb = item.thumbnail_url || '';

      // Try to build a YouTube thumbnail if possible (best-effort)
      if (!thumb) {
        const ytMatch = (item.url || '').match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
        if (ytMatch && ytMatch[1]) {
          thumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
      }

      // Fallback placeholder if no thumbnail found
      if (!thumb) {
        thumb = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="%23020b18"/><text x="50%" y="50%" fill="%23ffffff" font-size="18" font-family="Arial" text-anchor="middle" dominant-baseline="middle">Video</text></svg>';
      }

      // Provide a prominent action link so the user can open the original video page
      const safeHref = item.url || embedSrc || '#';
      modalBody.innerHTML = `
        <div class="modal-image-wrap">
          <img src="${thumb}" alt="${escapeHtml(title)}" class="modal-image" />
        </div>
        <div class="modal-meta">
          <h2 id="modalTitle">${escapeHtml(title)}</h2>
          <p class="modal-date">${escapeHtml(date)}</p>
          <p class="modal-explanation">${escapeHtml(explanation)}</p>
          <p style="margin-top:.6rem">
            <a class="video-link" href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:var(--nasa-red);font-weight:600;">Open video in a new tab ▶</a>
          </p>
        </div>
      `;
    }
  } else {
    // Image case: show large image (use hdurl when available)
    const imageUrl = item.hdurl || item.url || '';
    modalBody.innerHTML = `
      <div class="modal-image-wrap">
        <img src="${imageUrl}" alt="${escapeHtml(title)}" class="modal-image" />
      </div>
      <div class="modal-meta">
        <h2 id="modalTitle">${escapeHtml(title)}</h2>
        <p class="modal-date">${escapeHtml(date)}</p>
        <p class="modal-explanation">${escapeHtml(explanation)}</p>
      </div>
    `;
  }

  // Show modal and move focus to the close button
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // prevent background scroll
  modalClose.focus();
}

// Close the modal
function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalBody.innerHTML = '';
}

// Close modal when clicking overlay or close button
modalOverlay.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);

// Close modal with Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});

// Small helper to escape text for safe HTML insertion
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}