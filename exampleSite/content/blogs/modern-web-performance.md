---
author: "Cid Kagenou"
title: "Speed"
slug: "modern-web-performance"
date: 2026-06-15
tags: ["Wisdom of the Shadows", "Performance"]
description: "A blade that arrives late is not a blade."
summary: "They shaved milliseconds from pages for a living. They were measuring something I learned as a child: a strike is only as good as the moment it lands."
weight: 20
type: post
image: "/images/avatar.png"
showTableOfContents: true
draft: false
---

In March 2024, Google formally replaced First Input Delay (FID) with **Interaction to Next Paint (INP)** as a fundamental Core Web Vital. This shifted the industry focus from mere initialization latency to responsiveness across an entire browsing session.

## 1. Demystifying Interaction to Next Paint (INP)

INP measures the longest duration between a user interaction (tap, click, keypress) and the moment the browser presents the resulting visual frame:

```
[User Action] ──> [Input Delay] ──> [Event Handlers] ──> [Presentation Delay] ──> [Frame Rendered]
```

To maintain a **Good INP (< 200ms)**:
- Break up long CPU tasks into chunks exceeding 50ms using `scheduler.yield()` or `requestIdleCallback()`.
- Avoid heavy synchronous DOM recalculations inside click handlers.
- Offload expensive computations to Web Workers.

---

## 2. Largest Contentful Paint (LCP) Optimization

LCP measures when the largest visual element (hero image, block of text) renders within the viewport:
- **Preload Critical Assets:** Use `<link rel="preload">` with appropriate `fetchpriority="high"`.
- **Eliminate Render-Blocking Resources:** Minify stylesheets, inline critical CSS, and defer non-essential JavaScript.
- **Modern Image Formats:** Serve images encoded in AVIF or WebP with responsive `srcset` resolutions.

---

## 3. Minimizing Cumulative Layout Shift (CLS)

Unexpected layout shifts frustrate readers:
- Always reserve aspect ratio space for dynamic elements and images using CSS `aspect-ratio` or explicit `width` and `height` attributes.
- Avoid injecting dynamic banners above existing content without reserving layout containers.
- Use `font-display: swap` paired with size-adjust metrics to eliminate Flash of Unstyled Text (FOUT) shifts.

---

## Conclusion

Fast websites prioritize user attention by eliminating wasteful main-thread stalls and optimizing critical rendering paths.
