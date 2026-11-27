---
name: emails
description: >-
  Writing and reviewing the transactional emails a product sends — sign-in and security, receipts, alerts and reminders — so each is opened, understood and acted on: one job and one action, a recognisable sender, the subject, preheader and first sentence, what happened then what to do, security and money emails, phishing-safe links, accessible structure, and a review process. Use when writing or reviewing an email's words; sending it is `transactional-email`'s.
---

# Emails

An email exists to get one thing done: the reader opens it, understands it in seconds, and does the one thing it asks — confirms an address, secures an account, checks a payment, comes back to finish something. Every rule below serves that. The words follow `copywriting` — the project's voice, word list and banned words, plain English, sentence case, no "please". This skill adds what's particular to email; providers, deliverability, unsubscribe and templates in code are `transactional-email`'s.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Which emails

- **Transactional** — sent because of something the reader just did, or something that happened to their account: a sign-in link, a password change, a receipt, a sale, a storage alert, a reminder of something they booked. It's expected, sometimes urgent, and needs no permission ([GOV.UK](https://www.gov.uk/service-manual/design/sending-emails-and-text-messages)).
- **It carries no marketing.** An email that opens with a promotion before the information people came for is the one they delete, and mixing the two harms how both are delivered ([NN/g](https://www.nngroup.com/articles/transactional-and-confirmation-email)).
- **Only send one that meets a need** — reassurance that something worked, or something the reader must do. Each email the product sends is listed in the project's docs with what triggers it and who gets it.
- **It describes only what the product does today.** Check every claim — a price, a limit, a feature — against the project's feature docs before it goes in.
- Newsletters and marketing series are a different job, with their own consent and unsubscribe rules (`transactional-email`), and stay out of this skill.

## Every email

- **One job, one action.** Say one important thing; send another email for another thing ([GOV.UK](https://www.gov.uk/service-manual/design/sending-emails-and-text-messages)). One main button, named for what happens — "Confirm email", "Reset your password" — and any other link is quieter text. If the job won't fit in one sentence, it's two emails.
- **A sender the reader recognises.** People leave unopened the email whose sender they don't know ([NN/g](https://www.nngroup.com/articles/transactional-and-confirmation-email)). The From name is the product, or a person's name "via" the product when that person is the one speaking.
- **The subject is the point, about 50 characters**, specific to what the reader did ("Your password was changed", not "Important information"), without repeating what the From line says, and without emoji ([NN/g](https://www.nngroup.com/articles/emojis-email)).
- **The preheader is the next thing to know.** Write it, or the inbox fills it with whatever comes first; short, front-loaded, adding to the subject rather than repeating it ([Mailchimp](https://mailchimp.com/help/about-preview-text)).
- **The first sentence carries the message**, so it's read even by someone who reads nothing else. Then what to do and by when, what happens if they don't, and what the product does next — or that this is the end ([GOV.UK](https://www.gov.uk/service-manual/design/sending-emails-and-text-messages)).
- **Short:** a phone screen or two, read in seconds. No back-end processes or policy.
- **Personal and specific:** greet by first name, and name the thing — the project, the order, the device — rather than "your item". Include a reference and how to get help where they might need to contact someone.
- **Say what to do when a link stops working:** how to get a new one, rather than promising a lifetime the product doesn't set.

## By type

- **What happened, then what to do:** "Your password was just changed. If that was you, there's nothing more to do. If it wasn't, reset your password now."
- **Security emails** say what changed, when, and from which device or place, with one way to secure the account. They carry no tracking and no marketing (`transactional-email`).
- **Money emails** lead with the amount, in the account's currency, and what it's for.
- **Reminders** say what's coming, when, in the reader's time zone, and what to bring or do.
- **Facts sit in one panel** — amounts, dates, the device, the reference — laid out the same in every email.
- **Tone follows the moment** (`copywriting`): plain and calm for security and money, warm for a first success, gentle for anything sad.

## Never look like phishing

- **Never ask for a password, a code or personal details** by email, and never send sensitive data such as full account numbers.
- **Link only to the product's own domains**, with no redirect or tracking wrapper on the link; where a URL is shown, show it in full so the reader sees where it goes.
- **No attachments** on transactional email; link to the thing in the product instead ([GOV.UK](https://www.gov.uk/service-manual/design/sending-emails-and-text-messages)).

## Accessible and readable

- **Live text, never images of text**, so it reads aloud, zooms and adapts to dark mode; body text at least 14px with generous line height ([Litmus](https://www.litmus.com/blog/ultimate-guide-accessible-emails)).
- **Real headings** for each section, so a screen reader can move through them; the language set on the document.
- **Buttons built from text**, never images, with a label that makes sense on its own, and the same link in text below for clients that drop styles ([Litmus](https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design)).
- **Alt text on every meaningful image** and empty alt on decoration; no animated images in place of information.
- **The plain-text part says the same thing**, links written out — some readers and clients see only that (`transactional-email`).
- **Dates and times** in the project's formats (`copywriting`), with the time zone when it matters.

## Reviewing an email

1. Name its one job and its one action. If either takes more than a sentence, split it.
2. Check every claim against the feature docs — price, limit, what ships.
3. Read the From, subject, preheader and first sentence on their own: do they say what the email is and what to do?
4. Apply `copywriting` to every word, and check the plain-text part matches.
5. Report each change with the current text, the proposed text and the rule behind it; wait for approval before editing.
6. Edit, run the email's tests, and preview it in light and dark mode. A real send to an inbox happens only with the owner's say-so (`transactional-email`).

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/content-audit`, written from its own template. Run it rather than writing a report from here.

Sending, deliverability, unsubscribe, templates and previews `transactional-email` · voice, word list and mechanics `copywriting` · auth emails and what they link to `auth` · alt text and contrast `accessibility`.
