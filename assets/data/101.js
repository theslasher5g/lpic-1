/* Topic 101: System Architecture */
LPIC.add({
  id: '101.1',
  title: 'Determine and configure hardware settings',
  weight: 2,
  desc: 'Candidates should be able to determine and configure fundamental system hardware.',
  knowledge: [
    'Enable and disable integrated peripherals.',
    'Differentiate between the various types of mass storage devices.',
    'Determine hardware resources for devices.',
    'Tools and utilities to list various hardware information (e.g. lsusb, lspci, etc.).',
    'Tools and utilities to manipulate USB devices.',
    'Conceptual understanding of sysfs, udev and dbus.',
  ],
  terms: ['/sys/', '/proc/', '/dev/', 'modprobe', 'lsmod', 'lspci', 'lsusb'],
  sims: ['boot'],
  wiki: String.raw`
## Firmware: enabling and disabling integrated peripherals
Integrated devices (on-board sound, network, serial ports, USB controllers, virtualization extensions, Secure Boot …) are switched on or off in the **firmware setup** — the BIOS or UEFI setup program you reach by pressing a key such as <kbd>Del</kbd>, <kbd>F2</kbd> or <kbd>F10</kbd> during POST. Linux can only use what the firmware exposes.

Inside Linux you can additionally *stop using* a device by not loading (or blacklisting) its **kernel module**:

~~~file
# /etc/modprobe.d/blacklist.conf
blacklist pcspkr        # never auto-load the PC speaker driver
options snd-hda-intel power_save=1
~~~

> TIP: {{BIOS}} = legacy firmware, boots from the MBR. {{UEFI}} = modern firmware with its own boot manager, reads boot loaders from the FAT32 *EFI System Partition* (ESP). Details in 101.2 and 102.2.

## The three virtual information sources: /proc, /sys, /dev
| Directory | What it is | Examples |
|---|---|---|
| {{/proc}} | **procfs** — kernel and process information, generated on the fly, mostly read-only | {{/proc/cpuinfo}}, {{/proc/meminfo}}, {{/proc/interrupts}}, {{/proc/ioports}}, {{/proc/dma}}, {{/proc/modules}}, {{/proc/<PID>/}} |
| {{/sys}} | **sysfs** — the kernel's device model: buses, devices, drivers, classes; attributes as small files | {{/sys/class/net/}}, {{/sys/block/}}, {{/sys/bus/usb/devices/}} |
| {{/dev}} | **device files** (nodes) created by **udev** — the interface programs use to talk to devices | {{/dev/sda}}, {{/dev/nvme0n1}}, {{/dev/ttyS0}}, {{/dev/null}} |

~~~console
$ cat /proc/cpuinfo | grep "model name"
model name	: Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz
model name	: Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz
$ grep MemTotal /proc/meminfo
MemTotal:        4028252 kB
$ cat /sys/class/net/enp0s3/address
08:00:27:4e:66:a1
~~~

## Hardware resources: IRQs, I/O ports, DMA
Classic PC devices need resources the kernel lists in procfs:
- **IRQ** (interrupt request line) — the device signals the CPU: {{/proc/interrupts}}
- **I/O ports** — address range for port-mapped I/O: {{/proc/ioports}}
- **DMA channels** — direct memory access without the CPU: {{/proc/dma}}

~~~console
$ cat /proc/interrupts
$ cat /proc/ioports
$ cat /proc/dma
~~~

> EXAM: Know which file shows what: interrupts → {{/proc/interrupts}}, I/O addresses → {{/proc/ioports}}, DMA → {{/proc/dma}}. On classic PCs IRQ 0 is the timer, IRQ 1 the keyboard, IRQ 8 the RTC, 14/15 the IDE controllers.

## Listing hardware: lspci, lsusb, lscpu, lsblk
{{lspci}} shows devices on the PCI/PCIe bus (graphics, network, storage controllers). {{-k}} shows the kernel driver in use and available modules, {{-v}}/{{-vv}} verbose, {{-nn}} the numeric vendor:device IDs, {{-s 00:03.0}} a single slot.

~~~console
$ lspci
$ lspci -k
~~~

{{lsusb}} lists USB devices with bus/device number and the vendor:product ID; {{-t}} shows the topology as a tree, {{-v}} the descriptors, {{-d 0781:5567}} filters by ID.

~~~console
$ lsusb
$ lsusb -t
~~~

Other useful tools: {{lscpu}} (CPU architecture), {{lsblk}} (block devices as a tree), {{lshw}} (everything, as root), {{dmidecode}} (firmware tables — vendor, serial numbers, RAM slots), {{hwinfo}} (SUSE).

## Kernel modules: lsmod, modprobe, modinfo
Most drivers are **loadable kernel modules** ({{.ko}} files under {{/lib/modules/$(uname -r)/}}).

| Command | Purpose |
|---|---|
| {{lsmod}} | list loaded modules (name, size, use count, dependent modules) — reads {{/proc/modules}} |
| {{modinfo MODULE}} | show description, license, file name, dependencies, parameters |
| {{modprobe MODULE}} | load a module **plus its dependencies** (uses {{modules.dep}}, built by {{depmod}}) |
| {{modprobe -r MODULE}} | unload a module (and now unused dependencies) |
| {{insmod /path/file.ko}} | load one module file — no dependency resolution |
| {{rmmod MODULE}} | unload one module |

~~~console
$ lsmod | head -5
# modinfo e1000
$ sudo modprobe -v vfat
$ lsmod | grep fat
$ sudo modprobe -r vfat
~~~

Persistent configuration: {{/etc/modprobe.d/*.conf}} ({{blacklist}}, {{options}}, {{alias}}, {{install}}) and modules to load at boot in {{/etc/modules-load.d/*.conf}} (systemd) or {{/etc/modules}} (Debian).

> WARN: {{modprobe -r}} refuses to remove a module that is in use (use count > 0). {{rmmod}} works on single modules and does not care about dependencies.

## Mass storage devices
| Type | Interface | Linux device names |
|---|---|---|
| HDD / SSD (SATA, SAS, USB, SCSI) | via the SCSI disk driver | {{/dev/sda}}, {{/dev/sdb}} … partitions {{/dev/sda1}} |
| NVMe SSD | PCIe | {{/dev/nvme0n1}}, partitions {{/dev/nvme0n1p1}} |
| SD/MMC cards, eMMC | MMC | {{/dev/mmcblk0}}, {{/dev/mmcblk0p1}} |
| Virtual disks (KVM virtio) | virtio | {{/dev/vda}}, {{/dev/vda1}} |
| Optical drives | SCSI/ATAPI | {{/dev/sr0}} (symlink {{/dev/cdrom}}) |
| old IDE/PATA | (legacy driver) | {{/dev/hda}} … |

HDDs have spinning platters (seek time), **SSDs** use flash (fast random access, limited write cycles, TRIM via {{fstrim}}). USB sticks and card readers appear as SCSI disks ({{sdX}}).

## Hot-plugging: udev, sysfs and D-Bus
When you plug in a device the kernel creates an entry in **sysfs** and sends a **uevent**. The **udev** daemon ({{systemd-udevd}}) receives it, applies rules from {{/lib/udev/rules.d/}} and {{/etc/udev/rules.d/}}, loads the driver module if needed and **creates the device node in {{/dev}}** — including persistent symlinks such as {{/dev/disk/by-uuid/…}} and {{/dev/disk/by-id/…}}. Finally applications are notified via **D-Bus**, the message bus that desktop components (file managers, NetworkManager, udisks) use to talk to each other.

~~~console
$ udevadm info /dev/sda
$ udevadm monitor
$ cat /etc/udev/rules.d/70-usb-backup.rules
$ ls -l /dev/disk/by-uuid/
~~~

> EXAM: **sysfs** ({{/sys}}) = kernel's view of the devices, **udev** = userspace daemon that creates {{/dev}} entries following rules, **D-Bus** = inter-process communication bus that tells applications about the new hardware.

## Manipulating USB devices
- see what happened: {{dmesg}} or {{journalctl -k -f}} right after plugging in
- identify: {{lsusb}}, {{lsblk}}, {{udevadm info}}
- storage needs the {{usb_storage}} module; HID devices use {{usbhid}}
- safely remove a stick: {{umount /media/usb}} (or {{udisksctl unmount -b /dev/sdc1}} and {{udisksctl power-off -b /dev/sdc}})
`,
  quiz: [
    { q: 'Which file shows the interrupt (IRQ) assignments of the system?', o: ['{{/proc/interrupts}}', '{{/proc/irq}}', '{{/sys/irq}}', '{{/proc/ioports}}'], a: 0, e: '{{/proc/interrupts}} lists every IRQ with per-CPU counters and the driver. {{/proc/ioports}} lists I/O port ranges.' },
    { q: 'Which command lists the currently loaded kernel modules?', fill: ['lsmod'], e: '{{lsmod}} formats the contents of {{/proc/modules}}.' },
    { q: 'Which command loads a kernel module **including all modules it depends on**?', o: ['{{insmod}}', '{{modprobe}}', '{{depmod}}', '{{lsmod -a}}'], a: 1, e: '{{modprobe}} uses {{modules.dep}} to resolve dependencies. {{insmod}} loads only the single file given.' },
    { q: 'Which option of {{lspci}} shows the kernel driver in use for each device?', o: ['{{-t}}', '{{-k}}', '{{-d}}', '{{-n}}'], a: 1, e: '{{lspci -k}} prints "Kernel driver in use" and "Kernel modules". {{-n}} shows numeric IDs, {{-t}} a tree.' },
    { q: 'Which pseudo filesystem exposes the kernel\'s device model (buses, devices, drivers) as directories and attribute files?', o: ['procfs ({{/proc}})', 'sysfs ({{/sys}})', 'devtmpfs ({{/dev}})', 'tmpfs ({{/run}})'], a: 1, e: 'sysfs is mounted on {{/sys}}. udev uses it to learn about devices and then creates the device nodes in {{/dev}}.' },
    { q: 'Which component creates device nodes in {{/dev}} dynamically when hardware is hot-plugged?', o: ['D-Bus', 'udev', 'HAL', 'init'], a: 1, e: 'udev (systemd-udevd) receives kernel uevents and applies rules from {{/etc/udev/rules.d/}} and {{/lib/udev/rules.d/}}.' },
    { q: 'Which command shows a tree view of USB buses and connected devices?', o: ['{{lsusb -v}}', '{{lsusb -t}}', '{{lspci -t}}', '{{usbtree}}'], a: 1, e: '{{lsusb -t}} prints the topology; {{-v}} prints verbose descriptors.' },
    { q: 'Which file lists the I/O port address ranges used by devices?', fill: ['/proc/ioports'], e: 'Hardware resources: {{/proc/interrupts}} (IRQ), {{/proc/ioports}} (I/O ports), {{/proc/dma}} (DMA channels).' },
    { q: 'You want a driver module never to be loaded automatically. What do you add to a file in {{/etc/modprobe.d/}}?', o: ['{{remove MODULE}}', '{{blacklist MODULE}}', '{{deny MODULE}}', '{{disable MODULE}}'], a: 1, e: 'Example: {{blacklist pcspkr}} in {{/etc/modprobe.d/blacklist.conf}}.' },
    { q: 'What is the Linux device name of the first partition of the first NVMe SSD?', o: ['{{/dev/sda1}}', '{{/dev/nvme0n1p1}}', '{{/dev/nvme1p0}}', '{{/dev/hda1}}'], a: 1, e: 'NVMe: controller {{nvme0}}, namespace {{n1}}, partition {{p1}}. SATA/SCSI/USB disks use {{/dev/sdX}}.' },
    { q: 'Which statements about D-Bus are correct? (Choose two.)', o: ['It is a message bus for communication between processes.', 'It creates the device files in {{/dev}}.', 'Desktop applications learn about newly attached hardware through it.', 'It replaces the kernel module loader.'], a: [0, 2], e: 'udev creates device nodes; D-Bus distributes events and allows IPC between system services and applications.' },
    { q: 'Which command shows detailed information such as description, license and parameters of the kernel module {{e1000}}?', fill: ['modinfo e1000'], e: '{{modinfo}} reads the information embedded in the {{.ko}} file.' },
    { q: 'Integrated hardware (e.g. on-board audio) has to be disabled completely so the OS cannot see it. Where is this done?', o: ['In {{/etc/modprobe.d/}}', 'In the BIOS/UEFI setup', 'With {{lspci -d}}', 'In {{/proc/sys/dev}}'], a: 1, e: 'Only the firmware setup can switch off integrated peripherals; Linux can merely avoid loading the driver.' },
    { q: 'Which file does {{lsmod}} read its information from?', o: ['{{/proc/modules}}', '{{/etc/modules}}', '{{/lib/modules/modules.dep}}', '{{/sys/modules.list}}'], a: 0, e: '{{/etc/modules}} (Debian) lists modules to load at boot — that is configuration, not the current state.' },
  ],
});

LPIC.add({
  id: '101.2',
  title: 'Boot the system',
  weight: 3,
  desc: 'Candidates should be able to guide the system through the booting process.',
  knowledge: [
    'Provide common commands to the boot loader and options to the kernel at boot time.',
    'Demonstrate knowledge of the boot sequence from BIOS/UEFI to boot completion.',
    'Understanding of SysVinit and systemd.',
    'Awareness of Upstart.',
    'Check boot events in the log files.',
  ],
  terms: ['dmesg', 'journalctl', 'BIOS', 'UEFI', 'bootloader', 'kernel', 'initramfs', 'init', 'SysVinit', 'systemd'],
  sims: ['boot', 'targets'],
  wiki: String.raw`
## The boot sequence at a glance
1. **Firmware** — BIOS or UEFI runs the **POST** (power-on self test) and initialises hardware.
2. **Boot loader** — BIOS: code in the **MBR** (first 512 bytes) loads GRUB; UEFI: the firmware loads an EFI application (e.g. {{grubx64.efi}}) from the **EFI System Partition**.
3. **GRUB** shows a menu, loads the **kernel** ({{/boot/vmlinuz-*}}) and the **initramfs** ({{/boot/initrd.img-*}}) into memory and passes the **kernel command line**.
4. **Kernel** initialises CPU, memory, drivers; mounts the initramfs as a temporary root.
5. **initramfs** loads the drivers needed to reach the real root filesystem (RAID, LVM, LUKS, NVMe…), mounts it and switches to it.
6. The kernel starts **{{/sbin/init}}** — PID 1 — today almost always **systemd**, historically **SysVinit** or Upstart.
7. init starts services until the default **target / runlevel** is reached, then **getty** or a display manager offers a login.

Open the *Boot sequence explorer* simulation to step through this with BIOS vs. UEFI and SysV vs. systemd.

## BIOS vs. UEFI
| | BIOS (legacy) | UEFI |
|---|---|---|
| boot code location | MBR (446 bytes boot code + 64 bytes partition table + 0x55AA) | {{.efi}} files on the ESP (FAT32, often mounted at {{/boot/efi}}) |
| partition table | usually MBR (max. 2 TiB) | GPT (CSM can emulate BIOS) |
| boot manager | none — just "boot order" | built in, entries in NVRAM ({{efibootmgr}}) |
| security | – | Secure Boot (signed boot loaders, {{shimx64.efi}}) |

## Talking to the boot loader and the kernel
In the GRUB menu press <kbd>e</kbd> to edit the selected entry; the line starting with {{linux}} holds the kernel and its parameters. Boot the edited entry with <kbd>Ctrl</kbd>+<kbd>X</kbd> or <kbd>F10</kbd>; <kbd>c</kbd> opens the GRUB command line. Changes are only for this one boot.

~~~file
linux /boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-... ro quiet systemd.unit=rescue.target
~~~

| Kernel parameter | Effect |
|---|---|
| {{root=/dev/sda2}} / {{root=UUID=…}} | root filesystem |
| {{ro}} / {{rw}} | mount root read-only (so it can be checked) / read-write |
| {{single}}, {{1}}, {{S}}, {{systemd.unit=rescue.target}} | single-user / rescue mode |
| {{emergency}}, {{systemd.unit=emergency.target}} | emergency shell |
| {{init=/bin/bash}} | start a shell instead of init (password recovery) |
| {{quiet}} / {{splash}} | fewer messages / graphical splash |
| {{mem=2G}}, {{maxcpus=1}}, {{nomodeset}}, {{acpi=off}} | hardware workarounds |
| {{console=ttyS0,115200}} | kernel messages to the serial console |

The parameters of the running kernel are in {{/proc/cmdline}}:

~~~console
$ cat /proc/cmdline
BOOT_IMAGE=/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 ro quiet
~~~

Permanent parameters go into {{GRUB_CMDLINE_LINUX}} / {{GRUB_CMDLINE_LINUX_DEFAULT}} in {{/etc/default/grub}}, followed by {{update-grub}} (see 102.2).

## Kernel and initramfs
The kernel image is compressed (**bzImage**, file {{vmlinuz}}). The **initramfs** (initial RAM filesystem; older: initrd = initial RAM disk) is a compressed **cpio** archive containing a minimal userspace and kernel modules. It is created with {{update-initramfs -u}} (Debian), {{mkinitramfs}} or {{dracut}} (Red Hat) and must be rebuilt when storage drivers or {{/etc/crypttab}} change.

## init systems
**SysVinit** — PID 1 is {{/sbin/init}}, configured by {{/etc/inittab}}. It enters a **runlevel** by running the scripts in {{/etc/rcN.d/}} (symlinks to {{/etc/init.d/}}): {{K}}-scripts stop, {{S}}-scripts start, in numeric order. Strictly sequential → slow boots.

**Upstart** — Ubuntu's event-based replacement (2006–2014), jobs in {{/etc/init/*.conf}}. Replaced by systemd; you only need to know it existed.

**systemd** — the standard today. PID 1 is {{/lib/systemd/systemd}} ({{/sbin/init}} is a symlink). Everything is a **unit** ({{.service}}, {{.target}}, {{.mount}}, {{.socket}}, {{.timer}}, {{.device}} …), started **in parallel** according to dependencies; **targets** replace runlevels; logging via the **journal**.

~~~console
$ ls -l /sbin/init
$ ps -p 1 -o comm=
$ systemctl get-default
$ systemd-analyze
$ systemd-analyze blame
~~~

## Checking boot events
The kernel writes to the **ring buffer** in memory; read it with {{dmesg}} ({{-T}} human timestamps, {{-H}} pager, {{-w}} follow, {{-l err}} only errors). On systemd systems the journal contains kernel and service messages of the whole boot:

~~~console
$ dmesg | head
$ dmesg | grep -i usb
$ journalctl -b
$ journalctl -b -1
$ journalctl -k
$ journalctl --list-boots
~~~

{{journalctl -b -1}} (previous boot) requires a **persistent** journal in {{/var/log/journal}} ({{Storage=persistent}} or the directory existing). Classic syslog files: {{/var/log/messages}} (Red Hat), {{/var/log/syslog}} and {{/var/log/kern.log}} (Debian), {{/var/log/boot.log}}.

> EXAM: {{dmesg}} = kernel ring buffer (only kernel messages, since boot). {{journalctl -b}} = everything systemd collected for the current boot, {{-k}} = only kernel messages.
`,
  quiz: [
    { q: 'Which command displays the kernel ring buffer?', fill: ['dmesg'], e: '{{dmesg}} prints messages the kernel produced since boot, e.g. hardware detection.' },
    { q: 'Which file contains the kernel command line the running kernel was booted with?', fill: ['/proc/cmdline'], e: 'GRUB passes the parameters; {{cat /proc/cmdline}} shows them.' },
    { q: 'Which command shows all journal messages of the **previous** boot?', o: ['{{journalctl -b 1}}', '{{journalctl -b -1}}', '{{journalctl --last-boot}}', '{{dmesg -1}}'], a: 1, e: '{{-b 0}} or {{-b}} is the current boot, {{-b -1}} the one before. Requires persistent journal storage.' },
    { q: 'What is the purpose of the initramfs?', o: ['It stores the GRUB configuration.', 'It provides drivers and tools to mount the real root filesystem.', 'It is the swap area used during boot.', 'It contains the firmware settings.'], a: 1, e: 'The kernel mounts the initramfs as a temporary root; it loads e.g. RAID/LVM/crypto modules and switches to the real root.' },
    { q: 'Where does a UEFI system look for the boot loader?', o: ['In the first 512 bytes of the disk', 'In an EFI application on the EFI System Partition', 'In {{/boot/grub/grub.cfg}}', 'In the CMOS'], a: 1, e: 'The ESP is FAT formatted, e.g. {{\\EFI\\debian\\grubx64.efi}}. The MBR is the BIOS way.' },
    { q: 'Which kernel parameter boots a systemd machine into rescue (single-user) mode?', o: ['{{runlevel=rescue}}', '{{systemd.unit=rescue.target}}', '{{init=rescue}}', '{{target=1}}'], a: 1, e: 'Also accepted: {{single}}, {{1}} or {{S}} for compatibility.' },
    { q: 'In the GRUB 2 menu, which key lets you edit the selected entry before booting?', o: ['{{e}}', '{{c}}', '{{b}}', '{{Tab}}'], a: 0, e: '{{e}} edits the entry (boot with Ctrl+X), {{c}} opens the GRUB command line.' },
    { q: 'What is the process ID of init / systemd?', fill: ['1'], e: 'The kernel starts init as PID 1; it is the ancestor of all other processes.' },
    { q: 'Which init system was event based and used by Ubuntu before systemd?', o: ['SysVinit', 'Upstart', 'runit', 'OpenRC'], a: 1, e: 'Upstart (jobs in {{/etc/init/}}) — LPIC only requires awareness.' },
    { q: 'In which order do these stages occur? (Choose the correct sequence.)', o: ['firmware → boot loader → kernel → initramfs → init', 'firmware → kernel → boot loader → init → initramfs', 'boot loader → firmware → kernel → init → initramfs', 'firmware → initramfs → boot loader → kernel → init'], a: 0, keep: true, e: 'POST/firmware, then GRUB loads kernel + initramfs, the kernel uses the initramfs to mount root, then executes init.' },
    { q: 'Which statements about SysVinit are correct? (Choose two.)', o: ['Its configuration file is {{/etc/inittab}}.', 'It starts services in parallel based on dependencies.', 'Runlevel scripts live in {{/etc/rcN.d/}} as S/K symlinks.', 'It uses unit files in {{/etc/systemd/system}}.'], a: [0, 2], e: 'Parallel, dependency-based starting and unit files are systemd features.' },
    { q: 'Which kernel parameter can be used to obtain a root shell without running init, e.g. to reset a lost root password?', fill: ['init=/bin/bash', 'init=/bin/sh'], e: 'The root fs is then usually read-only: {{mount -o remount,rw /}}, then {{passwd}}.' },
    { q: 'Which command shows only kernel messages from the systemd journal?', o: ['{{journalctl -k}}', '{{journalctl -u kernel}}', '{{journalctl --dmesg-only}}', '{{journalctl -p kern}}'], a: 0, e: '{{-k}} (or {{--dmesg}}) shows kernel messages of the current boot.' },
    { q: 'What does the kernel parameter {{ro}} do?', o: ['Disables root logins', 'Mounts the root filesystem read-only at first', 'Starts in rescue mode', 'Uses a read-only initramfs'], a: 1, e: 'Root is mounted read-only so it can be checked by fsck; later it is remounted read-write according to {{/etc/fstab}}.' },
  ],
});

LPIC.add({
  id: '101.3',
  title: 'Change runlevels / boot targets and shutdown or reboot system',
  weight: 3,
  desc: 'Candidates should be able to manage the SysVinit runlevel or systemd boot target of the system. This objective includes changing to single user mode, shutdown or rebooting the system. Candidates should be able to alert users before switching runlevels / boot targets and properly terminate processes. This objective also includes setting the default SysVinit runlevel or systemd boot target. It also includes awareness of Upstart as an alternative to SysVinit or systemd.',
  knowledge: [
    'Set the default runlevel or boot target.',
    'Change between runlevels / boot targets including single user mode.',
    'Shutdown and reboot from the command line.',
    'Alert users before switching runlevels / boot targets or other major system events.',
    'Properly terminate processes.',
  ],
  terms: ['/etc/inittab', 'shutdown', 'init', '/etc/init.d/', 'telinit', 'systemd', 'systemctl', '/etc/systemd/', '/usr/lib/systemd/', 'wall'],
  sims: ['targets'],
  wiki: String.raw`
## Runlevels (SysVinit)
| Runlevel | Meaning (typical) |
|---|---|
| 0 | halt / power off |
| 1, s, S | single-user mode: maintenance, only root, no network |
| 2 | multi-user (Debian: full multi-user incl. GUI; Red Hat: without NFS) |
| 3 | multi-user, text mode, network |
| 4 | unused / custom |
| 5 | multi-user with graphical login (X11) |
| 6 | reboot |

The default runlevel is set in {{/etc/inittab}}:

~~~file
# /etc/inittab — id:runlevels:action:process
id:3:initdefault:
l3:3:wait:/etc/init.d/rc 3
ca:12345:ctrlaltdel:/sbin/shutdown -t1 -a -r now
1:2345:respawn:/sbin/getty 38400 tty1
~~~

Service scripts live in {{/etc/init.d/}}; each runlevel has a directory {{/etc/rcN.d/}} with symlinks: {{S20ssh}} = start in this runlevel (order 20), {{K01ssh}} = kill when entering it. Manage the links with {{update-rc.d}} (Debian) or {{chkconfig}} (Red Hat).

~~~console
$ ls -l /etc/rc3.d/
# runlevel
N 5
# telinit 3
# init 1
~~~

{{runlevel}} prints the *previous* and the *current* runlevel ({{N}} = none). {{telinit N}} (or {{init N}}) switches; {{telinit q}} re-reads {{/etc/inittab}}.

## Targets (systemd)
systemd replaces runlevels by **targets** — units that group other units:

| Runlevel | Target |
|---|---|
| 0 | {{poweroff.target}} |
| 1 | {{rescue.target}} |
| 2, 3, 4 | {{multi-user.target}} |
| 5 | {{graphical.target}} |
| 6 | {{reboot.target}} |
| – | {{emergency.target}} (even less than rescue: root fs read-only, no services) |

Compatibility aliases {{runlevel0.target}} … {{runlevel6.target}} exist as symlinks.

~~~console
$ systemctl get-default
graphical.target
# systemctl set-default multi-user.target
# systemctl isolate multi-user.target
# systemctl isolate rescue.target
# systemctl rescue
# systemctl emergency
$ systemctl list-units --type=target
~~~

- {{set-default}} changes the symlink {{/etc/systemd/system/default.target}} → affects the **next boot**.
- {{isolate}} switches **now**, stopping everything not required by the new target.
- Unit files are shipped in {{/usr/lib/systemd/system/}} (or {{/lib/systemd/system/}}); local changes and overrides go to {{/etc/systemd/system/}}, which takes precedence. Runtime units: {{/run/systemd/system/}}.

> EXAM: Remember both worlds: **SysV** {{/etc/inittab}} + {{telinit}}/{{init}}; **systemd** {{systemctl get-default}}, {{set-default}}, {{isolate}}. A one-time different target can be chosen on the kernel command line: {{systemd.unit=multi-user.target}}.

## Shutting down and rebooting
~~~console
# shutdown -h now
# shutdown -r +5 "Kernel update, back in 5 minutes"
# shutdown -h 22:30
# shutdown -c
# shutdown -k +10 "Just a warning"
# reboot
# poweroff
# halt
# systemctl reboot
# systemctl poweroff
~~~

| Option | Meaning |
|---|---|
| {{-h}} / {{-P}} | halt / power off (default action) |
| {{-r}} | reboot |
| {{-c}} | cancel a scheduled shutdown |
| {{-k}} | only send the warning, do not shut down |
| time | {{now}}, {{+m}} (minutes), {{hh:mm}} |

{{shutdown}} sends a **wall message** to all logged-in users and — 5 minutes before the time — creates {{/run/nologin}} (or {{/etc/nologin}}) so that no new non-root logins are possible.

## Alerting users
~~~console
$ wall "The server reboots at 18:00 — please save your work"
$ echo "Maintenance tonight" | wall
~~~

{{wall}} ("write all") writes to the terminals of all logged-in users (who have {{mesg y}}). The login message {{/etc/motd}} and the pre-login banner {{/etc/issue}} ({{/etc/issue.net}} for network logins) are the other ways to inform users.

## Properly terminating processes
Before switching to single-user mode or rebooting, services should be stopped cleanly: init/systemd first sends **SIGTERM** (15) so programs can save state, waits, then sends **SIGKILL** (9). Do the same manually:

~~~console
$ kill 1420
$ kill -9 1420
$ killall -SIGTERM python3
# systemctl stop apache2
~~~

See objective 103.5 for signals in detail.

## Upstart (awareness)
Event-based init used by Ubuntu 6.10–14.10 and RHEL 6. Jobs in {{/etc/init/*.conf}}, managed with {{initctl}}, {{start}}, {{stop}}, {{status}}. It still understood runlevels via {{telinit}}.
`,
  quiz: [
    { q: 'Which command sets the default boot target of a systemd system to text-mode multi-user?', o: ['{{systemctl isolate multi-user.target}}', '{{systemctl set-default multi-user.target}}', '{{systemctl default multi-user}}', '{{telinit 3}}'], a: 1, e: '{{set-default}} changes the {{default.target}} symlink for future boots; {{isolate}} switches immediately.' },
    { q: 'Which line in {{/etc/inittab}} sets the default runlevel to 3?', o: ['{{id:3:initdefault:}}', '{{default:3:boot:}}', '{{runlevel=3}}', '{{id:3:respawn:}}'], a: 0, e: 'Format: id:runlevels:action:process — the action is {{initdefault}}.' },
    { q: 'Which systemd target corresponds to runlevel 5?', fill: ['graphical.target'], e: '0 poweroff, 1 rescue, 2–4 multi-user, 5 graphical, 6 reboot.' },
    { q: 'Which command cancels a pending shutdown?', fill: ['shutdown -c'], e: '{{shutdown -c}} cancels and informs users.' },
    { q: 'Which command reboots the system in 5 minutes and sends a message to the users?', o: ['{{shutdown -r +5 "Reboot"}}', '{{shutdown -h 5 "Reboot"}}', '{{reboot -t 5}}', '{{shutdown -r 5min "Reboot"}}'], a: 0, e: 'Time formats: {{now}}, {{+MINUTES}}, {{HH:MM}}.' },
    { q: 'Which command sends a message to the terminals of all logged-in users?', fill: ['wall'], e: '{{wall}} (write all). {{shutdown}} uses the same mechanism.' },
    { q: 'What does {{runlevel}} print when the output is {{N 3}}?', o: ['There was no previous runlevel; the current one is 3.', 'Runlevel 3 is not available.', 'The next runlevel will be 3.', 'Networking is off in runlevel 3.'], a: 0, e: 'First the previous, then the current runlevel; {{N}} = none.' },
    { q: 'Which command switches a SysV system immediately to single-user mode? (Choose two.)', o: ['{{telinit 1}}', '{{init 1}}', '{{runlevel 1}}', '{{shutdown -s}}'], a: [0, 1], e: '{{telinit}} and {{init}} change the runlevel; {{runlevel}} only displays it.' },
    { q: 'In which directory should an administrator place a modified copy of a unit file so that it overrides the distribution\'s version?', o: ['{{/usr/lib/systemd/system/}}', '{{/etc/systemd/system/}}', '{{/run/systemd/units/}}', '{{/var/lib/systemd/}}'], a: 1, e: '{{/etc/systemd/system}} takes precedence over {{/usr/lib/systemd/system}} (vendor units).' },
    { q: 'Which systemctl subcommand changes to another target **immediately**, stopping all units not needed by it?', fill: ['isolate', 'systemctl isolate'], e: 'e.g. {{systemctl isolate multi-user.target}}.' },
    { q: 'Which shutdown option only sends the warning message without actually shutting down?', o: ['{{-k}}', '{{-w}}', '{{-n}}', '{{-t}}'], a: 0, e: '{{shutdown -k now "test"}} — useful to test the wall message.' },
    { q: 'In which directory are the SysV init scripts stored?', fill: ['/etc/init.d', '/etc/init.d/'], e: 'The runlevel directories {{/etc/rcN.d/}} only contain S/K symlinks to them.' },
    { q: 'Which statement about {{systemctl isolate emergency.target}} is true?', o: ['It starts all services in parallel.', 'It provides a minimal shell with the root filesystem typically read-only.', 'It reboots immediately.', 'It is the same as multi-user.target.'], a: 1, e: 'emergency.target starts even less than rescue.target.' },
  ],
});
