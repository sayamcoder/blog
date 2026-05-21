document.addEventListener('DOMContentLoaded', () => {
  // 1. Spotlight Card Glow Effect
  const postCards = document.querySelectorAll('.post-card');
  
  postCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position inside the card
      const y = e.clientY - rect.top;  // y position inside the card
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // 2. Client-side Search and Filter Helpers
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        const urlParams = new URLSearchParams(window.location.search);
        
        if (query) {
          urlParams.set('q', query);
        } else {
          urlParams.delete('q');
        }
        
        window.location.search = urlParams.toString();
      }
    });
  }

  // 3. Admin Panel - Auto Slug Generator
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  let manualSlug = false;

  if (titleInput && slugInput) {
    // If the slug input already has content, treat it as manual/pre-existing
    if (slugInput.value.trim() !== '') {
      manualSlug = true;
    }

    slugInput.addEventListener('input', () => {
      manualSlug = slugInput.value.trim() !== '';
    });

    titleInput.addEventListener('input', () => {
      if (!manualSlug) {
        slugInput.value = slugify(titleInput.value);
      }
    });
  }

  // Helper to slugify string
  function slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start
      .replace(/-+$/, '');            // Trim - from end
  }

  // 4. Admin Panel - Live Markdown Preview & Auto Read-time Estimator
  const contentInput = document.getElementById('content');
  const previewBody = document.getElementById('preview-body');
  const readTimeInput = document.getElementById('read_time');
  const autoReadTimeSpan = document.getElementById('auto-read-time');

  if (contentInput) {
    // Initial compute
    updatePreviewAndStats();

    contentInput.addEventListener('input', updatePreviewAndStats);
  }

  function updatePreviewAndStats() {
    const markdownText = contentInput.value;
    
    // Update live preview
    if (previewBody) {
      if (markdownText.trim() === '') {
        previewBody.innerHTML = '<p class="text-muted">Your rendered article will appear here...</p>';
      } else if (window.marked) {
        // Use client-side marked if loaded
        previewBody.innerHTML = window.marked.parse(markdownText);
      } else {
        previewBody.innerText = markdownText;
      }
    }

    // Update read time estimation
    const words = markdownText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const estimatedMinutes = Math.max(1, Math.ceil(words / 200));

    if (autoReadTimeSpan) {
      autoReadTimeSpan.innerText = `(~${estimatedMinutes} min read)`;
    }

    // Pre-fill read time input if it's currently empty or has not been manually changed
    if (readTimeInput && (readTimeInput.value === '' || readTimeInput.dataset.auto === 'true')) {
      readTimeInput.value = estimatedMinutes;
      readTimeInput.dataset.auto = 'true';
    }
  }

  if (readTimeInput) {
    readTimeInput.addEventListener('input', () => {
      readTimeInput.dataset.auto = 'false';
    });
  }

  // 5. Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      const isVisible = navLinks.style.display === 'flex';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '80px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'rgba(5, 5, 8, 0.95)';
        navLinks.style.padding = '20px';
        navLinks.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        navLinks.style.gap = '16px';
        navLinks.style.zIndex = '99';
      }
    });
  }
});
