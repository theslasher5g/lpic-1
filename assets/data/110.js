/* Topic 110: Security */
LPIC.add({
  id: '110.1',
  title: 'Perform security administration tasks',
  weight: 3,
  desc: 'Candidates should know how to review system configuration to ensure host security in accordance with local security policies.',
  knowledge: [
    'Audit a system to find files with the suid/sgid bit set.',
    'Set or change user passwords and password aging information.',
    'Being able to use nmap and netstat to discover open ports on a system.',
    'Set up limits on user logins, processes and memory usage.',
    'Determine which users have logged in to the system or are currently logged in.',
    'Basic sudo configuration and usage.',
  ],
  terms: ['find', 'passwd', 'fuser', 'lsof', 'nmap', 'chage', 'netstat', 'sudo', '/etc/sudoers', 'su', 'usermod', 'ulimit', 'who, w, last'],
  wiki: String.raw`
## Finding SUID and SGID files
SUID (4000) and SGID (2000) programs run with the rights of their *owner/group* — e.g. {{/usr/bin/passwd}} runs as root. Every unexpected SUID-root file is a potential privilege escalation, so audit them regularly and compare with a known-good list.
~~~console
$ find / -perm -4000 -type f 2>/dev/null          # SUID set (at least)
$ find / -perm -2000 -type f 2>/dev/null          # SGID set
$ find / -perm /6000 -type f -ls 2>/dev/null      # SUID OR SGID
$ find / -perm -4000 -user root -type f 2>/dev/null
$ ls -l /usr/bin/passwd /usr/bin/su
~~~
{{-perm -4000}} = *all* of these bits set; {{-perm /6000}} = *any* of these bits set (old syntax {{+6000}}). In {{ls -l}}, SUID shows as {{s}} in the owner's execute position ({{S}} if not executable).

Removing a bit: {{chmod u-s FILE}}, {{chmod g-s FILE}}. Mount untrusted filesystems with the options **{{nosuid}}** (and {{noexec}}, {{nodev}}).

## Passwords and password aging
~~~console
$ passwd                              # change your own password
# passwd alice                        # root sets another user's password
# passwd -l alice                     # lock  (prefix "!" in /etc/shadow)
# passwd -u alice                     # unlock
# passwd -e alice                     # expire: must change at next login
$ passwd -S student                   # status: P / L / NP
$ chage -l student                    # list aging info
# chage -M 90 -m 1 -W 14 alice        # max 90 days, min 1, warn 14 days before
# chage -I 7 alice                    # inactive days after expiry before locking
# chage -E 2026-12-31 alice           # account expiry date (-E -1 removes it)
# chage -d 0 alice                    # force password change at next login
# usermod -L alice / usermod -U alice # lock / unlock
# usermod -e 2026-12-31 alice         # account expiry
~~~
Without options, {{chage USER}} asks interactively. Defaults for new accounts: {{PASS_MAX_DAYS}}, {{PASS_MIN_DAYS}}, {{PASS_WARN_AGE}} in {{/etc/login.defs}}.

## Who is or was logged in?
~~~console
$ who                    # currently logged in users (from /var/run/utmp)
$ who -a
$ w                      # who + what they are doing, load average
$ last                   # login history (from /var/log/wtmp)
$ last -n 5 alice
$ last reboot            # reboots
# lastb                  # failed logins (/var/log/btmp, root only)
$ lastlog                # last login of every account
$ id; whoami; users
~~~

## Open ports and the processes behind them
On the **local** host:
~~~console
$ ss -tuln
# ss -tulpn
$ netstat -tuln
# netstat -tulpn
# lsof -i                     # all network files
# lsof -i :22                 # who uses port 22?
# lsof -i TCP -s TCP:LISTEN
# lsof /var/log/syslog        # who has this file open?
# lsof -u alice
# fuser -v 22/tcp             # PID using TCP port 22
# fuser -vm /mnt              # processes using a mount point
# fuser -k /mnt/usb           # kill them (before umount)
~~~
From the network — **nmap** (install it first: {{apt install nmap}}):
~~~console
# apt install -y nmap
$ nmap localhost                       # top 1000 TCP ports
$ nmap -p 1-65535 192.168.56.10
# nmap -sS 192.168.56.0/24             # SYN scan (root)
$ nmap -sT -p 22,80,443 fileserver     # TCP connect scan
# nmap -sU -p 53,123,161 192.168.56.1  # UDP
$ nmap -sV fileserver                  # detect service versions
$ nmap -sn 192.168.56.0/24             # host discovery only (ping scan)
# nmap -O fileserver                   # OS detection
~~~
> WARN: Only scan systems you are authorized to scan.

## Resource limits — ulimit and limits.conf
{{ulimit}} is a shell builtin that sets limits for the shell and its children. **Soft** limits can be raised by the user up to the **hard** limit; hard limits can only be lowered (except by root).
~~~console
$ ulimit -a                   # all limits
$ ulimit -n                   # max. open files
$ ulimit -Sn; ulimit -Hn      # soft / hard value
$ ulimit -u 100               # max. user processes
$ ulimit -v 1000000           # max. virtual memory (KB)
$ ulimit -c 0                 # no core dumps
$ ulimit -f 10240             # max. file size (blocks)
$ ulimit -t 60                # CPU time (seconds)
~~~
Persistent per-user/group limits are set with PAM ({{pam_limits.so}}) in **{{/etc/security/limits.conf}}** and {{/etc/security/limits.d/*.conf}}:
~~~file
#<domain>   <type>  <item>      <value>
*           soft    core        0
@students   hard    nproc       50
bob         hard    maxlogins   2
alice       -       nofile      4096      # "-" = soft and hard
@devs       hard    as          2000000   # address space (KB)
~~~
Systemd services use {{LimitNOFILE=}}, {{LimitNPROC=}}… in the unit file instead.

## sudo
{{sudo}} runs a command as another user (default root) after asking for the **user's own** password (cached for ~15 min); everything is logged (auth.log / journal). {{su}} instead asks for the **target** user's password.
~~~console
$ sudo -l                          # what may I run?
$ sudo whoami
$ sudo -u alice id                 # run as alice
$ sudo -i                          # root login shell
$ sudo -s                          # root shell keeping the environment
$ sudo -k                          # forget the cached credentials
$ sudo -e /etc/hosts               # = sudoedit: edit as root with your editor
$ su -                             # root login shell (root's password)
$ su - alice -c 'id'
~~~
### /etc/sudoers
Always edit with **{{visudo}}** (locks the file and checks syntax). Drop-in files go into {{/etc/sudoers.d/}}.
~~~file
# who   where=(as_user:as_group)   what
root    ALL=(ALL:ALL) ALL
%sudo   ALL=(ALL:ALL) ALL                    # Debian: group sudo
%wheel  ALL=(ALL) ALL                        # Red Hat: group wheel
alice   ALL=(root) /usr/bin/systemctl restart nginx
bob     web01=(ALL) NOPASSWD: /usr/bin/apt update, /usr/bin/apt upgrade
%ops    ALL=(ALL) NOPASSWD: ALL

User_Alias  ADMINS = alice, bob
Cmnd_Alias  NET = /usr/sbin/ip, /usr/bin/nmcli
ADMINS      ALL = NET
Defaults    timestamp_timeout=5, logfile=/var/log/sudo.log
~~~
A leading {{%}} means a group. Adding a user to the admin group: {{usermod -aG sudo alice}} (Debian) or {{usermod -aG wheel alice}} (Red Hat).
~~~console
$ sudo cat /etc/sudoers
$ sudo -l
$ groups
~~~
`,
  quiz: [
    { q: 'Which command finds all files with the SUID bit set on the whole system?', fill: ['find / -perm -4000', 'find / -perm -4000 -type f', 'find / -perm -u+s', 'find / -perm /4000', 'find / -perm -u=s', 'find / -type f -perm -4000', 'find / -perm -4000 2>/dev/null', 'find / -perm /u+s', 'find / -perm /u=s'], e: '' },
    { q: 'Which find option matches files having the SUID **or** the SGID bit?', o: ['{{-perm /6000}}', '{{-perm -6000}}', '{{-perm 6000}}', '{{-suid -sgid}}'], a: 0, e: '{{-6000}} requires both bits.' },
    { q: 'Security policy: {{alice}} must set a new password the next time she logs in. Which commands enforce this? (Choose two.)', o: ['{{chage -d 0 alice}}', '{{passwd -e alice}}', '{{passwd -l alice}}', '{{usermod -L alice}}'], a: [0, 1], e: '' },
    { q: 'Which command sets the maximum password age of {{bob}} to 60 days?', fill: ['chage -M 60 bob', 'chage --maxdays 60 bob', 'passwd -x 60 bob'], e: '' },
    { q: 'Which command shows the failed login attempts recorded in {{/var/log/btmp}}?', fill: ['lastb'], e: '{{last}} reads /var/log/wtmp.' },
    { q: 'Which command shows who is logged in and what they are currently doing?', fill: ['w'], e: '{{who}} shows logins without the activity.' },
    { q: 'Which command lists the processes that use TCP port 80? (Choose two.)', o: ['{{lsof -i :80}}', '{{fuser -v 80/tcp}}', '{{ps -p 80}}', '{{netstat -p 80}}'], a: [0, 1], e: '' },
    { q: 'Which nmap option performs only host discovery without a port scan?', fill: ['-sn', '-sP'], e: '{{-sP}} is the old name.' },
    { q: 'Which file must be edited to permanently limit the number of processes for the group {{students}}?', fill: ['/etc/security/limits.conf'], e: 'Line: @students hard nproc 50 (applied via pam_limits).' },
    { q: 'Which command shows all current resource limits of the shell?', fill: ['ulimit -a'], e: '' },
    { q: 'What is the difference between soft and hard limits?', o: ['Soft limits apply only to root.', 'A user can raise the soft limit up to the hard limit; the hard limit can only be lowered by non-root users.', 'Hard limits are only warnings.', 'There is no difference.'], a: 1, e: '' },
    { q: 'Which command should be used to edit {{/etc/sudoers}}?', fill: ['visudo'], e: 'It checks the syntax before saving.' },
    { q: 'What does the sudoers line {{%admin ALL=(ALL) NOPASSWD: ALL}} mean?', o: ['The user admin may run all commands without a password.', 'Members of the group admin may run all commands as any user without entering a password.', 'Nobody in group admin needs sudo.', 'The admin group may only run commands on host ALL.'], a: 1, e: '% = group.' },
    { q: 'Which command lists the commands the current user is allowed to run with sudo?', fill: ['sudo -l', 'sudo --list'], e: '' },
    { q: 'Whose password does {{sudo}} ask for by default?', o: ['root\'s', 'the target user\'s', 'the invoking user\'s own password', 'none'], a: 2, e: '{{su}} asks for the target user\'s password.' },
    { q: 'Which command kills all processes that use the mount point {{/mnt/usb}}?', fill: ['fuser -k /mnt/usb', 'fuser -km /mnt/usb', 'fuser -mk /mnt/usb'], e: '' },
    { q: 'Which command displays the last logins of the user {{alice}}?', fill: ['last alice'], e: '' },
  ],
});

LPIC.add({
  id: '110.2',
  title: 'Setup host security',
  weight: 3,
  desc: 'Candidates should know how to set up a basic level of host security.',
  knowledge: [
    'Awareness of shadow passwords and how they work.',
    'Turn off network services not in use.',
    'Understand the role of TCP wrappers.',
  ],
  terms: ['/etc/nologin', '/etc/passwd', '/etc/shadow', '/etc/xinetd.d/', '/etc/xinetd.conf', 'systemd.socket', '/etc/inittab', '/etc/init.d/', '/etc/hosts.allow', '/etc/hosts.deny'],
  sims: ['passwd'],
  wiki: String.raw`
## Shadow passwords
Originally the password hash was in the world-readable {{/etc/passwd}}, so anyone could copy it and crack it offline. With **shadow passwords** the hash moves to **{{/etc/shadow}}**, readable only by root (and group {{shadow}}); {{/etc/passwd}} keeps an {{x}} in the password field.
~~~console
$ ls -l /etc/passwd /etc/shadow /etc/group /etc/gshadow
$ grep student /etc/passwd
$ sudo grep student /etc/shadow
~~~
| File | Permissions | Content |
|---|---|---|
| {{/etc/passwd}} | 644 root:root | name:x:UID:GID:GECOS:home:shell |
| {{/etc/shadow}} | 640 root:shadow (RHEL 000) | name:hash:lastchg:min:max:warn:inactive:expire: |
| {{/etc/group}} | 644 | name:x:GID:members |
| {{/etc/gshadow}} | 640 | group passwords and administrators |

Hash format {{$id$salt$hash}}: {{$1$}} MD5, {{$5$}} SHA-256, {{$6$}} SHA-512, {{$y$}} yescrypt. Special values: {{!}} or {{*}} = no login with a password (locked/system account), empty = no password (dangerous). {{pwconv}}/{{pwunconv}} convert between shadow and non-shadow, {{pwck}}/{{grpck}} check consistency.

> TIP: The **/etc/passwd, shadow & group explained** simulation dissects each field.

## Disabling logins: /etc/nologin and nologin shells
- If **{{/etc/nologin}}** exists, **only root** can log in; other users see the file's contents and are rejected (pam_nologin). Useful during maintenance. {{shutdown}} creates it automatically shortly before shutting down.
- Accounts that should never log in get the shell **{{/usr/sbin/nologin}}** (polite message) or {{/bin/false}}.
~~~console
$ cat /etc/nologin.example
# echo "Maintenance until 18:00" > /etc/nologin
# rm /etc/nologin
$ grep nologin /etc/passwd | head -3
# usermod -s /usr/sbin/nologin bob
~~~

## Turning off unused network services
Every listening service is attack surface. First find what is running/listening, then stop **and** disable what is not needed — or uninstall it.
~~~console
$ ss -tuln
$ systemctl list-units --type=service --state=running
$ systemctl list-unit-files --state=enabled
# systemctl disable --now cups
# systemctl mask telnet            # make it impossible to start
$ systemctl is-enabled cups
~~~
### SysV init systems
~~~console
$ ls /etc/init.d/
# service cups stop
# update-rc.d cups disable         # Debian
# chkconfig cups off               # Red Hat (old)
~~~
On ancient SysV systems {{/etc/inittab}} also starts services (e.g. getty lines) — comment them out and run {{telinit q}}.

### Socket activation (systemd.socket)
systemd can listen on a port itself and start the service only when a connection arrives — the modern replacement for inetd. A {{.socket}} unit (e.g. {{ssh.socket}}, {{cups.socket}}) belongs to a service with the same name. To disable such a service, stop/disable **both** units:
~~~file
# /etc/systemd/system/echo.socket
[Socket]
ListenStream=7777
Accept=yes

[Install]
WantedBy=sockets.target
~~~
~~~console
$ systemctl list-sockets
$ systemctl list-units --type=socket
# systemctl disable --now cups.socket cups.service
~~~

### inetd / xinetd (super servers)
The **super server** listens on many ports and starts the real daemon per connection. inetd uses one line per service in {{/etc/inetd.conf}}; **xinetd** uses {{/etc/xinetd.conf}} plus one file per service in **{{/etc/xinetd.d/}}**:
~~~file
# /etc/xinetd.d/telnet
service telnet
{
    disable         = yes          # "yes" turns the service off
    socket_type     = stream
    wait            = no
    user            = root
    server          = /usr/sbin/in.telnetd
    only_from       = 192.168.56.0/24
    log_on_failure  += USERID
}
~~~
~~~console
$ cat /etc/xinetd.d/telnet
$ cat /etc/inetd.conf
~~~
After changes: {{systemctl restart xinetd}} (or send SIGHUP to inetd). To disable a service in inetd.conf, comment out its line.

## TCP wrappers — /etc/hosts.allow and /etc/hosts.deny
TCP wrappers (**libwrap**, {{tcpd}}) add host-based access control to services that are linked against libwrap or started via {{tcpd}} from inetd (xinetd supports it natively).

Evaluation order:
1. If a rule in **{{/etc/hosts.allow}}** matches → access **granted**.
2. Else if a rule in **{{/etc/hosts.deny}}** matches → access **denied**.
3. Else → access **granted**.

The first match wins; changes take effect immediately (no restart).
~~~file
# /etc/hosts.allow   daemon_list : client_list [: shell_command]
sshd : 192.168.56.0/24, 10.0.0.
in.telnetd : LOCAL
vsftpd : .example.com EXCEPT untrusted.example.com
ALL : 127.0.0.1

# /etc/hosts.deny — deny everything else ("default deny")
ALL : ALL
~~~
Wildcards: {{ALL}}, {{LOCAL}} (names without a dot), {{KNOWN}}, {{UNKNOWN}}, {{PARANOID}}; {{.example.com}} matches a domain, {{192.168.}} a network prefix, {{EXCEPT}} excludes.
~~~console
$ cat /etc/hosts.allow
$ cat /etc/hosts.deny
$ ldd /usr/sbin/sshd
~~~
> NOTE: TCP wrappers are deprecated: modern OpenSSH and most distributions (RHEL 8+, Fedora) no longer support them. Use a firewall ({{nftables}}, {{firewalld}}, {{ufw}}) instead — but they are still exam content.
`,
  quiz: [
    { q: 'Which file stores the password hashes when shadow passwords are used?', fill: ['/etc/shadow'], e: '' },
    { q: 'Which permissions does {{/etc/shadow}} typically have on Debian?', o: ['644 root:root', '640 root:shadow', '666 root:root', '755 root:shadow'], a: 1, e: 'It must not be world-readable. RHEL uses 000.' },
    { q: 'What happens when the file {{/etc/nologin}} exists?', o: ['No user can log in, including root.', 'Only root can log in; other users see the file content.', 'Users without a password cannot log in.', 'The system shuts down.'], a: 1, e: '' },
    { q: 'Which shell should be assigned to an account that must not log in interactively and should show a polite message?', fill: ['/usr/sbin/nologin', '/sbin/nologin'], e: '/bin/false simply exits.' },
    { q: 'A client connects to a service protected by TCP wrappers. No rule in hosts.allow matches, but {{ALL: ALL}} is in hosts.deny. What happens?', o: ['Access is granted.', 'Access is denied.', 'The service crashes.', 'The client is asked for a password.'], a: 1, e: 'hosts.allow first, then hosts.deny, otherwise allow.' },
    { q: 'A rule matches in both {{/etc/hosts.allow}} and {{/etc/hosts.deny}}. What is the result?', o: ['Access is denied.', 'Access is granted, because hosts.allow is checked first.', 'The rule with more specific addresses wins.', 'Neither rule applies.'], a: 1, e: '' },
    { q: 'Which line in {{/etc/hosts.allow}} allows SSH access only from the network 192.168.1.0/24?', o: ['{{sshd: 192.168.1.}}', '{{ssh = 192.168.1.0}}', '{{allow sshd 192.168.1.*}}', '{{192.168.1.: sshd}}'], a: 0, e: 'A trailing dot denotes a network prefix; CIDR /24 works in newer versions too.' },
    { q: 'In which directory does xinetd keep its per-service configuration files?', fill: ['/etc/xinetd.d', '/etc/xinetd.d/'], e: 'Global options in /etc/xinetd.conf.' },
    { q: 'Which xinetd setting turns a service off?', fill: ['disable = yes', 'disable=yes'], e: '' },
    { q: 'Which command stops the service {{cups}} immediately and prevents it from starting at boot?', fill: ['systemctl disable --now cups', 'systemctl disable --now cups.service', 'systemctl disable cups --now'], e: 'Also consider cups.socket.' },
    { q: 'Which systemd unit type starts a service on demand when a connection arrives on a port?', fill: ['socket', '.socket', 'systemd.socket'], e: 'The modern replacement for inetd.' },
    { q: 'What does the prefix {{$6$}} in a password hash in {{/etc/shadow}} indicate?', o: ['MD5', 'SHA-256', 'SHA-512', 'Blowfish'], a: 2, e: '$1$ MD5, $5$ SHA-256, $y$ yescrypt.' },
    { q: 'Which command lists all listening sockets so you can identify unneeded network services?', fill: ['ss -tuln', 'ss -tulpn', 'netstat -tuln', 'netstat -tulpn', 'ss -lntu', 'ss -tunl', 'ss -tlnu', 'ss -ltun'], e: '' },
  ],
});

LPIC.add({
  id: '110.3',
  title: 'Securing data with encryption',
  weight: 4,
  desc: 'The candidate should be able to use public key techniques to secure data and communication.',
  knowledge: [
    'Perform basic OpenSSH 2 client configuration and usage.',
    'Understand the role of OpenSSH 2 server host keys.',
    'Perform basic GnuPG configuration, usage and revocation.',
    'Use GPG to encrypt, decrypt, sign and verify files.',
    'Understand SSH port tunnels (including X11 tunnels).',
  ],
  terms: ['ssh', 'ssh-keygen', 'ssh-agent', 'ssh-add', '~/.ssh/id_rsa and id_rsa.pub', '~/.ssh/id_dsa and id_dsa.pub', '~/.ssh/id_ecdsa and id_ecdsa.pub', '~/.ssh/id_ed25519 and id_ed25519.pub', '/etc/ssh/ssh_host_rsa_key and ssh_host_rsa_key.pub', '/etc/ssh/ssh_host_dsa_key and ssh_host_dsa_key.pub', '/etc/ssh/ssh_host_ecdsa_key and ssh_host_ecdsa_key.pub', '/etc/ssh/ssh_host_ed25519_key and ssh_host_ed25519_key.pub', '~/.ssh/authorized_keys', 'ssh_known_hosts', 'gpg', 'gpg-agent', '~/.gnupg/'],
  wiki: String.raw`
## Public key cryptography in one minute
Each party has a **key pair**: the **private key** stays secret, the **public key** can be given to anyone.
- Data encrypted with the *public* key can only be decrypted with the *private* key → **confidentiality**.
- A signature made with the *private* key can be verified with the *public* key → **authenticity and integrity**.

SSH and GnuPG both build on this; for bulk data they use a fast symmetric session key (e.g. AES).

## OpenSSH client
~~~console
$ ssh fileserver                         # same user name as locally
$ ssh alice@fileserver
$ ssh -p 2222 alice@fileserver           # other port (default 22)
$ ssh fileserver hostname                # run one remote command
$ ssh -i ~/.ssh/id_ed25519 alice@fileserver
$ ssh -v fileserver                      # verbose (debug connection problems)
$ scp notes.txt alice@fileserver:/tmp/
$ scp -r docs fileserver:backup/
$ sftp alice@fileserver
~~~
Client configuration: system-wide {{/etc/ssh/ssh_config}}, per user **{{~/.ssh/config}}**:
~~~file
# ~/.ssh/config
Host fs
    HostName fileserver.example.com
    User alice
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    ForwardX11 yes
Host *
    ServerAliveInterval 60
~~~
Then simply {{ssh fs}}. The directory {{~/.ssh}} must be **700**, private keys **600**, otherwise ssh refuses to use them.

## Key-based authentication
~~~console
$ ssh-keygen -t ed25519 -C "student@lpic-lab"      # creates ~/.ssh/id_ed25519 + .pub
$ ssh-keygen -t rsa -b 4096                        # RSA, 4096 bits → id_rsa / id_rsa.pub
$ ls -l ~/.ssh
$ cat ~/.ssh/id_ed25519.pub
$ ssh-copy-id alice@fileserver                     # appends the pub key to the server's ~/.ssh/authorized_keys
$ ssh-keygen -p -f ~/.ssh/id_ed25519               # change the passphrase
$ ssh-keygen -lf ~/.ssh/id_ed25519.pub             # show fingerprint
~~~
| Key type | Private / public file (client) |
|---|---|
| RSA | {{~/.ssh/id_rsa}} / {{id_rsa.pub}} |
| DSA (obsolete, disabled in OpenSSH ≥ 7) | {{~/.ssh/id_dsa}} / {{id_dsa.pub}} |
| ECDSA | {{~/.ssh/id_ecdsa}} / {{id_ecdsa.pub}} |
| Ed25519 (recommended) | {{~/.ssh/id_ed25519}} / {{id_ed25519.pub}} |

On the **server**, the public keys allowed to log in to an account are listed in that account's **{{~/.ssh/authorized_keys}}** (one key per line, optional options like {{from="10.0.0.0/8"}} or {{command="..."}}). Manual alternative to ssh-copy-id: {{cat id_ed25519.pub | ssh alice@host 'cat >> ~/.ssh/authorized_keys'}}.

### ssh-agent and ssh-add
To avoid typing the key passphrase for every connection, the agent keeps decrypted keys in memory:
~~~console
$ eval $(ssh-agent)            # start agent, sets SSH_AUTH_SOCK and SSH_AGENT_PID
$ ssh-add                      # add the default keys (asks for the passphrase once)
$ ssh-add ~/.ssh/id_rsa
$ ssh-add -l                   # list loaded keys
$ ssh-add -D                   # remove all keys
$ ssh -A fileserver            # forward the agent to the remote host
~~~
Desktop sessions usually start an agent automatically.

## Host keys and known_hosts
Each SSH **server** has its own key pairs, generated at installation: **{{/etc/ssh/ssh_host_rsa_key}}**, {{ssh_host_ecdsa_key}}, {{ssh_host_ed25519_key}} (and the old {{ssh_host_dsa_key}}), each with a {{.pub}} file. They prove the server's identity to clients and protect against man-in-the-middle attacks.

On the first connection the client shows the fingerprint and asks for confirmation; accepted keys are stored in **{{~/.ssh/known_hosts}}** (per user) or **{{/etc/ssh/ssh_known_hosts}}** (system-wide, maintained by the admin). If the key changes later, ssh shows the big **"REMOTE HOST IDENTIFICATION HAS CHANGED"** warning and refuses to connect.
~~~console
$ ls -l /etc/ssh/
$ ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
$ cat ~/.ssh/known_hosts
$ ssh-keygen -R fileserver        # remove an outdated entry
$ ssh-keyscan fileserver          # fetch a server's public host keys
# ssh-keygen -A                   # (re)generate missing host keys
~~~
Server configuration: **{{/etc/ssh/sshd_config}}** (e.g. {{PermitRootLogin no}}, {{PasswordAuthentication no}}, {{Port 22}}, {{AllowUsers}}, {{X11Forwarding yes}}); reload with {{systemctl reload ssh}} (Debian) / {{sshd}} (Red Hat).

## SSH tunnels
### Local port forwarding (-L)
{{ssh -L localport:target:targetport gateway}} — connections to *localport* on your machine are carried through the SSH connection to *gateway*, which connects to *target:targetport*.
~~~console
$ ssh -L 8080:localhost:80 fileserver           # http://localhost:8080 → port 80 on fileserver
$ ssh -L 3307:db01:3306 -N fileserver           # reach db01's MySQL via fileserver; -N = no shell
~~~
### Remote port forwarding (-R)
{{ssh -R remoteport:target:targetport server}} — a port on the *remote* server is forwarded back to *target* reachable from your side (e.g. expose a local service).
~~~console
$ ssh -R 9000:localhost:22 fileserver           # on fileserver: ssh -p 9000 localhost reaches you
~~~
Dynamic forwarding {{ssh -D 1080 host}} creates a SOCKS proxy. {{-f}} sends ssh to the background.

### X11 forwarding
Runs graphical programs on the remote host but displays them locally; ssh sets {{DISPLAY}} (e.g. {{localhost:10.0}}) and handles the xauth cookie.
~~~console
$ ssh -X fileserver xclock     # untrusted X11 forwarding
$ ssh -Y fileserver            # trusted X11 forwarding
~~~
Requires {{X11Forwarding yes}} in the server's sshd_config.

## GnuPG (gpg)
GNU Privacy Guard implements **OpenPGP** for encrypting and signing files and e-mail. Keys and configuration live in **{{~/.gnupg/}}** ({{pubring.kbx}}, {{trustdb.gpg}}, {{private-keys-v1.d/}}, {{gpg.conf}}, {{openpgp-revocs.d/}}). The **gpg-agent** caches passphrases and manages private keys (started automatically).

### Key management
~~~console
$ gpg --gen-key                          # (--full-generate-key for all options)
$ gpg --quick-gen-key "Student <student@example.org>"
$ gpg --list-keys                        # -k: public keys
$ gpg --list-secret-keys                 # -K: private keys
$ gpg --fingerprint student
$ gpg --export -a student > student.pub.asc     # ASCII armored public key
$ gpg --import alice.pub.asc
$ gpg --edit-key alice                   # trust, sign, adduid, expire ...
$ gpg --keyserver keys.openpgp.org --send-keys KEYID
$ gpg --keyserver keys.openpgp.org --recv-keys KEYID
$ gpg --export-secret-keys -a student > backup.asc   # keep it safe!
~~~
Before trusting an imported key, verify its **fingerprint** with the owner over another channel, then sign it ({{gpg --sign-key alice}}).

### Encrypt and decrypt
~~~console
$ gpg -e -r student notes.txt            # → notes.txt.gpg (asymmetric, for recipient student)
$ gpg -e -a -r alice -r student report.txt   # -a: ASCII output report.txt.asc
$ gpg -d notes.txt.gpg                   # decrypt to stdout
$ gpg -o notes.dec -d notes.txt.gpg
$ gpg -c notes.txt                       # symmetric, passphrase only
~~~
To encrypt for someone you need **their public key**; they decrypt with **their private key**. Add yourself as recipient if you want to read it later.

### Sign and verify
~~~console
$ gpg --sign notes.txt                   # → notes.txt.gpg (compressed, signed)
$ gpg --clearsign notes.txt              # → notes.txt.asc (readable text + signature)
$ gpg --detach-sign notes.txt            # → notes.txt.sig (separate signature, -b)
$ gpg --verify notes.txt.asc
$ gpg --verify notes.txt.sig notes.txt
$ gpg -s -e -r alice contract.pdf        # sign and encrypt
~~~
Typical use: verifying downloads ({{SHA256SUMS}} + {{SHA256SUMS.gpg}}) and signing packages.

### Revocation
If a private key is lost or compromised, publish a **revocation certificate**. gpg creates one automatically in {{~/.gnupg/openpgp-revocs.d/}}; you can also create it manually — ideally right after key generation, stored offline:
~~~console
$ gpg --output revoke.asc --gen-revoke student
$ gpg --import revoke.asc                # applying it revokes the key locally
$ gpg --keyserver keys.openpgp.org --send-keys KEYID   # tell the world
~~~
`,
  quiz: [
    { q: 'Which file on the SSH server lists the public keys that may log in to an account?', fill: ['~/.ssh/authorized_keys', '.ssh/authorized_keys', 'authorized_keys'], e: 'In the home directory of the target account.' },
    { q: 'Which command copies your public key to the remote host {{web01}} for the user {{alice}}?', fill: ['ssh-copy-id alice@web01'], e: '' },
    { q: 'Which command creates a new Ed25519 SSH key pair?', fill: ['ssh-keygen -t ed25519'], e: 'Files ~/.ssh/id_ed25519 and ~/.ssh/id_ed25519.pub.' },
    { q: 'Which file stores the host keys of servers a user has connected to before?', fill: ['~/.ssh/known_hosts', '.ssh/known_hosts', 'known_hosts'], e: 'System-wide: /etc/ssh/ssh_known_hosts.' },
    { q: 'What is the purpose of the files {{/etc/ssh/ssh_host_*_key}}?', o: ['They authenticate users to the server.', 'They identify the SSH server to clients.', 'They encrypt the user\'s home directory.', 'They store known client keys.'], a: 1, e: 'Clients compare them with known_hosts.' },
    { q: 'Which command adds a private key to the running ssh-agent?', fill: ['ssh-add', 'ssh-add ~/.ssh/id_rsa', 'ssh-add ~/.ssh/id_ed25519'], e: '{{ssh-add -l}} lists loaded keys.' },
    { q: 'Which command forwards local port 8080 through {{gw}} to port 80 of {{intranet}}?', fill: ['ssh -L 8080:intranet:80 gw', 'ssh -L8080:intranet:80 gw', 'ssh gw -L 8080:intranet:80', 'ssh -N -L 8080:intranet:80 gw', 'ssh -L 8080:intranet:80 -N gw'], e: 'Remote forwarding uses -R.' },
    { q: 'You want to run {{xclock}} on {{fileserver}} and see its window on your local display through the SSH connection. Which ssh option do you use?', o: ['{{-X}}', '{{-x}}', '{{-D}}', '{{-L}}'], a: 0, e: '{{-x}} disables X11 forwarding, {{-Y}} is trusted forwarding.' },
    { q: 'Which permissions should a private SSH key file have?', fill: ['600', '0600', '400', '0400'], e: 'ssh ignores keys that are readable by others.' },
    { q: 'Which command starts an ssh-agent and sets the required environment variables in the current shell?', fill: ['eval $(ssh-agent)', 'eval `ssh-agent`', 'eval "$(ssh-agent)"', 'eval $(ssh-agent -s)', 'eval "$(ssh-agent -s)"'], e: 'SSH_AUTH_SOCK and SSH_AGENT_PID.' },
    { q: 'Which gpg command encrypts {{file.txt}} for the recipient {{alice}}?', fill: ['gpg -e -r alice file.txt', 'gpg --encrypt --recipient alice file.txt', 'gpg -r alice -e file.txt', 'gpg -er alice file.txt', 'gpg --encrypt -r alice file.txt'], e: 'You need alice\'s public key in your keyring.' },
    { q: 'Which gpg command creates a signature in a separate file?', fill: ['gpg --detach-sign', 'gpg -b', 'gpg --detach-sig', 'gpg --detach-sign file', 'gpg -b file'], e: 'Verify with {{gpg --verify file.sig file}}.' },
    { q: 'Which command exports your public key in ASCII format?', fill: ['gpg --export -a', 'gpg --armor --export', 'gpg -a --export', 'gpg --export --armor'], e: 'Append the user ID or key ID to select a key.' },
    { q: 'Which gpg command creates a revocation certificate?', fill: ['gpg --gen-revoke', 'gpg --generate-revocation'], e: 'gpg 2.1+ also stores one in ~/.gnupg/openpgp-revocs.d/.' },
    { q: 'Which directory contains the GnuPG keyrings and configuration of a user?', fill: ['~/.gnupg', '~/.gnupg/', '.gnupg'], e: '' },
    { q: 'Alice wants to send Bob a file that only Bob can read. Which key does she use for encryption?', o: ['Alice\'s private key', 'Alice\'s public key', 'Bob\'s public key', 'Bob\'s private key'], a: 2, e: 'Bob decrypts with his private key.' },
    { q: 'Which program caches GnuPG passphrases?', fill: ['gpg-agent'], e: '' },
    { q: 'Which file contains the per-user SSH client configuration (host aliases, users, ports)?', fill: ['~/.ssh/config', '.ssh/config'], e: 'System-wide: /etc/ssh/ssh_config.' },
  ],
});
