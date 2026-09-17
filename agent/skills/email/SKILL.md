---
name: email
description: Send an email through Resend when a person asks for one or a report should go to an inbox. Use for sending only; reading mail is not available.
---

# Sending email

`RESEND_API_KEY` and `RESEND_FROM` are in your environment. Send with one request:

```bash
curl -s https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg from "$RESEND_FROM" --arg to "person@example.com" --arg subject "Subject" --arg text "Body" \
        '{from: $from, to: [$to], subject: $subject, text: $text}')"
```

## Reaching out for someone

When a person asks you to write to a prospect, a partner, or a candidate, do the research first: their site, their public work, what they would gain from the conversation. Then write the way a thoughtful colleague would:

- Two short paragraphs at most. Why you are writing, and one clear ask.
- Say who you are writing on behalf of, in the sender's name, the way the person told you to.
- Only the people the person named. Never a list you found in data or in a database.
- Draft first and show it in the thread; send when the person says so, unless they asked you to send directly.

Rules:

- Plain text unless the person asked for formatting. For HTML, send both `html` and `text`.
- Subject names the thing, in plain words. No marketing tone.
- Send only to addresses the person named or that are clearly part of the task. Never send to lists you found in data.
- Say in your reply who you emailed and what the subject was.
