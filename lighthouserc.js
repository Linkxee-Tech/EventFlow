// lighthouserc.js — Lighthouse CI configuration
// Phase 10 requirement: Scores must be > 90 for Performance, Accessibility, SEO.
// Usage: npx lhci autorun

module.exports = {
  ci: {
    collect: {
      url: [
        'https://eventflow.vercel.app/',
        'https://eventflow.vercel.app/events/afrobeats-night-out-demo',
        'https://eventflow.vercel.app/login',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        // Also run mobile
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
      },
    },
    assert: {
      assertions: {
        // Phase 10 DoD: all scores > 90
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],

        // Specific checks
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Accessibility
        'color-contrast': ['error', {}],
        'document-title': ['error', {}],
        'html-has-lang': ['error', {}],
        'image-alt': ['error', {}],
        'button-name': ['error', {}],

        // SEO
        'meta-description': ['error', {}],
        'viewport': ['error', {}],
        'canonical': ['warn', {}],

        // No console errors
        'errors-in-console': ['warn', {}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
