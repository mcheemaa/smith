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

Rules:

- Plain text unless the person asked for formatting. For HTML, send both `html` and `text`.
- Subject names the thing, in plain words. No marketing tone.
- Send only to addresses the person named or that are clearly part of the task. Never send to lists you found in data.
- Say in your reply who you emailed and what the subject was.
