---
name: content-audit
description: >-
  Manually invoked. Copy audit of an app, its emails or a diff, against the project's own voice, word list and banned words and the plain-language standards (GOV.UK, NN/g, WCAG) — point-first writing, marketing claims and calls to action, buttons and links, form labels and errors, empty, success and loading states, sentence case and mechanics, accessible words and alt text, translation-safe strings, and each transactional email's sender, subject, preheader and body. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Content audit

A **manually-invoked audit of every word a product shows** — website pages, help articles, app and admin screens, forms, buttons, errors, dialogs, empty states, notifications and the emails it sends — for an app or a specific diff/PR. Each finding is verified against the real string before it lands in a phase-aware, scored report at `_reports/content-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`copywriting`** and the words side of **`emails`**, which are the fix targets when installed. The project's voice is the yardstick: this audit reports where copy departs from the voice, word list and banned words the project records, and never imposes a voice of its own.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the audit phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reader first.** Read each string as someone meeting it under pressure, on a phone, with a screen reader or in a second language. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — the phase argument if given; else the audit phase in `AGENTS.md`; else `production`.
2. **Load the voice** — the project's brand voice, word list, banned words, recorded formats (dates, times, money) and feature docs. Without a recorded voice, use the baseline below and say so in the report's scope line.
3. **Load the previous report** — if `_reports/content-audit.md` exists, carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → mark all `NEW`.
4. **Collect the copy** — components and pages, message or translation files, MDX and help articles, metadata titles and descriptions, schema error messages that reach the screen, toasts, server errors shown to people, and email templates with their subject, preheader and plain-text part. Read strings as rendered: JSX splits sentences across expressions.
5. **Run the checklist** (below), collecting findings with `file:line` evidence and the current text.
6. **Verify** each candidate — the string reaches a reader as quoted; the word list or a recorded exception doesn't allow it; a claim is checked against the feature docs. A claim the docs can't settle is "needs confirmation".
7. **Write the report** to `_reports/content-audit.md` (overwrite) and post the **chat summary**. Each fix gives the current text, the proposed text and the rule; never edit copy. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — copy that misleads or endangers: a wrong price, fee, limit or deadline; a claim the product doesn't do in a flow where money or data is at stake; an email that asks for a password, code or personal details, or links off the product's domains; an error in a core flow (sign in, pay, submit) that doesn't say what to do.
- **HIGH** — a WCAG A or AA copy failure (link purpose, headings and labels, label in name, error identification and suggestion, alt text) on a key page or a shared component; a banned word; a claim the product doesn't support; manipulative wording.
- **MEDIUM** — drift from the voice or word list (two words for one thing, the wrong tone for the moment), a generic error or empty state on a page few people reach, mechanics inconsistent across a surface.
- **LOW** — polish, a house rule beyond the standards, an AAA criterion such as reading level (3.1.5).

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/content-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change, the findings table with one section per finding, the scorecard, phase-tiered action items and "Resolved since last audit".

### Output

- **Full report** → `_reports/content-audit.md`, overwriting the prior run.
- **Chat summary** → the overall `<X>/10` (with Δ vs last run), a severity count (C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends rewrites in the report; it never modifies copy.

## Checklist

Fast first pass, each hit then read in context: `Submit`, `OK`, `Click here`, `here</`, `Learn more`, `Get started`, `please`, `Please note`, `An error occurred`, `Invalid`, `required`, `Oops`, `Success!`, `e.g.`, `i.e.`, `(s)`, `uppercase` on running text, and strings joined with `+` or template pieces around a count.

### Voice and word list

- **Voice and tone** match what the project records; without a record, the baseline: clear over clever, helpful, confident without superlatives, active, concise. Tone fits the moment — reassuring in an error, plain in a warning, warm on success, calm in an empty state — and the reader: one reader per page, and an admin panel plain and exact.
- **Sensitive moments** — loss, illness, money gone wrong — carry no playfulness, no exclamation marks and nothing that sells. No humour in errors, warnings, money or security ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)).
- **One word for each thing**, from the word list; a synonym for the same action or object elsewhere is a finding.
- **No banned word**, anywhere, including alt text, metadata and emails.
- **No promise past today** — every claim matches the feature docs; nothing "coming soon" in shipped copy.

### Writing for the web

- **The point first** — the headline says what the page gives the reader, each paragraph opens with its point, each heading names its section ([NN/g](https://www.nngroup.com/articles/inverted-pyramid/)); headings, links and list items front-loaded with the words people scan for.
- **Brief and plain** — short sentences, one idea each; no jargon or slang; an abbreviation spelled out the first time on each page; house rule: readable at age 12 to 14, legal pages included ([WCAG 3.1.5](https://www.w3.org/WAI/WCAG22/Understanding/reading-level), AAA → LOW).
- **Specific** — numerals, real kinds of thing, what it costs. Copy that explains how the screen works is a finding against the screen ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)).

### Marketing pages

- **The tagline** says what the product does and for whom; one that fits any competitor says nothing.
- **One reader and one main call to action** per page or section, named for what the reader gets; "Get started" and a bare "Learn more" are findings ([NN/g](https://www.nngroup.com/articles/get-started), [NN/g](https://www.nngroup.com/articles/learn-more-links/)).
- **The outcome, not the technology**; proof is real (screenshots, numbers, customers); no named competitor in a headline.

### Buttons and links

- **Verb first, saying what happens** — never "OK", "Submit", "Yes" or "Click here" ([GOV.UK](https://design-system.service.gov.uk/components/button/)); one main button per screen or step.
- **A destructive button names what goes**, and its confirmation names the consequence and whether it can be undone.
- **A busy button says what it's doing** ("Sending invite…"); "now" only when there's a choice of later.
- **A link makes sense on its own** — no "here" or "read more" without context ([WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context)).
- **No manipulative wording** — no confirmshaming, trick questions or urgency that isn't real.

### Forms and errors

- **Labels** visible, short, sentence case, no full stop or colon, never only a placeholder; hints under the label; "Create a password" for something new ([WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions)).
- **Every error says what happened and how to fix it**, reusing the field's words; "An error occurred", "This field is required", "Invalid", "please" and a bare code are findings ([GOV.UK](https://design-system.service.gov.uk/components/error-message/), [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification), [3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion)).
- **Different problems, different messages**, with the same words beside the field and in the summary.
- **The system takes the blame** — no "sorry" for the person's input, no "you forgot"; "sorry" only when the product failed, with what to do next. No exclamation marks or jokes in errors or alerts.

### States and notifications

- **The voice of a form** — the product "we", the reader "you", the reader's own choice "I"; "they" for a person of unknown gender.
- **An off-screen next step says what and where** — which address, how long a link works, when money arrives ([GOV.UK](https://www.gov.uk/service-manual/design/confirmation-pages)).
- **Success names what was done**, never a bare "Success"; no "please" or "please note".
- **An empty state says what will appear and gives the action that fills it**; no-results says so and how to widen the search ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)).
- **Loading copy is specific** where it can be; **a notification's first words say what happened**; tooltips, helper text and toasts are brief.

### Style and mechanics

- **Sentence case everywhere** — titles, headings, buttons, labels, tabs, menus, table headers, toasts; no full stop on headings, labels, buttons or titles.
- **Negatives written out** in warnings and instructions; exclamation marks rare and single; emoji never in place of words.
- **No capitals for emphasis**, typed or by CSS on running text; "for example", not "e.g."; no "i.e.".
- **Dates, times, numbers and money** in the project's formats, through locale-aware formatting, never assembled by hand.

### Accessible words

- **One `h1` saying what the page is for, and a title built from it**; headings and labels describe what follows ([WCAG 2.4.2](https://www.w3.org/WAI/WCAG22/Understanding/page-titled), [2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels)).
- **An accessible name starts with the visible words**; an icon-only control is named for its action ([WCAG 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name)).
- **No instruction by shape, colour, size or position** ([WCAG 1.3.3](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics)).
- **Alt text says what a meaningful image shows** — no "image of" or file names — and decoration has empty alt ([WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content)).
- **Inclusive** — no generalisations about people, places or cultures ([Microsoft](https://learn.microsoft.com/en-us/style-guide/bias-free-communication)); one pair of account words, never "Sign up" beside "Sign in" ([GOV.UK](https://design-system.service.gov.uk/patterns/create-accounts)).

### Strings that survive translation

- No sentence built from fragments or a word appended to a variable; real plural forms, never "(s)"; layouts that leave room for text a third longer.

### Emails

Read each email's From, subject, preheader and first sentence on their own, then the whole, then the plain-text part.

- **One job, one action** — one main button named for what happens; a second job is a second email ([GOV.UK](https://www.gov.uk/service-manual/design/sending-emails-and-text-messages)). No marketing in a transactional email, and each one is listed in the project's docs with its trigger.
- **A recognisable sender** — the product, or a person "via" the product ([NN/g](https://www.nngroup.com/articles/transactional-and-confirmation-email)).
- **The subject** is specific to what the reader did, about 50 characters, without repeating the From line or using emoji; **the preheader** is written and adds to the subject ([Mailchimp](https://mailchimp.com/help/about-preview-text)); **the first sentence** carries the message, then what to do and by when.
- **Short, personal and specific** — first name, the named thing, a reference and where to get help; what to do when a link has expired.
- **By type** — security: what changed, when, from which device or place, and one way to secure the account; money: the amount first, in the account's currency, and what it's for; reminders: what, when in the reader's time zone, what to bring. Facts in one panel laid out the same in every email.
- **Never like phishing** — never asks for a password, code or personal details; no full account numbers; links only to the product's own domains, with no redirect or tracking wrapper, a shown URL in full; no attachments.
- **Readable** — live text, never images of text; real headings and the document's language; buttons made of text with the link repeated below; alt text on meaningful images; the plain-text part says the same, links written out ([Litmus](https://www.litmus.com/blog/ultimate-guide-accessible-emails)).

## Boundaries

- **Report-only** — rewrites are proposed in the report as current text → proposed text → rule; this audit never edits copy.
- **The project's voice wins** — a word, tone or format the project records, with its reason, isn't a finding; copy that conflicts with the recorded voice is.
- **Words, not markup or sending** — ARIA, label wiring and contrast are `accessibility-audit`'s; providers, deliverability, unsubscribe and templates in code are `transactional-email`'s.
- **Never commit or push without explicit approval.**
