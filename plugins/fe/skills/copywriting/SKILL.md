---
name: copywriting
description: >-
  Writing and reviewing every piece of a product's copy — the website, help articles, the app and its admin panel — in the project's own voice, word list and banned words: voice and tone by moment and reader, writing for the web, marketing pages, buttons and links, forms and errors, empty, success and loading states, mechanics, accessible words, copy that survives translation, and a review process. Use when writing, reviewing or updating any user-facing text.
---

# Copywriting

Every word a product shows: website pages, help articles, app and admin screens, forms, buttons, errors, dialogs, empty states and notifications. Copy is part of the experience — clear, specific and accessible, in one recognisable voice. If people have to stop and work out what the words mean, the copy has failed. Emails follow `emails` as well.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The project's voice

Before writing, read the project's **brand voice**, **word list** and **banned words**, and apply them to every string:

- **Voice** is the constant personality; the project records its traits. Without them, the baseline is: clear over clever, helpful, confident without superlatives, active, concise.
- **Tone** flexes with the moment — reassuring in an error, plain in a warning, warm on success, calm in an empty state — and with the reader: each page or screen speaks to one reader, and an admin panel speaks to the team, plain and exact.
- **Sensitive moments** — loss, illness, money gone wrong — get no playfulness, no exclamation marks, short gentle sentences and nothing that sells.
- **One word for each thing**, from the word list, never a synonym: if it's "delete" in one place, it isn't "remove" in another for the same action.
- **The banned words** never appear, anywhere.
- **Copy never promises more than the product does today.** What it does comes from the project's feature docs; nothing "coming soon" in shipped copy.

Playfulness has limits: never in errors, warnings, money, security, or anything that went wrong — people meet those under stress ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces), [Mailchimp](https://styleguide.mailchimp.com/grammar-and-mechanics/)).

## Writing for the web

- **Put the point first:** the headline says what the page gives the reader, the first sentence of each paragraph carries its point, and each heading says what its section is about ([NN/g](https://www.nngroup.com/articles/inverted-pyramid/)).
- **Front-load** headings, links and list items with the words people scan for; people read the start of lines and skip the rest ([NN/g](https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/)).
- **Be brief:** short sentences, one idea each; short paragraphs and lists over walls of text ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)).
- **Plain, familiar words;** no jargon or slang; spell out an abbreviation the first time on each page. Aim for text a 12-to-14-year-old could read, legal pages included ([WCAG 3.1.5](https://www.w3.org/WAI/WCAG22/Understanding/reading-level), [GOV.UK](https://www.gov.uk/guidance/content-design/writing-for-gov-uk)).
- **Specific beats general:** numbers as numerals, real places and real kinds of thing, what it costs.
- **If the copy has to explain how the screen works, fix the screen** ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)).

## Marketing pages

- **The tagline says what the product does and for whom.** One that would fit any competitor, or that nobody would claim the opposite of, says nothing ([NN/g](https://www.nngroup.com/articles/tagline-blues-whats-the-site-about)).
- **One reader per page or section, and one main call to action**, named for what the reader gets ("Create your first project"). Never "Get started" — people press it expecting information and land in a sign-up ([NN/g](https://www.nngroup.com/articles/get-started)).
- **No bare "Learn more":** say what they'll learn ("See how payouts work") ([NN/g](https://www.nngroup.com/articles/learn-more-links/)).
- **Sell the outcome, not the technology** — "AI-powered" isn't a reason to buy ([NN/g](https://www.nngroup.com/articles/powered-by-ai-is-not-a-value-proposition)).
- **Proof is real** — real screenshots, numbers and customers — and every claim is something the product does today. No comparing the product to a named competitor in a headline.

## Buttons and links

- **Say what happens, verb first:** "Send invite", "Save changes", "Continue to payment". Never "OK", "Submit", "Yes" or "Click here"; prefer a specific verb even over "Next" ([NN/g](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/), [GOV.UK](https://design-system.service.gov.uk/components/button/)).
- **One main button per screen or step;** everything else is quieter.
- **A destructive button names what goes** ("Delete project"), and its confirmation names the consequence and whether it can be undone ("Delete 3 photos? You can't undo this"). Colour is never the only signal.
- **A busy button says what it's doing** ("Sending invite…"), not "Loading".
- **A link makes sense on its own** — screen reader users hear links listed out of context. Never "here" ([WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context)).
- **Drop "now"** unless there's a choice of now or later.
- **No manipulative wording:** no confirmshaming ("No thanks, I don't like saving money"), no trick questions, no urgency that isn't real.

## Forms and errors

- **Labels are visible, short, sentence case**, with no full stop or colon; a placeholder is never the label. Hints sit under the label and say what to enter or why it's asked ([WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions), [NN/g](https://www.nngroup.com/articles/form-design-placeholders/)).
- **A field for something new says so:** "Create a password", not "Password".
- **An error says what happened and how to fix it:** "Enter an email address like name@example.com". Never "An error occurred", "This field is required", "Invalid input" or a bare code ([GOV.UK](https://design-system.service.gov.uk/components/error-message/), [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification), [3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion)).
- **Different problems get different messages**, with the same words beside the field and in the summary above the form.
- **Keep what they typed;** don't show an error before they've finished.
- **Blame the system, not the person.** No "sorry" for their input; say sorry only when the product failed, and say what to do: "Something went wrong on our side. Try again in a few minutes."
- **No exclamation marks and no jokes** in errors or alerts.

## Messages, states and notifications

- **Forms are a conversation:** the product is "we", the reader "you", and the reader speaking "I" ("I agree to the terms"). "They" for a person whose gender is unknown.
- **When the next step happens off screen, say what and where** — which address an email went to, how long a link works, when money arrives ([GOV.UK](https://www.gov.uk/service-manual/design/confirmation-pages)).
- **Success names what was done** ("The invite was sent"), not "Success". "Thank you" only where it means something.
- **No "please" or "please note"** in instructions ([GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)).
- **An empty state says what will appear and gives the action that fills it** — and a search with no results says so and how to widen it, which isn't the same as a first-run empty state ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)).
- **Loading copy is specific** when it can be ("Loading your projects…").
- **A notification's first words say what happened;** the rest says what to do, if anything.
- **Microcopy** — tooltips, helper text, onboarding, toasts — removes doubt at the point of action, briefly.

## Style and mechanics

- **Sentence case everywhere** — titles, headings, buttons, labels, tabs, menus, table headers, toasts. Capitalise only the first word and proper nouns. Mixed casing is the most visible inconsistency.
- **No full stop** on headings, labels, buttons or titles; full sentences end with one.
- **Contractions keep it warm** ("you're", "we'll"), but negatives are written out in warnings and instructions, where "can't" may be misread as "can".
- **Exclamation marks sparingly**, one at a time; emoji rarely, never in place of words.
- **No capitals for emphasis or whole words**, typed or by CSS on running text — slower to read, especially with dyslexia, and some screen readers spell them out. Use bold.
- **"For example", not "e.g."**; no "i.e.".
- **Dates, times, numbers and money in the project's recorded formats**, produced by locale-aware formatting, never assembled by hand.

## Accessible words

- **Each page has one `h1` saying what it's for, and a title built from it** ("Team – Admin"). Headings describe what follows and are never part of a sentence ([WCAG 2.4.2](https://www.w3.org/WAI/WCAG22/Understanding/page-titled), [2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels)).
- **An accessible name starts with the visible words**, so voice control works; an icon-only button is named for its action ("Close", "Remove photo") ([WCAG 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name)).
- **Never rely on shape, size, colour or position:** not "the green button" or "the menu on the left" ([WCAG 1.3.3](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics)).
- **Alt text says what a meaningful image shows;** a decorative one has empty alt text ([WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content)).
- **A phrase in another language is marked** with its `lang`, so it's pronounced right ([WCAG 3.1.2](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts)).
- **Inclusive by default:** no generalisations about people, places or cultures; examples and names reflect the range of people the product serves ([Microsoft](https://learn.microsoft.com/en-us/style-guide/bias-free-communication)).
- **One pair of account words**, recorded by the project — "Sign in" and "Sign out", with "Create an account" for joining, is the common standard — never "Sign up" beside "Sign in" ([GOV.UK](https://design-system.service.gov.uk/patterns/create-accounts)).

## Copy that survives translation

Even a one-language product writes copy that won't break when another arrives: strings sit behind keys where the project has them; never build a sentence from fragments or append a word to a variable ("{count} photos" is one string); use real plural forms, never "(s)"; leave room for text that grows by a third.

## Updating copy

1. Pick the scope — a page, a flow, a component or an app.
2. List every piece of text in it: page title, headings, body, buttons, labels, hints, errors, empty states, toasts, dialogs, notifications and the emails it sends.
3. Check each against the project's voice, word list and banned words, and the rules above.
4. Report each change with the current text, the proposed text and the rule behind it; wait for approval before editing.
5. Edit, then run the affected build, stories and tests. Renaming a feature changes its feature doc in the same change.

## Related skills

Emails `emails` · visual identity `design-system` · logos `logos-and-icons` · accessible names and errors in markup `accessibility`, `semantic-html` · form errors in code `schemas-and-contracts` · page titles and metadata `seo` · shared components take their copy through props `reusables`.
