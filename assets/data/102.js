/* Topic 102: Linux Installation and Package Management */
LPIC.add({
  id: '102.1',
  title: 'Design hard disk layout',
  weight: 2,
  desc: 'Candidates should be able to design a disk partitioning scheme for a Linux system.',
  knowledge: [
    'Allocate filesystems and swap space to separate partitions or disks.',
    'Tailor the design to the intended use of the system.',
    'Ensure the /boot partition conforms to the hardware architecture requirements for booting.',
    'Knowledge of basic features of LVM.',
  ],
  terms: ['/ (root) filesystem', '/var filesystem', '/home filesystem', '/boot filesystem', 'EFI System Partition (ESP)', 'swap space', 'mount points', 'partitions'],
  sims: ['partition', 'fstab'],
  wiki: String.raw`
## Why more than one partition?
Linux mounts everything into **one directory tree**. A separate partition (or disk, or logical volume) for a subtree gives:
- **protection**: a full {{/var}} (logs, mail spool) or {{/home}} cannot fill the root filesystem
- **different mount options**: e.g. {{noexec,nosuid}} for {{/tmp}} or {{/home}}, read-only {{/usr}}
- **easier reinstall**: format {{/}} but keep {{/home}}
- **different filesystems / backup policies** per area
- **boot requirements**: firmware must be able to read the boot partition

## The usual mount points
| Mount point | Contents and sizing hints |
|---|---|
| {{/}} (root) | the system; must contain {{/etc}}, {{/bin}}, {{/sbin}}, {{/lib}}, {{/dev}} — everything needed to boot to single-user mode. 20–50 GB is plenty for most servers. |
| {{/boot}} | kernel, initramfs, GRUB files. ~500 MB–1 GB. Separate when root is on LVM/RAID/encrypted or a filesystem GRUB cannot read. |
| {{/boot/efi}} | **EFI System Partition (ESP)** on UEFI systems: FAT32 (vfat), type EF00, 100–550 MB, holds {{.efi}} boot loaders. |
| {{/home}} | user data — usually the largest part on workstations. |
| {{/var}} | variable data: logs ({{/var/log}}), spool ({{/var/spool}}), caches, databases ({{/var/lib/mysql}}), web content. Big on servers. |
| {{/tmp}} | temporary files, often {{tmpfs}} in RAM. |
| {{/usr}}, {{/opt}}, {{/srv}} | programs (shareable, could be read-only), add-on software, served data. |
| swap | not mounted — paging space for the kernel. |

> EXAM: The **root filesystem** must hold everything required to boot and repair the system: {{/etc}}, {{/bin}}, {{/sbin}}, {{/lib}}, {{/dev}}. Never put those on a separate partition.

## Swap space
Swap extends RAM: rarely used pages are moved to disk. It can be a **partition** (type 82 / 8200) or a **swap file**.

~~~console
# mkswap /dev/sdb2
# swapon /dev/sdb2
# swapon --show
$ free -h
~~~

Classic rule of thumb: twice the RAM for small machines; today 1–2× RAM up to a few GB, at least RAM size if you want **hibernation** (suspend to disk). Several swap areas can be used in parallel with priorities ({{pri=}} in fstab).

## Tailoring the design to the use case
- **Desktop/laptop**: {{/}}, big {{/home}}, swap ≥ RAM (hibernate), ESP.
- **Mail/log/database server**: generous separate {{/var}} (or {{/var/lib/…}}, {{/var/spool/mail}}).
- **File server**: data on separate disks or RAID, {{/srv}} or {{/home}} on its own volume.
- **Multi-user system**: {{/home}} and {{/tmp}} separate, with quotas.
- **Embedded/appliance**: read-only root, small writable data partition.

## Partition tables: MBR and GPT
| | MBR (DOS) | GPT |
|---|---|---|
| partitions | 4 primary, or 3 primary + 1 **extended** with **logical** partitions (numbered from 5) | 128 by default, all equal |
| max. disk size | 2 TiB | 8 ZiB |
| redundancy | none | backup table at the end of the disk, CRC32 |
| firmware | BIOS (UEFI via CSM) | UEFI (BIOS boot via "BIOS boot partition" for GRUB) |

## /boot and the hardware architecture
- **BIOS + MBR**: GRUB's core image sits in the gap after the MBR; {{/boot}} must be readable by GRUB (ext2/3/4, xfs, btrfs…). With GPT on BIOS you need a small (1 MB) **BIOS boot partition** (type EF02).
- **UEFI**: you need an **ESP** formatted with **FAT** (vfat), mounted at {{/boot/efi}}.
- Old BIOSes could only read the first 1024 cylinders — that is why {{/boot}} used to be the first partition.

## LVM — Logical Volume Manager
LVM puts a flexible layer between disks and filesystems:
1. **PV** — physical volume: a disk or partition prepared with {{pvcreate /dev/sdb1}}
2. **VG** — volume group: a pool made of one or more PVs, {{vgcreate data /dev/sdb1 /dev/sdc1}}; space is divided into **PEs** (physical extents, default 4 MiB)
3. **LV** — logical volume: a "virtual partition" carved out of a VG, {{lvcreate -L 20G -n home data}} → {{/dev/data/home}} or {{/dev/mapper/data-home}}

Advantages: grow/shrink LVs online ({{lvextend -r -L +5G /dev/data/home}}), span multiple disks, **snapshots** for consistent backups, move data between disks ({{pvmove}}). Overview commands: {{pvs}}, {{vgs}}, {{lvs}}, {{pvdisplay}}, {{vgdisplay}}, {{lvdisplay}}.

~~~console
# pvcreate /dev/sdb1
# vgcreate vg_data /dev/sdb1
# lvcreate -L 10G -n lv_home vg_data
# mkfs.ext4 /dev/vg_data/lv_home
# lvextend -r -L +5G /dev/vg_data/lv_home
~~~

> NOTE: {{/boot}} is usually *not* placed on LVM because older boot loaders cannot read it.
`,
  quiz: [
    { q: 'Which directories must be on the root filesystem because they are required to boot the system? (Choose two.)', o: ['{{/etc}}', '{{/home}}', '{{/sbin}}', '{{/var}}', '{{/opt}}'], a: [0, 2], e: '{{/etc}}, {{/bin}}, {{/sbin}}, {{/lib}}, {{/dev}} must be on {{/}}. {{/home}}, {{/var}}, {{/opt}} may be separate.' },
    { q: 'Which filesystem type must the EFI System Partition have?', o: ['ext4', 'FAT (vfat)', 'xfs', 'swap'], a: 1, e: 'UEFI firmware reads FAT12/16/32. It is mounted at {{/boot/efi}}.' },
    { q: 'What is the maximum number of primary partitions on an MBR partitioned disk?', fill: ['4'], e: 'Or 3 primary + 1 extended partition containing logical partitions.' },
    { q: 'A mail server stores large mailboxes and many logs. Which directory should get a large separate filesystem?', o: ['{{/boot}}', '{{/var}}', '{{/etc}}', '{{/usr}}'], a: 1, e: 'Mail spools ({{/var/spool/mail}}, {{/var/mail}}) and logs ({{/var/log}}) live below {{/var}}.' },
    { q: 'Which LVM component is a pool of storage made of one or more physical volumes?', o: ['logical volume', 'volume group', 'physical extent', 'device mapper'], a: 1, e: 'PV → VG (pool) → LV (usable "partition").' },
    { q: 'Which command initialises a partition as an LVM physical volume?', fill: ['pvcreate', 'pvcreate /dev/sdb1'], e: 'Then {{vgcreate}} and {{lvcreate}}.' },
    { q: 'Why is a separate {{/home}} partition useful? (Choose two.)', o: ['User data survives a reinstallation of the system.', 'It is required for booting.', 'Users cannot fill up the root filesystem.', 'It makes the kernel load faster.'], a: [0, 2], e: 'Separate partitions isolate space usage and simplify reinstalls.' },
    { q: 'Which statement about swap is correct?', o: ['Swap must always be a partition.', 'Swap can be a partition or a file and is activated with swapon.', 'Swap is mounted to {{/swap}}.', 'Swap requires an ext4 filesystem.'], a: 1, e: 'Prepare with {{mkswap}}, activate with {{swapon}}; it is not mounted into the tree.' },
    { q: 'What is the advantage of GPT over MBR? (Choose two.)', o: ['Supports disks larger than 2 TiB', 'Needed for BIOS-only machines', 'Keeps a backup copy of the partition table', 'Limited to 4 partitions'], a: [0, 2], e: 'GPT: 64-bit LBAs, 128 partitions, backup header at the end of the disk.' },
    { q: 'What is a reason to create a separate {{/boot}} partition?', o: ['The root filesystem is on LVM or encrypted and the boot loader cannot read it.', '{{/boot}} must always be on FAT.', 'To store user data.', 'The swap area is located there.'], a: 0, e: 'GRUB needs to read the kernel and initramfs from a filesystem it understands.' },
    { q: 'Which LVM feature allows a consistent backup of a filesystem while it is in use?', fill: ['snapshot', 'snapshots'], e: '{{lvcreate -s -L 1G -n snap /dev/vg/lv}} creates a copy-on-write snapshot.' },
  ],
});

LPIC.add({
  id: '102.2',
  title: 'Install a boot manager',
  weight: 2,
  desc: 'Candidates should be able to select, install and configure a boot manager.',
  knowledge: [
    'Providing alternative boot locations and backup boot options.',
    'Install and configure a boot loader such as GRUB Legacy.',
    'Perform basic configuration changes for GRUB 2.',
    'Interact with the boot loader.',
  ],
  terms: ['menu.lst', 'grub.cfg', 'grub.conf', 'grub-install', 'grub-mkconfig', 'MBR'],
  sims: ['boot'],
  wiki: String.raw`
## GRUB 2 — the standard boot loader
GRUB 2 (GRand Unified Bootloader) is used by practically all distributions. Its main configuration file **{{/boot/grub/grub.cfg}}** (Red Hat: {{/boot/grub2/grub.cfg}}; UEFI: sometimes {{/boot/efi/EFI/<distro>/grub.cfg}}) is **generated** — never edit it by hand:

~~~console
$ cat /etc/default/grub
$ ls /etc/grub.d/
# grub-mkconfig -o /boot/grub/grub.cfg
# update-grub
~~~

{{update-grub}} is Debian's shortcut for {{grub-mkconfig -o /boot/grub/grub.cfg}}; on Red Hat use {{grub2-mkconfig -o /boot/grub2/grub.cfg}}. The scripts in {{/etc/grub.d/}} ({{00_header}}, {{10_linux}}, {{30_os-prober}}, {{40_custom}} …) produce the menu; settings come from {{/etc/default/grub}}:

~~~file
GRUB_DEFAULT=0                      # entry number or title, or "saved"
GRUB_TIMEOUT=5                      # seconds until the default boots, -1 = wait
GRUB_CMDLINE_LINUX_DEFAULT="quiet"  # parameters for normal entries
GRUB_CMDLINE_LINUX=""               # parameters for all entries incl. recovery
GRUB_DISABLE_RECOVERY="true"
#GRUB_TERMINAL=console
~~~

Custom menu entries go into {{/etc/grub.d/40_custom}}:

~~~file
menuentry "My rescue kernel" {
    set root=(hd0,gpt2)
    linux /boot/vmlinuz-rescue root=/dev/sda2 ro single
    initrd /boot/initrd-rescue.img
}
~~~

> EXAM: GRUB 2 counts **disks from 0** and **partitions from 1**: {{(hd0,1)}} or {{(hd0,msdos1)}} / {{(hd0,gpt2)}} = first disk, partition 1 / 2. GRUB Legacy counted both from 0: {{(hd0,0)}} = first partition.

## Installing GRUB
~~~console
# grub-install /dev/sda
# grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=debian
# efibootmgr -v
~~~

- **BIOS/MBR**: {{grub-install /dev/sda}} writes {{boot.img}} into the **MBR** of the disk (not into a partition!) and {{core.img}} into the gap after it (or a BIOS boot partition on GPT).
- **UEFI**: installs {{grubx64.efi}} into the ESP and registers an NVRAM entry.

## Interacting with GRUB at boot
- Hold <kbd>Shift</kbd> (BIOS) or press <kbd>Esc</kbd> (UEFI) to show a hidden menu.
- <kbd>↑</kbd>/<kbd>↓</kbd> select, <kbd>Enter</kbd> boot, <kbd>e</kbd> edit an entry temporarily, <kbd>Ctrl</kbd>+<kbd>X</kbd>/<kbd>F10</kbd> boot the edited entry, <kbd>c</kbd> command line.
- GRUB shell commands: {{ls}}, {{ls (hd0,1)/}}, {{set root=(hd0,1)}}, {{linux /vmlinuz root=/dev/sda1}}, {{initrd /initrd.img}}, {{boot}}, {{insmod}}, {{search --file /vmlinuz}}.

~~~text
grub> ls
(hd0) (hd0,gpt1) (hd0,gpt2) (hd0,gpt3)
grub> set root=(hd0,gpt2)
grub> linux /boot/vmlinuz-6.1.0-18-amd64 root=/dev/sda2 ro
grub> initrd /boot/initrd.img-6.1.0-18-amd64
grub> boot
~~~

## GRUB Legacy (GRUB 0.97)
Still on the exam: configuration in **{{/boot/grub/menu.lst}}** (Red Hat: **{{/boot/grub/grub.conf}}**), edited **directly** — no generator.

~~~file
default=0
timeout=10
title Debian GNU/Linux
    root (hd0,0)
    kernel /vmlinuz-2.6.32 root=/dev/sda1 ro quiet
    initrd /initrd.img-2.6.32
title Windows
    rootnoverify (hd0,1)
    chainloader +1
~~~

Installation: {{grub-install /dev/sda}} or from the GRUB shell: {{root (hd0,0)}} then {{setup (hd0)}}. Note {{chainloader +1}} — hand over to another boot loader (e.g. Windows) in a partition's boot sector.

## Alternative boot locations and backups
- Install GRUB on **several disks** of a RAID 1 ({{grub-install /dev/sdb}} too) so the machine still boots if one disk dies.
- Keep a **rescue medium** (live USB/CD, distribution installer in "rescue" mode) — boot it, mount the root filesystem, {{chroot}} into it and run {{grub-install}} / {{update-grub}}.
- Back up the MBR (boot code + partition table): {{dd if=/dev/sda of=mbr.img bs=512 count=1}}; restore only the boot code with {{bs=446 count=1}}.
- Keep an older kernel in the menu as a fallback ({{GRUB_DEFAULT=saved}} + {{grub-reboot}} for one-time boots).
- Other boot loaders you should have heard of: **systemd-boot** (UEFI only), **SYSLINUX/ISOLINUX/PXELINUX** (removable media, network boot), **LILO** (historic).
`,
  quiz: [
    { q: 'Which file is the main configuration file of GRUB 2 on Debian?', o: ['{{/boot/grub/menu.lst}}', '{{/boot/grub/grub.cfg}}', '{{/etc/grub.conf}}', '{{/etc/default/grub}}'], a: 1, e: '{{grub.cfg}} is generated from {{/etc/default/grub}} and {{/etc/grub.d/}}. {{menu.lst}} is GRUB Legacy.' },
    { q: 'After changing {{/etc/default/grub}}, which command regenerates the GRUB 2 configuration?', o: ['{{grub-install /dev/sda}}', '{{grub-mkconfig -o /boot/grub/grub.cfg}}', '{{grub-setup}}', '{{mkinitrd}}'], a: 1, e: 'On Debian also {{update-grub}}. {{grub-install}} installs the boot loader itself.' },
    { q: 'Which file contains GRUB Legacy\'s menu on Debian-based systems?', fill: ['/boot/grub/menu.lst', 'menu.lst'], e: 'Red Hat used {{/boot/grub/grub.conf}}.' },
    { q: 'In GRUB 2 notation, what does {{(hd0,1)}} refer to?', o: ['second disk, first partition', 'first disk, first partition', 'first disk, second partition', 'second disk, second partition'], a: 1, e: 'GRUB 2: disks from 0, partitions from 1. In GRUB Legacy {{(hd0,0)}} was the first partition.' },
    { q: 'Which command installs GRUB into the MBR of the first SATA disk?', fill: ['grub-install /dev/sda'], e: 'Install to the disk, not a partition (not {{/dev/sda1}}).' },
    { q: 'Which variable in {{/etc/default/grub}} sets how many seconds the menu is shown?', fill: ['GRUB_TIMEOUT'], e: '{{GRUB_TIMEOUT=5}}; -1 waits forever.' },
    { q: 'Where should custom menu entries for GRUB 2 be added?', o: ['Directly in {{/boot/grub/grub.cfg}}', 'In {{/etc/grub.d/40_custom}}', 'In {{/boot/grub/menu.lst}}', 'In {{/etc/inittab}}'], a: 1, e: 'Then run {{update-grub}}. Hand edits of grub.cfg are overwritten.' },
    { q: 'Which GRUB Legacy directive passes control to the boot sector of another partition (e.g. Windows)?', o: ['{{chainloader +1}}', '{{boot other}}', '{{kernel +1}}', '{{rootnoverify}}'], a: 0, e: '{{rootnoverify (hd0,1)}} + {{chainloader +1}} loads the first sector of that partition.' },
    { q: 'Which variable holds kernel parameters that are added to the normal (non-recovery) boot entries only?', o: ['{{GRUB_CMDLINE_LINUX}}', '{{GRUB_CMDLINE_LINUX_DEFAULT}}', '{{GRUB_KERNEL_OPTS}}', '{{GRUB_APPEND}}'], a: 1, e: '{{GRUB_CMDLINE_LINUX}} is added to all entries including recovery.' },
    { q: 'You booted a rescue system to repair a broken boot loader. What is the typical next step after mounting the installed root filesystem at {{/mnt}} (and binding /dev, /proc, /sys)?', o: ['{{chroot /mnt}}, then {{grub-install}}', '{{reboot}}', '{{fsck /mnt}}', '{{update-initramfs /mnt}}'], a: 0, e: 'chroot makes the installed system the root, so grub-install and update-grub use its configuration.' },
    { q: 'How many bytes of the MBR contain the boot loader code?', o: ['512', '446', '64', '2'], a: 1, e: '446 bytes code + 64 bytes partition table (4×16) + 2 bytes signature 0x55AA = 512.' },
  ],
});

LPIC.add({
  id: '102.3',
  title: 'Manage shared libraries',
  weight: 1,
  desc: 'Candidates should be able to determine the shared libraries that executable programs depend on and install them when necessary.',
  knowledge: ['Identify shared libraries.', 'Identify the typical locations of system libraries.', 'Load shared libraries.'],
  terms: ['ldd', 'ldconfig', '/etc/ld.so.conf', 'LD_LIBRARY_PATH'],
  wiki: String.raw`
## Static vs. shared libraries
A **library** is reusable code. Programs can be linked
- **statically** — library code is copied into the binary (bigger, self-contained, libraries end in {{.a}}), or
- **dynamically** — the program only references **shared objects** ({{.so}} files) that are loaded at run time. Advantages: smaller binaries, less RAM (shared pages), security fixes in one place.

Naming: {{libNAME.so.MAJOR.MINOR}} — e.g. {{libz.so.1.2.13}} with the **soname** symlink {{libz.so.1}} (what programs ask for) and the development link {{libz.so}} (used by the compiler).

## Where libraries live
- {{/lib}}, {{/lib64}}, {{/usr/lib}}, {{/usr/lib64}}
- Debian multiarch: {{/lib/x86_64-linux-gnu}}, {{/usr/lib/x86_64-linux-gnu}}
- locally installed software: {{/usr/local/lib}}; add-on packages: {{/opt/<pkg>/lib}}

## The dynamic linker/loader
When a dynamically linked program starts, the kernel runs the **dynamic linker** {{ld-linux.so.2}} / {{ld-linux-x86-64.so.2}}, which finds the needed libraries in this order:
1. directories in the environment variable **{{LD_LIBRARY_PATH}}**
2. the cache file **{{/etc/ld.so.cache}}** (binary, built by {{ldconfig}})
3. the default directories {{/lib}} and {{/usr/lib}}

## ldd — which libraries does a program need?
~~~console
$ ldd /usr/bin/ls
	linux-vdso.so.1 (0x00007ffd8b5f2000)
	libselinux.so.1 => /lib/x86_64-linux-gnu/libselinux.so.1 (0x00007f3a2c8a1000)
	libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f3a2c600000)
	/lib64/ld-linux-x86-64.so.2 (0x00007f3a2ca3e000)
~~~

A missing library is shown as {{libfoo.so.2 => not found}} — install the package containing it (find it with {{apt-file search}}, {{dpkg -S}}, {{dnf provides}}). {{ldd}} needs a **path** ({{ldd $(which ls)}}).

> WARN: Do not run {{ldd}} on untrusted binaries — it may execute them. {{objdump -p FILE | grep NEEDED}} is a safe alternative.

## ldconfig and /etc/ld.so.conf
{{/etc/ld.so.conf}} lists additional library directories; modern systems only contain an include line and keep the directories in {{/etc/ld.so.conf.d/*.conf}}:

~~~console
$ cat /etc/ld.so.conf
include /etc/ld.so.conf.d/*.conf
$ cat /etc/ld.so.conf.d/libc.conf
~~~
~~~file
# /etc/ld.so.conf.d/libc.conf — libc default configuration
/usr/local/lib
~~~

After installing a library into a new directory: add the directory to a {{.conf}} file and run **{{ldconfig}}** (as root). It creates the soname symlinks and rebuilds {{/etc/ld.so.cache}}.

~~~console
# echo /opt/vendorapp/lib > /etc/ld.so.conf.d/vendorapp.conf
# ldconfig
# ldconfig -p | grep libz
~~~

{{ldconfig -p}} prints the cache, {{-v}} is verbose, {{-n DIR}} processes only that directory.

## LD_LIBRARY_PATH — temporary, per user
~~~console
$ export LD_LIBRARY_PATH=/opt/vendorapp/lib:$LD_LIBRARY_PATH
$ LD_LIBRARY_PATH=/home/student/lib ./myprog
~~~

Good for testing or for users without root rights; for permanent system-wide paths use {{ld.so.conf.d}} + {{ldconfig}}. (It is ignored for SUID programs for security reasons.)
`,
  quiz: [
    { q: 'Which command lists the shared libraries required by {{/usr/bin/ssh}}?', fill: ['ldd /usr/bin/ssh'], e: '{{ldd}} prints the dependencies and where they were found.' },
    { q: 'After adding a new directory to a file in {{/etc/ld.so.conf.d/}}, which command must be run?', fill: ['ldconfig'], e: '{{ldconfig}} rebuilds {{/etc/ld.so.cache}} and the soname links.' },
    { q: 'Which environment variable adds directories that are searched for shared libraries before the cache?', fill: ['LD_LIBRARY_PATH'], e: 'Colon-separated list, e.g. {{LD_LIBRARY_PATH=/opt/app/lib}}.' },
    { q: 'Which file is the binary cache of library locations used by the dynamic linker?', o: ['{{/etc/ld.so.conf}}', '{{/etc/ld.so.cache}}', '{{/var/cache/ldconfig}}', '{{/lib/ld.so}}'], a: 1, e: '{{/etc/ld.so.conf}} is the text configuration; {{ldconfig}} writes the cache.' },
    { q: 'Which command prints the contents of the library cache?', o: ['{{ldd -p}}', '{{ldconfig -p}}', '{{cat /etc/ld.so.conf}}', '{{ldconfig -v -n}}'], a: 1, e: '{{ldconfig -p}} (or {{--print-cache}}).' },
    { q: 'What file name extension do shared libraries on Linux have?', o: ['{{.dll}}', '{{.a}}', '{{.so}}', '{{.lib}}'], a: 2, e: '"shared object", usually with a version suffix like {{.so.6}}. {{.a}} are static archives.' },
    { q: 'What does {{ldd}} print for a library that cannot be found?', o: ['{{=> missing}}', '{{=> not found}}', '{{=> ?}}', 'nothing'], a: 1, e: 'e.g. {{libfoo.so.1 => not found}} — install the package that ships it.' },
    { q: 'Which are typical locations of system libraries? (Choose two.)', o: ['{{/lib}}', '{{/usr/lib}}', '{{/etc/lib}}', '{{/var/lib}}'], a: [0, 1], e: '{{/var/lib}} holds variable state data of programs, not libraries.' },
    { q: 'Which program actually loads the shared libraries when a dynamically linked binary is started?', o: ['ldconfig', 'the dynamic linker ld-linux.so', 'ldd', 'the kernel module loader'], a: 1, e: '{{/lib64/ld-linux-x86-64.so.2}} is the interpreter of dynamic ELF binaries.' },
  ],
});

LPIC.add({
  id: '102.4',
  title: 'Use Debian package management',
  weight: 3,
  desc: 'Candidates should be able to perform package management using the Debian package tools.',
  knowledge: [
    'Install, upgrade and uninstall Debian binary packages.',
    'Find packages containing specific files or libraries which may or may not be installed.',
    'Obtain package information like version, content, dependencies, package integrity and installation status (whether or not the package is installed).',
    'Awareness of apt.',
  ],
  terms: ['/etc/apt/sources.list', 'dpkg', 'dpkg-reconfigure', 'apt-get', 'apt-cache'],
  sims: ['pkg'],
  wiki: String.raw`
## .deb packages and the tool stack
A Debian package {{name_version-revision_arch.deb}} (e.g. {{htop_3.2.2-2_amd64.deb}}) is an {{ar}} archive containing {{control.tar.*}} (metadata, maintainer scripts) and {{data.tar.*}} (files).
- **dpkg** — low level: installs/removes **local .deb files**, knows the database of installed packages ({{/var/lib/dpkg/}}), does **not** resolve dependencies or download.
- **APT** ({{apt-get}}, {{apt-cache}}, {{apt}}) — high level: downloads from repositories, resolves dependencies, calls dpkg.

## Repositories: /etc/apt/sources.list
~~~file
# type  URI                                   suite             components
deb     http://deb.debian.org/debian          bookworm          main contrib non-free-firmware
deb     http://security.debian.org/debian-security bookworm-security main
deb-src http://deb.debian.org/debian          bookworm          main
~~~

Additional repositories go into {{/etc/apt/sources.list.d/*.list}} (or the newer deb822 {{*.sources}} format). Components: {{main}} (free), {{contrib}} (free, depends on non-free), {{non-free}}. After changing sources: {{apt-get update}}.

## apt-get / apt
~~~console
# apt-get update
# apt-get upgrade
# apt-get dist-upgrade
# apt-get install htop
# apt-get install -y nginx
# apt-get remove htop
# apt-get purge htop
# apt-get autoremove
# apt-get install -f
# apt-get clean
$ apt-get download htop
~~~

| Command | Meaning |
|---|---|
| {{update}} | download the package lists (index) — does not install anything |
| {{upgrade}} | upgrade installed packages, never remove or add new ones |
| {{dist-upgrade}} / {{full-upgrade}} | upgrade with intelligent handling of changed dependencies (may install/remove) |
| {{install PKG}} | install incl. dependencies ({{--reinstall}}, {{-y}} assume yes, {{-s}} simulate) |
| {{remove PKG}} | remove, **keep configuration files** |
| {{purge PKG}} | remove **including configuration files** |
| {{autoremove}} | remove dependencies no longer needed |
| {{install -f}} | fix broken dependencies (e.g. after a failed {{dpkg -i}}) |
| {{clean}} / {{autoclean}} | empty the cache {{/var/cache/apt/archives/}} |

{{apt}} is the newer, user-friendly front end ({{apt install}}, {{apt list --installed}}, {{apt search}}, {{apt show}}, progress bar) — for scripts {{apt-get}} has the stable interface.

## apt-cache — querying
~~~console
$ apt-cache search "web server"
$ apt-cache show apache2
$ apt-cache depends apache2
$ apt-cache rdepends libssl3
$ apt-cache policy openssh-server
$ apt-cache pkgnames | head
~~~

## dpkg
~~~console
# dpkg -i /var/cache/apt/archives/htop_3.2.2-2_amd64.deb
# dpkg -r htop
# dpkg -P htop
$ dpkg -l
$ dpkg -l 'open*'
$ dpkg -L openssh-server
$ dpkg -S /usr/bin/ls
$ dpkg -s bash
$ dpkg -c htop_3.2.2-2_amd64.deb
$ dpkg -I htop_3.2.2-2_amd64.deb
$ dpkg --get-selections
~~~

| Option | Meaning |
|---|---|
| {{-i FILE.deb}} | install a package file (+ {{--force-depends}} etc. to override) |
| {{-r PKG}} / {{-P PKG}} | remove / purge |
| {{-l [PATTERN]}} | list packages with status ({{ii}} installed, {{rc}} removed but config left, {{un}} unknown) |
| {{-L PKG}} | files installed by a package |
| {{-S FILE}} | which installed package owns a file |
| {{-s PKG}} | status and metadata of an installed package |
| {{-c FILE.deb}} / {{-I FILE.deb}} | contents / control info of a .deb file |
| {{--configure -a}} | configure unpacked but unconfigured packages |

{{dpkg-query -W}} and {{dpkg-query -l}} are the query back end of {{dpkg -l/-L/-s}}.

## Reconfiguring a package
Many packages ask questions during installation (debconf). Run them again with:

~~~console
# dpkg-reconfigure tzdata
# dpkg-reconfigure locales
# dpkg-reconfigure keyboard-configuration
~~~

## Finding packages by file — installed or not
- installed: {{dpkg -S /path/file}}
- not installed: {{apt-file search libfoo.so.1}} (install {{apt-file}}, then {{apt-file update}}) or packages.debian.org

## Integrity
APT verifies repository signatures (Release/InRelease files signed with GPG keys in {{/etc/apt/trusted.gpg.d/}}). Installed files can be checked against MD5 sums in {{/var/lib/dpkg/info/*.md5sums}} with {{debsums}} or {{dpkg --verify PKG}}.

> EXAM: dpkg = local files, no dependency resolution. apt-get = repositories + dependencies. Know {{-i -r -P -l -L -S -s}} for dpkg and {{update / upgrade / dist-upgrade / install / remove / purge / autoremove}} for apt-get.
`,
  quiz: [
    { q: 'Which command shows which installed package owns the file {{/usr/bin/ssh}}?', fill: ['dpkg -S /usr/bin/ssh', 'dpkg --search /usr/bin/ssh'], e: '{{dpkg -S}} searches the file lists of installed packages.' },
    { q: 'Which command removes a package **including** its configuration files?', o: ['{{apt-get remove PKG}}', '{{dpkg -r PKG}}', '{{apt-get purge PKG}}', '{{apt-get clean PKG}}'], a: 2, e: '{{purge}} / {{dpkg -P}} delete config files too; {{remove}} / {{dpkg -r}} keep them (status {{rc}}).' },
    { q: 'Which command updates the local package index from the repositories?', fill: ['apt-get update', 'apt update'], e: 'Does not upgrade anything; run {{upgrade}} afterwards.' },
    { q: 'Which command lists all files installed by the package {{coreutils}}?', fill: ['dpkg -L coreutils', 'dpkg --listfiles coreutils', 'dpkg-query -L coreutils'], e: '{{-L}} = list files.' },
    { q: 'In which file are the APT package sources configured?', fill: ['/etc/apt/sources.list'], e: 'Plus {{/etc/apt/sources.list.d/}}.' },
    { q: 'An installation with {{dpkg -i foo.deb}} failed because of missing dependencies. Which command fixes this?', o: ['{{dpkg --fix}}', '{{apt-get install -f}}', '{{apt-get update}}', '{{dpkg-reconfigure foo}}'], a: 1, e: '{{apt-get install -f}} ("fix broken") downloads the missing dependencies and finishes the configuration.' },
    { q: 'Which command reruns the configuration dialog of an installed package, e.g. the time zone setup?', fill: ['dpkg-reconfigure tzdata', 'dpkg-reconfigure'], e: 'Uses the debconf questions of the package.' },
    { q: 'What is the difference between {{apt-get upgrade}} and {{apt-get dist-upgrade}}?', o: ['There is none.', 'dist-upgrade may install new or remove existing packages to resolve changed dependencies.', 'upgrade also upgrades the distribution release.', 'dist-upgrade only downloads.'], a: 1, e: '{{upgrade}} never removes or adds packages.' },
    { q: 'Which command shows the dependencies of the package {{apache2}} without installing it?', o: ['{{apt-cache depends apache2}}', '{{dpkg -L apache2}}', '{{apt-get deps apache2}}', '{{dpkg -I apache2}}'], a: 0, e: 'Also {{apt-cache show}} (Depends: line). {{rdepends}} shows reverse dependencies.' },
    { q: 'What does the status {{rc}} in the output of {{dpkg -l}} mean?', o: ['installed and configured', 'removed, but configuration files remain', 'reinstall required', 'currently being configured'], a: 1, e: 'r = desired remove, c = config-files state. {{ii}} = installed.' },
    { q: 'Which tool finds the package that contains a file even if the package is **not** installed?', o: ['{{dpkg -S}}', '{{apt-file search}}', '{{apt-cache policy}}', '{{dpkg -c}}'], a: 1, e: '{{apt-file}} searches the Contents indices of the repositories.' },
    { q: 'Which command lists the contents of a .deb file that is not installed?', fill: ['dpkg -c', 'dpkg --contents', 'dpkg-deb -c'], e: 'e.g. {{dpkg -c htop_3.2.2-2_amd64.deb}}; {{-I}} shows the control information.' },
    { q: 'Which statements about dpkg are true? (Choose two.)', o: ['It installs local .deb files.', 'It downloads packages from repositories.', 'It does not resolve dependencies automatically.', 'It reads {{/etc/apt/sources.list}}.'], a: [0, 2], e: 'Downloading and dependency resolution are APT\'s job.' },
  ],
});

LPIC.add({
  id: '102.5',
  title: 'Use RPM and YUM package management',
  weight: 3,
  desc: 'Candidates should be able to perform package management using RPM, YUM and Zypper.',
  knowledge: [
    'Install, re-install, upgrade and remove packages using RPM, YUM and Zypper.',
    'Obtain information on RPM packages such as version, status, dependencies, integrity and signatures.',
    'Determine what files a package provides, as well as find which package a specific file comes from.',
    'Awareness of dnf.',
  ],
  terms: ['rpm', 'rpm2cpio', '/etc/yum.conf', '/etc/yum.repos.d/', 'yum', 'zypper'],
  sims: ['pkg'],
  wiki: String.raw`
## RPM packages
File name: {{name-version-release.architecture.rpm}}, e.g. {{httpd-2.4.57-5.el9.x86_64.rpm}} ({{noarch}} for architecture independent, {{src.rpm}} for sources). The database of installed packages lives in {{/var/lib/rpm/}}.
- **rpm** — low level, local files, no repository access, no automatic dependency resolution.
- **yum** (Yellowdog Updater Modified; RHEL ≤ 7) and its successor **dnf** (Fedora, RHEL 8+, where {{yum}} is a link to dnf) — repositories + dependencies.
- **zypper** — openSUSE / SLES front end (libzypp).

> NOTE: The sandbox is Debian based but contains a simulated RPM database, so you can practise {{rpm -qa}}, {{rpm -qi bash}}, {{yum install nginx}} … there as well.

## rpm — installing, upgrading, removing
~~~console
# rpm -ivh htop-3.2.2-2.el9.x86_64.rpm
# rpm -Uvh htop-3.2.3-1.el9.x86_64.rpm
# rpm -Fvh *.rpm
# rpm -e htop
# rpm -ivh --nodeps foo.rpm
# rpm -ivh --test foo.rpm
# rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-Rocky-9
~~~

| Option | Meaning |
|---|---|
| {{-i}} | install ({{-v}} verbose, {{-h}} hash marks progress) |
| {{-U}} | **upgrade** — installs if not present, replaces older versions |
| {{-F}} | **freshen** — upgrade only packages that are already installed |
| {{-e}} | erase (remove) |
| {{--nodeps}}, {{--force}}, {{--test}}, {{--replacepkgs}} | override checks, dry run, reinstall |

## rpm — querying ({{-q}})
~~~console
$ rpm -qa
$ rpm -qa | grep ssh
$ rpm -q bash
$ rpm -qi bash
$ rpm -ql openssh-server
$ rpm -qc openssh-server
$ rpm -qd bash
$ rpm -qf /etc/ssh/sshd_config
$ rpm -qR httpd
$ rpm -qpi htop-3.2.2-2.el9.x86_64.rpm
$ rpm -qpl htop-3.2.2-2.el9.x86_64.rpm
$ rpm -q --changelog bash | head
~~~

| Query | Shows |
|---|---|
| {{-qa}} | all installed packages |
| {{-qi PKG}} | information (version, release, install date, signature, summary) |
| {{-ql PKG}} | file list; {{-qc}} config files only, {{-qd}} documentation |
| {{-qf FILE}} | which package owns FILE |
| {{-qR PKG}} | requirements (dependencies); {{--provides}} capabilities provided |
| {{-qp …}} | query a **package file** instead of the database (combine: {{-qpi}}, {{-qpl}}) |

## Integrity and signatures
~~~console
$ rpm -K htop-3.2.2-2.el9.x86_64.rpm
$ rpm -V openssh-server
S.5....T.  c /etc/ssh/sshd_config
$ rpm -Va
~~~

{{rpm -K}} ({{--checksig}}) verifies digests and the GPG signature of a package file. {{rpm -V}} verifies installed files against the database; each character marks a difference: **S** size, **M** mode, **5** digest, **D** device, **L** link, **U** user, **G** group, **T** mtime, **P** capabilities; {{c}} = config file.

## rpm2cpio — extracting without installing
~~~console
$ rpm2cpio htop-3.2.2-2.el9.x86_64.rpm | cpio -idmv
~~~

{{-i}} extract, {{-d}} create directories, {{-m}} keep modification times, {{-v}} verbose. Useful to restore a single deleted file.

## yum and dnf
~~~console
# yum install nginx
# yum remove nginx
# yum update
# yum update kernel
$ yum check-update
$ yum search nginx
$ yum info nginx
$ yum list installed
$ yum list available
$ yum provides /usr/bin/htop
$ yum whatprovides '*/libz.so.1'
$ yum repolist
# yum clean all
$ yum history
# yum reinstall bash
# yum localinstall ./foo.rpm
# yum groupinstall "Development Tools"
$ yumdownloader htop
~~~

dnf uses the same subcommands ({{dnf install}}, {{dnf upgrade}}, {{dnf provides}}, {{dnf history undo 5}} …).

Configuration: **{{/etc/yum.conf}}** (dnf: {{/etc/dnf/dnf.conf}}) for global options ({{gpgcheck}}, {{installonly_limit}}, {{cachedir}}) and repositories in **{{/etc/yum.repos.d/*.repo}}**:

~~~file
[baseos]
name=Rocky Linux $releasever - BaseOS
baseurl=http://dl.rockylinux.org/pub/rocky/$releasever/BaseOS/$basearch/os/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-Rocky-9
~~~

Enable/disable a repo for one command: {{yum --enablerepo=epel install htop}}; permanently {{yum-config-manager --enable epel}} / {{dnf config-manager --set-enabled epel}}.

## zypper (SUSE)
~~~console
# zypper refresh
# zypper install nginx
# zypper remove nginx
# zypper update
$ zypper search nginx
$ zypper info nginx
$ zypper repos
# zypper addrepo http://download.opensuse.org/repositories/X/ myrepo
$ zypper what-provides /usr/bin/htop
~~~

Short forms: {{in}}, {{rm}}, {{se}}, {{if}}, {{up}}, {{ref}}, {{lr}}, {{ar}}, {{rr}}. Repositories in {{/etc/zypp/repos.d/}}.
`,
  quiz: [
    { q: 'Which command lists all installed RPM packages?', fill: ['rpm -qa'], e: '{{-q}} query, {{-a}} all.' },
    { q: 'Which command shows which RPM package installed the file {{/etc/ssh/sshd_config}}?', fill: ['rpm -qf /etc/ssh/sshd_config'], e: '{{-qf}} = query file.' },
    { q: 'What is the difference between {{rpm -U}} and {{rpm -F}}?', o: ['-U only installs new packages, -F only removes.', '-U upgrades or installs; -F upgrades only packages that are already installed.', 'They are identical.', '-F forces the installation.'], a: 1, e: '"Freshen" ignores packages that are not installed yet.' },
    { q: 'Which command lists the files contained in the package file {{foo.rpm}} that is not installed?', o: ['{{rpm -ql foo.rpm}}', '{{rpm -qpl foo.rpm}}', '{{rpm -lf foo.rpm}}', '{{rpm -V foo.rpm}}'], a: 1, e: '{{-p}} makes rpm query the package file instead of the database.' },
    { q: 'Which command extracts the contents of an RPM file without installing it?', o: ['{{rpm -x pkg.rpm}}', '{{rpm2cpio pkg.rpm | cpio -idmv}}', '{{tar xf pkg.rpm}}', '{{yum extract pkg.rpm}}'], a: 1, e: '{{rpm2cpio}} converts the payload to a cpio stream.' },
    { q: 'In which directory are YUM repository definitions stored?', fill: ['/etc/yum.repos.d', '/etc/yum.repos.d/'], e: 'Files ending in {{.repo}}; global settings in {{/etc/yum.conf}}.' },
    { q: 'Which yum command finds the package that provides a given file, even if it is not installed?', o: ['{{yum search FILE}}', '{{yum provides FILE}}', '{{yum info FILE}}', '{{yum list FILE}}'], a: 1, e: 'Also {{yum whatprovides}}; dnf uses {{dnf provides}}.' },
    { q: 'Which command verifies an installed RPM package against the RPM database?', fill: ['rpm -V', 'rpm --verify'], e: 'Output like {{S.5....T.}} shows size, digest and mtime changes.' },
    { q: 'Which command refreshes the repository metadata in zypper?', o: ['{{zypper update}}', '{{zypper refresh}}', '{{zypper reload}}', '{{zypper clean}}'], a: 1, e: 'Short form {{zypper ref}}.' },
    { q: 'Which command checks the GPG signature of the package file {{foo.rpm}}?', o: ['{{rpm -K foo.rpm}}', '{{rpm -V foo.rpm}}', '{{rpm -qi foo.rpm}}', '{{gpg --verify foo.rpm}}'], a: 0, e: '{{rpm -K}} = {{--checksig}}; import keys with {{rpm --import}}.' },
    { q: 'Which tool is the successor of yum on Fedora and RHEL 8+?', fill: ['dnf'], e: 'On RHEL 8+ the {{yum}} command is a link to dnf.' },
    { q: 'Which rpm option shows the dependencies (requirements) of an installed package?', o: ['{{-qd}}', '{{-qR}}', '{{-qc}}', '{{-qs}}'], a: 1, e: '{{-qR}} = {{--requires}}. {{-qd}} docs, {{-qc}} config files, {{-qs}} states.' },
    { q: 'Which zypper command installs the package {{nginx}}? (Choose two.)', o: ['{{zypper install nginx}}', '{{zypper in nginx}}', '{{zypper add nginx}}', '{{zypper -i nginx}}'], a: [0, 1], e: '{{in}} is the short form of {{install}}.' },
  ],
});

LPIC.add({
  id: '102.6',
  title: 'Linux as a virtualization guest',
  weight: 1,
  desc: 'Candidates should understand the implications of virtualization and cloud computing on a Linux guest system.',
  knowledge: [
    'Understand the general concept of virtual machines and containers.',
    'Understand common elements virtual machines in an IaaS cloud, such as computing instances, block storage and networking.',
    'Understand unique properties of a Linux system which have to changed when a system is cloned or used as a template.',
    'Understand how system images are used to deploy virtual machines, cloud instances and containers.',
    'Understand Linux extensions which integrate Linux with a virtualization product.',
    'Awareness of cloud-init.',
  ],
  terms: ['Virtual machine', 'Linux container', 'Application container', 'Guest drivers', 'SSH host keys', 'D-Bus machine id'],
  wiki: String.raw`
## Virtual machines
A **hypervisor** runs several **virtual machines** (guests), each with its own virtual hardware and its own kernel:
- **Type 1 / bare metal**: runs directly on the hardware — KVM (part of the Linux kernel), Xen, VMware ESXi, Hyper-V.
- **Type 2 / hosted**: runs as an application on a host OS — VirtualBox, VMware Workstation, QEMU without KVM.

Kinds of virtualization:
- **full virtualization**: the guest runs unmodified (needs CPU support: Intel **VT-x** / AMD **AMD-V**, flags {{vmx}}/{{svm}} in {{/proc/cpuinfo}}),
- **paravirtualization**: the guest knows it is virtual and uses special drivers/interfaces (Xen PV, **virtio**) — faster I/O.

~~~console
$ systemd-detect-virt
kvm
$ grep -cE 'vmx|svm' /proc/cpuinfo
$ hostnamectl | grep -i virtual
$ lscpu | grep -i hypervisor
~~~

## Containers
Containers share the **host kernel**; isolation comes from kernel features: **namespaces** (own PID, network, mount, user, UTS view) and **cgroups** (resource limits).
- **System (Linux) containers** — e.g. LXC/LXD: a full distribution with init, like a lightweight VM.
- **Application containers** — e.g. Docker, Podman: one application/process plus its libraries, built from layered **images**.

Containers start in milliseconds and are small, but cannot run a different kernel (e.g. Windows on Linux).

## Guest drivers / integration
Virtualization products provide drivers and tools that make the guest work better: paravirtual disk and network drivers (**virtio_blk**, **virtio_net**, **vmxnet3**), memory **balloon** driver, clock synchronisation, shared folders, copy & paste, screen resizing, clean shutdown from the host.
- KVM/QEMU: virtio modules (in the kernel) + **qemu-guest-agent**
- VirtualBox: **Guest Additions** ({{vboxguest}}, {{vboxsf}}, {{vboxvideo}})
- VMware: **open-vm-tools** ({{vmtoolsd}})
- Hyper-V: hv_* modules, hyperv-daemons

~~~console
$ lsmod | grep -E 'virtio|vbox|vmw|hv_'
~~~

## IaaS cloud building blocks
**Infrastructure as a Service**: you rent virtual infrastructure (AWS EC2, Azure, GCP, OpenStack):
- **computing instances** — VMs with a chosen size (vCPU/RAM, "flavor"/"instance type"),
- **block storage** — virtual disks (volumes) attached to instances, persistent independent of the instance,
- **object storage** — buckets accessed over HTTP (S3),
- **networking** — virtual networks, subnets, security groups (firewall rules), public/floating IPs, load balancers.

## Images and templates
VMs, cloud instances and containers are deployed from **images**: a prepared disk image (qcow2, VMDK, VHD, AMI) or a container image (layers). Cloning means every copy starts identical — so **unique identity data must be changed** in each clone:

| Item | Where / how to reset |
|---|---|
| **SSH host keys** | {{/etc/ssh/ssh_host_*}} — delete and regenerate ({{ssh-keygen -A}} or {{dpkg-reconfigure openssh-server}}); otherwise all clones share the same key → clients cannot detect a man-in-the-middle |
| **D-Bus / systemd machine ID** | {{/etc/machine-id}} (and {{/var/lib/dbus/machine-id}}) — empty it and run {{systemd-machine-id-setup}} / {{dbus-uuidgen --ensure}} |
| hostname | {{/etc/hostname}}, {{hostnamectl set-hostname}} |
| MAC address dependent config | udev persistent net rules, static IPs, DHCP client IDs |
| filesystem UUIDs | {{tune2fs -U random}}, {{xfs_admin -U generate}} if disks are cloned and attached to the same host |
| user data | shell histories, logs, temporary files, SSH authorized keys of the template user |

Tools such as {{virt-sysprep}} automate this.

## cloud-init
**cloud-init** is the standard tool that configures a cloud instance at its first boot using **metadata** from the cloud provider and **user data** you supply: set the hostname, create users, install SSH public keys, grow the root partition, install packages, write files, run commands. Configuration usually in YAML ({{#cloud-config}}), files in {{/etc/cloud/}}.

~~~file
#cloud-config
hostname: web01
users:
  - name: admin
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3Nza... admin@laptop
    sudo: ALL=(ALL) NOPASSWD:ALL
packages:
  - nginx
runcmd:
  - systemctl enable --now nginx
~~~
`,
  quiz: [
    { q: 'Which unique files should be regenerated after cloning a VM template? (Choose two.)', o: ['SSH host keys in {{/etc/ssh/}}', '{{/etc/passwd}}', 'the machine ID {{/etc/machine-id}}', '{{/etc/fstab}}'], a: [0, 2], e: 'Every machine needs its own SSH host keys and D-Bus/systemd machine ID.' },
    { q: 'What do containers share with their host?', o: ['Nothing — they emulate full hardware.', 'The kernel', 'The BIOS', 'Their own hypervisor'], a: 1, e: 'Containers are isolated processes using namespaces and cgroups on the host kernel.' },
    { q: 'Which tool configures a cloud instance at first boot using user data and metadata?', fill: ['cloud-init'], e: 'cloud-init creates users, installs SSH keys, sets the hostname, runs commands …' },
    { q: 'Which CPU flags indicate hardware virtualization support? (Choose two.)', o: ['{{vmx}}', '{{svm}}', '{{ht}}', '{{lm}}'], a: [0, 1], e: '{{vmx}} = Intel VT-x, {{svm}} = AMD-V. {{lm}} = 64-bit long mode, {{ht}} = hyper-threading.' },
    { q: 'What is the main purpose of guest drivers such as virtio or VirtualBox Guest Additions?', o: ['To emulate a BIOS', 'To improve performance and integration of the guest with the hypervisor', 'To encrypt the VM disk', 'To convert containers into VMs'], a: 1, e: 'Paravirtual disk/network drivers, ballooning, time sync, shared folders, clean shutdown.' },
    { q: 'In an IaaS cloud, what is a persistent virtual disk that can be attached to a computing instance called?', o: ['object storage', 'block storage (volume)', 'ephemeral cache', 'container image'], a: 1, e: 'Block storage behaves like a disk; object storage (S3) is accessed via HTTP.' },
    { q: 'Which type of container runs a single application with its dependencies, e.g. with Docker?', o: ['system container', 'application container', 'virtual machine', 'chroot jail'], a: 1, e: 'System containers (LXC) run a whole distribution including init.' },
    { q: 'Which command reports the virtualization technology a Linux system runs on?', fill: ['systemd-detect-virt'], e: 'Prints e.g. {{kvm}}, {{oracle}}, {{vmware}}, {{docker}} or {{none}}.' },
    { q: 'Which file contains the unique machine ID used by systemd and D-Bus?', fill: ['/etc/machine-id'], e: 'Also {{/var/lib/dbus/machine-id}} (often a symlink).' },
  ],
});
