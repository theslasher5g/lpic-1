/* Topic 107: Administrative Tasks */
LPIC.add({
  id: '107.1',
  title: 'Manage user and group accounts and related system files',
  weight: 5,
  desc: 'Candidates should be able to add, remove, suspend and change user accounts.',
  knowledge: [
    'Add, modify and remove users and groups.',
    'Manage user/group info in password/group databases.',
    'Create and manage special purpose and limited accounts.',
  ],
  terms: ['/etc/passwd', '/etc/shadow', '/etc/group', '/etc/skel/', 'chage', 'getent', 'groupadd', 'groupdel', 'groupmod', 'passwd', 'useradd', 'userdel', 'usermod'],
  sims: ['passwd'],
  wiki: String.raw`
## The account databases
| File | Mode | Content |
|---|---|---|
| {{/etc/passwd}} | 644 (world readable) | one line per account: {{name:x:UID:GID:GECOS:home:shell}} |
| {{/etc/shadow}} | 640 root:shadow (or 000/600) | password hashes and aging: {{name:hash:lastchg:min:max:warn:inactive:expire:}} |
| {{/etc/group}} | 644 | {{group:x:GID:member1,member2}} (supplementary members) |
| {{/etc/gshadow}} | 640 | group passwords and administrators |
| {{/etc/login.defs}} | | defaults: UID_MIN/MAX, PASS_MAX_DAYS, UMASK, ENCRYPT_METHOD, CREATE_HOME |
| {{/etc/default/useradd}} | | useradd defaults: GROUP, HOME, SHELL, SKEL, EXPIRE |
| {{/etc/skel/}} | | template files copied to new home directories |

~~~console
$ grep student /etc/passwd
$ sudo grep student /etc/shadow
$ grep developers /etc/group
$ getent passwd alice
$ getent group sudo
$ id alice
$ groups student
~~~

**UID ranges**: 0 = root; 1–999 = **system accounts** for services (Debian: 100–999 dynamically allocated); ≥ 1000 = regular users (UID_MIN). The **shadow hash** prefix shows the algorithm: {{$1$}} MD5, {{$5$}} SHA-256, {{$6$}} SHA-512, {{$y$}} yescrypt; {{!}} or {{*}} means locked / no password login. Days in shadow are counted since 1970-01-01. Open the *passwd/shadow explainer* simulation for a field-by-field tour.

{{getent}} queries the **Name Service Switch** ({{/etc/nsswitch.conf}}), so it also shows accounts from LDAP/SSSD — {{grep /etc/passwd}} would not.

## Creating users: useradd
~~~console
# useradd -m -s /bin/bash -c "Carol Coder" -G developers,sudo carol
# passwd carol
# useradd -m -d /srv/svc -s /usr/sbin/nologin -r svcuser
# useradd -u 2001 -g users -e 2026-12-31 temp
# useradd -D
$ tail -3 /etc/passwd
~~~

| Option | Meaning |
|---|---|
| {{-m}} / {{-M}} | create / don't create the home directory (copies {{/etc/skel}}; {{-k DIR}} another skeleton) |
| {{-d DIR}} | home directory |
| {{-s SHELL}} | login shell |
| {{-c TEXT}} | comment (GECOS: full name …) |
| {{-u UID}} / {{-g GROUP}} | UID / primary group (name or GID) |
| {{-G G1,G2}} | supplementary groups |
| {{-e YYYY-MM-DD}} / {{-f DAYS}} | account expiry / inactive days after password expiry |
| {{-r}} | system account (UID < 1000, no aging, no home by default) |
| {{-D}} | show/set defaults |

With **user private groups** (Debian/RHEL default, {{USERGROUPS_ENAB yes}}), useradd also creates a group named like the user. The new account is **locked** ({{!}} in shadow) until a password is set with {{passwd}}. Debian's interactive wrapper {{adduser}} asks for everything (and {{adduser user group}} adds a user to a group).

## Modifying users: usermod
~~~console
# usermod -aG developers bob
# usermod -s /bin/bash bob
# usermod -c "Bob the Builder" bob
# usermod -d /home/robert -m bob
# usermod -l robert bob
# usermod -L alice
# usermod -U alice
# usermod -e 2026-12-31 alice
# usermod -g users alice
~~~

> WARN: {{usermod -G group user}} **replaces** all supplementary groups; to *add* one use {{-aG}} ({{-a}} = append). Group changes take effect at the next login ({{newgrp}} or {{su - user}} to test).

| Option | Meaning |
|---|---|
| {{-aG}} / {{-G}} | append to / set supplementary groups |
| {{-g}} | primary group |
| {{-s}}, {{-c}}, {{-u}} | shell, comment, UID |
| {{-d DIR -m}} | new home, move content |
| {{-l NEW}} | rename the login |
| {{-L}} / {{-U}} | lock / unlock the password ({{!}} prefix) |
| {{-e DATE}} | account expiry ({{-e ""}} or {{-1}} = never) |

## Deleting users: userdel
~~~console
# userdel temp
# userdel -r carol
~~~

{{-r}} also removes the home directory and the mail spool; {{-f}} forces (even if logged in). Files elsewhere stay — find orphans with {{find / -nouser}}.

## Passwords and aging: passwd, chage
~~~console
$ passwd
# passwd alice
# passwd -l bob
# passwd -u bob
# passwd -S alice
# passwd -e alice
# passwd -d guest
$ chage -l student
# chage -M 90 -m 1 -W 7 -I 14 alice
# chage -E 2026-12-31 alice
# chage -d 0 alice
~~~

- {{passwd}}: change own password (users must give the old one; root can change anyone's); {{-l}}/{{-u}} lock/unlock, {{-d}} delete (empty password!), {{-e}} expire now (force change at next login), {{-S}} status, {{-n -x -w -i}} aging.
- {{chage}}: {{-l}} list, {{-m MIN}}, {{-M MAX}} days, {{-W WARN}}, {{-I INACTIVE}}, {{-E DATE}} account expiry ({{-1}} never), {{-d LASTDAY}} ({{0}} = must change at next login). Normal users may only run {{chage -l}} for themselves.

## Groups
~~~console
# groupadd developers
# groupadd -g 1500 -r backup
# groupmod -n devs developers
# groupmod -g 1600 devs
# groupdel devs
# gpasswd -a bob developers
# gpasswd -d bob developers
$ newgrp developers
~~~

{{groupdel}} refuses to delete a group that is the **primary group** of a user. {{gpasswd}} administers {{/etc/group}} and {{/etc/gshadow}} (members, group administrators {{-A}}). {{vigr}} / {{vipw}} edit the files safely with locking; {{pwck}} / {{grpck}} check consistency.

## Special purpose and limited accounts
- **service / system accounts** ({{www-data}}, {{sshd}}, {{postfix}}): low UID, no password ({{*}} or {{!}}), shell {{/usr/sbin/nologin}} or {{/bin/false}}, often no real home directory
- **nologin**: {{/usr/sbin/nologin}} prints "This account is currently not available"; {{/etc/nologin}} existing blocks all non-root logins (shutdown uses it)
- **restricted shell**: {{rbash}} / {{bash -r}} (no {{cd}}, no changing PATH, no redirections)
- **expiring accounts** for interns/contractors: {{useradd -e}} / {{chage -E}}
- **locked** accounts: {{passwd -l}} / {{usermod -L}} (password login impossible — SSH keys may still work! Use {{usermod -e 1}} or the nologin shell to block completely)

~~~console
$ grep nologin /etc/passwd | head -3
$ sudo su -s /bin/bash -c whoami www-data
~~~
`,
  quiz: [
    { q: 'Which command adds the existing user {{bob}} to the supplementary group {{docker}} without removing him from other groups?', fill: ['usermod -aG docker bob', 'usermod -a -G docker bob', 'gpasswd -a bob docker', 'adduser bob docker'], e: 'Without {{-a}}, {{-G}} replaces the list of supplementary groups.' },
    { q: 'Which command creates the user {{carol}} with a home directory populated from {{/etc/skel}}?', fill: ['useradd -m carol', 'useradd --create-home carol'], e: 'Without {{-m}} (and CREATE_HOME no) no home directory is created.' },
    { q: 'Which command deletes the user {{temp}} together with the home directory and mail spool?', fill: ['userdel -r temp', 'userdel --remove temp'], e: 'Files outside the home directory remain.' },
    { q: 'Which file contains the password hashes?', fill: ['/etc/shadow'], e: '/etc/passwd shows only an "x" placeholder.' },
    { q: 'What does the 3rd field of {{/etc/shadow}} contain?', o: ['the UID', 'the date of the last password change in days since 1970-01-01', 'the maximum password age', 'the account expiration date'], a: 1, e: 'name:hash:lastchg:min:max:warn:inactive:expire.' },
    { q: 'Which command forces the user {{alice}} to change her password at the next login? (Choose two.)', o: ['{{chage -d 0 alice}}', '{{passwd -e alice}}', '{{passwd -l alice}}', '{{usermod -e 0 alice}}'], a: [0, 1], e: '{{passwd -l}} locks; {{usermod -e}} sets the account expiry.' },
    { q: 'Which command displays the password aging information of the user {{student}}?', fill: ['chage -l student'], e: 'Users may run it for their own account.' },
    { q: 'Which command locks the password of the account {{bob}}? (Choose two.)', o: ['{{passwd -l bob}}', '{{usermod -L bob}}', '{{userdel -l bob}}', '{{chage -L bob}}'], a: [0, 1], e: 'Both prefix the hash with "!". Key-based SSH logins may still work.' },
    { q: 'Which command shows account information from all configured sources, including LDAP?', fill: ['getent passwd', 'getent'], e: 'getent uses the NSS configuration in /etc/nsswitch.conf.' },
    { q: 'Why does {{groupdel developers}} fail?', o: ['The group has members.', 'It is the primary group of an existing user.', 'Groups can only be deleted with gpasswd.', 'The GID is below 1000.'], a: 1, e: 'Change the users\' primary group first or delete those users.' },
    { q: 'Which shell is typically assigned to service accounts that must not log in interactively? (Choose two.)', o: ['{{/usr/sbin/nologin}}', '{{/bin/false}}', '{{/bin/bash}}', '{{/bin/rbash}}'], a: [0, 1], e: 'rbash is a restricted, but still interactive shell.' },
    { q: 'In which range are UIDs of regular users created by default on modern distributions?', o: ['0–99', '100–499', '1000 and above', 'any random number'], a: 2, e: 'Defined by UID_MIN (1000) in /etc/login.defs.' },
    { q: 'Which command renames the group {{devs}} to {{developers}}?', fill: ['groupmod -n developers devs'], e: '{{-g}} changes the GID.' },
    { q: 'Which command creates a system account {{backup}} without a home directory?', o: ['{{useradd -r backup}}', '{{useradd -s backup}}', '{{useradd --system -m backup}}', '{{adduser -m backup}}'], a: 0, e: '{{-r}} = system account (UID below 1000, no home by default).' },
    { q: 'Which file defines the default shell and home base used by {{useradd}} when none is given?', fill: ['/etc/default/useradd'], e: '{{useradd -D}} shows these defaults; /etc/login.defs holds UID ranges and aging defaults.' },
    { q: 'What does the field {{x}} in the second column of {{/etc/passwd}} mean?', o: ['the account is locked', 'the password is stored in /etc/shadow', 'the user has no password', 'the user is an administrator'], a: 1, e: 'An empty field would mean no password at all.' },
  ],
});

LPIC.add({
  id: '107.2',
  title: 'Automate system administration tasks by scheduling jobs',
  weight: 4,
  desc: 'Candidates should be able to use cron and systemd timers to run jobs at regular intervals and to use at to run jobs at a specific time.',
  knowledge: ['Manage cron and at jobs.', 'Configure user access to cron and at services.', 'Understand systemd timer units.'],
  terms: ['/etc/cron.{d,daily,hourly,monthly,weekly}/', '/etc/at.deny', '/etc/at.allow', '/etc/crontab', '/etc/cron.allow', '/etc/cron.deny', '/var/spool/cron/', 'crontab', 'at', 'atq', 'atrm', 'systemctl', 'systemd-run'],
  sims: ['cron'],
  wiki: String.raw`
## cron
The **cron** daemon ({{cron}} / {{crond}}) checks every minute which jobs are due. Three places define jobs:

| Location | Format | Edited with |
|---|---|---|
| user crontabs {{/var/spool/cron/crontabs/USER}} (RHEL: {{/var/spool/cron/USER}}) | 5 time fields + command | {{crontab -e}} (never directly) |
| system crontab {{/etc/crontab}} | 5 time fields + **user** + command | editor |
| {{/etc/cron.d/*}} | like /etc/crontab (with user field) | editor / packages |
| {{/etc/cron.hourly/}}, {{cron.daily/}}, {{cron.weekly/}}, {{cron.monthly/}} | executable **scripts** (no time fields) | run by {{run-parts}} from /etc/crontab or anacron |

## Crontab format
~~~file
# ┌───────── minute        (0-59)
# │ ┌─────── hour          (0-23)
# │ │ ┌───── day of month  (1-31)
# │ │ │ ┌─── month         (1-12 or jan-dec)
# │ │ │ │ ┌─ day of week   (0-7, 0 and 7 = Sunday, or sun-sat)
# │ │ │ │ │
  30 2 * * 1-5  /usr/local/bin/backup.sh
  */15 * * * *  /usr/local/bin/check.sh > /dev/null 2>&1
  0 8,12,18 * * * echo "drink water"
  0 0 1 * *     /usr/local/bin/monthly-report
  @reboot       /usr/local/bin/on-boot.sh
~~~

- {{*}} every value, {{1-5}} range, {{1,15}} list, {{*/15}} step (every 15), {{0-30/10}}
- shortcuts: {{@reboot}}, {{@hourly}}, {{@daily}} ({{@midnight}}), {{@weekly}}, {{@monthly}}, {{@yearly}} ({{@annually}})
- if **both** day-of-month and day-of-week are restricted, the job runs when **either** matches
- the environment is minimal ({{PATH=/usr/bin:/bin}}, {{SHELL=/bin/sh}}) — use absolute paths or set variables at the top ({{PATH=…}}, {{MAILTO=admin@example.com}}, {{MAILTO=""}} disables mail)
- output is **mailed** to the owner — redirect it ({{>/dev/null 2>&1}} or to a log)
- {{%}} in the command means newline/stdin — escape as {{\%}} (e.g. {{date +\%F}})

~~~console
$ crontab -l
$ echo '*/10 * * * * /home/student/scripts/hello.sh >> /tmp/hello.log 2>&1' | crontab -
$ crontab -l
$ crontab -e
$ crontab -r
# crontab -u alice -l
$ cat /etc/crontab
$ ls /etc/cron.daily/
~~~

{{crontab -e}} opens {{$EDITOR}} and checks the syntax when saving; {{-l}} list, {{-r}} remove (careful — no confirmation), {{-u USER}} (root only), {{crontab FILE}} installs a file. The *cron builder* simulation explains any schedule.

## anacron
cron misses jobs while the machine is off. **anacron** ({{/etc/anacrontab}}) runs daily/weekly/monthly jobs that are overdue, with a delay, and stores timestamps in {{/var/spool/anacron/}} — ideal for laptops. Format: {{period(days) delay(min) job-id command}}.

## Access control for cron
- if **{{/etc/cron.allow}}** exists, only users listed there may use {{crontab}}
- otherwise if **{{/etc/cron.deny}}** exists, everybody except the listed users may
- if neither exists: depends on the distribution (Debian: everybody; some: only root)
- root may always use crontab

## at — one-time jobs
~~~console
$ echo "touch /tmp/at-was-here" | at now + 5 minutes
$ at 16:30 tomorrow
$ at -f scripts/backup.sh noon
$ atq
$ at -c 3
$ atrm 3
$ batch
~~~

Time specifications: {{now + 10 minutes}}, {{now + 2 hours}}, {{16:30}}, {{4pm}}, {{noon}}, {{midnight}}, {{teatime}} (16:00), {{tomorrow}}, {{16:30 2026-12-24}}, {{next monday}}. Commands are read from stdin (end interactive input with <kbd>Ctrl</kbd>+<kbd>D</kbd>) or {{-f FILE}}; the current environment and directory are saved with the job. {{atq}} (= {{at -l}}) lists, {{atrm N}} (= {{at -d}}) removes, {{at -c N}} shows a job, {{batch}} runs when the load is low. The daemon is {{atd}}; jobs live in {{/var/spool/at/}} (or {{/var/spool/cron/atjobs}}).

Access control works the same way: **{{/etc/at.allow}}** (only listed users), else **{{/etc/at.deny}}** (all except listed). An empty {{at.deny}} allows everybody.

## systemd timers
A **timer unit** ({{NAME.timer}}) activates a service unit ({{NAME.service}} by default):

~~~file
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
~~~

~~~file
# /etc/systemd/system/backup.timer
[Unit]
Description=Nightly backup timer

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
~~~

~~~console
$ systemctl cat backup.timer
# systemctl daemon-reload
# systemctl enable --now backup.timer
$ systemctl list-timers
$ systemctl status backup.timer
$ journalctl -u backup.service
~~~

- **realtime** (wall clock): {{OnCalendar=}} — {{daily}}, {{weekly}}, {{Mon..Fri 08:00}}, {{*-*-01 00:00:00}}, {{*:0/15}} (every 15 min); test with {{systemd-analyze calendar "Mon *-*-* 08:00"}}
- **monotonic**: {{OnBootSec=10min}}, {{OnUnitActiveSec=1h}}, {{OnStartupSec=}}, {{OnActiveSec=}}
- {{Persistent=true}} catches up runs missed while the system was off (like anacron)
- advantages over cron: logging in the journal, dependencies, resource control, randomised delays

**Transient timers** without writing files: {{systemd-run}}:

~~~console
# systemd-run --on-active=30m /usr/local/bin/cleanup.sh
# systemd-run --on-calendar="*-*-* 03:00" --unit=nightly touch /tmp/ran
$ systemd-run --user --on-active=10s notify-send hello
~~~
`,
  quiz: [
    { q: 'Which crontab line runs {{/usr/local/bin/report}} at 06:15 every Monday?', o: ['{{15 6 * * 1 /usr/local/bin/report}}', '{{6 15 * * 1 /usr/local/bin/report}}', '{{15 6 1 * * /usr/local/bin/report}}', '{{* 6:15 * * mon /usr/local/bin/report}}'], a: 0, e: 'minute hour day-of-month month day-of-week.' },
    { q: 'What does {{*/10 * * * *}} mean?', o: ['at minute 10 of every hour', 'every 10 minutes', 'every 10 hours', 'on the 10th of every month'], a: 1, e: 'Step values: */N.' },
    { q: 'Which command lists the current user\'s crontab?', fill: ['crontab -l'], e: '{{-e}} edits, {{-r}} removes.' },
    { q: 'How does {{/etc/crontab}} differ from a user crontab?', o: ['It has no time fields.', 'It has an additional user field before the command.', 'It may only contain @reboot.', 'It is edited with crontab -e.'], a: 1, e: '/etc/cron.d/* files use the same format.' },
    { q: 'If {{/etc/cron.allow}} exists, who may use crontab?', o: ['everyone except the users listed', 'only the users listed (and root)', 'only root', 'nobody'], a: 1, e: '/etc/cron.deny is only consulted if cron.allow does not exist.' },
    { q: 'Which command lists the pending at jobs of the current user? (Choose two.)', o: ['{{atq}}', '{{at -l}}', '{{at --list-all}}', '{{atrm -l}}'], a: [0, 1], e: '{{atrm N}} removes job N.' },
    { q: 'Which command removes the at job number 7?', fill: ['atrm 7', 'at -d 7', 'at -r 7'], e: '' },
    { q: 'Which at command runs a job in 2 hours?', fill: ['at now + 2 hours', 'at now +2 hours', 'at now+2hours', 'at now + 2 hour'], e: 'Commands are read from stdin.' },
    { q: 'Where are scripts placed that should be run once per day by cron/anacron without writing a crontab line?', fill: ['/etc/cron.daily', '/etc/cron.daily/'], e: 'They are executed by run-parts; no time fields needed.' },
    { q: 'Which systemd timer option makes the timer catch up a run that was missed while the system was powered off?', fill: ['Persistent=true', 'Persistent'], e: 'Similar to anacron.' },
    { q: 'Which command lists all active systemd timers with their next and last run?', fill: ['systemctl list-timers'], e: 'Add {{--all}} to include inactive timers.' },
    { q: 'Which command creates a transient timer that runs a command once in 30 minutes, without creating unit files?', o: ['{{systemctl timer 30m cmd}}', '{{systemd-run --on-active=30m cmd}}', '{{at -s 30m cmd}}', '{{systemd-timer +30m cmd}}'], a: 1, e: '{{systemd-run --on-calendar=...}} for calendar expressions.' },
    { q: 'Which file controls which users may NOT use the at command, if {{/etc/at.allow}} does not exist?', fill: ['/etc/at.deny'], e: 'An empty at.deny allows everybody.' },
    { q: 'Why should the {{%}} character be escaped in crontab commands?', o: ['It starts a comment.', 'cron converts unescaped % into newlines / stdin.', 'It is the step operator.', 'It refers to the user name.'], a: 1, e: 'Write {{date +\\%F}}.' },
    { q: 'Which shortcut in a crontab runs a job once when the system starts?', fill: ['@reboot'], e: 'Others: @hourly, @daily, @weekly, @monthly, @yearly.' },
  ],
});

LPIC.add({
  id: '107.3',
  title: 'Localisation and internationalisation',
  weight: 3,
  desc: 'Candidates should be able to localize a system in a different language than English. As well, an understanding of why LANG=C is useful when scripting.',
  knowledge: ['Configure locale settings and environment variables.', 'Configure timezone settings and environment variables.'],
  terms: ['/etc/timezone', '/etc/localtime', '/usr/share/zoneinfo/', 'LC_*', 'LC_ALL', 'LANG', 'TZ', '/usr/bin/locale', 'tzselect', 'timedatectl', 'date', 'iconv', 'UTF-8', 'ISO-8859', 'ASCII', 'Unicode'],
  wiki: String.raw`
## Locales
A **locale** defines language, country and character set conventions: messages, date/time formats, number formats (decimal comma vs. point), currency, sorting order (collation), character classification, paper size. Name format: {{language_TERRITORY.CODESET@modifier}}, e.g. {{de_DE.UTF-8}}, {{en_US.UTF-8}}, {{fr_CH.ISO-8859-1}}, {{C}} / {{POSIX}}.

~~~console
$ locale
$ locale -a
$ echo $LANG
$ LANG=de_DE.UTF-8 date
$ LC_TIME=de_DE.UTF-8 date
$ localectl status
# localectl set-locale LANG=de_DE.UTF-8
$ cat /etc/default/locale
$ cat /etc/locale.gen
# locale-gen
~~~

## Locale variables
| Variable | Controls |
|---|---|
| {{LC_CTYPE}} | character classification and case conversion |
| {{LC_NUMERIC}} | number formatting |
| {{LC_TIME}} | date and time formats |
| {{LC_COLLATE}} | sorting order (e.g. {{ls}}, {{sort}}) |
| {{LC_MONETARY}} | currency |
| {{LC_MESSAGES}} | language of program messages |
| {{LC_PAPER}}, {{LC_NAME}}, {{LC_ADDRESS}}, {{LC_TELEPHONE}}, {{LC_MEASUREMENT}} | the rest |
| **{{LANG}}** | default for all {{LC_*}} that are not set |
| **{{LC_ALL}}** | **overrides** all of the above (for testing / scripts) |
| {{LANGUAGE}} | GNU gettext: priority list of message languages ({{de:en}}) |

Priority: **LC_ALL > LC_xxx > LANG**.

System-wide settings: {{/etc/default/locale}} (Debian), {{/etc/locale.conf}} (systemd/RHEL) — written by {{localectl set-locale}}; per user in {{~/.profile}} / {{~/.bashrc}}. Generate additional locales on Debian by enabling them in {{/etc/locale.gen}} and running {{locale-gen}} (or {{dpkg-reconfigure locales}}).

## Why LANG=C in scripts?
The **C** (= POSIX) locale gives predictable, English, ASCII-sorted output independent of the user's settings. Scripts that parse command output or rely on sort order/character ranges set it explicitly:

~~~console
$ LC_ALL=C sort fruits.txt
$ sort fruits.txt
$ LANG=C df -h /
$ LC_ALL=C.UTF-8 ls
~~~

E.g. {{[a-z]}} in some locales also matches upper-case letters, and German {{date}} or {{df}} output uses different words and decimal commas.

## Character sets and encodings
| Encoding | Description |
|---|---|
| **ASCII** | 7 bit, 128 characters (English letters, digits, punctuation, control chars) |
| **ISO-8859-x** | 8-bit extensions, 256 characters: {{-1}} Latin-1 Western Europe, {{-15}} Latin-9 (with €), {{-2}} Central European, {{-5}} Cyrillic … only one alphabet at a time |
| **Unicode** | one universal character set (code points U+0000 … U+10FFFF) for all scripts |
| **UTF-8** | variable length (1–4 bytes) encoding of Unicode, ASCII compatible — the default on Linux |
| UTF-16 / UTF-32 | 2–4 / 4 byte encodings (Windows, Java) |

Convert between encodings with **{{iconv}}**:

~~~console
$ iconv -l | head -3
$ iconv -f ISO-8859-1 -t UTF-8 old.txt > new.txt
$ echo "Grüße" | iconv -f UTF-8 -t ASCII//TRANSLIT
$ file notes.txt
~~~

## Time zones
The system clock (and normally the hardware clock) runs in **UTC**; the time zone only changes how times are displayed.

- **{{/usr/share/zoneinfo/}}** — the time zone database (binary TZif files), e.g. {{Europe/Berlin}}, {{America/New_York}}, {{UTC}}
- **{{/etc/localtime}}** — the system time zone: a **symlink** (or copy) to a zoneinfo file
- **{{/etc/timezone}}** — Debian: the zone name as text ({{Europe/Berlin}})
- **{{TZ}}** — environment variable overriding the time zone per user/process

~~~console
$ ls -l /etc/localtime
$ cat /etc/timezone
$ date
$ TZ=Asia/Tokyo date
$ TZ=America/New_York date +%H:%M
$ date -u
$ timedatectl
$ timedatectl list-timezones | grep Europe
# timedatectl set-timezone Europe/Vienna
# ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime
$ tzselect
# dpkg-reconfigure tzdata
~~~

{{tzselect}} asks for continent/country/city and **prints** the TZ value (e.g. {{Europe/Berlin}}) — it does not change the system; add {{TZ='Europe/Berlin'; export TZ}} to {{~/.profile}} for the user, or use {{timedatectl set-timezone}} / {{dpkg-reconfigure tzdata}} system-wide.

## date
~~~console
$ date
$ date +%F
$ date +"%Y-%m-%d %H:%M:%S"
$ date +%s
$ date -d "yesterday" +%A
$ date -d "+3 days" +%F
$ date -d @1700000000
~~~

Format: {{%Y}} year, {{%m}} month, {{%d}} day, {{%H:%M:%S}} time, {{%F}} = {{%Y-%m-%d}}, {{%T}} = {{%H:%M:%S}}, {{%A}}/{{%a}} weekday, {{%B}}/{{%b}} month name, {{%j}} day of year, {{%s}} epoch seconds, {{%Z}} zone. Setting the clock is covered in 108.1.

## Daylight saving time
Many regions switch to **daylight saving time (DST)** for part of the year. The rules are part of the tz database files in {{/usr/share/zoneinfo/}} that {{/etc/localtime}} points to — the system clock itself stays in UTC, only the *display* changes. Because governments change DST rules, keep the **tzdata** package up to date ({{apt upgrade}} / {{dnf upgrade}}); an outdated tzdata is the classic reason for a clock that is wrong by exactly one hour.

~~~console
$ ls -l /etc/localtime
$ TZ=Europe/Berlin date -d '2026-07-01 12:00 UTC'
$ TZ=Europe/Berlin date -d '2026-12-01 12:00 UTC'
$ dpkg -l tzdata
~~~
`,
  quiz: [
    { q: 'Which variable overrides all other locale settings?', fill: ['LC_ALL'], e: 'Priority: LC_ALL > LC_* > LANG.' },
    { q: 'Which locale category controls the format of date and time?', fill: ['LC_TIME'], e: 'LC_NUMERIC numbers, LC_COLLATE sorting, LC_MESSAGES language.' },
    { q: 'Why do scripts often set {{LANG=C}} (or {{LC_ALL=C}})?', o: ['to speed up the CPU', 'to get predictable, locale-independent output and sorting', 'to enable UTF-8', 'to disable error messages'], a: 1, e: 'Parsing localized output is fragile.' },
    { q: 'Which command lists all locales available on the system?', fill: ['locale -a'], e: '{{locale}} without options shows the current settings.' },
    { q: 'Which file defines the system time zone on most Linux systems?', o: ['{{/etc/timezone}}', '{{/etc/localtime}}', '{{/usr/share/zoneinfo/default}}', '{{/etc/tz.conf}}'], a: 1, e: '/etc/localtime is a symlink to /usr/share/zoneinfo/Region/City. Debian additionally keeps the name in /etc/timezone.' },
    { q: 'Which environment variable sets the time zone for a single user or command?', fill: ['TZ'], e: 'e.g. {{TZ=Asia/Tokyo date}}.' },
    { q: 'Which command converts {{file.txt}} from ISO-8859-1 to UTF-8?', fill: ['iconv -f ISO-8859-1 -t UTF-8 file.txt', 'iconv -f iso-8859-1 -t utf-8 file.txt', 'iconv -f ISO-8859-1 -t UTF-8 file.txt > file.utf8', 'iconv -f latin1 -t utf8 file.txt'], e: '{{-f}} from, {{-t}} to.' },
    { q: 'What does {{tzselect}} do?', o: ['It changes /etc/localtime immediately.', 'It interactively determines and prints a TZ value, without changing the system.', 'It synchronises the clock.', 'It lists all locales.'], a: 1, e: 'Use timedatectl set-timezone for the system.' },
    { q: 'Which command changes the system time zone on a systemd system?', fill: ['timedatectl set-timezone', 'timedatectl set-timezone Europe/Berlin'], e: '{{timedatectl list-timezones}} shows valid names.' },
    { q: 'Which statements about UTF-8 are correct? (Choose two.)', o: ['It is a variable-length encoding of Unicode.', 'It uses exactly two bytes per character.', 'ASCII text is valid UTF-8.', 'It supports only Western European languages.'], a: [0, 2], e: '1–4 bytes per character, ASCII compatible.' },
    { q: 'Which directory contains the time zone data files?', fill: ['/usr/share/zoneinfo', '/usr/share/zoneinfo/'], e: 'e.g. /usr/share/zoneinfo/Europe/Berlin.' },
    { q: 'Which ISO-8859 variant contains the Euro sign and is used for Western European languages?', o: ['ISO-8859-1', 'ISO-8859-15', 'ISO-8859-5', 'ISO-8859-2'], a: 1, e: 'Latin-9; Latin-1 (8859-1) predates the Euro.' },
    { q: 'Which command prints the current date in the format YYYY-MM-DD? (Choose two.)', o: ['{{date +%F}}', '{{date +%Y-%m-%d}}', '{{date -F}}', '{{date +%D}}'], a: [0, 1], e: '%D prints MM/DD/YY.' },
    { q: 'On Debian, in which file is the system-wide LANG setting stored?', fill: ['/etc/default/locale'], e: 'systemd/RHEL use /etc/locale.conf; both are written by localectl.' },
  ],
});
