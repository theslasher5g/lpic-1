/* LPIC-1 Trainer — initial contents of the simulated Debian-like system "lpic-lab". */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});

  const PASSWD = `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin
messagebus:x:100:107::/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
postfix:x:106:113::/var/spool/postfix:/usr/sbin/nologin
student:x:1000:1000:LPIC Student,,,:/home/student:/bin/bash
alice:x:1001:1001:Alice Admin:/home/alice:/bin/bash
bob:x:1002:1002:Bob Builder:/home/bob:/bin/zsh
`;
  const SHADOW = `root:$6$Xk2a9Lq1$9yGJp0pZbqv8i0s1oQ5FJm8vQb3s2f0kZ1yQx7mVd3z8uJk2rW1sPq0eT4cN6hB5aL9dY2fE7gH3jK1lM0nO.:19650:0:99999:7:::
daemon:*:19650:0:99999:7:::
bin:*:19650:0:99999:7:::
sys:*:19650:0:99999:7:::
sync:*:19650:0:99999:7:::
man:*:19650:0:99999:7:::
lp:*:19650:0:99999:7:::
mail:*:19650:0:99999:7:::
www-data:*:19650:0:99999:7:::
nobody:*:19650:0:99999:7:::
systemd-timesync:!*:19650::::::
messagebus:!:19650::::::
sshd:!:19650::::::
postfix:!:19650::::::
student:$6$tR4nE8sQ$Hj3kL9mN2bV5cX8zA1sD4fG7hJ0kL3qW6eR9tY2uI5oP8aS1dF4gH7jK0lZ3xC6vB9nM2qW5eR8tY1uI4oP7a.:19650:0:99999:7:::
alice:$6$aB3dE6gH$Kj8hG5fD2sA9pO6iU3yT0rE7wQ4zX1cV8bN5mL2kJ9hG6fD3sA0pO7iU4yT1rE8wQ5zX2cV9bN6mL3kJ0hG7f.:19650:0:90:7:14::
bob:!$6$qW9eR2tY$Lk5jH8gF1dS4aP7oI0uY3tR6eW9qZ2xC5vB8nM1lK4jH7gF0dS3aP6oI9uY2tR5eW8qZ1xC4vB7nM0lK3jH6g.:19650:0:99999:7:::
`;
  const GROUP = `root:x:0:
daemon:x:1:
bin:x:2:
sys:x:3:
adm:x:4:student
tty:x:5:
disk:x:6:
lp:x:7:
mail:x:8:
man:x:12:
proxy:x:13:
kmem:x:15:
dialout:x:20:student
cdrom:x:24:student
sudo:x:27:student,alice
audio:x:29:student
www-data:x:33:
shadow:x:42:
utmp:x:43:
video:x:44:student
plugdev:x:46:student
staff:x:50:
users:x:100:student,alice,bob
messagebus:x:107:
postfix:x:113:
nogroup:x:65534:
systemd-timesync:x:997:
student:x:1000:
alice:x:1001:
bob:x:1002:
developers:x:1010:alice,bob
`;
  const GSHADOW = GROUP.split('\n')
    .filter(Boolean)
    .map((l) => {
      const p = l.split(':');
      return `${p[0]}:*::${p[3]}`;
    })
    .join('\n') + '\n';

  const FSTAB = `# /etc/fstab: static file system information.
#
# <file system>                            <mount point>  <type>  <options>          <dump> <pass>
UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93  /              ext4    errors=remount-ro  0      1
UUID=6A1F-2C3D                             /boot/efi      vfat    umask=0077         0      1
UUID=9d2c4e7a-1b3f-4a6c-8e5d-2f7a9b0c1d34  none           swap    sw                 0      0
tmpfs                                      /tmp           tmpfs   defaults,size=1G   0      0
/dev/sr0                                   /media/cdrom0  udf,iso9660 user,noauto    0      0
`;

  const PROFILE = `# /etc/profile: system-wide .profile file for the Bourne shell (sh(1))
# and Bourne compatible shells (bash(1), ksh(1), ash(1), ...).

if [ "$(id -u)" -eq 0 ]; then
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
else
  PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
fi
export PATH

if [ -d /etc/profile.d ]; then
  for i in /etc/profile.d/*.sh; do
    if [ -r $i ]; then
      . $i
    fi
  done
  unset i
fi
`;
  const BASHRC_SYS = `# System-wide .bashrc file for interactive bash(1) shells.
# To enable the settings / commands in this file for login shells as well,
# this file has to be sourced in /etc/profile.

# If not running interactively, don't do anything
[ -z "$PS1" ] && return

# set a fancy prompt (non-color, overwrite the one in /etc/profile)
PS1='\\u@\\h:\\w\\$ '
`;
  const USER_BASHRC = `# ~/.bashrc: executed by bash(1) for non-login shells.

# don't put duplicate lines or lines starting with space in the history.
HISTCONTROL=ignoreboth
HISTSIZE=1000
HISTFILESIZE=2000

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'

export EDITOR=vim
`;
  const USER_PROFILE = `# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login exists.

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi
`;
  const BASH_LOGOUT = `# ~/.bash_logout: executed by bash(1) when login shell exits.
# when leaving the console clear the screen to increase privacy
`;

  const HOSTS = `127.0.0.1       localhost
127.0.1.1       lpic-lab.example.com lpic-lab
192.168.56.10   fileserver.example.com fileserver
192.168.56.20   db01.example.com db01

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
`;

  const SERVICES = `# Network services, Internet style (excerpt)
ftp-data        20/tcp
ftp             21/tcp
ssh             22/tcp                          # SSH Remote Login Protocol
telnet          23/tcp
smtp            25/tcp          mail
domain          53/tcp                          # Domain Name Server
domain          53/udp
bootps          67/udp                          # DHCP server
bootpc          68/udp                          # DHCP client
tftp            69/udp
http            80/tcp          www             # WorldWideWeb HTTP
pop3            110/tcp         pop-3
sunrpc          111/tcp         portmapper
nntp            119/tcp         readnews untp
ntp             123/udp                         # Network Time Protocol
netbios-ns      137/udp
netbios-dgm     138/udp
netbios-ssn     139/tcp
imap2           143/tcp         imap
snmp            161/udp
snmp-trap       162/udp         snmptrap
ldap            389/tcp
https           443/tcp                         # http protocol over TLS/SSL
microsoft-ds    445/tcp
submissions     465/tcp         ssmtp smtps urd # Submission over TLS
syslog          514/udp
printer         515/tcp         spooler         # line printer spooler
submission      587/tcp                         # Submission [RFC4409]
ipp             631/tcp                         # Internet Printing Protocol
ldaps           636/tcp
imaps           993/tcp                         # IMAP over SSL
pop3s           995/tcp                         # POP-3 over SSL
mysql           3306/tcp
x11             6000/tcp        x11-0           # X Window System
`;

  const OS_RELEASE = `PRETTY_NAME="Debian GNU/Linux 12 (bookworm) — LPIC-1 Trainer"
NAME="Debian GNU/Linux"
VERSION_ID="12"
VERSION="12 (bookworm)"
VERSION_CODENAME=bookworm
ID=debian
HOME_URL="https://www.debian.org/"
`;

  const CPUINFO = (() => {
    let s = '';
    for (let i = 0; i < 2; i++)
      s += `processor\t: ${i}
vendor_id\t: GenuineIntel
cpu family\t: 6
model\t\t: 158
model name\t: Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz
stepping\t: 10
cpu MHz\t\t: 3192.000
cache size\t: 12288 KB
physical id\t: 0
siblings\t: 2
core id\t\t: ${i}
cpu cores\t: 2
flags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx rdtscp lm constant_tsc rep_good nopl xtopology nonstop_tsc cpuid pni pclmulqdq ssse3 cx16 pcid sse4_1 sse4_2 x2apic movbe popcnt aes xsave avx rdrand hypervisor lahf_lm abm 3dnowprefetch fsgsbase avx2 invpcid
bogomips\t: 6384.00

`;
    return s;
  })();

  const MEMINFO = `MemTotal:        4028252 kB
MemFree:         2214508 kB
MemAvailable:    3201644 kB
Buffers:           61340 kB
Cached:          1018760 kB
SwapCached:            0 kB
Active:           903420 kB
Inactive:         640212 kB
SwapTotal:       4194300 kB
SwapFree:        4194300 kB
Dirty:               104 kB
Shmem:             12688 kB
`;

  const INTERRUPTS = `           CPU0       CPU1
  0:         36          0   IO-APIC   2-edge      timer
  1:          9          0   IO-APIC   1-edge      i8042
  8:          0          0   IO-APIC   8-edge      rtc0
  9:          0          0   IO-APIC   9-fasteoi   acpi
 12:        156          0   IO-APIC  12-edge      i8042
 14:          0          0   IO-APIC  14-edge      ata_piix
 15:       2213          0   IO-APIC  15-edge      ata_piix
 19:      12042        451   IO-APIC  19-fasteoi   enp0s3
 20:        816          0   IO-APIC  20-fasteoi   vboxguest
 21:       9811       2210   IO-APIC  21-fasteoi   ahci[0000:00:0d.0], snd_intel8x0
NMI:          0          0   Non-maskable interrupts
LOC:     104311     100732   Local timer interrupts
`;
  const IOPORTS = `0000-0cf7 : PCI Bus 0000:00
  0000-001f : dma1
  0020-0021 : pic1
  0040-0043 : timer0
  0050-0053 : timer1
  0060-0060 : keyboard
  0064-0064 : keyboard
  0070-0071 : rtc_cmos
  0080-008f : dma page reg
  00a0-00a1 : pic2
  00c0-00df : dma2
  00f0-00ff : fpu
  0170-0177 : 0000:00:01.1
    0170-0177 : ata_piix
  01f0-01f7 : 0000:00:01.1
    01f0-01f7 : ata_piix
  03c0-03df : vga+
  03f8-03ff : serial
d000-d00f : 0000:00:01.1
d020-d03f : 0000:00:03.0
  d020-d03f : e1000
`;
  const DMA = ` 4: cascade
`;
  const VERSION = 'Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org) (gcc-12 (Debian 12.2.0-14) 12.2.0, GNU ld (GNU Binutils for Debian) 2.40) #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 (2024-02-01)\n';
  const CMDLINE = 'BOOT_IMAGE=/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 ro quiet\n';
  const PARTITIONS = `major minor  #blocks  name

   8        0   41943040 sda
   8        1     524288 sda1
   8        2   37223424 sda2
   8        3    4194304 sda3
   8       16   20971520 sdb
  11        0    1048575 sr0
`;

  const GRUB_DEFAULT = `# If you change this file, run 'update-grub' afterwards to update
# /boot/grub/grub.cfg.
# For full documentation of the options in this file, see:
#   info -f grub -n 'Simple configuration'

GRUB_DEFAULT=0
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR=\`lsb_release -i -s 2> /dev/null || echo Debian\`
GRUB_CMDLINE_LINUX_DEFAULT="quiet"
GRUB_CMDLINE_LINUX=""

# Uncomment to disable graphical terminal
#GRUB_TERMINAL=console
#GRUB_DISABLE_RECOVERY="true"
`;
  const GRUB_CFG = `#
# DO NOT EDIT THIS FILE
#
# It is automatically generated by grub-mkconfig using templates
# from /etc/grub.d and settings from /etc/default/grub
#
set default="0"
set timeout=5

menuentry 'Debian GNU/Linux' --class debian --class gnu-linux --class os {
	insmod gzio
	insmod part_gpt
	insmod ext2
	search --no-floppy --fs-uuid --set=root 3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93
	echo	'Loading Linux 6.1.0-18-amd64 ...'
	linux	/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 ro  quiet
	echo	'Loading initial ramdisk ...'
	initrd	/boot/initrd.img-6.1.0-18-amd64
}
menuentry 'Debian GNU/Linux, with Linux 6.1.0-18-amd64 (recovery mode)' {
	linux	/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 ro single
	initrd	/boot/initrd.img-6.1.0-18-amd64
}
`;
  const INITTAB = `# /etc/inittab — LEGACY SysV init example (kept for study; this system boots with systemd)
# Format:  id:runlevels:action:process
id:3:initdefault:
si::sysinit:/etc/init.d/rcS
l0:0:wait:/etc/init.d/rc 0
l1:1:wait:/etc/init.d/rc 1
l2:2:wait:/etc/init.d/rc 2
l3:3:wait:/etc/init.d/rc 3
l5:5:wait:/etc/init.d/rc 5
l6:6:wait:/etc/init.d/rc 6
ca:12345:ctrlaltdel:/sbin/shutdown -t1 -a -r now
1:2345:respawn:/sbin/getty 38400 tty1
`;
  const CRONTAB = `# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the \`crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name command to be executed
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
`;
  const ANACRONTAB = `# /etc/anacrontab: configuration file for anacron
SHELL=/bin/sh
PATH=/sbin:/bin:/usr/sbin:/usr/bin
HOME=/root
LOGNAME=root

# period(days)  delay(min)  job-identifier  command
1               5           cron.daily      run-parts --report /etc/cron.daily
7               10          cron.weekly     run-parts --report /etc/cron.weekly
@monthly        15          cron.monthly    run-parts --report /etc/cron.monthly
`;
  const SSHD_CONFIG = `# This is the sshd server system-wide configuration file.  See sshd_config(5)
Include /etc/ssh/sshd_config.d/*.conf

#Port 22
#AddressFamily any
#ListenAddress 0.0.0.0
PermitRootLogin prohibit-password
#PubkeyAuthentication yes
#AuthorizedKeysFile	.ssh/authorized_keys .ssh/authorized_keys2
PasswordAuthentication yes
KbdInteractiveAuthentication no
UsePAM yes
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem	sftp	/usr/lib/openssh/sftp-server
`;
  const SSH_CONFIG = `# /etc/ssh/ssh_config — system-wide ssh client configuration
Host *
#   ForwardAgent no
#   ForwardX11 no
#   PasswordAuthentication yes
#   IdentityFile ~/.ssh/id_rsa
#   IdentityFile ~/.ssh/id_ed25519
#   Port 22
    SendEnv LANG LC_*
    HashKnownHosts yes
`;
  const SUDOERS = `#
# This file MUST be edited with the 'visudo' command as root.
#
Defaults	env_reset
Defaults	mail_badpass
Defaults	secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# User privilege specification
root	ALL=(ALL:ALL) ALL

# Allow members of group sudo to execute any command
%sudo	ALL=(ALL:ALL) ALL

# See sudoers(5) for more information on "@include" directives:
@includedir /etc/sudoers.d
`;
  const LOGIN_DEFS = `# /etc/login.defs - Configuration control definitions for the login package.
MAIL_DIR        /var/mail
PASS_MAX_DAYS   99999
PASS_MIN_DAYS   0
PASS_WARN_AGE   7
UID_MIN                  1000
UID_MAX                 60000
SYS_UID_MIN               100
SYS_UID_MAX               999
GID_MIN                  1000
GID_MAX                 60000
CREATE_HOME     yes
UMASK           022
USERGROUPS_ENAB yes
ENCRYPT_METHOD  SHA512
`;
  const USERADD_DEFAULT = `# Default values for useradd(8)
GROUP=100
HOME=/home
INACTIVE=-1
EXPIRE=
SHELL=/bin/sh
SKEL=/etc/skel
CREATE_MAIL_SPOOL=no
`;
  const NSSWITCH = `# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.

passwd:         files systemd
group:          files systemd
shadow:         files
gshadow:        files

hosts:          files dns
networks:       files

protocols:      db files
services:       db files
ethers:         db files
rpc:            db files

netgroup:       nis
`;
  const RESOLV = `# Generated by NetworkManager
search example.com
nameserver 192.168.56.1
nameserver 1.1.1.1
options timeout:2 attempts:3
`;
  const HOSTS_ALLOW = `# /etc/hosts.allow: list of hosts that are allowed to access the system.
#                  See the manual pages hosts_access(5) and hosts_options(5).
# Example:    ALL: LOCAL @some_netgroup
#             ALL: .foobar.edu EXCEPT terminalserver.foobar.edu
sshd: 192.168.56.0/24
`;
  const HOSTS_DENY = `# /etc/hosts.deny: list of hosts that are _not_ allowed to access the system.
# Example:    ALL: some.host.name, .some.domain
#             ALL EXCEPT in.fingerd: other.host.name, .other.domain
#ALL: ALL
`;
  const XINETD = `# Simple configuration file for xinetd (legacy super-server, study example)
defaults
{
	instances       = 60
	log_type        = SYSLOG authpriv
	log_on_success  = HOST PID
	log_on_failure  = HOST
	cps             = 25 30
}
includedir /etc/xinetd.d
`;
  const XINETD_TELNET = `# default: off — disable unneeded services!
service telnet
{
	disable         = yes
	flags           = REUSE
	socket_type     = stream
	wait            = no
	user            = root
	server          = /usr/sbin/in.telnetd
	log_on_failure  += USERID
}
`;
  const RSYSLOG = `# /etc/rsyslog.conf configuration file for rsyslog
module(load="imuxsock") # provides support for local system logging
module(load="imklog")   # provides kernel logging support

#### RULES ####
# facility.priority                action
auth,authpriv.*                    /var/log/auth.log
*.*;auth,authpriv.none            -/var/log/syslog
kern.*                            -/var/log/kern.log
mail.*                            -/var/log/mail.log
mail.err                           /var/log/mail.err
*.emerg                            :omusrmsg:*
# forward everything to a central log host (UDP @, TCP @@)
#*.* @@loghost.example.com:514
`;
  const LOGROTATE = `# see "man logrotate" for details
# rotate log files weekly
weekly
# keep 4 weeks worth of backlogs
rotate 4
# create new (empty) log files after rotating old ones
create
# uncomment this if you want your log files compressed
#compress
include /etc/logrotate.d
`;
  const LOGROTATE_RSYSLOG = `/var/log/syslog
/var/log/auth.log
{
	rotate 4
	weekly
	missingok
	notifempty
	compress
	delaycompress
	sharedscripts
	postrotate
		/usr/lib/rsyslog/rsyslog-rotate
	endscript
}
`;
  const JOURNALD = `[Journal]
#Storage=auto
#Compress=yes
#SystemMaxUse=
#SystemKeepFree=
#MaxRetentionSec=
#ForwardToSyslog=yes
`;
  const ALIASES = `# /etc/aliases — mail aliases; run 'newaliases' after editing
postmaster:    root
abuse:         root
webmaster:     root
root:          student
`;
  const CHRONY = `# /etc/chrony/chrony.conf
pool 2.debian.pool.ntp.org iburst
driftfile /var/lib/chrony/chrony.drift
makestep 1 3
rtcsync
`;
  const NTP_CONF = `# /etc/ntp.conf — legacy ntpd configuration (study example)
driftfile /var/lib/ntp/ntp.drift
pool 0.debian.pool.ntp.org iburst
pool 1.debian.pool.ntp.org iburst
restrict -4 default kod notrap nomodify nopeer noquery limited
restrict 127.0.0.1
`;
  const CUPSD = `# /etc/cups/cupsd.conf (excerpt)
LogLevel warn
Listen localhost:631
Listen /run/cups/cups.sock
Browsing On
DefaultAuthType Basic
<Location />
  Order allow,deny
</Location>
<Location /admin>
  Order allow,deny
</Location>
`;
  const PRINTERS = `# Printer configuration file for CUPS
<DefaultPrinter office-laser>
Info HP LaserJet Office
Location 2nd floor
DeviceURI ipp://192.168.56.50/ipp/print
State Idle
Accepting Yes
</DefaultPrinter>
<Printer pdf>
Info Virtual PDF printer
DeviceURI cups-pdf:/
State Idle
Accepting Yes
</Printer>
`;
  const XORG = `# /etc/X11/xorg.conf — example (modern Xorg autodetects; snippets go in /etc/X11/xorg.conf.d/)
Section "ServerLayout"
    Identifier     "Layout0"
    Screen      0  "Screen0"
    InputDevice    "Keyboard0" "CoreKeyboard"
EndSection

Section "InputDevice"
    Identifier     "Keyboard0"
    Driver         "libinput"
    Option         "XkbLayout" "us,de"
EndSection

Section "Monitor"
    Identifier     "Monitor0"
    HorizSync       28.0 - 80.0
    VertRefresh     48.0 - 75.0
EndSection

Section "Device"
    Identifier     "Card0"
    Driver         "modesetting"
EndSection

Section "Screen"
    Identifier     "Screen0"
    Device         "Card0"
    Monitor        "Monitor0"
    DefaultDepth    24
    SubSection     "Display"
        Depth       24
        Modes      "1920x1080" "1280x1024"
    EndSubSection
EndSection
`;
  const XKB_CONF = `Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "de"
EndSection
`;
  const NETPLAN = `# /etc/netplan/01-netcfg.yaml (Ubuntu style, study example)
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no
      addresses: [192.168.56.101/24]
      routes:
        - to: default
          via: 192.168.56.1
      nameservers:
        addresses: [192.168.56.1, 1.1.1.1]
`;
  const INTERFACES = `# /etc/network/interfaces (Debian ifupdown)
source /etc/network/interfaces.d/*

auto lo
iface lo inet loopback

auto enp0s3
iface enp0s3 inet static
    address 192.168.56.101/24
    gateway 192.168.56.1
    dns-nameservers 192.168.56.1
`;
  const NM_CON = `[connection]
id=Wired connection 1
uuid=7c1e2a9f-0b4d-4e63-9a2f-5c8d7e6f1a2b
type=ethernet
interface-name=enp0s3

[ipv4]
method=manual
address1=192.168.56.101/24,192.168.56.1
dns=192.168.56.1;1.1.1.1;

[ipv6]
method=auto
`;
  const LD_SO_CONF = `include /etc/ld.so.conf.d/*.conf
`;
  const SOURCES_LIST = `deb http://deb.debian.org/debian bookworm main contrib non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free-firmware
`;
  const YUM_CONF = `[main]
gpgcheck=1
installonly_limit=3
clean_requirements_on_remove=True
best=True
skip_if_unavailable=False
`;
  const YUM_REPO = `[baseos]
name=Rocky Linux $releasever - BaseOS
mirrorlist=https://mirrors.rockylinux.org/mirrorlist?arch=$basearch&repo=BaseOS-$releasever
gpgcheck=1
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-Rocky-9

[epel]
name=Extra Packages for Enterprise Linux 9
metalink=https://mirrors.fedoraproject.org/metalink?repo=epel-9&arch=$basearch
enabled=0
gpgcheck=1
`;
  const ZYPP_REPO = `[repo-oss]
name=Main Repository
enabled=1
autorefresh=1
baseurl=http://download.opensuse.org/distribution/leap/15.5/repo/oss/
type=rpm-md
`;
  const LOCALE_GEN = `# This file lists locales that you wish to have built.
en_US.UTF-8 UTF-8
de_DE.UTF-8 UTF-8
# fr_FR.UTF-8 UTF-8
`;
  const DEFAULT_LOCALE = `LANG=en_US.UTF-8
`;
  const SYSTEMD_UNIT_SSH = `[Unit]
Description=OpenBSD Secure Shell server
Documentation=man:sshd(8) man:sshd_config(5)
After=network.target auditd.service

[Service]
EnvironmentFile=-/etc/default/ssh
ExecStartPre=/usr/sbin/sshd -t
ExecStart=/usr/sbin/sshd -D $SSHD_OPTS
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
Type=notify

[Install]
WantedBy=multi-user.target
Alias=sshd.service
`;
  const BACKUP_TIMER = `[Unit]
Description=Nightly backup timer

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
`;
  const BACKUP_SERVICE = `[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
`;
  const MODPROBE_BL = `# Do not load these modules automatically
blacklist pcspkr
blacklist floppy
# options for a module:
options snd-hda-intel power_save=1
`;
  const UDEV_RULE = `# /etc/udev/rules.d/70-usb-backup.rules
SUBSYSTEM=="block", ATTRS{idVendor}=="0781", ATTRS{idProduct}=="5567", SYMLINK+="backupdisk"
`;
  const SYSCTL = `# /etc/sysctl.conf - Configuration file for setting system variables
#net.ipv4.ip_forward=1
#net.ipv6.conf.all.forwarding=1
kernel.printk = 3 4 1 3
`;
  const LIMITS = `# /etc/security/limits.conf
#<domain>      <type>  <item>         <value>
*               soft    core            0
@students       hard    nproc           50
bob             hard    maxlogins       2
`;
  const MOTD = `
  Welcome to lpic-lab — the LPIC-1 training sandbox (simulated Debian 12).

  Everything here runs in your browser. Nothing can break — experiment freely!
  Try:  help | man ls | ls -la | cat /etc/passwd | sudo -i | vi notes.txt
  Note: rpm/yum/zypper are also simulated so you can practise both worlds.

`;
  const ISSUE = 'Debian GNU/Linux 12 \\n \\l\n\n';

  const NOTES = `LPIC-1 study notes
==================
Exam 101: System Architecture, Installation, GNU & Unix Commands, Filesystems
Exam 102: Shells & Scripting, Interfaces, Administration, Services, Networking, Security

Remember: every exam has 60 questions in 90 minutes.
The passing score is 500 points on a scale from 200 to 800.
TODO: practise vi, sed and find every day.
`;
  const FRUITS = `banana
apple
cherry
apple
date
banana
elderberry
fig
apple
grape
Cherry
`;
  const NUMBERS = `42
7
1000
13
7
256
3
99
`;
  const EMPLOYEES = `id,name,department,salary,city
101,Anna,IT,5200,Berlin
102,Ben,Sales,4100,Hamburg
103,Clara,IT,6100,Munich
104,David,HR,3900,Berlin
105,Eva,Sales,4500,Cologne
106,Felix,IT,4800,Hamburg
107,Gina,Support,3600,Berlin
108,Hans,HR,4200,Munich
`;
  const ACCESS_LOG = `192.168.56.1 - - [26/Oct/2026:09:12:01 +0000] "GET /index.html HTTP/1.1" 200 5123
10.0.0.7 - - [26/Oct/2026:09:12:09 +0000] "GET /login HTTP/1.1" 200 812
10.0.0.7 - - [26/Oct/2026:09:12:15 +0000] "POST /login HTTP/1.1" 401 97
203.0.113.9 - - [26/Oct/2026:09:13:44 +0000] "GET /admin HTTP/1.1" 403 199
192.168.56.1 - - [26/Oct/2026:09:14:02 +0000] "GET /images/logo.png HTTP/1.1" 200 20451
10.0.0.7 - - [26/Oct/2026:09:14:30 +0000] "POST /login HTTP/1.1" 200 1024
198.51.100.23 - - [26/Oct/2026:09:15:10 +0000] "GET /wp-login.php HTTP/1.1" 404 312
203.0.113.9 - - [26/Oct/2026:09:15:11 +0000] "GET /admin HTTP/1.1" 403 199
192.168.56.1 - - [26/Oct/2026:09:16:00 +0000] "GET /api/status HTTP/1.1" 500 87
10.0.0.12 - - [26/Oct/2026:09:16:45 +0000] "GET /index.html HTTP/1.1" 200 5123
`;
  const POEM = `The quick brown fox jumps over the lazy dog.
Linux is a kernel; GNU/Linux is an operating system.
vi has two main modes: command mode and insert mode.
Press ESC to return to command mode.
Type :wq to save and quit, or :q! to quit without saving.
The lazy dog sleeps all day long.
`;
  const SERVERS = `# name      ip              role
web01      192.168.56.11   web
web02      192.168.56.12   web
db01       192.168.56.20   database
fileserver 192.168.56.10   storage
mail01     192.168.56.25   mail
`;
  const CONFIG_INI = `[general]
name = demo-app
debug = false
port = 8080

[database]
host = db01.example.com
port = 3306
user = app
`;
  const HELLO_SH = `#!/bin/bash
# hello.sh — a first shell script
NAME=\${1:-World}
echo "Hello, $NAME!"
echo "You are logged in as $(whoami) on $(hostname)"
`;
  const BACKUP_SH = `#!/bin/bash
# backup.sh — archive a directory into /tmp with a date stamp
SRC=\${1:-$HOME/docs}
DEST=/tmp/backup-$(date +%F).tar.gz

if [ ! -d "$SRC" ]; then
    echo "Source $SRC does not exist" >&2
    exit 1
fi

tar -czf "$DEST" "$SRC" && echo "Backup written to $DEST"
`;
  const LOOP_SH = `#!/bin/bash
# loops.sh — for, while and test examples
for f in "$HOME"/*.txt; do
    echo "Text file: $(basename "$f") ($(wc -l < "$f") lines)"
done

count=1
while [ $count -le 3 ]; do
    echo "Iteration $count"
    count=$((count + 1))
done
`;
  const TODO = `- [ ] Read objective 103.7 (regular expressions)
- [x] Practise chmod with octal modes
- [ ] Schedule a cron job that runs every Monday at 06:00
- [ ] Configure a static IP address
`;
  const REPORT = `# Quarterly report
Revenue grew by 12 percent.
Costs were reduced in Q3.
Next steps: migrate servers to Debian 12.
`;
  const SYSLOG = (() => {
    const lines = [
      'systemd[1]: Started Daily apt download activities.',
      'kernel: [    0.000000] Linux version 6.1.0-18-amd64',
      'kernel: [    2.114213] e1000 0000:00:03.0 enp0s3: renamed from eth0',
      'systemd[1]: Reached target Multi-User System.',
      'CRON[812]: (root) CMD (cd / && run-parts --report /etc/cron.hourly)',
      'sshd[901]: Server listening on 0.0.0.0 port 22.',
      'chronyd[455]: Selected source 192.168.56.1',
      'systemd[1]: Starting Cleanup of Temporary Directories...',
      'kernel: [  311.552100] usb 1-1: new high-speed USB device number 2 using ehci-pci',
      'kernel: [  311.900021] sd 2:0:0:0: [sdc] 15633408 512-byte logical blocks: (8.00 GB/7.45 GiB)',
      'postfix/master[1102]: daemon started -- version 3.7.10',
      'cupsd[640]: REQUEST localhost - - "POST /printers/office-laser HTTP/1.1" 200',
    ];
    return lines.map((l, i) => `Oct 26 08:${String(10 + i).padStart(2, '0')}:0${i % 10} lpic-lab ${l}`).join('\n') + '\n';
  })();
  const AUTHLOG = `Oct 26 08:15:02 lpic-lab sshd[1204]: Accepted publickey for student from 192.168.56.1 port 50122 ssh2
Oct 26 08:15:02 lpic-lab sshd[1204]: pam_unix(sshd:session): session opened for user student(uid=1000)
Oct 26 08:21:44 lpic-lab sshd[1290]: Failed password for invalid user admin from 203.0.113.9 port 40422 ssh2
Oct 26 08:21:47 lpic-lab sshd[1290]: Failed password for invalid user admin from 203.0.113.9 port 40422 ssh2
Oct 26 08:22:10 lpic-lab sudo:  student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/apt update
Oct 26 08:30:00 lpic-lab su[1402]: (to root) student on pts/0
Oct 26 08:31:12 lpic-lab sshd[1455]: Failed password for root from 198.51.100.23 port 51811 ssh2
`;
  const KERNLOG = `Oct 26 08:10:01 lpic-lab kernel: [    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41 ro quiet
Oct 26 08:10:01 lpic-lab kernel: [    1.201133] ata1.00: ATA-8: VBOX HARDDISK, 1.0, max UDMA/133
Oct 26 08:10:01 lpic-lab kernel: [    1.512309] EXT4-fs (sda2): mounted filesystem with ordered data mode.
`;

  /* -------- builder -------- */
  SIM.buildWorld = function (fs) {
    const um = fs.umask;
    fs.umask = 0;
    fs.cred = { uid: 0, gid: 0, groups: [0] };
    const D = (p, mode = 0o755, uid = 0, gid = 0) => {
      const n = fs.mkdirp(p, '/');
      n.mode = mode;
      n.uid = uid;
      n.gid = gid;
      return n;
    };
    const F = (p, data, mode = 0o644, uid = 0, gid = 0) => {
      const dir = p.slice(0, p.lastIndexOf('/'));
      if (dir && !fs.tryLookup(dir, '/')) fs.mkdirp(dir, '/');
      const n = fs.writeFile(p, '/', data);
      n.mode = mode;
      n.uid = uid;
      n.gid = gid;
      return n;
    };
    const L = (p, target) => {
      const dir = p.slice(0, p.lastIndexOf('/'));
      if (dir && !fs.tryLookup(dir, '/')) fs.mkdirp(dir, '/');
      return fs.symlink(target, p, '/');
    };
    const DEV = (p, t, maj, min, mode = 0o660, gid = 6, name) => {
      const n = fs.create(p, '/', { t, mode, rdev: [maj, min], devname: name || p.split('/').pop() });
      n.gid = gid;
      return n;
    };

    ['bin', 'sbin', 'lib', 'lib64'].forEach((d) => L('/' + d, 'usr/' + d));
    D('/usr/bin');
    D('/usr/sbin');
    D('/usr/lib/x86_64-linux-gnu');
    D('/usr/lib64');
    D('/usr/local/bin');
    D('/usr/local/sbin');
    D('/usr/local/lib');
    D('/usr/share/man/man1');
    D('/usr/share/man/man5');
    D('/usr/share/man/man8');
    D('/usr/share/doc/bash');
    F('/usr/share/doc/bash/README', 'Bash is the GNU Project\'s shell — the Bourne Again SHell.\n');
    D('/usr/share/X11/xkb');
    D('/usr/share/zoneinfo/Europe');
    D('/usr/share/zoneinfo/America');
    D('/usr/share/zoneinfo/Asia');
    ['Berlin', 'London', 'Paris', 'Vienna', 'Zurich'].forEach((c) => F('/usr/share/zoneinfo/Europe/' + c, 'TZif2\n'));
    ['New_York', 'Los_Angeles', 'Chicago'].forEach((c) => F('/usr/share/zoneinfo/America/' + c, 'TZif2\n'));
    ['Tokyo', 'Kolkata'].forEach((c) => F('/usr/share/zoneinfo/Asia/' + c, 'TZif2\n'));
    F('/usr/share/zoneinfo/UTC', 'TZif2\n');

    // libraries
    const libs = ['libc.so.6', 'libm.so.6', 'libselinux.so.1', 'libpcre2-8.so.0', 'libtinfo.so.6', 'libz.so.1', 'libcrypto.so.3', 'libssl.so.3', 'libacl.so.1'];
    libs.forEach((l) => F('/usr/lib/x86_64-linux-gnu/' + l.replace(/\.so\.(\d+)$/, '.so.$1'), '\x7fELF shared object\n', 0o644));
    F('/usr/lib64/ld-linux-x86-64.so.2', '\x7fELF dynamic linker\n', 0o755);
    D('/usr/lib/systemd/system');
    F('/usr/lib/systemd/system/ssh.service', SYSTEMD_UNIT_SSH);
    ['multi-user.target', 'graphical.target', 'rescue.target', 'emergency.target', 'poweroff.target', 'reboot.target'].forEach((t) =>
      F('/usr/lib/systemd/system/' + t, `[Unit]\nDescription=${t}\n`)
    );
    for (let i = 0; i <= 6; i++) {
      const map = ['poweroff', 'rescue', 'multi-user', 'multi-user', 'multi-user', 'graphical', 'reboot'];
      L('/usr/lib/systemd/system/runlevel' + i + '.target', map[i] + '.target');
    }
    D('/usr/lib/modules/6.1.0-18-amd64/kernel/drivers/net');
    F('/usr/lib/modules/6.1.0-18-amd64/modules.dep', 'kernel/drivers/net/ethernet/intel/e1000/e1000.ko:\nkernel/fs/fat/vfat.ko: kernel/fs/fat/fat.ko\n');

    // /boot
    D('/boot/grub');
    D('/boot/efi/EFI/debian');
    F('/boot/vmlinuz-6.1.0-18-amd64', 'Linux kernel x86 boot executable bzImage\n');
    F('/boot/initrd.img-6.1.0-18-amd64', 'ASCII cpio archive (SVR4 with no CRC)\n');
    F('/boot/config-6.1.0-18-amd64', 'CONFIG_64BIT=y\nCONFIG_EXT4_FS=y\nCONFIG_XFS_FS=m\n');
    F('/boot/System.map-6.1.0-18-amd64', 'ffffffff81000000 T _text\n');
    F('/boot/grub/grub.cfg', GRUB_CFG, 0o444);
    F('/boot/efi/EFI/debian/grubx64.efi', 'PE32+ executable (EFI application)\n');
    F('/boot/efi/EFI/debian/shimx64.efi', 'PE32+ executable (EFI application)\n');

    // /etc
    D('/etc');
    F('/etc/passwd', PASSWD);
    F('/etc/shadow', SHADOW, 0o640, 0, 42);
    F('/etc/group', GROUP);
    F('/etc/gshadow', GSHADOW, 0o640, 0, 42);
    F('/etc/hostname', 'lpic-lab\n');
    F('/etc/hosts', HOSTS);
    F('/etc/fstab', FSTAB);
    F('/etc/mtab', '');
    F('/etc/profile', PROFILE);
    F('/etc/bash.bashrc', BASHRC_SYS);
    D('/etc/profile.d');
    F('/etc/profile.d/lpic.sh', '# custom environment for all users\nexport LPIC_LAB=1\n');
    F('/etc/environment', 'PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"\n');
    F('/etc/shells', '# /etc/shells: valid login shells\n/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/dash\n/usr/bin/zsh\n');
    F('/etc/services', SERVICES);
    F('/etc/os-release', OS_RELEASE);
    F('/etc/debian_version', '12.5\n');
    F('/etc/issue', ISSUE);
    F('/etc/issue.net', 'Debian GNU/Linux 12\n');
    F('/etc/motd', MOTD);
    F('/etc/default/grub', GRUB_DEFAULT);
    D('/etc/grub.d');
    F('/etc/grub.d/40_custom', '#!/bin/sh\nexec tail -n +3 $0\n# custom menu entries go here\n', 0o755);
    F('/etc/inittab', INITTAB);
    F('/etc/crontab', CRONTAB);
    F('/etc/anacrontab', ANACRONTAB);
    ['cron.d', 'cron.hourly', 'cron.daily', 'cron.weekly', 'cron.monthly'].forEach((d) => D('/etc/' + d));
    F('/etc/cron.daily/logrotate', '#!/bin/sh\n/usr/sbin/logrotate /etc/logrotate.conf\n', 0o755);
    F('/etc/cron.daily/apt-compat', '#!/bin/sh\n# daily apt jobs\n', 0o755);
    F('/etc/cron.d/e2scrub_all', '30 3 * * 0 root test -e /run/systemd/system || /sbin/e2scrub_all\n');
    F('/etc/cron.allow', 'student\nalice\n');
    F('/etc/at.deny', 'nobody\nwww-data\n');
    D('/etc/ssh');
    D('/etc/ssh/sshd_config.d');
    F('/etc/ssh/sshd_config', SSHD_CONFIG);
    F('/etc/ssh/ssh_config', SSH_CONFIG);
    F('/etc/ssh/ssh_host_rsa_key', '-----BEGIN OPENSSH PRIVATE KEY-----\n(simulated host key)\n-----END OPENSSH PRIVATE KEY-----\n', 0o600);
    F('/etc/ssh/ssh_host_rsa_key.pub', 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7simulatedhostkey root@lpic-lab\n');
    F('/etc/ssh/ssh_host_ed25519_key', '-----BEGIN OPENSSH PRIVATE KEY-----\n(simulated host key)\n-----END OPENSSH PRIVATE KEY-----\n', 0o600);
    F('/etc/ssh/ssh_host_ed25519_key.pub', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIsimulated root@lpic-lab\n');
    F('/etc/ssh/ssh_known_hosts', '');
    F('/etc/sudoers', SUDOERS, 0o440);
    D('/etc/sudoers.d', 0o750);
    F('/etc/login.defs', LOGIN_DEFS);
    D('/etc/default');
    F('/etc/default/useradd', USERADD_DEFAULT);
    F('/etc/default/locale', DEFAULT_LOCALE);
    F('/etc/default/keyboard', 'XKBMODEL="pc105"\nXKBLAYOUT="us"\nXKBVARIANT=""\nXKBOPTIONS=""\n');
    F('/etc/locale.gen', LOCALE_GEN);
    F('/etc/locale.conf', 'LANG=en_US.UTF-8\n');
    F('/etc/timezone', 'Europe/Berlin\n');
    L('/etc/localtime', '/usr/share/zoneinfo/Europe/Berlin');
    F('/etc/adjtime', '0.000000 1730000000 0.000000\n1730000000\nUTC\n');
    F('/etc/nsswitch.conf', NSSWITCH);
    F('/etc/resolv.conf', RESOLV);
    F('/etc/hosts.allow', HOSTS_ALLOW);
    F('/etc/hosts.deny', HOSTS_DENY);
    F('/etc/xinetd.conf', XINETD);
    D('/etc/xinetd.d');
    F('/etc/xinetd.d/telnet', XINETD_TELNET);
    F('/etc/inetd.conf', '# legacy inetd configuration\n#telnet stream tcp nowait root /usr/sbin/tcpd /usr/sbin/in.telnetd\n');
    F('/etc/rsyslog.conf', RSYSLOG);
    D('/etc/rsyslog.d');
    F('/etc/logrotate.conf', LOGROTATE);
    D('/etc/logrotate.d');
    F('/etc/logrotate.d/rsyslog', LOGROTATE_RSYSLOG);
    D('/etc/systemd/system/multi-user.target.wants');
    D('/etc/systemd/system/timers.target.wants');
    F('/etc/systemd/journald.conf', JOURNALD);
    F('/etc/systemd/timesyncd.conf', '[Time]\n#NTP=\n#FallbackNTP=0.debian.pool.ntp.org 1.debian.pool.ntp.org\n');
    L('/etc/systemd/system/default.target', '/usr/lib/systemd/system/graphical.target');
    L('/etc/systemd/system/multi-user.target.wants/ssh.service', '/usr/lib/systemd/system/ssh.service');
    F('/etc/systemd/system/backup.service', BACKUP_SERVICE);
    F('/etc/systemd/system/backup.timer', BACKUP_TIMER);
    F('/etc/aliases', ALIASES);
    D('/etc/postfix');
    F('/etc/postfix/main.cf', 'myhostname = lpic-lab.example.com\nmydestination = $myhostname, localhost\nrelayhost =\ninet_interfaces = loopback-only\n');
    D('/etc/chrony');
    F('/etc/chrony/chrony.conf', CHRONY);
    F('/etc/ntp.conf', NTP_CONF);
    D('/etc/cups');
    F('/etc/cups/cupsd.conf', CUPSD, 0o640, 0, 7);
    F('/etc/cups/printers.conf', PRINTERS, 0o600);
    F('/etc/printcap', '# generated by CUPS\noffice-laser|HP LaserJet Office:rm=lpic-lab:rp=office-laser:\npdf|Virtual PDF printer:rm=lpic-lab:rp=pdf:\n');
    D('/etc/X11/xorg.conf.d');
    F('/etc/X11/xorg.conf', XORG);
    F('/etc/X11/xorg.conf.d/00-keyboard.conf', XKB_CONF);
    D('/etc/netplan');
    F('/etc/netplan/01-netcfg.yaml', NETPLAN, 0o600);
    D('/etc/network/interfaces.d');
    F('/etc/network/interfaces', INTERFACES);
    D('/etc/NetworkManager/system-connections', 0o700);
    F('/etc/NetworkManager/system-connections/Wired connection 1.nmconnection', NM_CON, 0o600);
    F('/etc/ld.so.conf', LD_SO_CONF);
    D('/etc/ld.so.conf.d');
    F('/etc/ld.so.conf.d/x86_64-linux-gnu.conf', '# Multiarch support\n/usr/local/lib/x86_64-linux-gnu\n/lib/x86_64-linux-gnu\n/usr/lib/x86_64-linux-gnu\n');
    F('/etc/ld.so.conf.d/libc.conf', '# libc default configuration\n/usr/local/lib\n');
    F('/etc/ld.so.cache', 'ld.so-1.7.0 (binary cache)\n');
    D('/etc/apt/sources.list.d');
    F('/etc/apt/sources.list', SOURCES_LIST);
    D('/etc/apt/apt.conf.d');
    F('/etc/yum.conf', YUM_CONF);
    F('/etc/dnf/dnf.conf', YUM_CONF);
    D('/etc/yum.repos.d');
    F('/etc/yum.repos.d/rocky.repo', YUM_REPO);
    D('/etc/zypp/repos.d');
    F('/etc/zypp/repos.d/repo-oss.repo', ZYPP_REPO);
    D('/etc/modprobe.d');
    F('/etc/modprobe.d/blacklist.conf', MODPROBE_BL);
    F('/etc/modules', '# /etc/modules: kernel modules to load at boot time.\nloop\n');
    D('/etc/modules-load.d');
    F('/etc/modules-load.d/modules.conf', '# load at boot\n');
    D('/etc/udev/rules.d');
    F('/etc/udev/rules.d/70-usb-backup.rules', UDEV_RULE);
    F('/etc/sysctl.conf', SYSCTL);
    D('/etc/security');
    F('/etc/security/limits.conf', LIMITS);
    D('/etc/skel');
    F('/etc/skel/.bashrc', USER_BASHRC);
    F('/etc/skel/.profile', USER_PROFILE);
    F('/etc/skel/.bash_logout', BASH_LOGOUT);
    D('/etc/init.d');
    ['ssh', 'cron', 'rsyslog', 'cups'].forEach((s) =>
      F('/etc/init.d/' + s, `#!/bin/sh\n### BEGIN INIT INFO\n# Provides: ${s}\n# Default-Start: 2 3 4 5\n# Default-Stop: 0 1 6\n### END INIT INFO\ncase "$1" in start|stop|restart|status) echo "$1 ${s}";; esac\n`, 0o755)
    );
    for (let r = 0; r <= 6; r++) D('/etc/rc' + r + '.d');
    [2, 3, 4, 5].forEach((r) => {
      L('/etc/rc' + r + '.d/S01ssh', '../init.d/ssh');
      L('/etc/rc' + r + '.d/S01cron', '../init.d/cron');
    });
    [0, 1, 6].forEach((r) => L('/etc/rc' + r + '.d/K01ssh', '../init.d/ssh'));
    F('/etc/machine-id', 'a3f1c2d4e5b60718293a4b5c6d7e8f90\n', 0o444);
    D('/etc/gnupg');
    D('/etc/pki/rpm-gpg');
    F('/etc/nologin.example', 'System maintenance until 18:00 — logins disabled.\n');

    // /dev
    D('/dev');
    DEV('/dev/sda', 'b', 8, 0);
    DEV('/dev/sda1', 'b', 8, 1);
    DEV('/dev/sda2', 'b', 8, 2);
    DEV('/dev/sda3', 'b', 8, 3);
    DEV('/dev/sdb', 'b', 8, 16);
    DEV('/dev/sr0', 'b', 11, 0, 0o660, 24);
    DEV('/dev/null', 'c', 1, 3, 0o666, 0);
    DEV('/dev/zero', 'c', 1, 5, 0o666, 0);
    DEV('/dev/random', 'c', 1, 8, 0o666, 0);
    DEV('/dev/urandom', 'c', 1, 9, 0o666, 0);
    DEV('/dev/tty', 'c', 5, 0, 0o666, 5);
    DEV('/dev/console', 'c', 5, 1, 0o600, 0);
    DEV('/dev/tty1', 'c', 4, 1, 0o620, 5);
    DEV('/dev/ttyS0', 'c', 4, 64, 0o660, 20);
    DEV('/dev/loop0', 'b', 7, 0);
    D('/dev/pts');
    D('/dev/disk/by-uuid');
    L('/dev/disk/by-uuid/3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93', '../../sda2');
    L('/dev/disk/by-uuid/6A1F-2C3D', '../../sda1');
    L('/dev/disk/by-uuid/9d2c4e7a-1b3f-4a6c-8e5d-2f7a9b0c1d34', '../../sda3');
    D('/dev/disk/by-id');
    L('/dev/disk/by-id/ata-VBOX_HARDDISK_VB1234', '../../sda');
    L('/dev/cdrom', 'sr0');
    D('/dev/shm', 0o1777);
    fs.devices['/dev/sda1'] = { fstype: 'vfat', uuid: '6A1F-2C3D', label: 'EFI', size: '512M' };
    fs.devices['/dev/sda2'] = { fstype: 'ext4', uuid: '3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93', label: 'rootfs', size: '35.5G', root: fs.root };
    fs.devices['/dev/sda3'] = { fstype: 'swap', uuid: '9d2c4e7a-1b3f-4a6c-8e5d-2f7a9b0c1d34', label: '', size: '4G' };
    fs.devices['/dev/sdb'] = { size: '20G' };
    fs.devices['/dev/sr0'] = { fstype: 'iso9660', label: 'Debian 12.5.0 amd64 n', size: '1G', uuid: '2024-02-10-11-02-33-00' };

    // /proc and /sys (static snapshots)
    D('/proc', 0o555);
    F('/proc/cpuinfo', CPUINFO, 0o444);
    F('/proc/meminfo', MEMINFO, 0o444);
    F('/proc/interrupts', INTERRUPTS, 0o444);
    F('/proc/ioports', IOPORTS, 0o444);
    F('/proc/dma', DMA, 0o444);
    F('/proc/version', VERSION, 0o444);
    F('/proc/cmdline', CMDLINE, 0o444);
    F('/proc/partitions', PARTITIONS, 0o444);
    F('/proc/swaps', 'Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority\n/dev/sda3                               partition\t4194300\t\t0\t\t-2\n', 0o444);
    F('/proc/uptime', '12345.67 23456.78\n', 0o444);
    F('/proc/loadavg', '0.08 0.12 0.09 1/213 2001\n', 0o444);
    F('/proc/filesystems', 'nodev\tsysfs\nnodev\ttmpfs\nnodev\tproc\nnodev\tdevtmpfs\n\text3\n\text2\n\text4\n\txfs\n\tvfat\n\tiso9660\nnodev\tcgroup2\n', 0o444);
    F('/proc/modules', '', 0o444);
    F('/proc/mounts', '', 0o444);
    F('/proc/devices', 'Character devices:\n  1 mem\n  4 tty\n  5 /dev/tty\n 10 misc\n\nBlock devices:\n  7 loop\n  8 sd\n 11 sr\n', 0o444);
    D('/proc/sys/net/ipv4', 0o555);
    D('/proc/sys/kernel', 0o555);
    F('/proc/sys/net/ipv4/ip_forward', '0\n', 0o644);
    F('/proc/sys/kernel/hostname', 'lpic-lab\n', 0o644);
    F('/proc/sys/kernel/osrelease', '6.1.0-18-amd64\n', 0o444);
    D('/proc/1', 0o555);
    F('/proc/1/cmdline', '/sbin/init', 0o444);
    D('/sys/class/net/enp0s3');
    D('/sys/class/net/lo');
    F('/sys/class/net/enp0s3/address', '08:00:27:4e:66:a1\n', 0o444);
    F('/sys/class/net/enp0s3/operstate', 'up\n', 0o444);
    D('/sys/block/sda');
    D('/sys/block/sdb');
    F('/sys/block/sda/size', '83886080\n', 0o444);
    F('/sys/block/sdb/size', '41943040\n', 0o444);
    D('/sys/bus/usb/devices');
    D('/sys/bus/pci/devices');
    D('/sys/firmware/efi');
    D('/sys/module');

    // /run, /var, /tmp, /srv, /opt, /mnt, /media
    D('/run/user/1000', 0o700, 1000, 1000);
    F('/run/sshd.pid', '901\n');
    D('/run/systemd');
    D('/tmp', 0o1777);
    D('/var/tmp', 0o1777);
    D('/var/log/journal');
    D('/var/log/apt');
    F('/var/log/syslog', SYSLOG, 0o640, 0, 4);
    F('/var/log/messages', SYSLOG, 0o640, 0, 4);
    F('/var/log/auth.log', AUTHLOG, 0o640, 0, 4);
    F('/var/log/kern.log', KERNLOG, 0o640, 0, 4);
    F('/var/log/dpkg.log', '2026-10-25 10:01:13 install vim:amd64 <none> 2:9.0.1378-2\n2026-10-25 10:01:14 status installed vim:amd64 2:9.0.1378-2\n', 0o644);
    F('/var/log/apt/history.log', 'Start-Date: 2026-10-25  10:01:10\nCommandline: apt install vim\nInstall: vim:amd64 (2:9.0.1378-2)\nEnd-Date: 2026-10-25  10:01:15\n', 0o644);
    F('/var/log/wtmp', '(binary login records — use last)\n', 0o664, 0, 43);
    F('/var/log/btmp', '(binary failed login records — use lastb)\n', 0o660, 0, 43);
    F('/var/log/lastlog', '(binary — use lastlog)\n', 0o664, 0, 43);
    F('/var/log/mail.log', 'Oct 26 08:40:01 lpic-lab postfix/pickup[1501]: 4F2A1: uid=1000 from=<student>\n', 0o640, 0, 4);
    F('/var/log/cups/error_log', 'I [26/Oct/2026:08:10:05 +0000] Listening on localhost:631\n', 0o640, 0, 7);
    F('/var/log/Xorg.0.log', '[    12.123] (II) LoadModule: "modesetting"\n[    12.456] (II) modeset(0): Output Virtual-1 connected\n[    12.789] (EE) Failed to load module "nvidia" (module does not exist, 0)\n', 0o644);
    D('/var/lib/dpkg/info');
    D('/var/lib/apt/lists');
    D('/var/lib/rpm');
    D('/var/lib/mlocate');
    D('/var/cache/apt/archives');
    D('/var/cache/yum');
    F('/var/cache/apt/archives/htop_3.2.2-2_amd64.deb', '!<arch>\ndebian-binary (simulated .deb)\n');
    D('/var/spool/cron/crontabs', 0o1730, 0, 0);
    D('/var/spool/at');
    D('/var/spool/cups');
    D('/var/spool/postfix');
    D('/var/mail', 0o2775, 0, 8);
    F('/var/mail/student', 'From root@lpic-lab  Mon Oct 26 08:00:00 2026\nSubject: Welcome\n\nWelcome to the LPIC-1 lab. Good luck with the exams!\n\n', 0o660, 1000, 8);
    D('/var/www/html', 0o755, 33, 33);
    F('/var/www/html/index.html', '<h1>It works!</h1>\n', 0o644, 33, 33);
    D('/srv/ftp');
    D('/opt/vendorapp/bin');
    F('/opt/vendorapp/bin/vendorapp', '#!/bin/sh\necho "vendorapp 1.0"\n', 0o755);
    D('/mnt');
    D('/media/cdrom0');
    D('/media/usb');
    D('/lost+found', 0o700);
    D('/root', 0o700);
    F('/root/.bashrc', USER_BASHRC.replace("export EDITOR=vim", "export EDITOR=vim\nPS1='\\u@\\h:\\w\\$ '"));
    F('/root/.profile', '# ~root/.profile\nif [ "$BASH" ]; then\n  if [ -f ~/.bashrc ]; then\n    . ~/.bashrc\n  fi\nfi\n');
    F('/root/secret.txt', 'Only root can read this file.\n', 0o600);
    D('/home', 0o755);

    // user homes
    const home = (u, uid, files) => {
      D('/home/' + u, 0o750, uid, uid);
      F('/home/' + u + '/.bashrc', USER_BASHRC, 0o644, uid, uid);
      F('/home/' + u + '/.profile', USER_PROFILE, 0o644, uid, uid);
      F('/home/' + u + '/.bash_logout', BASH_LOGOUT, 0o644, uid, uid);
      for (const [p, data, mode] of files || []) {
        if (data === null) D('/home/' + u + '/' + p, mode || 0o755, uid, uid);
        else F('/home/' + u + '/' + p, data, mode || 0o644, uid, uid);
      }
    };
    home('student', 1000, [
      ['notes.txt', NOTES],
      ['fruits.txt', FRUITS],
      ['numbers.txt', NUMBERS],
      ['employees.csv', EMPLOYEES],
      ['access.log', ACCESS_LOG],
      ['poem.txt', POEM],
      ['docs', null],
      ['docs/todo.txt', TODO],
      ['docs/report.md', REPORT],
      ['data', null],
      ['data/servers.txt', SERVERS],
      ['data/config.ini', CONFIG_INI],
      ['scripts', null],
      ['scripts/hello.sh', HELLO_SH, 0o755],
      ['scripts/backup.sh', BACKUP_SH, 0o755],
      ['scripts/loops.sh', LOOP_SH, 0o644],
      ['.ssh', null, 0o700],
      ['.ssh/known_hosts', '|1|simulated= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIsimulated\n', 0o644],
      ['.bash_history', 'ls -la\ncd /etc\ncat passwd\nsudo apt update\n', 0o600],
    ]);
    home('alice', 1001, [['project.txt', 'Alice\'s secret project plan\n', 0o640]]);
    home('bob', 1002, []);
    F('/home/bob/.zshrc', '# zsh config\n', 0o644, 1002, 1002);
    D('/home/shared', 0o2775, 0, 1010);
    F('/home/shared/README', 'Shared directory for the developers group (SGID bit set).\n', 0o664, 1001, 1010);
    // a classic SUID binary and some files for find/permission exercises
    F('/usr/bin/passwd', '\x7fELF 64-bit LSB pie executable (setuid)\n', 0o4755);
    F('/usr/bin/sudo', '\x7fELF 64-bit LSB pie executable (setuid)\n', 0o4755);
    F('/usr/bin/su', '\x7fELF 64-bit LSB pie executable (setuid)\n', 0o4755);
    F('/usr/bin/chage', '\x7fELF 64-bit LSB pie executable (setgid shadow)\n', 0o2755, 0, 42);
    F('/usr/bin/wall', '\x7fELF 64-bit LSB pie executable (setgid tty)\n', 0o2755, 0, 5);
    F('/usr/bin/crontab', '\x7fELF 64-bit LSB pie executable (setgid crontab)\n', 0o2755);
    F('/usr/bin/mount', '\x7fELF 64-bit LSB pie executable (setuid)\n', 0o4755);
    F('/usr/bin/umount', '\x7fELF 64-bit LSB pie executable (setuid)\n', 0o4755);
    F('/usr/bin/ping', '\x7fELF 64-bit LSB pie executable (cap_net_raw)\n', 0o755);

    // give the world a realistic age: system files months old, home files recent
    const now = Date.now();
    const DAY = 86400000;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    fs.walk('/', '/', (p, n) => {
      if (p.startsWith('/proc') || p.startsWith('/dev') || p.startsWith('/run')) return;
      let age;
      if (p.startsWith('/home/') || p.startsWith('/root')) age = rnd() * 9 * DAY + 3600000;
      else if (p.startsWith('/var/log')) age = rnd() * 2 * DAY;
      else if (p.startsWith('/tmp')) age = rnd() * DAY;
      else age = (30 + rnd() * 400) * DAY;
      n.mtime = n.ctime = n.atime = Math.floor(now - age);
    });
    const old = fs.tryLookup('/home/student/docs/report.md', '/');
    if (old) old.node.mtime = now - 40 * DAY;
    fs.umask = um;
  };

  /* -------- static system state used by "system" commands -------- */
  SIM.initialState = function () {
    return {
      hostname: 'lpic-lab',
      runlevel: 5,
      prevRunlevel: 'N',
      target: 'graphical.target',
      modules: [
        ['e1000', 155648, 0, ''],
        ['snd_intel8x0', 49152, 2, ''],
        ['snd_ac97_codec', 180224, 1, 'snd_intel8x0'],
        ['snd_pcm', 155648, 2, 'snd_intel8x0,snd_ac97_codec'],
        ['snd', 126976, 6, 'snd_intel8x0,snd_ac97_codec,snd_pcm'],
        ['soundcore', 16384, 1, 'snd'],
        ['ext4', 1007616, 1, ''],
        ['mbcache', 16384, 1, 'ext4'],
        ['jbd2', 167936, 1, 'ext4'],
        ['vboxguest', 491520, 1, ''],
        ['ahci', 49152, 0, ''],
        ['libahci', 53248, 1, 'ahci'],
        ['usbhid', 69632, 0, ''],
        ['hid', 167936, 1, 'usbhid'],
        ['loop', 40960, 0, ''],
      ],
      availableModules: {
        vfat: { size: 24576, deps: ['fat'], desc: 'VFAT filesystem support' },
        fat: { size: 90112, deps: [], desc: 'FAT filesystem support' },
        xfs: { size: 1966080, deps: [], desc: 'SGI XFS with ACLs, security attributes' },
        btrfs: { size: 1708032, deps: ['xor', 'raid6_pq'], desc: 'B-Tree File System' },
        xor: { size: 24576, deps: [], desc: 'XOR blocks' },
        raid6_pq: { size: 122880, deps: [], desc: 'RAID6 Q-syndrome calculations' },
        usb_storage: { size: 81920, deps: [], desc: 'USB Mass Storage driver for Linux' },
        nfs: { size: 516096, deps: ['sunrpc'], desc: 'NFS client' },
        sunrpc: { size: 696320, deps: [], desc: 'Sun RPC' },
        dummy: { size: 16384, deps: [], desc: 'Dummy netdevice driver' },
        bluetooth: { size: 983040, deps: [], desc: 'Bluetooth Core' },
        kvm: { size: 1146880, deps: [], desc: 'Kernel-based Virtual Machine' },
        pcspkr: { size: 16384, deps: [], desc: 'PC Speaker beeper driver' },
        floppy: { size: 131072, deps: [], desc: 'Floppy driver' },
      },
      services: {
        ssh: { desc: 'OpenBSD Secure Shell server', active: true, enabled: true, pid: 901, bin: '/usr/sbin/sshd -D' },
        cron: { desc: 'Regular background program processing daemon', active: true, enabled: true, pid: 520, bin: '/usr/sbin/cron -f' },
        rsyslog: { desc: 'System Logging Service', active: true, enabled: true, pid: 480, bin: '/usr/sbin/rsyslogd -n -iNONE' },
        'systemd-journald': { desc: 'Journal Service', active: true, enabled: true, pid: 260, bin: '/lib/systemd/systemd-journald', static: true },
        chrony: { desc: 'chrony, an NTP client/server', active: true, enabled: true, pid: 455, bin: '/usr/sbin/chronyd -F 1' },
        cups: { desc: 'CUPS Scheduler', active: true, enabled: true, pid: 640, bin: '/usr/sbin/cupsd -l' },
        postfix: { desc: 'Postfix Mail Transport Agent', active: true, enabled: true, pid: 1102, bin: '/usr/lib/postfix/sbin/master -w' },
        NetworkManager: { desc: 'Network Manager', active: true, enabled: true, pid: 430, bin: '/usr/sbin/NetworkManager --no-daemon' },
        'systemd-timesyncd': { desc: 'Network Time Synchronization', active: false, enabled: false, pid: 0, bin: '/lib/systemd/systemd-timesyncd' },
        apache2: { desc: 'The Apache HTTP Server', active: false, enabled: false, pid: 0, bin: '/usr/sbin/apache2 -k start' },
        atd: { desc: 'Deferred execution scheduler', active: true, enabled: true, pid: 530, bin: '/usr/sbin/atd -f' },
        gdm: { desc: 'GNOME Display Manager', active: true, enabled: true, pid: 700, bin: '/usr/sbin/gdm3' },
        'cups.socket': { desc: 'CUPS Scheduler', active: true, enabled: true, pid: 0, listen: '/run/cups/cups.sock' },
        'ssh.socket': { desc: 'OpenBSD Secure Shell server socket', active: false, enabled: false, pid: 0, listen: '[::]:22' },
        'systemd-networkd': { desc: 'Network Configuration', active: false, enabled: false, pid: 0, bin: '/lib/systemd/systemd-networkd' },
        'systemd-resolved': { desc: 'Network Name Resolution', active: false, enabled: false, pid: 0, bin: '/lib/systemd/systemd-resolved' },
        'backup.timer': { desc: 'Nightly backup timer', active: true, enabled: true, pid: 0, timer: true },
        telnet: { desc: 'Telnet server (legacy, insecure)', active: false, enabled: false, pid: 0, bin: '/usr/sbin/in.telnetd', masked: false },
      },
      procs: [
        { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init splash', ni: 0, stat: 'Ss', tty: '?', cpu: 0.0, mem: 0.3, vsz: 167204, rss: 12880, start: '08:10' },
        { pid: 2, ppid: 0, user: 'root', cmd: '[kthreadd]', ni: 0, stat: 'S', tty: '?', cpu: 0, mem: 0, vsz: 0, rss: 0, start: '08:10' },
        { pid: 260, ppid: 1, user: 'root', cmd: '/lib/systemd/systemd-journald', ni: 0, stat: 'Ss', tty: '?', cpu: 0.1, mem: 0.6, vsz: 48420, rss: 24312, start: '08:10' },
        { pid: 290, ppid: 1, user: 'root', cmd: '/lib/systemd/systemd-udevd', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.2, vsz: 25120, rss: 6900, start: '08:10' },
        { pid: 430, ppid: 1, user: 'root', cmd: '/usr/sbin/NetworkManager --no-daemon', ni: 0, stat: 'Ssl', tty: '?', cpu: 0.1, mem: 0.5, vsz: 318776, rss: 19040, start: '08:10' },
        { pid: 455, ppid: 1, user: '_chrony', cmd: '/usr/sbin/chronyd -F 1', ni: 0, stat: 'S', tty: '?', cpu: 0, mem: 0.1, vsz: 18972, rss: 3304, start: '08:10' },
        { pid: 480, ppid: 1, user: 'root', cmd: '/usr/sbin/rsyslogd -n -iNONE', ni: 0, stat: 'Ssl', tty: '?', cpu: 0, mem: 0.1, vsz: 222220, rss: 5476, start: '08:10' },
        { pid: 520, ppid: 1, user: 'root', cmd: '/usr/sbin/cron -f', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.1, vsz: 6680, rss: 2700, start: '08:10' },
        { pid: 530, ppid: 1, user: 'daemon', cmd: '/usr/sbin/atd -f', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.0, vsz: 3732, rss: 2104, start: '08:10' },
        { pid: 640, ppid: 1, user: 'root', cmd: '/usr/sbin/cupsd -l', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.3, vsz: 34728, rss: 12932, start: '08:10' },
        { pid: 700, ppid: 1, user: 'root', cmd: '/usr/sbin/gdm3', ni: 0, stat: 'Ssl', tty: '?', cpu: 0, mem: 0.2, vsz: 239444, rss: 8848, start: '08:10' },
        { pid: 812, ppid: 700, user: 'student', cmd: '/usr/lib/xorg/Xorg vt2 -displayfd 3', ni: 0, stat: 'Sl+', tty: 'tty2', cpu: 1.2, mem: 2.4, vsz: 412312, rss: 96400, start: '08:11' },
        { pid: 901, ppid: 1, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.2, vsz: 15428, rss: 9128, start: '08:10' },
        { pid: 1102, ppid: 1, user: 'root', cmd: '/usr/lib/postfix/sbin/master -w', ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.1, vsz: 43236, rss: 4600, start: '08:10' },
        { pid: 1250, ppid: 812, user: 'student', cmd: '/usr/bin/gnome-shell', ni: 0, stat: 'Sl', tty: '?', cpu: 3.4, mem: 7.9, vsz: 4512300, rss: 318200, start: '08:11' },
        { pid: 1377, ppid: 1250, user: 'student', cmd: '/usr/lib/firefox-esr/firefox-esr', ni: 0, stat: 'Sl', tty: '?', cpu: 12.6, mem: 11.2, vsz: 3150000, rss: 450120, start: '08:20' },
        { pid: 1420, ppid: 1, user: 'alice', cmd: '/usr/bin/python3 /home/alice/report.py', ni: 10, stat: 'SN', tty: '?', cpu: 25.1, mem: 1.0, vsz: 30200, rss: 40420, start: '08:30' },
        { pid: 1500, ppid: 1, user: 'www-data', cmd: '/usr/bin/php-fpm: pool www', ni: 0, stat: 'S', tty: '?', cpu: 0.2, mem: 0.8, vsz: 210400, rss: 32000, start: '08:12' },
        { pid: 1990, ppid: 1250, user: 'student', cmd: '-bash', ni: 0, stat: 'Ss', tty: 'pts/0', cpu: 0, mem: 0.1, vsz: 8960, rss: 5300, start: '09:00' },
      ],
      nextPid: 2001,
      packagesDeb: {
        bash: ['5.2.15-2+b2', 'GNU Bourne Again SHell', 'shells', ['base-files', 'debianutils'], '/bin/bash,/etc/bash.bashrc,/usr/share/doc/bash/README'],
        coreutils: ['9.1-1', 'GNU core utilities', 'utils', [], '/usr/bin/ls,/usr/bin/cp,/usr/bin/mv,/usr/bin/cat,/usr/bin/chmod'],
        'openssh-server': ['1:9.2p1-2+deb12u2', 'secure shell (SSH) server, for secure access from remote machines', 'net', ['openssh-client', 'libssl3'], '/usr/sbin/sshd,/etc/ssh/sshd_config,/lib/systemd/system/ssh.service'],
        'openssh-client': ['1:9.2p1-2+deb12u2', 'secure shell (SSH) client, for secure access to remote machines', 'net', ['libssl3'], '/usr/bin/ssh,/usr/bin/scp,/usr/bin/ssh-keygen,/etc/ssh/ssh_config'],
        vim: ['2:9.0.1378-2', 'Vi IMproved - enhanced vi editor', 'editors', ['vim-runtime', 'libtinfo6'], '/usr/bin/vim.basic,/usr/share/vim'],
        'vim-runtime': ['2:9.0.1378-2', 'Vi IMproved - Runtime files', 'editors', [], '/usr/share/vim/vim90'],
        nano: ['7.2-1', 'small, friendly text editor inspired by Pico', 'editors', ['libtinfo6'], '/bin/nano,/etc/nanorc'],
        libssl3: ['3.0.11-1~deb12u2', 'Secure Sockets Layer toolkit - shared libraries', 'libs', ['libc6'], '/usr/lib/x86_64-linux-gnu/libssl.so.3,/usr/lib/x86_64-linux-gnu/libcrypto.so.3'],
        libc6: ['2.36-9+deb12u4', 'GNU C Library: Shared libraries', 'libs', [], '/lib/x86_64-linux-gnu/libc.so.6,/lib64/ld-linux-x86-64.so.2'],
        libtinfo6: ['6.4-4', 'shared low-level terminfo library for terminal handling', 'libs', ['libc6'], '/usr/lib/x86_64-linux-gnu/libtinfo.so.6'],
        cron: ['3.0pl1-162', 'process scheduling daemon', 'admin', [], '/usr/sbin/cron,/usr/bin/crontab,/etc/crontab'],
        rsyslog: ['8.2302.0-1', 'reliable system and kernel logging daemon', 'admin', [], '/usr/sbin/rsyslogd,/etc/rsyslog.conf'],
        chrony: ['4.3-2+deb12u1', 'Versatile implementation of the Network Time Protocol', 'net', [], '/usr/sbin/chronyd,/usr/bin/chronyc,/etc/chrony/chrony.conf'],
        cups: ['2.4.2-3+deb12u5', 'Common UNIX Printing System(tm) - PPD/driver support, web interface', 'net', ['cups-client'], '/usr/sbin/cupsd,/etc/cups/cupsd.conf'],
        'cups-client': ['2.4.2-3+deb12u5', 'Common UNIX Printing System(tm) - client programs (SysV)', 'net', [], '/usr/bin/lp,/usr/bin/lpr,/usr/bin/lpq,/usr/bin/lprm,/usr/bin/lpstat'],
        postfix: ['3.7.10-0+deb12u1', 'High-performance mail transport agent', 'mail', [], '/usr/sbin/postfix,/usr/sbin/sendmail,/etc/postfix/main.cf'],
        grub2: ['2.06-13+deb12u1', 'GRand Unified Bootloader (dummy package)', 'admin', ['grub-efi-amd64'], '/usr/share/doc/grub2'],
        'grub-efi-amd64': ['2.06-13+deb12u1', 'GRand Unified Bootloader, version 2 (EFI-AMD64 version)', 'admin', [], '/usr/sbin/grub-install,/etc/default/grub'],
        'linux-image-6.1.0-18-amd64': ['6.1.76-1', 'Linux 6.1 for 64-bit PCs (signed)', 'kernel', [], '/boot/vmlinuz-6.1.0-18-amd64'],
        'network-manager': ['1.42.4-1', 'network management framework (daemon and userspace tools)', 'net', [], '/usr/sbin/NetworkManager,/usr/bin/nmcli'],
        'xserver-xorg-core': ['2:21.1.7-3+deb12u5', 'Xorg X server - core server', 'x11', [], '/usr/lib/xorg/Xorg'],
        gdm3: ['43.0-3', 'GNOME Display Manager', 'gnome', [], '/usr/sbin/gdm3'],
        'gnome-shell': ['43.9-0+deb12u1', 'graphical shell for the GNOME desktop', 'gnome', [], '/usr/bin/gnome-shell'],
        'firefox-esr': ['115.8.0esr-1~deb12u1', 'Mozilla Firefox web browser - Extended Support Release (ESR)', 'web', [], '/usr/bin/firefox-esr'],
        gnupg: ['2.2.40-1.1', 'GNU privacy guard - a free PGP replacement', 'utils', [], '/usr/bin/gpg'],
        sudo: ['1.9.13p3-1+deb12u1', 'Provide limited super user privileges to specific users', 'admin', [], '/usr/bin/sudo,/etc/sudoers'],
        'iproute2': ['6.1.0-3', 'networking and traffic control tools', 'net', [], '/bin/ip,/sbin/ss'],
        'net-tools': ['2.10-0.1', 'NET-3 networking toolkit (ifconfig, route, netstat)', 'net', [], '/sbin/ifconfig,/sbin/route,/bin/netstat'],
        'bind9-dnsutils': ['1:9.18.24-1', 'Clients provided with BIND 9 (dig, nslookup)', 'net', [], '/usr/bin/dig,/usr/bin/nslookup,/usr/bin/host'],
        locales: ['2.36-9+deb12u4', 'GNU C Library: National Language (locale) data [support]', 'localization', [], '/usr/sbin/locale-gen,/etc/locale.gen'],
        'mlocate': ['1.1.18-1', 'quickly find files on the filesystem based on their name', 'utils', [], '/usr/bin/locate,/usr/bin/updatedb'],
        'e2fsprogs': ['1.47.0-2', 'ext2/ext3/ext4 file system utilities', 'admin', [], '/sbin/mkfs.ext4,/sbin/e2fsck,/sbin/tune2fs,/sbin/dumpe2fs,/sbin/debugfs'],
        'xfsprogs': ['6.1.0-1', 'Utilities for managing the XFS filesystem', 'admin', [], '/sbin/mkfs.xfs,/sbin/xfs_repair,/usr/sbin/xfs_db,/usr/sbin/xfs_fsr'],
        'dosfstools': ['4.2-1', 'utilities for making and checking MS-DOS FAT filesystems', 'admin', [], '/sbin/mkfs.vfat,/sbin/fsck.vfat'],
        parted: ['3.5-3', 'disk partition manipulator', 'admin', [], '/sbin/parted'],
        'gdisk': ['1.0.9-2.1', 'GPT fdisk text-mode partitioning tool', 'admin', [], '/sbin/gdisk,/sbin/sgdisk'],
        at: ['3.2.5-1', 'Delayed job execution and batch processing', 'admin', [], '/usr/bin/at,/usr/bin/atq,/usr/bin/atrm,/usr/sbin/atd'],
        anacron: ['2.3-36', 'cron-like program that doesn\'t go by time', 'admin', [], '/usr/sbin/anacron,/etc/anacrontab'],
        rpm: ['4.18.0+dfsg-1+deb12u1', 'package manager for RPM (installed for practice)', 'admin', [], '/usr/bin/rpm,/usr/bin/rpm2cpio'],
      },
      packagesDebAvail: {
        htop: ['3.2.2-2', 'interactive processes viewer', 'utils', ['libncursesw6'], '/usr/bin/htop'],
        libncursesw6: ['6.4-4', 'shared libraries for terminal handling (wide character support)', 'libs', [], '/usr/lib/x86_64-linux-gnu/libncursesw.so.6'],
        apache2: ['2.4.59-1~deb12u1', 'Apache HTTP Server', 'httpd', ['apache2-bin', 'apache2-data'], '/usr/sbin/apache2,/etc/apache2/apache2.conf'],
        'apache2-bin': ['2.4.59-1~deb12u1', 'Apache HTTP Server (modules and other binary files)', 'httpd', [], '/usr/sbin/apache2'],
        'apache2-data': ['2.4.59-1~deb12u1', 'Apache HTTP Server (common files)', 'httpd', [], '/usr/share/apache2'],
        nmap: ['7.93+dfsg1-1', 'The Network Mapper', 'net', [], '/usr/bin/nmap'],
        tree: ['2.1.0-1', 'displays an indented directory tree, in color', 'utils', [], '/usr/bin/tree'],
        tmux: ['3.3a-3', 'terminal multiplexer', 'admin', [], '/usr/bin/tmux'],
        screen: ['4.9.0-4', 'terminal multiplexer with VT100/ANSI terminal emulation', 'misc', [], '/usr/bin/screen'],
        'mariadb-server': ['1:10.11.6-0+deb12u1', 'MariaDB database server', 'database', [], '/usr/sbin/mariadbd'],
        git: ['1:2.39.2-1.1', 'fast, scalable, distributed revision control system', 'vcs', [], '/usr/bin/git'],
        'traceroute': ['1:2.1.2-1', 'Traces the route taken by packets over an IPv4/IPv6 network', 'net', [], '/usr/bin/traceroute'],
        'ntpsec': ['1.2.2+dfsg1-1', 'Network Time Protocol daemon and utility programs', 'net', [], '/usr/sbin/ntpd,/usr/bin/ntpq'],
        'orca': ['43.1-1', 'Scriptable screen reader', 'gnome', [], '/usr/bin/orca'],
        'xinetd': ['1:2.3.15.4-1', 'replacement for inetd with many enhancements', 'net', [], '/usr/sbin/xinetd'],
      },
      packagesRpm: {
        bash: ['5.1.8-6.el9', 'x86_64', 'The GNU Bourne Again shell', '/usr/bin/bash'],
        'openssh-server': ['8.7p1-34.el9', 'x86_64', 'An open source SSH server daemon', '/usr/sbin/sshd,/etc/ssh/sshd_config'],
        httpd: ['2.4.57-5.el9', 'x86_64', 'Apache HTTP Server', '/usr/sbin/httpd,/etc/httpd/conf/httpd.conf'],
        'vim-enhanced': ['8.2.2637-20.el9', 'x86_64', 'A version of the VIM editor which includes recent enhancements', '/usr/bin/vim'],
        kernel: ['5.14.0-362.8.1.el9_3', 'x86_64', 'The Linux kernel', '/boot/vmlinuz-5.14.0-362.8.1.el9_3.x86_64'],
        coreutils: ['8.32-34.el9', 'x86_64', 'A set of basic GNU tools commonly used in shell scripts', '/usr/bin/ls,/usr/bin/cp'],
      },
      packagesRpmAvail: {
        nginx: ['1.20.1-14.el9', 'x86_64', 'A high performance web server and reverse proxy server', '/usr/sbin/nginx'],
        htop: ['3.2.2-2.el9', 'x86_64', 'Interactive process viewer', '/usr/bin/htop'],
        tmux: ['3.2a-5.el9', 'x86_64', 'A terminal multiplexer', '/usr/bin/tmux'],
        'mariadb-server': ['10.5.22-1.el9', 'x86_64', 'The MariaDB server and related files', '/usr/libexec/mariadbd'],
      },
      printQueue: [],
      printJob: 42,
      atJobs: [],
      atNext: 3,
      shutdown: null,
      mailq: [],
      gpgKeys: [],
      dns: {
        'example.com': ['93.184.215.14', '2606:2800:21f:cb07:6820:80da:af6b:8b2c'],
        'www.example.com': ['93.184.215.14'],
        'lpi.org': ['65.39.134.165'],
        'www.lpi.org': ['65.39.134.165'],
        'debian.org': ['151.101.2.132'],
        'deb.debian.org': ['151.101.2.132'],
        'kernel.org': ['139.178.84.217'],
        'google.com': ['142.250.185.78', '2a00:1450:4001:82a::200e'],
        'mail.example.com': ['93.184.215.20'],
        'gw.example.com': ['192.168.56.1'],
      },
      mx: { 'example.com': ['10 mail.example.com.'], 'lpi.org': ['10 mx1.lpi.org.'] },
      ip: {
        links: [
          { name: 'lo', mac: '00:00:00:00:00:00', mtu: 65536, state: 'UNKNOWN', v4: ['127.0.0.1/8'], v6: ['::1/128'] },
          { name: 'enp0s3', mac: '08:00:27:4e:66:a1', mtu: 1500, state: 'UP', v4: ['192.168.56.101/24'], v6: ['fe80::a00:27ff:fe4e:66a1/64'] },
          { name: 'enp0s8', mac: '08:00:27:b2:19:0c', mtu: 1500, state: 'DOWN', v4: [], v6: [] },
        ],
        routes: [
          { dst: 'default', via: '192.168.56.1', dev: 'enp0s3', proto: 'static', metric: 100 },
          { dst: '192.168.56.0/24', dev: 'enp0s3', proto: 'kernel', scope: 'link', src: '192.168.56.101', metric: 100 },
        ],
      },
      timezone: 'Europe/Berlin',
      ntp: true,
      lang: 'en_US.UTF-8',
      locate: null,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
