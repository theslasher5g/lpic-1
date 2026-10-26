/* Topic 108: Essential System Services */
LPIC.add({
  id: '108.1',
  title: 'Maintain system time',
  weight: 3,
  desc: 'Candidates should be able to properly maintain the system time and synchronize the clock via NTP.',
  knowledge: [
    'Set the system date and time.',
    'Set the hardware clock to the correct time in UTC.',
    'Configure the correct timezone.',
    'Basic NTP configuration using ntpd and chrony.',
    'Knowledge of using the pool.ntp.org service.',
    'Awareness of the ntpq command.',
  ],
  terms: ['/usr/share/zoneinfo/', '/etc/timezone', '/etc/localtime', '/etc/ntp.conf', '/etc/chrony.conf', 'date', 'hwclock', 'timedatectl', 'ntpd', 'ntpdate', 'chronyc', 'pool.ntp.org'],
  wiki: String.raw`
## Two clocks
A Linux machine has **two** clocks:

| Clock | Also called | Where | Managed with |
|---|---|---|---|
| **System clock** | software / kernel clock | kept by the kernel while the system runs (counts seconds since 1970-01-01 UTC) | {{date}}, {{timedatectl}}, NTP daemons |
| **Hardware clock** | RTC, CMOS / BIOS clock | battery-backed chip on the mainboard, runs while powered off | {{hwclock}} |

At boot the kernel reads the RTC and sets the system clock; on shutdown the system clock may be written back. The RTC should be kept in **UTC** (Windows dual-boot setups sometimes use local time — {{/etc/adjtime}} records which: line 3 {{UTC}} or {{LOCAL}}).

## date — show and set the system clock
~~~console
$ date
$ date -u                          # UTC
$ date +%F                         # 2026-10-26   (ISO date)
$ date '+%Y-%m-%d %H:%M:%S'
$ date +%s                         # seconds since the epoch
$ date -d @1700000000              # convert an epoch timestamp
$ date -d 'next friday' +%A
$ date -d '2026-12-24 18:00' +%s
# date -s '2026-10-26 14:30:00'    # set the clock (root)
# date 102614302026                # MMDDhhmm[[CC]YY][.ss] — the classic format
~~~
Common format specifiers: {{%Y}} year, {{%m}} month, {{%d}} day, {{%H}} hour, {{%M}} minute, {{%S}} second, {{%F}} = {{%Y-%m-%d}}, {{%T}} = {{%H:%M:%S}}, {{%Z}} time zone, {{%s}} epoch, {{%a}}/{{%A}} weekday, {{%b}}/{{%B}} month name, {{%j}} day of year.

## hwclock — the RTC
~~~console
# hwclock                  # = hwclock --show / -r: read the RTC
# hwclock --systohc        # -w: system clock  → hardware clock
# hwclock --hctosys        # -s: hardware clock → system clock
# hwclock --systohc --utc  # store the RTC in UTC (recommended)
# hwclock --set --date '2026-10-26 12:00'
~~~
> EXAM: Learn the direction words: **sys-to-hc** writes the RTC, **hc-to-sys** reads it. {{-w}} = write, {{-s}} = set system time.

## Time zones
Time zone data lives in {{/usr/share/zoneinfo/}} (compiled tz database files, e.g. {{Europe/Berlin}}). The system zone is defined by **{{/etc/localtime}}** — a symlink to (or copy of) one of these files. Debian additionally stores the name as text in **{{/etc/timezone}}**.

~~~console
$ ls -l /etc/localtime
$ ls /usr/share/zoneinfo/
$ TZ=America/New_York date         # one command in another zone
$ TZ=Asia/Tokyo date
$ timedatectl list-timezones | grep Europe
# timedatectl set-timezone Europe/Vienna
$ tzselect                         # interactive helper that prints the TZ value
~~~
Manual method without systemd:
~~~console
# ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime
# echo Europe/Berlin > /etc/timezone
# dpkg-reconfigure tzdata          # Debian interactive alternative
~~~
The {{TZ}} environment variable overrides the system zone for a single user or process (e.g. in {{~/.profile}}: {{export TZ='Europe/Berlin'}}).

## timedatectl (systemd)
~~~console
$ timedatectl                      # local/UTC/RTC time, zone, NTP state
# timedatectl set-time '2026-10-26 14:30:00'
# timedatectl set-timezone UTC
# timedatectl set-ntp true         # enable systemd-timesyncd / NTP sync
# timedatectl set-local-rtc 0      # RTC in UTC
~~~
{{set-time}} fails while NTP synchronization is active — disable it first with {{set-ntp false}}. The simple SNTP client of systemd is **systemd-timesyncd** ({{/etc/systemd/timesyncd.conf}}).

## NTP — Network Time Protocol
- Uses **UDP port 123**.
- Hierarchy of **strata**: stratum 0 = reference clock (GPS, atomic clock), stratum 1 = servers directly attached, stratum 2 = clients of stratum 1, … (max. 15; 16 = unsynchronized).
- NTP corrects the clock gradually (**slewing**) instead of jumping (**stepping**), so time never runs backwards for running programs. Large offsets (> 1000 s by default) make ntpd give up — use {{ntpdate}}/{{ntpd -g}} or chrony's {{makestep}}.
- **pool.ntp.org** is a public cluster of volunteer servers chosen via DNS round robin: {{0.pool.ntp.org}}, {{1.pool.ntp.org}}, vendor zones like {{2.debian.pool.ntp.org}}, country zones like {{de.pool.ntp.org}}.
- The **drift file** records how fast the local clock drifts so ntpd/chronyd can compensate.

### ntpd (classic reference implementation)
~~~file
# /etc/ntp.conf
driftfile /var/lib/ntp/ntp.drift
pool 0.pool.ntp.org iburst
pool 1.pool.ntp.org iburst
server ntp1.example.com iburst prefer
restrict default kod nomodify notrap nopeer noquery
restrict 127.0.0.1
~~~
~~~console
$ ntpq -p                          # peers: * = selected, + = candidate, - = outlier
$ cat /etc/ntp.conf
# ntpdate -q pool.ntp.org          # query only (deprecated tool)
# ntpdate pool.ntp.org             # one-shot set (ntpd must not be running)
~~~
In {{ntpq -p}}: **st** = stratum, **when** = seconds since last response, **poll** = interval, **reach** = octal bitmask of the last 8 polls (377 = all answered), **delay/offset/jitter** in ms.

### chrony (default on RHEL, Fedora, SUSE, Ubuntu)
Daemon {{chronyd}}, control client {{chronyc}}. Config: {{/etc/chrony.conf}} (Red Hat) or {{/etc/chrony/chrony.conf}} (Debian).
~~~file
# /etc/chrony.conf
pool 2.pool.ntp.org iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3          # step the clock if off by >1 s during the first 3 updates
rtcsync                 # periodically copy system time to the RTC
#allow 192.168.0.0/16   # act as server for this network
~~~
~~~console
$ chronyc sources                  # ^* = current sync source
$ chronyc sources -v
$ chronyc tracking                 # offset, stratum, reference ID
$ cat /etc/chrony/chrony.conf
# chronyc makestep                 # step the clock immediately
~~~

> TIP: Only **one** NTP daemon should run at a time: ntpd, chronyd or systemd-timesyncd.
`,
  quiz: [
    { q: 'Which command writes the current system time to the hardware clock?', fill: ['hwclock --systohc', 'hwclock -w', 'hwclock --systohc --utc', 'hwclock -w -u', 'hwclock --systohc -u'], e: '{{--hctosys}} ({{-s}}) works in the opposite direction.' },
    { q: 'Which command sets the system clock from the hardware clock?', fill: ['hwclock --hctosys', 'hwclock -s'], e: 'This is done automatically at boot.' },
    { q: 'Which file determines the local time zone of the system?', fill: ['/etc/localtime'], e: 'Usually a symlink to a file below /usr/share/zoneinfo/.' },
    { q: 'Where are the time zone data files stored?', fill: ['/usr/share/zoneinfo', '/usr/share/zoneinfo/'], e: 'For example /usr/share/zoneinfo/Europe/Berlin.' },
    { q: 'Which environment variable lets a single user use a different time zone than the system?', fill: ['TZ'], e: '{{TZ=Asia/Tokyo date}} runs one command in another zone.' },
    { q: 'Which protocol and port does NTP use?', o: ['TCP 123', 'UDP 123', 'UDP 161', 'TCP 37'], a: 1, e: 'Port 37 is the old TIME protocol (rdate).' },
    { q: 'What is the purpose of pool.ntp.org?', o: ['It is the stratum 0 atomic clock.', 'It is a DNS round-robin cluster of public NTP servers.', 'It is the default chrony configuration file.', 'It is an NTP server running on localhost.'], a: 1, e: 'Each lookup returns different volunteer servers; numbered (0., 1., 2.) and regional sub-zones exist.' },
    { q: 'Which command shows the list of peers of a running ntpd including stratum, offset and jitter?', fill: ['ntpq -p', 'ntpq -pn', 'ntpq -np'], e: 'The peer marked with * is the current synchronization source.' },
    { q: 'Which command displays the time sources used by chronyd?', fill: ['chronyc sources', 'chronyc sources -v'], e: '{{chronyc tracking}} shows details of the current synchronization.' },
    { q: 'Which command enables NTP synchronization on a systemd system?', fill: ['timedatectl set-ntp true', 'timedatectl set-ntp yes', 'timedatectl set-ntp 1', 'timedatectl set-ntp on'], e: 'It starts systemd-timesyncd (or the configured NTP service).' },
    { q: 'Which command sets the time zone to Europe/Vienna on a systemd system?', fill: ['timedatectl set-timezone Europe/Vienna'], e: 'It updates the /etc/localtime symlink.' },
    { q: 'Which statement about NTP strata is correct?', o: ['Stratum 1 servers synchronize from stratum 2 servers.', 'Stratum 0 is the reference clock itself, e.g. GPS or an atomic clock.', 'A lower stratum means a less accurate clock.', 'Stratum 16 is the most accurate level.'], a: 1, e: 'Stratum 16 means unsynchronized.' },
    { q: 'Which command prints the current date as {{2026-10-26}}? (Choose two.)', o: ['{{date +%F}}', '{{date +%Y-%m-%d}}', '{{date -I time}}', '{{date +%D}}'], a: [0, 1], e: '{{%D}} is the US format mm/dd/yy.' },
    { q: 'On a Debian system, which file additionally contains the name of the time zone in plain text?', fill: ['/etc/timezone'], e: 'Red Hat systems only use the /etc/localtime symlink.' },
    { q: 'Which file of ntpd stores the measured frequency error of the local clock?', o: ['the drift file', '/etc/adjtime', '/etc/ntp.keys', '/var/log/ntpstats'], a: 0, e: 'Configured with the {{driftfile}} directive (chrony uses it too).' },
    { q: 'Which command performs a one-time clock synchronization against an NTP server and is considered deprecated?', fill: ['ntpdate'], e: 'Modern alternatives: {{chronyd -q}}, {{ntpd -gq}}, {{chronyc makestep}}.' },
  ],
});

LPIC.add({
  id: '108.2',
  title: 'System logging',
  weight: 4,
  desc: 'Candidates should be able to configure rsyslog. This objective also includes configuring the logging daemon to send log output to a central log server or accept log output as a central log server. Use of the systemd journal subsystem is covered. Also, awareness of syslog and syslog-ng as alternative logging systems is included.',
  knowledge: [
    'Basic configuration of rsyslog.',
    'Understanding of standard facilities, priorities and actions.',
    'Query the systemd journal.',
    'Filter systemd journal data by criteria such as date, service or priority.',
    'Configure persistent systemd journal storage and journal size.',
    'Delete old systemd journal data.',
    'Retrieve systemd journal data from a rescue system or file system copy.',
    'Understand interaction of rsyslog with systemd-journald.',
    'Configuration of logrotate.',
    'Awareness of syslog and syslog-ng.',
  ],
  terms: ['/etc/rsyslog.conf', '/var/log/', 'logger', 'logrotate', '/etc/logrotate.conf', '/etc/logrotate.d/', 'journalctl', 'systemd-cat', '/etc/systemd/journald.conf', '/var/log/journal/'],
  wiki: String.raw`
## The logging landscape
- **syslog** — the classic protocol and daemon ({{syslogd}}, config {{/etc/syslog.conf}}). Messages carry a *facility* and a *priority*.
- **rsyslog** — the default syslog daemon on most distributions; backwards-compatible with the syslog.conf syntax plus modules, TCP, RELP, templates. Config {{/etc/rsyslog.conf}} + {{/etc/rsyslog.d/*.conf}}.
- **syslog-ng** — alternative with its own *source / filter / destination / log* syntax ({{/etc/syslog-ng/syslog-ng.conf}}).
- **systemd-journald** — collects messages from the kernel, early boot, stdout/stderr of services and the syslog socket into a binary, indexed **journal**. Read with {{journalctl}}.

On a typical system journald receives everything first and rsyslog reads from it (via the {{imuxsock}} socket forwarding or the {{imjournal}} module) and writes the classic text files in {{/var/log/}}.

## Facilities and priorities
| Facilities | |
|---|---|
| {{auth}}, {{authpriv}} | security / authorization (login, su, sudo, sshd) |
| {{cron}} | cron and at |
| {{daemon}} | system daemons without their own facility |
| {{kern}} | kernel messages |
| {{lpr}} | printing |
| {{mail}} | mail system |
| {{news}}, {{uucp}} | legacy |
| {{syslog}} | messages of syslogd itself |
| {{user}} | user programs (default for {{logger}}) |
| {{local0}} … {{local7}} | free for local use |

**Priorities** (severity), from highest to lowest:

| # | Keyword | Meaning |
|---|---|---|
| 0 | {{emerg}} (panic) | system unusable |
| 1 | {{alert}} | immediate action needed |
| 2 | {{crit}} | critical |
| 3 | {{err}} (error) | error |
| 4 | {{warning}} (warn) | warning |
| 5 | {{notice}} | normal but significant |
| 6 | {{info}} | informational |
| 7 | {{debug}} | debug |

> EXAM: Know the order **emerg alert crit err warning notice info debug** ("**E**very **A**lert **C**auses **E**xtra **W**ork, **N**ot **I**nteresting **D**ata").

## rsyslog rules: selector → action
~~~file
# /etc/rsyslog.conf  (facility.priority   action)
auth,authpriv.*                 /var/log/auth.log
*.*;auth,authpriv.none         -/var/log/syslog
kern.*                         -/var/log/kern.log
mail.*                         -/var/log/mail.log
mail.err                        /var/log/mail.err
cron.*                          /var/log/cron.log
*.emerg                         :omusrmsg:*
local5.=info                    /var/log/myapp.log
mail.!debug                     /var/log/mail.important
~~~
Selector syntax:
- {{facility.priority}} — this priority **and higher** (e.g. {{mail.err}} = err, crit, alert, emerg).
- {{facility.=priority}} — exactly this priority; {{facility.!priority}} — everything below it; {{facility.none}} — nothing from this facility.
- {{*}} as wildcard, {{,}} lists facilities, {{;}} combines selectors.

Actions: a file ({{-}} prefix = don't sync after each write), {{:omusrmsg:*}} (all logged-in users), a user name, a pipe, or a remote host.

### Central log server
~~~file
# client: forward everything to the log host
*.*   @logserver.example.com:514      # UDP (one @)
*.*   @@logserver.example.com:514     # TCP (two @@)

# server: accept remote messages (/etc/rsyslog.conf)
module(load="imudp")
input(type="imudp" port="514")
module(load="imtcp")
input(type="imtcp" port="514")
# legacy syntax: $ModLoad imudp / $UDPServerRun 514
~~~
After changing the configuration: {{systemctl restart rsyslog}}. Syslog uses **port 514** (UDP; TCP is customary for rsyslog).

## logger — write test messages
~~~console
$ logger "Backup finished"
$ logger -p local0.warning -t backup "disk almost full"
$ logger -p auth.notice "testing auth facility"
$ tail -3 /var/log/syslog
$ sudo tail -2 /var/log/auth.log
~~~
{{-t}} sets the tag (program name), {{-p}} the facility.priority, {{-i}} adds the PID.

## Log files in /var/log
| File | Content |
|---|---|
| {{/var/log/syslog}} (Debian), {{/var/log/messages}} (Red Hat) | general system log |
| {{/var/log/auth.log}} (Debian), {{/var/log/secure}} (Red Hat) | authentication |
| {{/var/log/kern.log}}, {{dmesg}} | kernel |
| {{/var/log/mail.log}}, {{/var/log/maillog}} | mail |
| {{/var/log/cron}} | cron (Red Hat) |
| {{/var/log/wtmp}}, {{/var/log/btmp}}, {{/var/log/lastlog}} | binary login records → {{last}}, {{lastb}}, {{lastlog}} |
| {{/var/log/Xorg.0.log}}, {{/var/log/cups/}}, {{/var/log/apt/}} | application specific |

~~~console
$ ls /var/log
$ tail -n 5 /var/log/syslog
$ grep -i sshd /var/log/syslog | tail -3
$ last | head -5
~~~
Use {{tail -f}} to follow a log live.

## logrotate
Prevents logs from filling the disk: it renames ({{syslog}} → {{syslog.1}} → {{syslog.2.gz}} …), compresses and deletes old logs. It runs daily from cron ({{/etc/cron.daily/logrotate}}) or a systemd timer ({{logrotate.timer}}).

~~~file
# /etc/logrotate.conf — global defaults
weekly
rotate 4
create
#compress
include /etc/logrotate.d

# /etc/logrotate.d/myapp — per-application file
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 myapp adm
    maxsize 100M
    postrotate
        systemctl reload myapp >/dev/null 2>&1 || true
    endscript
}
~~~
Directives: {{daily}}/{{weekly}}/{{monthly}}/{{yearly}}, {{size 100M}}, {{rotate N}} (keep N old files), {{compress}}/{{delaycompress}}, {{missingok}}, {{notifempty}}, {{create mode owner group}}, {{copytruncate}}, {{dateext}}, {{postrotate … endscript}}.
~~~console
$ cat /etc/logrotate.conf
$ cat /etc/logrotate.d/rsyslog
# logrotate -d /etc/logrotate.conf     # debug / dry run
# logrotate -f /etc/logrotate.conf     # force rotation now
$ ls /var/log
~~~

## The systemd journal — journalctl
~~~console
$ journalctl                          # everything (oldest first, in a pager)
$ journalctl -n 20                    # last 20 entries
$ journalctl -r                       # newest first
$ journalctl -f                       # follow (like tail -f)
$ journalctl -u ssh.service           # one unit
$ journalctl -p err                   # priority err and higher
$ journalctl -p warning..err          # range
$ journalctl -b                       # current boot; -b -1 = previous boot
$ journalctl --list-boots
$ journalctl -k                       # kernel messages (like dmesg)
$ journalctl --since "2026-10-26 08:00" --until "1 hour ago"
$ journalctl --since today -u cron
$ journalctl _PID=901                 # match a journal field
$ journalctl /usr/sbin/sshd           # by executable
$ journalctl -o verbose -n 1          # all fields; -o json, -o short-iso
$ journalctl -t backup                # by syslog identifier (tag)
$ journalctl --disk-usage
~~~
Normal users only see their own messages unless they are in the groups {{systemd-journal}} or {{adm}}.

### Writing to the journal
~~~console
$ systemd-cat echo "hello journal"             # stdout of a command goes to the journal
$ echo "backup ok" | systemd-cat -t backup -p info
$ journalctl -t backup
~~~

### Storage, size and cleanup
Configured in {{/etc/systemd/journald.conf}} (section {{[Journal]}}):
~~~file
[Journal]
Storage=persistent     # volatile | persistent | auto | none
Compress=yes
SystemMaxUse=500M      # max. disk space for /var/log/journal
SystemKeepFree=1G
RuntimeMaxUse=50M      # for /run/log/journal
MaxRetentionSec=1month
ForwardToSyslog=yes    # pass messages to rsyslog
~~~
- **volatile** — journal only in RAM: {{/run/log/journal/}} (lost at reboot).
- **persistent** — on disk: {{/var/log/journal/}} (created if missing).
- **auto** (default) — persistent *if* {{/var/log/journal/}} exists, otherwise volatile. So {{mkdir -p /var/log/journal}} + {{systemctl restart systemd-journald}} enables persistence.

~~~console
# mkdir -p /var/log/journal && systemctl restart systemd-journald
$ journalctl --disk-usage
# journalctl --vacuum-size=200M        # delete archived files until ≤ 200 MB
# journalctl --vacuum-time=2weeks      # delete entries older than 2 weeks
# journalctl --vacuum-files=5
~~~

### Reading a journal from a rescue system
Mount the broken system's disk (e.g. at {{/mnt}}) and point journalctl at its files:
~~~console
# journalctl -D /mnt/var/log/journal          # --directory
# journalctl --file /mnt/var/log/journal/*/system.journal
# journalctl --root /mnt                      # use the whole root tree
~~~
Each machine's journal lives in a subdirectory named after {{/etc/machine-id}}.
`,
  quiz: [
    { q: 'Which is the correct order of syslog priorities from highest to lowest severity?', o: ['emerg, alert, crit, err, warning, notice, info, debug', 'emerg, crit, alert, err, notice, warning, info, debug', 'alert, emerg, crit, err, warning, info, notice, debug', 'crit, emerg, alert, err, warning, notice, debug, info'], a: 0, e: 'Numeric values 0 (emerg) to 7 (debug).' },
    { q: 'What does the rsyslog selector {{mail.err}} match?', o: ['only messages with priority err', 'messages of priority err and all higher priorities', 'all mail messages except err', 'messages of priority err and all lower priorities'], a: 1, e: '{{mail.=err}} would match exactly err.' },
    { q: 'Which rsyslog line forwards all messages via **TCP** to {{loghost}}?', o: ['{{*.* @loghost:514}}', '{{*.* @@loghost:514}}', '{{*.* tcp://loghost}}', '{{*.* >loghost:514}}'], a: 1, e: 'One @ = UDP, two @@ = TCP.' },
    { q: 'Which command writes the message "test" with facility local3 and priority notice to the system log?', fill: ['logger -p local3.notice test', 'logger -p local3.notice "test"', "logger -p local3.notice 'test'"], e: '{{-t TAG}} sets the program name.' },
    { q: 'Which facilities are reserved for local use?', o: ['user0–user7', 'local0–local7', 'custom0–custom9', 'daemon0–daemon7'], a: 1, e: '' },
    { q: 'Which journalctl option shows only messages of the unit {{nginx.service}}?', fill: ['-u', '--unit', '-u nginx.service', '--unit=nginx.service', '-u nginx'], e: '' },
    { q: 'Which command follows the journal in real time?', fill: ['journalctl -f', 'journalctl --follow'], e: '' },
    { q: 'Which command shows the messages of the previous boot?', fill: ['journalctl -b -1', 'journalctl --boot=-1', 'journalctl -b-1', 'journalctl --boot -1'], e: '{{--list-boots}} lists all recorded boots.' },
    { q: 'Which command shows only journal messages with priority err or higher?', fill: ['journalctl -p err', 'journalctl -p 3', 'journalctl --priority=err', 'journalctl -p3'], e: '' },
    { q: 'With {{Storage=auto}} in journald.conf, when is the journal stored persistently?', o: ['always', 'never', 'when the directory /var/log/journal exists', 'when rsyslog is not running'], a: 2, e: 'Otherwise it is kept in /run/log/journal (volatile).' },
    { q: 'Which command reduces the archived journal files to at most 100 MB?', fill: ['journalctl --vacuum-size=100M', 'journalctl --vacuum-size 100M'], e: '{{--vacuum-time=}} removes by age.' },
    { q: 'A system does not boot. You mounted its root filesystem at {{/mnt}}. Which command reads its journal? (Choose two.)', o: ['{{journalctl -D /mnt/var/log/journal}}', '{{journalctl --root /mnt}}', '{{journalctl -m /mnt}}', '{{journalctl --rescue /mnt}}'], a: [0, 1], e: '{{--file}} opens individual journal files.' },
    { q: 'Which command sends the output of a program to the systemd journal?', fill: ['systemd-cat'], e: 'e.g. {{systemd-cat -t backup /usr/local/bin/backup.sh}}.' },
    { q: 'In which directory are per-application logrotate configurations placed?', fill: ['/etc/logrotate.d', '/etc/logrotate.d/'], e: 'They are included by /etc/logrotate.conf.' },
    { q: 'Which logrotate directive keeps 7 rotated log files?', fill: ['rotate 7'], e: 'Older files are deleted.' },
    { q: 'Which logrotate directive avoids compressing the most recent rotated file, because the program may still write to it?', fill: ['delaycompress'], e: 'Used together with {{compress}}.' },
    { q: 'Which file configures the size limits of the systemd journal?', fill: ['/etc/systemd/journald.conf'], e: 'SystemMaxUse=, RuntimeMaxUse=, MaxRetentionSec=.' },
    { q: 'Which standard port does syslog use for network transport?', fill: ['514'], e: 'UDP 514 (TCP 514 is common for rsyslog; RFC 6587).' },
  ],
});

LPIC.add({
  id: '108.3',
  title: 'Mail Transfer Agent (MTA) basics',
  weight: 3,
  desc: 'Candidates should be aware of the commonly available MTA programs and be able to perform basic forward and alias configuration on a client host. Other configuration files are not covered.',
  knowledge: [
    'Create e-mail aliases.',
    'Configure e-mail forwarding.',
    'Knowledge of commonly available MTA programs (postfix, sendmail, exim) (no configuration).',
  ],
  terms: ['~/.forward', 'sendmail emulation layer commands', 'newaliases', 'mail', 'mailq', 'postfix', 'sendmail', 'exim'],
  wiki: String.raw`
## Mail components
| Abbr. | Role | Examples |
|---|---|---|
| **MUA** — Mail User Agent | the program the user reads/writes mail with | {{mail}}/{{mailx}}, mutt, Thunderbird |
| **MTA** — Mail Transfer Agent | transports mail between hosts via **SMTP (port 25)** | **Postfix**, **Sendmail**, **Exim**, (qmail) |
| **MDA** — Mail Delivery Agent | delivers to the local mailbox | procmail, dovecot-lda, local(8) |

Local mailboxes are usually in {{/var/mail/USER}} ({{/var/spool/mail/USER}}, *mbox* format) or {{~/Maildir/}}.

### The common MTAs (awareness only)
- **Sendmail** — the historic Unix MTA; monolithic, complex config ({{/etc/mail/sendmail.cf}}, generated from {{sendmail.mc}} with m4).
- **Postfix** — modular, secure, default on many distributions (Debian/Ubuntu server, SUSE, RHEL). Config {{/etc/postfix/main.cf}} and {{master.cf}}; tool {{postconf}}.
- **Exim** — flexible, default on Debian (exim4) historically; config {{/etc/exim4/}}.

## The sendmail emulation layer
Because so many scripts call {{/usr/sbin/sendmail}}, **every MTA ships sendmail-compatible commands**. They behave the same no matter whether Postfix, Exim or Sendmail is installed:

| Command | Purpose |
|---|---|
| {{sendmail}} | submit a message ({{sendmail -t < msg.txt}}, {{sendmail user@host}}) |
| {{mailq}} (= {{sendmail -bp}}) | show the mail queue |
| {{newaliases}} (= {{sendmail -bi}}) | rebuild the alias database from {{/etc/aliases}} |
| {{sendmail -q}} | process the queue now (Postfix: {{postqueue -f}}) |

~~~console
$ ls -l /usr/sbin/sendmail
$ mailq
$ postconf mail_version
~~~

## Aliases — /etc/aliases
System-wide aliases redirect mail for a local name. Format: {{name: target[, target…]}}.
~~~file
# /etc/aliases
postmaster:   root
abuse:        root
webmaster:    alice, bob                 # several recipients
root:         student                    # root's mail goes to student
support:      helpdesk@example.com       # external address
archive:      /var/mail/archive.mbox     # append to a file
ticket:       "|/usr/local/bin/ticket"   # pipe into a program
team:         :include:/etc/mail/team.list
~~~
After editing, the binary database ({{/etc/aliases.db}}) **must be rebuilt**:
~~~console
$ cat /etc/aliases
# newaliases
~~~
> EXAM: Editing {{/etc/aliases}} alone has no effect — run **{{newaliases}}**.

## Forwarding — ~/.forward
Any user can forward their own mail by putting addresses (one per line, or comma separated) into **{{~/.forward}}**. The file must be owned by the user and not writable by others.
~~~console
$ echo "student@example.org" > ~/.forward
$ cat ~/.forward
~~~
To forward *and* keep a local copy, include the user's own name escaped with a backslash:
~~~file
\student, student@example.org
~~~
A line like {{"|/usr/bin/procmail"}} pipes mail into a program.

## Sending and reading mail on the command line
~~~console
$ echo "Backup ok" | mail -s "Backup report" root
$ mail -s "Report" alice < notes.txt
$ mail                           # read your mailbox (interactive)
$ mailq
~~~
Inside {{mail}}: number = read message, {{d}} delete, {{r}} reply, {{q}} quit (saves read mail to {{~/mbox}}), {{x}} exit without changes.
`,
  quiz: [
    { q: 'After editing {{/etc/aliases}}, which command must be run so that the MTA uses the changes?', fill: ['newaliases', 'sendmail -bi'], e: 'It rebuilds /etc/aliases.db.' },
    { q: 'Which file can a user create in the home directory to forward incoming mail?', fill: ['~/.forward', '.forward'], e: 'It contains the target addresses.' },
    { q: 'Which command shows the mail queue, regardless of the installed MTA?', fill: ['mailq', 'sendmail -bp'], e: 'Part of the sendmail emulation layer.' },
    { q: 'Which programs are Mail Transfer Agents? (Choose three.)', o: ['Postfix', 'Exim', 'Sendmail', 'Mutt', 'Dovecot'], a: [0, 1, 2], e: 'Mutt is an MUA, Dovecot an IMAP/POP3 server.' },
    { q: 'Which line in {{/etc/aliases}} delivers mail for {{info}} to both alice and bob?', o: ['{{info: alice, bob}}', '{{info = alice bob}}', '{{alice, bob: info}}', '{{info -> alice; bob}}'], a: 0, e: 'Format: name: target, target …' },
    { q: 'Why do Postfix and Exim provide a {{sendmail}} command?', o: ['They are forks of Sendmail.', 'For compatibility: many programs and scripts call /usr/sbin/sendmail to submit mail.', 'To convert sendmail.cf files.', 'They require Sendmail to be installed as well.'], a: 1, e: 'The "sendmail emulation layer".' },
    { q: 'The user {{student}} wants to forward mail to {{s@example.org}} but also keep a local copy. What goes into {{~/.forward}}?', o: ['{{s@example.org}}', '{{\\student, s@example.org}}', '{{student > s@example.org}}', '{{copy student s@example.org}}'], a: 1, e: 'The backslash prevents the local name from being forwarded again (loop).' },
    { q: 'Which command sends a mail with subject "Hi" to root, using the text from stdin?', fill: ['mail -s Hi root', 'mail -s "Hi" root', 'mailx -s Hi root', 'mailx -s "Hi" root'], e: '' },
    { q: 'Which TCP port is used by SMTP for mail transport between MTAs?', fill: ['25'], e: '587 = submission, 465 = SMTPS.' },
    { q: 'Where are local mailboxes in mbox format typically stored?', o: ['/var/mail/ or /var/spool/mail/', '/etc/mail/', '/usr/share/mail/', '/var/log/mail/'], a: 0, e: 'Maildir format stores mail in ~/Maildir/.' },
  ],
});

LPIC.add({
  id: '108.4',
  title: 'Manage printers and printing',
  weight: 2,
  desc: 'Candidates should be able to manage print queues and user print jobs using CUPS and the LPD compatibility interface.',
  knowledge: [
    'Basic CUPS configuration (for local and remote printers).',
    'Manage user print queues.',
    'Troubleshoot general printing problems.',
    'Add and remove jobs from configured printer queues.',
  ],
  terms: ['CUPS configuration files, tools and utilities', '/etc/cups/', 'lpd legacy interface (lpr, lprm, lpq)'],
  wiki: String.raw`
## CUPS — Common Unix Printing System
- Scheduler daemon **{{cupsd}}**, speaks **IPP** (Internet Printing Protocol) on **TCP port 631**.
- Web interface: **http://localhost:631** (add printers, manage jobs; admin tasks need a user in the {{lpadmin}} group or root).
- Converts documents through **filters** (e.g. PDF → printer language) using **PPD** files (PostScript Printer Description) or driverless IPP Everywhere.
- Provides both the **System V** ({{lp}}, {{lpstat}}, {{cancel}}, {{lpadmin}}) and the **BSD/LPD** ({{lpr}}, {{lpq}}, {{lprm}}, {{lpc}}) command sets.

### Configuration files in /etc/cups/
| File | Purpose |
|---|---|
| {{cupsd.conf}} | scheduler: listening addresses ({{Listen}}/{{Port}}), access control ({{<Location>}} blocks), {{Browsing}}, log level |
| {{printers.conf}} | the configured queues (written by CUPS — stop cupsd before editing by hand) |
| {{ppd/}} | PPD files of the queues |
| {{cups-files.conf}} | file/directory locations, {{SystemGroup}} |
| {{classes.conf}} | printer classes (groups of printers) |

Spool directory {{/var/spool/cups/}}, logs in **{{/var/log/cups/}}** ({{error_log}}, {{access_log}}, {{page_log}}). {{/etc/printcap}} is generated for legacy programs.

~~~console
$ ls /etc/cups
$ sudo cat /etc/cups/printers.conf
$ cat /etc/printcap
$ systemctl status cups
~~~
In {{cupsd.conf}}, {{LogLevel debug}} helps troubleshooting; {{cupsctl --share-printers}} / {{cupsctl --remote-admin}} change common settings.

## Adding and removing queues — lpadmin
~~~console
# lpadmin -p office -E -v ipp://192.168.56.50/ipp/print -m everywhere
# lpadmin -p office -L "2nd floor" -D "Office laser"
# lpadmin -d office                 # set system default (also: lpoptions -d office)
# lpadmin -x office                 # delete the queue
# lpinfo -v                         # list available devices/backends
~~~
{{-p}} printer name, {{-E}} enable and accept jobs, {{-v}} device URI ({{ipp://}}, {{socket://host:9100}}, {{lpd://host/queue}}, {{usb://…}}), {{-m}} model/driver, {{-P}} a PPD file.

## Printing and queue management
| Task | BSD / LPD | System V |
|---|---|---|
| print a file | {{lpr -P queue file}} | {{lp -d queue file}} |
| copies | {{lpr -# 3 file}} | {{lp -n 3 file}} |
| show queue | {{lpq}} / {{lpq -P queue}} / {{lpq -a}} | {{lpstat -o}} |
| remove job | {{lprm 42}}, {{lprm -}} (all own jobs) | {{cancel 42}}, {{cancel -a queue}} |
| printer status | {{lpc status}} | {{lpstat -p}}, {{lpstat -t}} (everything) |

~~~console
$ lpstat -t
$ lpstat -d
$ lpr -P pdf notes.txt
$ lp -d office-laser -n 2 poem.txt
$ lpq -a
$ lpstat -o
$ lprm -
$ lpq
~~~
Without {{-P}}/{{-d}} the **default printer** is used ({{lpstat -d}}, environment variable {{PRINTER}}).

## Enable/disable vs. accept/reject
Two independent switches per queue:
- **cupsaccept / cupsreject** (also {{accept}}/{{reject}}) — whether the queue **accepts new jobs**.
- **cupsenable / cupsdisable** — whether the queue **prints** the jobs in it.

~~~console
# cupsdisable -r "toner empty" office-laser   # stop printing, keep queueing
$ lpstat -p
# cupsenable office-laser
# cupsreject office-laser                     # refuse new jobs
$ lpstat -a
# cupsaccept office-laser
~~~
Moving jobs to another printer: {{lpmove 42 pdf}}.

## Troubleshooting checklist
1. Is cupsd running? {{systemctl status cups}}, {{lpstat -r}} ("scheduler is running").
2. Is the queue enabled and accepting? {{lpstat -p -a}}.
3. Are jobs stuck? {{lpstat -o}} / {{lpq}}, cancel and resubmit.
4. Check {{/var/log/cups/error_log}} (set {{LogLevel debug}} temporarily).
5. Is the device reachable? ({{ping}}, port 631/9100 open?) Is the right driver/PPD used?
`,
  quiz: [
    { q: 'Which TCP port does the CUPS scheduler and web interface use?', fill: ['631'], e: 'IPP — http://localhost:631' },
    { q: 'Which file contains the main configuration of the CUPS daemon?', fill: ['/etc/cups/cupsd.conf'], e: 'printers.conf holds the queues.' },
    { q: 'Which command removes **all** of your own print jobs from the default queue?', fill: ['lprm -', 'cancel -a', 'lprm'], e: '{{lprm}} without arguments removes the current active job.' },
    { q: 'Which command shows the jobs in the queue {{office}} using the BSD interface?', fill: ['lpq -P office', 'lpq -Poffice'], e: 'System V: {{lpstat -o office}}.' },
    { q: 'Which command prints {{report.pdf}} on the printer {{laser}}? (Choose two.)', o: ['{{lpr -P laser report.pdf}}', '{{lp -d laser report.pdf}}', '{{lpq -P laser report.pdf}}', '{{print -q laser report.pdf}}'], a: [0, 1], e: '' },
    { q: 'A printer should stop printing (e.g. for maintenance), but still accept and queue new jobs. Which command achieves this?', o: ['{{cupsreject printer}}', '{{cupsdisable printer}}', '{{lprm printer}}', '{{lpadmin -x printer}}'], a: 1, e: '{{cupsreject}} would refuse new jobs.' },
    { q: 'Which command adds a new CUPS print queue?', fill: ['lpadmin'], e: 'e.g. {{lpadmin -p name -E -v URI -m everywhere}}.' },
    { q: 'Which command shows the full status of the CUPS system: scheduler, default printer, devices and queues?', fill: ['lpstat -t'], e: '' },
    { q: 'Where does CUPS write its log files?', fill: ['/var/log/cups', '/var/log/cups/'], e: 'error_log, access_log, page_log.' },
    { q: 'Which command cancels the print job with ID 17 (System V style)?', fill: ['cancel 17'], e: 'BSD: {{lprm 17}}.' },
    { q: 'Which command sets the system-wide default printer to {{office}}?', fill: ['lpadmin -d office', 'lpoptions -d office'], e: '{{lpoptions -d}} as a normal user sets a personal default.' },
  ],
});
