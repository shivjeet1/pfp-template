# Hugo Portfolio Template

[![Hugo](https://img.shields.io/badge/Hugo-v0.146.0%2B-ff4088?logo=hugo&logoColor=white)](https://gohugo.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Theme Showcase](https://img.shields.io/badge/themes.gohugo.io-Portfolio-success)](https://themes.gohugo.io/)

A modern, high-performance developer portfolio and blog theme for Hugo. Designed for software engineers, designers, and open-source creators who want a clean personal website featuring an interactive 3D WebGL hero, seamless dark/light mode, structured project showcase, and technical skill matrices—with **zero Node.js or npm build dependencies**.

Built strictly following the **modern Hugo v0.146.0+ template system architecture** (`layouts/home.html`, root `baseof.html`, `_partials/`, `_shortcodes/`, separated `taxonomy.html`/`term.html`).

---

![Hugo Portfolio Template Screenshot](images/screenshot.png)

## ✨ Features

- **🎮 Interactive 3D WebGL Hero**: Built-in kinetic orbital Three.js hero with mouse drag / touch rotation, damping, and dynamic accent color reactivity. Procedurally generated with zero heavy 3D asset downloads. Can be toggled on/off in `hugo.toml`.
- **🌓 Smooth Dark / Light Mode**: Instant toggle with local storage persistence and zero flash of unstyled content (`FOUC`).
- **💼 Structured Projects Showcase**: Rendered from `data/projects.yml` with badges for languages/frameworks, star counts, GitHub links, and live demo buttons.
- **🛠️ Technical Skills Grid**: Categorized skill matrices (Languages, Frameworks, Cloud, Databases) rendered from `data/skills.yml` with clean iconography.
- **📝 High-Impact Blog & Articles**: Clean typography (Lato), reading time estimates, responsive table of contents with scrollspy, and tag/category taxonomies.
- **⚡ Blazing Fast**: Zero external CSS/JS compilation pipelines required. Built-in Hugo Pipes minification and fingerprinting. 100/100 Lighthouse performance potential.
- **🔍 SEO & Social Cards**: Auto-generated OpenGraph, Twitter Card meta tags, and structured JSON-LD.
- **📱 Fully Responsive**: Thoughtful layouts engineered for mobile phones, tablets, and ultrawide monitors.
- **🌐 Offline Ready**: Built-in Service Worker caching strategy for offline reading.

---

## 🚀 Quick Start

### Option 1: Use the Example Site (Fastest)

To launch a working site in under 60 seconds:

```bash
# Clone this repository
git clone https://github.com/shivjeet1/pfp-template.git

# Enter the example site directory
cd pfp-template/exampleSite

# Start Hugo local development server
hugo server --themesDir ../.. -t pfp-template
```

Open `http://localhost:1313` in your browser.

---

### Option 2: Add to an Existing Hugo Site

1. In your existing Hugo project root:

```bash
git submodule add https://github.com/shivjeet1/pfp-template.git themes/pfp-template
```

2. Add the theme to your `hugo.toml` (or `config.toml`):

```toml
theme = "pfp-template"
```

3. Copy the starter content and data templates from the theme's `exampleSite`:

```bash
cp -r themes/pfp-template/exampleSite/content ./
cp -r themes/pfp-template/exampleSite/data ./
```

---

### Option 3: Hugo Modules

If your site is configured as a Hugo Module:

```bash
hugo mod init my-portfolio
```

Add the theme module to your `hugo.toml`:

```toml
[module]
  [[module.imports]]
    path = "github.com/shivjeet1/pfp-template"
```

Then update modules:

```bash
hugo mod get -u
```

---

## ⚙️ Configuration

Here is a sample `hugo.toml` configuration:

```toml
baseURL = "https://example.org/"
title = "Alex Developer | Software Engineer & Creator"
defaultContentLanguage = "en"
theme = "pfp-template"

# Hugo v0.146.0+ Taxonomies
[taxonomies]
  category = "categories"
  tag = "tags"

[params]
  description = "Software engineer specializing in distributed systems, web architectures, and developer tooling."
  author = "Alex Developer"
  avatarURL = "images/avatar.svg"
  accentColor = "#4B61D1"
  fontSize = "1.1rem"
  metaKeywords = ["software engineer", "developer", "golang", "rust", "typescript", "open-source"]
  dateFormat = "Jan 2, 2006"
  footerText = "Crafted with Hugo and pfp-template."

  # Feature Toggles
  [params.features]
    heroScene = true         # Enables the procedural Three.js 3D kinetic orb
    socialShare = true       # Social sharing links on blog posts
    backToTop = true         # Floating back-to-top button
    serviceWorker = false    # Enable PWA service worker caching

  # Hero Section
  [params.hero]
    greeting = "Hello, I'm"
    name = "Alex Developer"
    role = "Software Engineer & Open Source Craftsman"
    bio = "Building reliable distributed backend systems, high-performance web applications, and developer ergonomics."
    resumeURL = "/resume.pdf"
    contactURL = "mailto:hello@example.com"

  # Social Links (Displayed in Header & Footer)
  [params.social]
    github = "https://github.com"
    linkedin = "https://linkedin.com"
    twitter = "https://twitter.com"
    email = "mailto:hello@example.com"
    rss = "/blogs/index.xml"

# Main Navigation Menu
[[menus.main]]
  name = "About"
  url = "/about/"
  weight = 1

[[menus.main]]
  name = "Projects"
  url = "/projects/"
  weight = 2

[[menus.main]]
  name = "Blog"
  url = "/blogs/"
  weight = 3
```

---

## 📂 Data-Driven Showcases

### Projects (`data/projects.yml`)

Add your highlighted work into `data/projects.yml`:

```yaml
- title: "Distributed Task Queue"
  description: "High-throughput, persistent asynchronous task processing engine in Go."
  languages: ["Go", "Redis", "gRPC", "Docker"]
  stars: 1250
  github: "https://github.com/example/task-queue"
  link: "https://queue.example.org"

- title: "Real-time Metrics Dashboard"
  description: "WebGL and WebSockets streaming telemetry monitoring platform."
  languages: ["TypeScript", "Three.js", "WebSockets"]
  stars: 480
  github: "https://github.com/example/metrics-app"
  link: "https://metrics.example.org"
```

### Skills Matrix (`data/skills.yml`)

Organize your technical proficiencies in `data/skills.yml`:

```yaml
- category: "Languages & Core"
  skills:
    - name: "Go"
      icon: "⚡"
    - name: "Rust"
      icon: "🦀"
    - name: "TypeScript / JavaScript"
      icon: "🔷"
    - name: "Python"
      icon: "🐍"

- category: "Platforms & Systems"
  skills:
    - name: "Kubernetes & Docker"
      icon: "🐳"
    - name: "PostgreSQL & Redis"
      icon: "🐘"
    - name: "Linux & eBPF"
      icon: "🐧"
```

---

## 📝 Writing Content

### Creating a New Blog Post

```bash
hugo new blogs/my-first-post.md
```

Front matter example:

```markdown
---
title: "Architecting Modern High-Throughput Web Services"
date: 2026-03-24T10:00:00Z
draft: false
tags: ["Architecture", "Go", "Distributed Systems"]
categories: ["Engineering"]
description: "Insights on designing resilient microservices with low-latency communication."
toc: true
---

Your content goes here...
```

### Shortcodes Included

- **`{{< skills >}}`**: Automatically renders the interactive skills matrix anywhere in Markdown from `data/skills.yml`.
- **`{{< development >}}`**: Displays an elegant "Under Construction / Development" banner for work-in-progress sections.

---

## 🎨 Customizing the 3D Hero Scene

The 3D hero utilizes Three.js loaded from CDN or local bundle, initialized by `static/js/hero-scene.js`.
- It requires **no 3D modeling software** or `.gltf` asset loading.
- It dynamically adapts its particle and mesh materials to your `[params] accentColor` and light/dark theme.
- To disable it completely, simply set `heroScene = false` under `[params.features]` in your `hugo.toml`.

---

## 🧪 Testing the Showcase

This theme complies with all requirements for inclusion in the [Hugo Themes Showcase](https://themes.gohugo.io):

```bash
cd exampleSite
hugo --themesDir ../.. -t pfp-template
```

Output:
```
Pages            │ 41
Static files     │ 13
Total in 48 ms
```

---

## 📄 License

This theme is licensed under the [MIT License](LICENSE).
