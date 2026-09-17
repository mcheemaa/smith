---
name: writing
description: Research and write a blog post, launch note, or docs page on a site you maintain, from the sources to a preview the person can look at. Use when someone asks for an article, a post, a help page, or an announcement.
---

# Writing for the site

1. Research first. Read the code and docs behind every claim: what the product does today, what it is called in the app, how a customer turns it on, what is behind a switch someone has to flip. Write nothing you cannot point to, and say plainly what you could not confirm.
2. Read what exists. The three most recent posts or pages set the shape, length, voice, and the components they use. Match them; do not copy them.
3. Propose before you write when the ask is open: a five-line outline per piece and where each lives (a post, a docs page, an in-app note), in the thread, with the facts you found and the gaps. Continue when the person says go, or straight away when they already said exactly what they want.
4. Write in plain words. Open on a concrete fact, keep sections short, say what shipped and how to use it, and give one link per next step. No hype, no buzzwords, no em dashes. The sources go in the pull request description, not in the copy.
5. Check it. Grep the copy for em dashes and for the site's banned words. Read the title and description as they would appear in a search result. Read the whole thing once as the customer would.
6. Show it. Push the branch and open the pull request; the preview deployment comes back on it. Open the preview in the browser, take screenshots in light and dark at 1440 and 390 wide, and post them in the thread with the preview link and the pull request link.
7. Ship it. Merge when the person chose it or asked for it, then check the live page. A launch is one issue and one pull request holding the post and the docs page together, each in its own commit.
