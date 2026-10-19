document.addEventListener('DOMContentLoaded', ready, false);

const THEME_PREF_STORAGE_KEY = "theme-preference";
const THEME_TO_ICON_CLASS = {
    'dark': 'feather-moon',
    'light': 'feather-sun'
};
const THEME_TO_ICON_TEXT_CLASS = {
    'dark': 'Dark mode',
    'light': 'Light mode'
};
let darkThemeCss = '';

const HEADING_TO_TOC_CLASS = {
    'H1': 'level-1',
    'H2': 'level-2',
    'H3': 'level-3',
    'H4': 'level-4'
}

// Reading or writing localStorage throws outright when storage is blocked
// (Safari private browsing, cookies disabled). Unhandled, that would abort
// the rest of ready() and take reveal animations, the copy button, the
// service worker and the table of contents down with it.
function readStoredTheme() {
    try {
        return localStorage.getItem(THEME_PREF_STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

function writeStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_PREF_STORAGE_KEY, theme);
    } catch (e) {
        /* storage unavailable; the toggle still works for this page view */
    }
}

function ready() {
    feather.replace({ 'stroke-width': 1, width: 20, height: 20 });
    setThemeByUserPref();
    initReveal();
    initCopyEmail();
    registerServiceWorker();

    const postContainer = document.querySelector('main#content > .container.post');
    if (postContainer !== null) {
        if (document.getElementById('TableOfContents') !== null) {
            fixTocItemsIndent();
            createScrollSpy();
        }
    }

    SVGInjector(document.querySelectorAll('img.svg-inject'));

    const hamburgerToggle = document.getElementById('hamburger-menu-toggle');
    const hamburgerMenu = document.querySelector('.nav-hamburger-list');
    const hamburgerMenuToggleTarget = document.getElementById('hamburger-menu-toggle-target');
    if (hamburgerToggle && hamburgerMenu && hamburgerMenuToggleTarget) {
        hamburgerToggle.addEventListener('click', () => {
            const collapsed = hamburgerMenu.classList.toggle('visibility-hidden');
            hamburgerMenuToggleTarget.setAttribute('aria-checked', String(!collapsed));
        });
    }
}

// Both scroll-driven effects run once per animation frame rather than once
// per scroll event, so a fast trackpad flick does not queue up hundreds of
// redundant layout reads.
let headerShadowQueued = false;

window.addEventListener('scroll', () => {
    if (headerShadowQueued) return;
    headerShadowQueued = true;
    requestAnimationFrame(() => {
        headerShadowQueued = false;
        // 820 matches the breakpoint where the header collapses to the
        // hamburger layout; drop the threshold so the shadow appears sooner
        // in the shorter viewport.
        toggleHeaderShadow(window.innerWidth <= 820 ? 50 : 100);
    });
}, { passive: true });

function fixTocItemsIndent() {
    document.querySelectorAll('#TableOfContents a').forEach(tocItem => {
        const itemId = tocItem.getAttribute("href").substring(1);
        const heading = document.getElementById(itemId);
        if (!heading) return;
        const level = HEADING_TO_TOC_CLASS[heading.tagName];
        if (level) tocItem.classList.add(level);
    });
}

function createScrollSpy() {
    // Resolve each link to its heading once. A TOC entry whose target is
    // missing would otherwise throw inside the scroll handler.
    const entries = Array.from(document.querySelectorAll('#toc a'))
        .map(link => {
            const heading = document.getElementById(link.getAttribute('href').substring(1));
            return heading ? { link, heading } : null;
        })
        .filter(Boolean);

    if (!entries.length) return;

    const OFFSET = 55;
    let activeLink = null;
    let queued = false;

    function update() {
        queued = false;

        // Entries are in document order, so the last heading above the offset
        // is the one being read. This picks deterministically rather than
        // whichever match happened to be visited last.
        let current = null;
        for (const entry of entries) {
            if (entry.heading.getBoundingClientRect().top <= OFFSET) {
                current = entry.link;
            } else {
                break;
            }
        }

        if (current === activeLink) return;
        if (activeLink) activeLink.classList.remove('active');
        if (current) current.classList.add('active');
        activeLink = current;
    }

    document.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
    }, { passive: true });

    update();
}

function toggleHeaderShadow(scrollY) {
    if (window.scrollY > scrollY) {
        document.querySelectorAll('.header').forEach(function(item) {
            item.classList.add('header-shadow')
        })
    } else {
        document.querySelectorAll('.header').forEach(function(item) {
            item.classList.remove('header-shadow')
        })
    }
}

function setThemeByUserPref() {
    darkThemeCss = document.getElementById("dark-theme");
    const savedTheme = readStoredTheme() ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const darkThemeToggles = document.querySelectorAll('.dark-theme-toggle');
    setTheme(savedTheme, darkThemeToggles);
    darkThemeToggles.forEach(el => el.addEventListener('click', toggleTheme, { capture: true }))
}

function toggleTheme(event) {
    const toggleIcon = event.currentTarget.querySelector("a svg.feather");
    if (!toggleIcon) return;
    if (toggleIcon.classList[1] === THEME_TO_ICON_CLASS.dark) {
        setThemeAndStore('light', [event.currentTarget]);
    } else if (toggleIcon.classList[1] === THEME_TO_ICON_CLASS.light) {
        setThemeAndStore('dark', [event.currentTarget]);
    }
}

function setTheme(themeToSet, targets) {
    darkThemeCss.disabled = themeToSet === 'light';
    targets.forEach((target) => {
        target.querySelector('a').innerHTML = feather.icons[THEME_TO_ICON_CLASS[themeToSet].split('-')[1]].toSvg();
        target.querySelector(".dark-theme-toggle-screen-reader-target").textContent = [THEME_TO_ICON_TEXT_CLASS[themeToSet]];
    });
}

function setThemeAndStore(themeToSet, targets) {
    setTheme(themeToSet, targets);
    writeStoredTheme(themeToSet);
}

function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const els = document.querySelectorAll('.section, .row, .hero__text > *');
    els.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
}

function initCopyEmail() {
    document.querySelectorAll('.copy-email').forEach(btn => {
        btn.addEventListener('click', async () => {
            const value = btn.getAttribute('data-email') || btn.getAttribute('data-copy') || '';
            if (!value) return;
            try {
                await navigator.clipboard.writeText(value);
                const original = btn.textContent;
                btn.textContent = 'copied';
                setTimeout(() => { btn.textContent = original; }, 1200);
            } catch (e) { /* clipboard unavailable */ }
        });
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    // A local preview would otherwise serve the previous build's cache.
    if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(window.location.hostname)) return;
    // The hero stands down on metered connections; so does the cache.
    if (navigator.connection && navigator.connection.saveData) return;
    // Caching is an enhancement; the page is unaffected if this fails.
    navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {});
}
