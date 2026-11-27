---
name: semantic-html
description: >-
  Semantic HTML and JSX markup — the element that describes the content, landmarks and one outline of headings, lists and description lists, tables, links versus buttons, form markup (labels, fieldsets, input types, autocomplete, button types), dialogs and disclosure, media markup, the document head, and markup under Tailwind and React. Use when writing or reviewing any markup, building a component, page, form, table or list, or fixing div soup.
---

# Semantic HTML

Pick the element that says what the content **is**, then style it. Semantic markup is what assistive technology, search engines, browser features (reader mode, autofill, translation) and the next developer all read; `<div>` and `<span>` are style hooks with no meaning, used only when nothing better fits. This skill owns element choice and structure; how things look, take focus and announce is `accessibility`'s.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The right element — decided while writing

| The content is…                                              | Use                                               | Not                          |
| ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------- |
| A label paired with a value (a stat, a spec, metadata)       | `<dl>` with `<dt>` and `<dd>`                     | nested `<span>`s or `<div>`s |
| A list of similar items                                      | `<ul>` or `<ol>` with `<li>`                      | a stack of `<div>`s          |
| A themed group of content with a heading                     | `<section>` with its heading                      | a bare `<div>`               |
| Something that stands on its own (a card, a post, a comment) | `<article>`                                       | `<div>`                      |
| The page's main content                                      | `<main>`, once per page                           | `<div>`                      |
| A block of navigation links                                  | `<nav>`                                           | a `<div>` of links           |
| A search form                                                | `<search>` around the form                        | `<div role="search">`        |
| The intro or end matter of a page or section                 | `<header>`, `<footer>`                            | `<div>`                      |
| Content beside the main flow (a sidebar, a callout)          | `<aside>`                                         | `<div>`                      |
| Emphasis, importance, a highlight                            | `<em>`, `<strong>`, `<mark>`                      | a `<span>` with CSS          |
| Something that does an action                                | `<button>`                                        | a `<div>` with `onClick`     |
| Something that goes to a URL                                 | `<a href>`                                        | a `<button>` that navigates  |
| A quotation, a figure with its caption                       | `<blockquote>`/`<q>`, `<figure>` + `<figcaption>` | `<div>`                      |
| A date or time                                               | `<time dateTime="…">`                             | `<span>`                     |
| Contact details for a page or article                        | `<address>`                                       | `<div>`                      |
| Code, a key to press, an abbreviation                        | `<code>`, `<kbd>`, `<abbr title>`                 | `<span>`                     |
| Rows and columns of data                                     | `<table>`                                         | a grid of `<div>`s           |
| Content that opens and closes                                | `<details>` + `<summary>`                         | a `<div>` toggled by a click |
| A modal or non-modal dialog                                  | `<dialog>`                                        | a hand-built overlay `<div>` |
| The result of a calculation                                  | `<output>`                                        | `<span>`                     |

- **A `<span>` never contains a `<span>`.** HTML allows it, but it's always a sign the content has structure the markup isn't saying: make the pieces siblings, or use the element the content is.
- **A link or a button, by what happens.** Going somewhere — a new URL, another page, a section of this one, a filter "pill" that changes the URL — is a link. Changing something here — submitting, opening, toggling, deleting — is a button. A pill row that navigates is a `<nav>` of links with the current one marked (`accessibility`), never toggle buttons or tabs. The exceptions keep their own patterns even when their state is in the URL: tabs that switch panels on the same page are a tab list, and a control that opens a dialog or drawer is a button (`react` keeps their state in the URL).
- **Layout never justifies a `<div>`.** A `<ul>`, `<dl>`, `<section>` or `<nav>` can be the flex or grid container itself.

## Structure

- **Landmarks:** one `<main>`, `<header>` and `<footer>` for the page's banner and footer, `<nav>` for each navigation block — each labelled (`aria-label`) when there's more than one — and `<aside>` for complementary content. Everything visible sits inside a landmark.
- **One outline of headings.** One `<h1>` per page, naming it; then `<h2>` for its sections and `<h3>` for parts of those, never skipping a level. Size comes from CSS, never from picking a heading level. The HTML "outline algorithm" was never implemented, so nesting a `<section>` doesn't change a heading's level.
- **A `<section>` has a heading**, and is named by it (`aria-labelledby`); a group with no heading is a `<div>`. A heading that would repeat what's visible is kept, visually hidden, rather than dropped.

## Lists and description lists

- **A label and its value are a `<dl>`.** `<dt>` comes before its `<dd>` in the DOM; to show the value on top, reorder with CSS (`flex-col-reverse`), never the DOM — safe here because nothing in a `<dl>` takes focus, so the reading order and the visual order can't mislead. A pair sits directly in `<dl>` or inside one `<div>` — nothing deeper — and a hint or unit goes inside the `<dd>`.

  ```tsx
  <dl>
    {stats.map((stat) => (
      <div key={stat.label}>
        <dt>{stat.label}</dt>
        <dd>{stat.value}</dd>
      </div>
    ))}
  </dl>
  ```

- **A list styled without bullets stays a list.** Tailwind's reset removes list markers, and Safari then stops announcing some lists; a `<ul>` or `<ol>` that must be read as a list takes `role="list"`.

## Tables

Rows of data someone would scan across, compare or sort are a `<table>`: a `<caption>` names it, `<thead>` holds the header row, each header cell is `<th scope="col">` (or `scope="row"` for a row's header), and the body is `<tbody>`. A CSS grid of `<div>`s loses the link between cell and header, and no ARIA brings it back. Cards in a grid are `<article>`s in a `<ul>`, not rows. A sortable column's header holds a `<button>`, and the header carries `aria-sort`.

## Forms

- **Every control has a `<label>`**, tied by `htmlFor` and `id` or by wrapping it. A placeholder is a hint, never the label.
- **Related controls are a `<fieldset>` with a `<legend>`** — a radio group, a set of checkboxes, a row of toggle buttons that pick one option, an address block.
- **The right input `type`** (`email`, `tel`, `url`, `number`, `date`, `search`) and `inputmode` for the keyboard, so phones show the right one; a number that isn't a quantity — a card number, an account number, an OTP — is `type="text"` with `inputmode="numeric"`, and a phone number is `type="tel"`.
- **`autocomplete` on every field about the person** (`name`, `email`, `tel`, `street-address`, `postal-code`, `new-password`, `current-password`), from the HTML standard's list — autofill works, and WCAG 1.3.5 requires it for fields about the person — plus `one-time-code` on a code field, which isn't required but lets the phone fill it.
- **Constraint attributes stay** (`required`, `minLength`, `min`, `max`, `pattern`) even when the app validates with its own messages: they describe the field. The form takes `noValidate` so the browser's bubbles don't compete with the app's (`schemas-and-contracts`).
- **Every `<button>` states its `type`.** A button inside a form submits by default, so anything that isn't the submit is `type="button"`.
- **A form that changes data is a `<form>`** with an action — a Server Action in Next.js (`nextjs`) — so Enter submits it and it works before scripts load.

How labels are read, and how errors are shown and announced, is `accessibility`'s.

## Dialogs and disclosure

- **A dialog is `<dialog>`**, opened with `showModal()` for a modal (the browser handles the top layer, `::backdrop`, Escape and inertness) or `show()` for a non-modal one. A lighter popup with no backdrop — a menu, a tooltip-like panel — uses the `popover` attribute.
- **Content that opens and closes is `<details>` and `<summary>`**; `name` on several `<details>` makes an exclusive accordion. A custom component only when the design needs what they can't do.
- Focus behaviour, return focus and live announcements are `accessibility`'s; a reusable dialog's API is `reusables`'.

## Media

- **Every `<img>` has `alt`**; what it says is `accessibility`'s. It also has `width` and `height` (or an aspect ratio in CSS) so the page doesn't shift as it loads, and `srcset` with `sizes` for responsive sources; `<picture>` only to switch formats or crops.
- **Images below the fold load lazily (`loading="lazy"`); the largest image in view never does** — it loads eagerly with `fetchpriority="high"`. In Next.js that's `next/image` with `loading="eager"` or `fetchPriority="high"` (`priority` is deprecated from Next 16) — `nextjs`.
- **An `<iframe>` has a `title`** naming what it holds (a map, a video), and a table too wide for the screen sits in a scroll container that's labelled and reachable by keyboard (`tabindex="0"`, `role="region"`, `aria-label`).
- **Video and audio** have `controls`, a `poster` for video, and a `<track kind="captions">`; nothing autoplays with sound.

## The document

`<!doctype html>`; `<html lang>` with the page's language; `<meta charset="utf-8">`; a viewport meta of `width=device-width, initial-scale=1` that never limits zoom; a unique `<title>`. In Next.js the framework writes most of these from the root layout and the Metadata API (`nextjs`, `seo-aeo-geo`).

## In React and Tailwind

- **A component's output follows the same rules.** A card renders an `<article>`, a list a `<ul>`, a stat block a `<dl>` — never a default `<div>`. A fragment, not a wrapper `<div>`, when a component returns siblings. JSX writes `htmlFor` and `className`, and a component that wraps a native element passes its attributes through (`reusables`).
- **Utility classes never change meaning.** Style the semantic element directly (`<section className>`); don't wrap it in styled `<div>`s. `sr-only` keeps text for assistive technology while hiding it visually (`tailwind`).

## Do / Don't

- **Do** ask what the content is before typing a tag; use landmarks and one heading outline; put label–value pairs in a `<dl>` and data in a `<table>`; label every control; group related controls in a `<fieldset>`; give every button a `type`; use `<dialog>` and `<details>`; size every image.
- **Don't** nest a `<span>` in a `<span>`; make a `<div>` clickable; navigate with a button or act with a link; skip a heading level for size; leave a `<section>` without a heading; lay out data in a grid of `<div>`s; use a placeholder as a label; lazy-load the main image.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/accessibility-audit`, written from its own template. Run it rather than writing a report from here.

Focus, keyboard, contrast, ARIA states and announcements `accessibility` · a reusable component's API and focus handling `reusables` · Tailwind and `sr-only` `tailwind` · images, forms and metadata in Next.js `nextjs` · titles and structured data `seo-aeo-geo` · form schemas `schemas-and-contracts` · the review `accessibility-audit`.
