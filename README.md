<img src="./.github/images/banner.svg" alt="Promotional image of @morev/stylelint-plugin package" width="830" height="465" />

![Stability of "master" branch](https://img.shields.io/github/actions/workflow/status/MorevM/css/build.yaml?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Last commit](https://img.shields.io/github/last-commit/morevm/css)
![Release version](https://img.shields.io/github/v/release/morevm/css?include_prereleases)
![GitHub Release Date](https://img.shields.io/github/release-date/morevm/css)
![Keywords](https://img.shields.io/github/package-json/keywords/morevm/css)

# @morev/css

A modern CSS foundation for projects whose entire visual layer is controlled by a design system.

`@morev/css` removes browser presentation to provide a neutral canvas while
preserving semantics, appropriate display modes, and essential native behavior.

## Installation

```sh
pnpm add @morev/css
```

## Structure

The foundation is split into three stylesheets:

- [`core.css`](./src/reset/core.css) removes user-agent presentation and normalizes browser differences.
- [`base.css`](./src/reset/base.css) adds design-system-ready defaults for typography, layout, and interaction.
- [`reduced-motion.css`](./src/reset/reduced-motion.css) optionally applies a strict reduced-motion policy.

The required `core` and `base` stylesheets are also available together as `reset.css`. \
All selected stylesheets must come before the design-system styles.

## Cascade layers

The distributed stylesheets intentionally do not declare an `@layer`.
Element selectors are wrapped in `:where()` so they add no specificity;
this preserves the expected cascade in projects that do not use layers.

## Usage

```css
@layer reset, design-system;

@import '@morev/css/reset/core.css' layer(reset);
@import '@morev/css/reset/base.css' layer(reset);

/* Optional */
@import '@morev/css/reset/reduced-motion.css' layer(reset);

@import './design-system.css' layer(design-system);
```

Using cascade layers is optional. Import the selected stylesheets before the design-system styles directly:

```css
@import '@morev/css/reset.css';

/* Optional */
@import '@morev/css/reset/reduced-motion.css';

@import './design-system.css';
```

### CDN

The reset can be used without a package manager or build step. Load the complete minified stylesheet
from a CDN before the design-system styles:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@morev/css/dist/reset.min.css">
```

Omitting the version resolves the current `latest` release. For reproducible deployments,
pin a version by adding it after the package name: `@morev/css@0.1.0`.

Every stylesheet is available in both regular and minified form:

| Stylesheet                         | Regular                    | Minified                       |
| ---------------------------------- | -------------------------- | ------------------------------ |
| Complete reset (`core` and `base`) | `reset.css`                | `reset.min.css`                |
| Core reset                         | `reset/core.css`           | `reset/core.min.css`           |
| Design-system defaults             | `reset/base.css`           | `reset/base.min.css`           |
| Optional reduced-motion policy     | `reset/reduced-motion.css` | `reset/reduced-motion.min.css` |

With jsDelivr, append these paths after `https://cdn.jsdelivr.net/npm/@morev/css/dist/`.
UNPKG supports the package export paths directly:

```html
<link rel="stylesheet" href="https://unpkg.com/@morev/css/reset.min.css">
<link rel="stylesheet" href="https://unpkg.com/@morev/css/reset/reduced-motion.min.css">
```

## Browser support

The package targets the moving [Baseline Widely Available](https://web.dev/baseline/) window
and keeps compatibility rules until the corresponding native behavior has been available
across the Baseline browser set for at least 30 months.

## Playground

The [`playground`](https://morevm.github.io/css/playground/) compares native and reset rendering
side by side and documents the behavior of every stylesheet.
