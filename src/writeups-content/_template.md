---
name: Machine Name
platform: HTB
os: Linux
difficulty: medium
date: 2026-01-01
tags: web, sqli, privesc
status: retired
---

<!--
HOW TO USE THIS TEMPLATE
1. Copy this file to src/writeups-content/<slug>.md  (e.g. cap.md)
   Files starting with "_" are ignored by the index.
2. Fill in the frontmatter above:
   - platform:   HTB | CTF | THM | ...   (becomes a filter pill)
   - difficulty: easy | medium | hard | insane   (color-coded)
   - date:       YYYY-MM-DD   (sorts newest first)
   - tags:       comma-separated
   - status:     retired | active | ... (optional)
3. Put screenshots in:  public/writeups/<slug>/
   Reference them with bare filenames:  ![Caption here](nmap.png)
4. Write the report below. The first H1 is the article headline.
-->

# Machine Name

One or two sentences framing the box: what it is, the headline
vulnerability, and the shape of the path to root.

## Summary

- **Foothold:** how you got the initial shell, in one line
- **Privilege escalation:** how you went from user to root
- **Key takeaway:** the one lesson worth remembering

## Recon

Describe your enumeration. Drop terminal output in fenced code blocks:

```
nmap -sC -sV -oA scan 10.10.10.10
```

Add a screenshot from `public/writeups/<slug>/`:

![Initial nmap scan showing open ports](nmap.png)

## Foothold

Walk through gaining the initial shell. Use `inline code` for commands,
flags, paths, and payloads.

```
curl -s "http://target/?id=1' UNION SELECT ..."
```

> Use a blockquote to call out the pivotal insight or the "aha" moment.

## Privilege Escalation

How you escalated to root/SYSTEM.

```
sudo -l
```

## Root

Proof and final notes.

![Root flag captured](root.png)

## Lessons

- What a defender should have done differently
- The class of mistake this box models in the real world
