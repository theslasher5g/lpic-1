/* Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard */
LPIC.add({
  id: '104.1',
  title: 'Create partitions and filesystems',
  weight: 2,
  desc: 'Candidates should be able to configure disk partitions and then create filesystems on media such as hard disks. This includes the handling of swap partitions.',
  knowledge: [
    'Manage MBR and GPT partition tables.',
    'Use various mkfs commands to create various filesystems such as: ext2/ext3/ext4, XFS, VFAT, exFAT.',
    'Basic feature knowledge of Btrfs, including multi-device filesystems, compression and subvolumes.',
  ],
  terms: ['fdisk', 'gdisk', 'parted', 'mkfs', 'mkswap'],
  sims: ['partition'],
  wiki: String.raw`
## Inspecting disks
~~~console
$ lsblk
$ lsblk -f
$ sudo fdisk -l
$ sudo fdisk -l /dev/sdb
$ cat /proc/partitions
$ sudo blkid
~~~

The sandbox has an empty second disk {{/dev/sdb}} (20 GiB) for practice.

## fdisk (MBR and GPT)
{{fdisk}} is menu driven: {{fdisk /dev/sdb}} then single-letter commands:

| Key | Action |
|---|---|
| {{m}} | help |
| {{p}} | print the partition table |
| {{n}} | new partition (asks: primary/extended, number, first sector, last sector or {{+5G}}) |
| {{d}} | delete a partition |
| {{t}} | change the type ({{83}} Linux, {{82}} Linux swap, {{8e}} Linux LVM, {{fd}} RAID, {{ef}} EFI, {{7}} NTFS/exFAT) |
| {{a}} | toggle the bootable flag (MBR) |
| {{o}} / {{g}} | create a new empty DOS (MBR) / GPT label |
| {{l}} | list known types |
| {{w}} | **write** changes and exit — nothing is changed before this! |
| {{q}} | quit without saving |

Modern fdisk handles GPT too. After changing a disk in use, the kernel may need {{partprobe}} (or a reboot) to see the new table.

## gdisk (GPT)
{{gdisk}} looks like fdisk but is GPT only, with 4-digit type codes: {{8300}} Linux filesystem, {{8200}} swap, {{8e00}} LVM, {{ef00}} EFI System, {{ef02}} BIOS boot. Extra commands: {{r}} recovery & transformation (e.g. convert MBR → GPT), {{x}} expert. {{sgdisk}} is the scriptable variant.

## parted
{{parted}} is scriptable and changes the disk **immediately** (no "write" step):

~~~console
# parted -s /dev/sdb mklabel gpt
# parted -s /dev/sdb mkpart data ext4 1MiB 8GiB
# parted -s /dev/sdb mkpart swap linux-swap 8GiB 10GiB
# parted /dev/sdb print
$ lsblk /dev/sdb
~~~

Commands: {{mklabel gpt|msdos}}, {{mkpart [type|name] [fs-type] START END}}, {{rm N}}, {{print}}, {{resizepart}}, {{set N boot on}}, {{unit MiB}}. {{parted -l}} lists all disks. GUI: {{gparted}}.

> WARN: {{mklabel}} creates a *new empty* partition table — all existing partitions are lost.

## Creating filesystems: mkfs
{{mkfs -t TYPE DEVICE}} is a front end for {{mkfs.TYPE}}:

~~~console
# mkfs -t ext4 /dev/sdb1
# mkfs.ext4 -L data /dev/sdb1
# mke2fs -t ext3 /dev/sdb1
# mkfs.xfs -f -L xfsdata /dev/sdb1
# mkfs.vfat -F 32 -n USBSTICK /dev/sdb1
# mkfs.exfat /dev/sdb1
$ sudo blkid /dev/sdb1
~~~

| Filesystem | Notes |
|---|---|
| **ext2** | no journal, simple, old |
| **ext3** | ext2 + journal (backward compatible) — {{mkfs.ext3}} or {{mke2fs -j}} |
| **ext4** | default on Debian/Ubuntu: extents, large files (16 TiB) and filesystems (1 EiB), delayed allocation, faster fsck |
| **XFS** | default on RHEL; high-performance 64-bit journaling fs; can **grow but not shrink**; {{-f}} overwrites an existing fs |
| **VFAT** (FAT32) | compatible with everything (UEFI ESP, USB sticks); max file 4 GiB; no Unix permissions |
| **exFAT** | FAT successor for large flash media (SDXC); large files; no Unix permissions |
| **Btrfs** | copy-on-write, see below |

Useful {{mke2fs}}/{{mkfs.ext4}} options: {{-L LABEL}}, {{-m 1}} reserved blocks for root (default 5 %), {{-b 4096}} block size, {{-N}} / {{-i}} number / ratio of inodes, {{-T largefile}} usage type, {{-j}} journal.

## Swap: mkswap
~~~console
# mkswap -L swap2 /dev/sdb2
# swapon /dev/sdb2
# swapon --show
# dd if=/dev/zero of=/swapfile bs=1M count=1024
# chmod 600 /swapfile
# mkswap /swapfile
# swapon /swapfile
# swapoff /swapfile
~~~

Partition type 82 (MBR) / 8200 (GPT). Activate at boot via {{/etc/fstab}}: {{/dev/sdb2 none swap sw 0 0}}.

## Btrfs basics
**Btrfs** ("butter FS") is a copy-on-write filesystem with integrated volume management:
- **multi-device**: one filesystem over several disks, with RAID 0/1/10 (5/6 experimental): {{mkfs.btrfs -d raid1 -m raid1 /dev/sdb /dev/sdc}}; add devices later: {{btrfs device add}}
- **subvolumes**: independently mountable trees inside one fs ({{btrfs subvolume create /mnt/@home}}, {{mount -o subvol=@home}})
- **snapshots**: instant CoW copies of a subvolume ({{btrfs subvolume snapshot}}) — used by openSUSE's snapper
- **transparent compression**: mount option {{compress=zstd}} (or lzo, zlib)
- checksums for data and metadata, online scrub ({{btrfs scrub start}}), online resize
`,
  quiz: [
    { q: 'Which command creates an ext4 filesystem on {{/dev/sdb1}}? (Choose two.)', o: ['{{mkfs -t ext4 /dev/sdb1}}', '{{mkfs.ext4 /dev/sdb1}}', '{{mkext4 /dev/sdb1}}', '{{fdisk -t ext4 /dev/sdb1}}'], a: [0, 1], e: '{{mke2fs -t ext4}} works too.' },
    { q: 'Which command prepares {{/dev/sdc2}} to be used as swap space?', fill: ['mkswap /dev/sdc2'], e: 'Then {{swapon /dev/sdc2}}.' },
    { q: 'In fdisk, which command writes the partition table to disk and exits?', fill: ['w'], e: 'Until {{w}} nothing is changed; {{q}} quits without saving.' },
    { q: 'Which tool is specifically designed to manage GPT partition tables and uses type codes like 8300?', fill: ['gdisk'], e: '8300 Linux, 8200 swap, EF00 EFI system partition.' },
    { q: 'Which partitioning tool applies changes immediately without a separate write command?', o: ['fdisk', 'gdisk', 'parted', 'cfdisk'], a: 2, e: 'parted is also fully scriptable ({{parted -s}}).' },
    { q: 'Which MBR partition type ID is used for Linux swap?', o: ['83', '82', '8e', 'ef'], a: 1, e: '83 Linux, 82 swap, 8e LVM, ef EFI.' },
    { q: 'Which statement about XFS is correct?', o: ['It can be shrunk with xfs_growfs.', 'It can be grown but not shrunk.', 'It has no journal.', 'It is limited to 2 TiB.'], a: 1, e: 'xfs_growfs only enlarges.' },
    { q: 'Which Btrfs features are correct? (Choose two.)', o: ['subvolumes and snapshots', 'it cannot span several devices', 'transparent compression', 'it requires a separate journal device'], a: [0, 2], e: 'Btrfs supports multiple devices with built-in RAID levels.' },
    { q: 'Which filesystem is required for the UEFI EFI System Partition and widely used on USB sticks?', fill: ['vfat', 'fat32', 'fat', 'VFAT', 'FAT32'], e: 'FAT does not support Unix permissions and limits files to 4 GiB (FAT32).' },
    { q: 'Which option of mkfs.ext4 sets the volume label?', o: ['{{-n}}', '{{-L}}', '{{-l}}', '{{-t}}'], a: 1, e: 'mkfs.vfat uses {{-n}} for the label.' },
    { q: 'Which command lists the partition tables of all disks?', fill: ['fdisk -l', 'parted -l', 'sudo fdisk -l'], e: '{{lsblk}} shows a tree of block devices.' },
    { q: 'Which filesystem was designed for large flash media and supports files larger than 4 GiB without Unix permissions?', fill: ['exfat', 'exFAT'], e: '{{mkfs.exfat}}' },
  ],
});

LPIC.add({
  id: '104.2',
  title: 'Maintain the integrity of filesystems',
  weight: 2,
  desc: 'Candidates should be able to maintain a standard filesystem, as well as the extra data associated with a journaling filesystem.',
  knowledge: ['Verify the integrity of filesystems.', 'Monitor free space and inodes.', 'Repair simple filesystem problems.'],
  terms: ['du', 'df', 'fsck', 'e2fsck', 'mke2fs', 'tune2fs', 'xfs_repair', 'xfs_fsr', 'xfs_db'],
  wiki: String.raw`
## Monitoring free space: df
~~~console
$ df -h
$ df -hT
$ df -h /home
$ df -i
$ df -x tmpfs -h
~~~

{{df}} reports per **filesystem**: {{-h}} human readable, {{-T}} type, {{-i}} **inodes** instead of blocks, {{-t/-x TYPE}} include/exclude types. A filesystem can be "full" with free blocks if it has run out of **inodes** (many tiny files) — check with {{df -i}}.

ext filesystems reserve 5 % of the blocks for root (so daemons and root can still work); that is why "Used + Avail < Size".

## Space used by files and directories: du
~~~console
$ du -sh /home/student
$ du -h --max-depth=1 /var | sort -h
$ du -ah docs
$ du -sch *.txt
~~~

{{-s}} summary per argument, {{-h}} human, {{-a}} all files, {{-c}} grand total, {{-d N}}/{{--max-depth=N}}. {{du}} sums file sizes; {{df}} asks the filesystem — differences point to deleted-but-still-open files ({{lsof +L1}}).

## Checking and repairing: fsck
~~~console
# umount /dev/sdb1
# fsck /dev/sdb1
# fsck -f /dev/sdb1
# e2fsck -f -p /dev/sdb1
# fsck -N /dev/sdb1
# fsck -A -R -y
~~~

{{fsck}} is a front end that calls {{fsck.ext4}} ({{e2fsck}}), {{fsck.vfat}} … according to the type.

| Option | Meaning |
|---|---|
| {{-A}} | check all filesystems in {{/etc/fstab}} (in order of the pass field); {{-R}} skip root |
| {{-N}} | dry run — show what would be done |
| {{-t TYPE}} | type |
| {{-y}} / {{-n}} | answer yes / no to all questions |
| {{-p}} / {{-a}} | automatic repair of safe problems ("preen") |
| {{-f}} (e2fsck) | force a check even if the fs is marked clean |
| {{-b SB}} (e2fsck) | use a backup superblock (e.g. 32768) when the primary is damaged |

> WARN: Never run fsck on a **mounted** read-write filesystem — it can destroy data. Unmount it, or for {{/}} boot into rescue mode / a live system (or mount read-only). Exit codes: 0 no errors, 1 errors corrected, 2 reboot needed, 4 errors left uncorrected, 8 operational error.

At boot, filesystems with a non-zero **pass** value (6th field in fstab) are checked; ext4 also forces checks after a number of mounts or time interval (see tune2fs). Lost but still existing data ends up in {{lost+found}}.

## tune2fs — ext2/3/4 parameters
~~~console
# tune2fs -l /dev/sdb1
# tune2fs -c 30 /dev/sdb1
# tune2fs -i 1m /dev/sdb1
# tune2fs -L backup /dev/sdb1
# tune2fs -m 1 /dev/sdb1
# tune2fs -j /dev/sdb1
# tune2fs -O ^has_journal /dev/sdb1
# dumpe2fs -h /dev/sdb1
~~~

{{-l}} list superblock (same as {{dumpe2fs -h}}), {{-c}} max mount count, {{-i}} check interval ({{d}}/{{w}}/{{m}}), {{-L}} label, {{-m}} reserved %, {{-j}} add journal (ext2 → ext3), {{-O}} features, {{-U}} UUID, {{-e}} error behaviour. {{mke2fs}} created the filesystem; {{debugfs}} is the interactive expert tool (e.g. undelete).

## XFS tools
~~~console
# xfs_repair -n /dev/sdb1
# xfs_repair /dev/sdb1
# xfs_db -r -c frag /dev/sdb1
# xfs_fsr /dev/sdb1
$ xfs_info /mnt
~~~

- {{xfs_repair}} — check/repair (fsck.xfs does nothing!); {{-n}} = no modify (check only); {{-L}} zeroes a dirty log (last resort, data loss possible). Filesystem must be unmounted.
- {{xfs_db}} — debugger, e.g. {{-c frag}} fragmentation report, {{-r}} read only.
- {{xfs_fsr}} — filesystem reorganiser: **defragments** mounted XFS filesystems.
- {{xfs_admin}} — labels/UUID, {{xfs_growfs}} — grow, {{xfs_info}} — geometry.
`,
  quiz: [
    { q: 'Which command shows the free and used **inodes** of all mounted filesystems?', fill: ['df -i'], e: 'A filesystem may run out of inodes before it runs out of space.' },
    { q: 'Which command shows the total disk space used by {{/var/log}} in human-readable form?', fill: ['du -sh /var/log', 'du -hs /var/log', 'du -s -h /var/log'], e: '{{-s}} summarises, {{-h}} human readable.' },
    { q: 'Before running fsck on {{/dev/sdb1}}, what must be done?', o: ['The filesystem must be mounted read-write.', 'The filesystem should be unmounted (or mounted read-only).', 'The journal must be deleted.', 'The partition must be resized.'], a: 1, e: 'Checking a mounted read-write filesystem can corrupt it.' },
    { q: 'Which command checks and repairs an XFS filesystem?', fill: ['xfs_repair'], e: '{{fsck.xfs}} is only a stub that does nothing.' },
    { q: 'Which tool defragments a mounted XFS filesystem?', fill: ['xfs_fsr'], e: 'fsr = filesystem reorganizer.' },
    { q: 'Which command displays the superblock information of the ext4 filesystem on {{/dev/sda2}}? (Choose two.)', o: ['{{tune2fs -l /dev/sda2}}', '{{dumpe2fs -h /dev/sda2}}', '{{fsck -l /dev/sda2}}', '{{df -T /dev/sda2}}'], a: [0, 1], e: 'Both print the superblock (mount count, features, UUID …).' },
    { q: 'Which tune2fs option sets the maximum number of mounts after which the filesystem is checked?', o: ['{{-i}}', '{{-c}}', '{{-m}}', '{{-C}}'], a: 1, e: '{{-i}} sets the time interval, {{-m}} reserved blocks, {{-C}} the current mount count.' },
    { q: 'Which fsck option shows what would be done without actually doing it?', fill: ['-N'], e: '{{fsck -N /dev/sdb1}}' },
    { q: 'Which e2fsck option forces a check even if the filesystem seems clean?', fill: ['-f'], e: '{{e2fsck -f /dev/sdb1}}' },
    { q: 'Which command converts an ext2 filesystem to ext3 by adding a journal?', fill: ['tune2fs -j', 'tune2fs -j /dev/sdb1'], e: 'No reformatting needed; afterwards mount it as ext3.' },
    { q: 'Where does e2fsck place recovered files whose directory entries were lost?', fill: ['lost+found', '/lost+found'], e: 'Every ext filesystem has a {{lost+found}} directory at its root.' },
    { q: 'Which tool reports the fragmentation of an XFS filesystem?', o: ['{{xfs_info}}', '{{xfs_db -c frag}}', '{{xfs_fsr -n}}', '{{xfs_repair -f}}'], a: 1, e: 'xfs_db is the XFS debugger.' },
  ],
});

LPIC.add({
  id: '104.3',
  title: 'Control mounting and unmounting of filesystems',
  weight: 3,
  desc: 'Candidates should be able to configure the mounting of a filesystem.',
  knowledge: [
    'Manually mount and unmount filesystems.',
    'Configure filesystem mounting on bootup.',
    'Configure user mountable removable filesystems.',
    'Use of labels and UUIDs for identifying and mounting file systems.',
    'Awareness of systemd mount units.',
  ],
  terms: ['/etc/fstab', '/media/', 'mount', 'umount', 'blkid', 'lsblk'],
  sims: ['fstab'],
  wiki: String.raw`
## mount and umount
Mounting attaches a filesystem to a directory (**mount point**) of the tree; the previous content of the directory is hidden while mounted.

~~~console
$ mount
$ mount -t ext4
$ findmnt
$ cat /proc/mounts
# mount /dev/sdb1 /mnt
# mount -t xfs /dev/sdb1 /mnt
# mount -o ro /dev/sdb1 /mnt
# mount -o remount,rw /mnt
# mount UUID=9b2e4f1a-... /data
# mount LABEL=backup /data
# mount /dev/sr0 /media/cdrom0
# mount -a
# umount /mnt
# umount /dev/sdb1
~~~

- {{mount}} without arguments lists mounted filesystems (also {{/proc/mounts}}, {{/etc/mtab}}, {{findmnt}}).
- {{-t TYPE}} (usually autodetected), {{-o OPTIONS}}, {{-a}} mount everything in fstab not marked {{noauto}}, {{-L}} / {{-U}} by label / UUID.
- {{mount DIR}} or {{mount DEVICE}} alone looks up the rest in {{/etc/fstab}}.
- {{umount}} (no "n"!) takes the device or the mount point. **"target is busy"** — a process uses it (current directory or open files): find it with {{lsof /mnt}} or {{fuser -vm /mnt}}; {{umount -l}} lazy unmount.

> TIP: In the sandbox: {{sudo parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 5GiB}}, {{sudo mkfs.ext4 -L data /dev/sdb1}}, {{sudo mount /dev/sdb1 /mnt}}, {{df -h /mnt}}.

## /etc/fstab — mounting at boot
~~~file
# <file system>                           <mount point> <type> <options>          <dump> <pass>
UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 /             ext4   errors=remount-ro  0      1
UUID=6A1F-2C3D                            /boot/efi     vfat   umask=0077         0      1
LABEL=data                                /data         xfs    defaults,noatime   0      2
/dev/sdb2                                 none          swap   sw                 0      0
/dev/sr0                                  /media/cdrom0 iso9660 ro,user,noauto    0      0
fileserver:/export/home                   /home         nfs    defaults,_netdev   0      0
tmpfs                                     /tmp          tmpfs  size=1G            0      0
~~~

1. **device**: {{/dev/sdXN}}, {{UUID=…}}, {{LABEL=…}}, {{PARTUUID=…}}, NFS {{server:/path}}, CIFS {{//server/share}}
2. **mount point** ({{none}} for swap)
3. **type**: ext4, xfs, vfat, btrfs, swap, nfs, cifs, tmpfs, iso9660, {{auto}}
4. **options** (comma separated)
5. **dump**: 1 = back up with dump, usually 0
6. **pass**: fsck order at boot — **1** for {{/}}, **2** for others, **0** never

Important options:

| Option | Meaning |
|---|---|
| {{defaults}} | = {{rw,suid,dev,exec,auto,nouser,async}} |
| {{ro}} / {{rw}} | read-only / read-write |
| {{auto}} / {{noauto}} | mounted by {{mount -a}} at boot / only manually |
| {{user}} | **any user may mount**; only that user may unmount; implies {{noexec,nosuid,nodev}} |
| {{users}} | any user may mount **and** unmount |
| {{owner}} | the owner of the device file may mount |
| {{exec}}/{{noexec}}, {{suid}}/{{nosuid}}, {{dev}}/{{nodev}} | allow programs / SUID bits / device files |
| {{noatime}}, {{relatime}} | access-time update behaviour |
| {{_netdev}}, {{nofail}} | network fs (wait for network) / don't fail the boot if missing |
| {{uid=}}, {{gid=}}, {{umask=}} | ownership for filesystems without Unix permissions (vfat, exFAT, NTFS) |

Test a new fstab line with {{mount -a}} (or {{findmnt --verify}}) **before** rebooting — a broken fstab can stop the boot in emergency mode.

## Identifying filesystems: UUIDs and labels
Device names like {{/dev/sdb1}} can change when disks are added or USB devices are plugged in in a different order. **UUIDs** (created by mkfs) and **labels** stay with the filesystem:

~~~console
$ sudo blkid
$ sudo blkid /dev/sda2
$ lsblk -f
$ ls -l /dev/disk/by-uuid/ /dev/disk/by-label/ 2>/dev/null
# e2label /dev/sdb1 data
# tune2fs -L data /dev/sdb1
# xfs_admin -L data /dev/sdb1
~~~

{{blkid}} prints UUID, TYPE, LABEL, PARTUUID; {{lsblk -f}} shows the same as a tree including mount points.

## Removable media and user mounts
- Desktop environments automount USB sticks and CDs below **{{/media/USERNAME/LABEL}}** (via udisks2, which uses D-Bus and polkit); traditionally {{/media/cdrom}}, {{/media/usb}}.
- {{/mnt}} is meant for temporary manual mounts by the administrator.
- To let normal users mount a device, add an fstab line with {{user}} or {{users}} and {{noauto}}:

~~~file
/dev/sr0   /media/cdrom0   iso9660   ro,user,noauto   0 0
~~~

Then any user can run {{mount /media/cdrom0}} and {{umount /media/cdrom0}}.

## systemd mount units (awareness)
systemd turns every fstab line into a **mount unit** at boot ({{systemd-fstab-generator}}); you can also write units directly. The unit name must match the mount point: {{/data}} → {{data.mount}}, {{/mnt/backup}} → {{mnt-backup.mount}}.

~~~file
# /etc/systemd/system/data.mount
[Unit]
Description=Data volume

[Mount]
What=/dev/disk/by-uuid/9b2e4f1a-7c3d-4e5f-a6b7-c8d9e0f1a2b3
Where=/data
Type=xfs
Options=defaults,noatime

[Install]
WantedBy=multi-user.target
~~~

~~~console
# systemctl daemon-reload
# systemctl enable --now data.mount
$ systemctl list-units --type=mount
~~~

{{.automount}} units mount on first access.
`,
  quiz: [
    { q: 'Which command mounts all filesystems listed in {{/etc/fstab}} that are not marked {{noauto}}?', fill: ['mount -a'], e: 'Also the way to test a new fstab entry before rebooting.' },
    { q: 'Which field of {{/etc/fstab}} determines the order in which filesystems are checked by fsck at boot?', o: ['the 4th (options)', 'the 5th (dump)', 'the 6th (pass)', 'the 2nd (mount point)'], a: 2, e: '1 = root filesystem, 2 = others, 0 = no check.' },
    { q: 'Which fstab option allows any user to mount a filesystem, while only that user (or root) may unmount it?', fill: ['user'], e: '{{users}} lets anybody unmount as well.' },
    { q: 'Which command shows UUIDs and filesystem types of block devices? (Choose two.)', o: ['{{blkid}}', '{{lsblk -f}}', '{{df -u}}', '{{fdisk -u}}'], a: [0, 1], e: '{{lsblk -f}} also shows labels and mount points.' },
    { q: 'umount reports "target is busy". Which commands help to find the processes using the filesystem? (Choose two.)', o: ['{{lsof /mnt}}', '{{fuser -vm /mnt}}', '{{ps -m /mnt}}', '{{df -p /mnt}}'], a: [0, 1], e: 'Often your own shell has its current directory inside the mount point.' },
    { q: 'What is the advantage of using {{UUID=}} instead of {{/dev/sdb1}} in fstab?', o: ['It is faster.', 'The UUID stays the same even if device names change.', 'UUIDs allow user mounts.', 'UUIDs enable compression.'], a: 1, e: 'Device names depend on detection order.' },
    { q: 'Which command remounts the root filesystem read-write?', fill: ['mount -o remount,rw /', 'mount -o rw,remount /'], e: 'Typical in rescue mode or after booting with init=/bin/bash.' },
    { q: 'What does the mount option {{defaults}} include? (Choose two.)', o: ['{{rw}}', '{{noexec}}', '{{auto}}', '{{user}}'], a: [0, 2], e: 'defaults = rw, suid, dev, exec, auto, nouser, async.' },
    { q: 'Which systemd unit name corresponds to the mount point {{/var/backup}}?', o: ['{{var-backup.mount}}', '{{var_backup.mount}}', '{{backup.mount}}', '{{/var/backup.mount}}'], a: 0, e: 'Slashes become dashes; the leading slash is dropped.' },
    { q: 'Where do desktop systems typically automount removable media?', o: ['{{/mnt}}', '{{/media}}', '{{/removable}}', '{{/srv}}'], a: 1, e: 'e.g. {{/media/USER/LABEL}}. {{/mnt}} is for temporary manual mounts.' },
    { q: 'Which command unmounts the filesystem mounted on {{/mnt/usb}}?', fill: ['umount /mnt/usb'], e: 'Note the spelling: umount.' },
    { q: 'Which fstab entry mounts an NFS export and waits for the network to be available?', o: ['{{server:/export /mnt nfs defaults,_netdev 0 0}}', '{{//server/export /mnt nfs defaults 0 2}}', '{{server:/export /mnt ext4 net 0 0}}', '{{nfs://server/export /mnt nfs auto 0 1}}'], a: 0, e: 'NFS syntax {{server:/path}}; CIFS uses {{//server/share}}.' },
  ],
});

LPIC.add({
  id: '104.5',
  title: 'Manage file permissions and ownership',
  weight: 3,
  desc: 'Candidates should be able to control file access through the proper use of permissions and ownerships.',
  knowledge: [
    'Manage access permissions on regular and special files as well as directories.',
    'Use access modes such as suid, sgid and the sticky bit to maintain security.',
    'Know how to change the file creation mask.',
    'Use the group field to grant file access to group members.',
  ],
  terms: ['chmod', 'umask', 'chown', 'chgrp'],
  sims: ['chmod', 'umask'],
  wiki: String.raw`
## Reading permissions
~~~console
$ ls -l notes.txt /usr/bin/passwd /tmp -d
-rw-r--r-- 1 student student  362 Oct 19 17:02 notes.txt
-rwsr-xr-x 1 root    root      47 Sep 13  2025 /usr/bin/passwd
drwxrwxrwt 9 root    root    4096 Oct 26 08:00 /tmp
$ stat -c '%A %a %U:%G %n' notes.txt
~~~

The first character is the **type**: {{-}} file, {{d}} directory, {{l}} symlink, {{b}} block device, {{c}} character device, {{p}} named pipe, {{s}} socket. Then three triplets for **u**ser (owner), **g**roup and **o**thers.

| | file | directory |
|---|---|---|
| **r** (4) | read the content | list the names ({{ls}}) |
| **w** (2) | change the content | create, delete, rename entries (independent of the files' own permissions!) |
| **x** (1) | execute as a program/script | enter ({{cd}}) and access entries by name |

The kernel checks in order: is the user the **owner** → owner bits only; else member of the **group** → group bits; else **others**. (root bypasses most checks.)

## chmod — changing modes
**Octal**: r=4, w=2, x=1, summed per class:

~~~console
$ chmod 640 notes.txt
$ chmod 755 scripts/hello.sh
$ chmod 700 private
$ chmod 0644 poem.txt
~~~

| Octal | Symbolic | Typical use |
|---|---|---|
| 755 | rwxr-xr-x | programs, scripts, public directories |
| 644 | rw-r--r-- | normal files |
| 600 | rw------- | private files, SSH private keys |
| 700 | rwx------ | private directories |
| 750 / 640 | rwxr-x--- / rw-r----- | group can read, others nothing |
| 775 / 664 | | shared group work |

**Symbolic**: {{[ugoa][+-=][rwxXst]}}, several clauses comma separated:

~~~console
$ chmod u+x scripts/loops.sh
$ chmod go-w notes.txt
$ chmod a=r poem.txt
$ chmod u=rwx,g=rx,o= scripts
$ chmod -R g+w docs
$ chmod -R a+X docs
$ chmod g=u notes.txt
$ ls -l notes.txt poem.txt scripts/loops.sh
~~~

{{a}} = all (also the default if no class is given — then the umask is respected), {{X}} = execute only for directories and files that are already executable for someone (useful with {{-R}}), {{-R}} recursive, {{-v}}/{{-c}} verbose. Only the owner (or root) may chmod a file.

## Ownership: chown, chgrp
~~~console
# chown alice notes.txt
# chown alice:developers notes.txt
# chown :developers notes.txt
# chown alice: notes.txt
# chown -R bob:bob /home/bob
$ chgrp developers notes.txt
$ ls -l notes.txt
~~~

- Only **root** may change the owner (otherwise users could give away files to bypass quotas).
- The owner may change the group to any group **they are a member of** ({{chgrp}} or {{chown :group}}).
- {{user:}} sets the group to the user's login group; {{user.group}} is the old syntax. {{-R}} recursive, {{--reference=FILE}}.

## Using groups to share files
1. create a group and add the members: {{groupadd developers}}, {{usermod -aG developers alice}}
2. create a directory owned by that group with group write permission and the **SGID** bit:

~~~console
# mkdir /srv/project
# chgrp developers /srv/project
# chmod 2775 /srv/project
$ ls -ld /home/shared
~~~

Now every file created inside belongs to the group *developers* (not the creator's primary group) — see SGID below. Members need to log in again (or use {{newgrp}}) after being added to a group.

## Special bits: SUID, SGID, sticky
| Bit | Octal | Symbolic | On files | On directories |
|---|---|---|---|---|
| **SUID** | 4000 | {{u+s}} → {{s}} in owner-x | program runs with the **owner's** UID (e.g. {{/usr/bin/passwd}} runs as root to write {{/etc/shadow}}) | (ignored) |
| **SGID** | 2000 | {{g+s}} → {{s}} in group-x | program runs with the file's **group** | new files **inherit the directory's group**; new subdirectories inherit SGID |
| **sticky** | 1000 | {{+t}} → {{t}} in others-x | (no effect on Linux) | only the **owner of a file** (or of the directory, or root) may delete/rename it — {{/tmp}} is {{1777}} |

~~~console
$ ls -l /usr/bin/passwd /usr/bin/su /usr/bin/wall /usr/bin/chage
$ ls -ld /tmp /var/tmp /home/shared
$ chmod 4755 scripts/hello.sh
$ chmod u-s,g+s scripts/hello.sh
$ chmod +t docs
$ chmod 1777 docs
$ ls -ld scripts/hello.sh docs
$ find / -perm -4000 -type f 2>/dev/null
$ find / -perm /6000 -type f 2>/dev/null
~~~

A capital {{S}} or {{T}} means the special bit is set but the underlying **x** bit is not (usually a mistake). Linux ignores SUID on scripts — only binaries honour it.

> EXAM: Octal with four digits: {{chmod 4755}} = SUID + 755, {{2775}} = SGID + 775, {{1777}} = sticky + 777. Find SUID programs (security audit) with {{find / -perm -4000}}.

## umask — default permissions for new files
New files start with **666**, new directories with **777**; the **umask** removes bits: *result = default AND NOT umask*.

| umask | new file | new directory |
|---|---|---|
| 0022 (default) | 644 rw-r--r-- | 755 rwxr-xr-x |
| 0002 (user private groups) | 664 | 775 |
| 0027 | 640 | 750 |
| 0077 | 600 | 700 |

~~~console
$ umask
0022
$ umask -S
u=rwx,g=rx,o=rx
$ umask 027
$ touch new-file; mkdir new-dir; ls -ld new-file new-dir
$ umask u=rwx,g=rx,o=
$ umask 022
~~~

The umask is a property of the process, inherited by children. Set it permanently in {{~/.bashrc}} / {{~/.profile}}, system-wide in {{/etc/profile}}, {{/etc/login.defs}} ({{UMASK}}) or via PAM ({{pam_umask}}). Note: a umask can never *add* the execute bit to files.
`,
  quiz: [
    { q: 'Which octal mode corresponds to {{rwxr-x---}}?', fill: ['750', '0750'], e: 'rwx = 7, r-x = 5, --- = 0.' },
    { q: 'Which command gives the owner execute permission on {{script.sh}} without changing anything else?', fill: ['chmod u+x script.sh'], e: 'Symbolic modes change only the specified bits.' },
    { q: 'What permissions does a new file get with a umask of 027?', o: ['{{rw-r-----}} (640)', '{{rwxr-x---}} (750)', '{{rw-rw-r--}} (664)', '{{rw-------}} (600)'], a: 0, e: '666 AND NOT 027 = 640. A directory would get 750.' },
    { q: 'Which special permission causes new files in a directory to inherit the directory\'s group?', o: ['SUID', 'SGID', 'sticky bit', 'umask'], a: 1, e: '{{chmod g+s dir}} or {{chmod 2775 dir}}.' },
    { q: 'The directory {{/tmp}} has the mode {{drwxrwxrwt}}. What does the {{t}} mean?', o: ['The directory is temporary and cleared at boot.', 'Only the owner of a file can delete or rename it.', 'Files are executable by everyone.', 'The directory is a mount point.'], a: 1, e: 'Sticky bit, octal 1000 — /tmp is 1777.' },
    { q: 'Which command sets the SUID bit on {{/usr/local/bin/tool}} together with mode 755?', fill: ['chmod 4755 /usr/local/bin/tool', 'chmod u+s,755 /usr/local/bin/tool'], e: '4 = SUID, 2 = SGID, 1 = sticky.' },
    { q: 'Which command changes the owner of {{report.txt}} to {{alice}} and the group to {{staff}}?', fill: ['chown alice:staff report.txt', 'chown alice.staff report.txt'], e: 'Only root may change the owner.' },
    { q: 'Which command finds all files with the SUID bit set?', o: ['{{find / -perm -4000}}', '{{find / -perm 0400}}', '{{find / -suid}}', '{{ls -R / | grep s}}'], a: 0, e: '{{-perm -4000}} = at least this bit set.' },
    { q: 'What does a capital {{S}} in {{-rwSr--r--}} indicate?', o: ['SUID is set and the owner can execute.', 'SUID is set but the owner execute bit is not set.', 'The file is a socket.', 'SGID is set.'], a: 1, e: 'Lower-case s = special bit + x; upper-case S = special bit without x.' },
    { q: 'A user owns a file and is a member of group {{dev}}. Which command can they use to change the file\'s group to {{dev}}? (Choose two.)', o: ['{{chgrp dev file}}', '{{chown :dev file}}', '{{chmod g=dev file}}', '{{newgrp dev file}}'], a: [0, 1], e: 'Owners may change the group to groups they belong to.' },
    { q: 'What does the execute permission mean for a directory?', o: ['Programs in it may run.', 'The directory may be entered and its entries accessed.', 'The directory may be listed.', 'Files may be deleted in it.'], a: 1, e: 'r lists names, w creates/deletes entries, x allows traversal.' },
    { q: 'Which command shows the current umask in symbolic form?', fill: ['umask -S'], e: 'e.g. {{u=rwx,g=rx,o=rx}} for 0022.' },
    { q: 'What does {{chmod -R a+X dir}} do?', o: ['Makes every file executable.', 'Adds execute for all on directories and on files that are already executable for someone.', 'Removes execute permission.', 'Sets the sticky bit.'], a: 1, e: 'Capital X is the safe way to make trees traversable.' },
    { q: 'Which statement about SUID on Linux is true?', o: ['It is honoured on shell scripts.', 'It makes a binary run with the privileges of its owner.', 'It works on directories.', 'It is shown as t.'], a: 1, e: 'Linux ignores SUID on interpreted scripts for security reasons.' },
  ],
});

LPIC.add({
  id: '104.6',
  title: 'Create and change hard and symbolic links',
  weight: 2,
  desc: 'Candidates should be able to create and manage hard and symbolic links to a file.',
  knowledge: ['Create links.', 'Identify hard and/or soft links.', 'Copying versus linking files.', 'Use links to support system administration tasks.'],
  terms: ['ln', 'ls'],
  sims: ['links'],
  wiki: String.raw`
## Inodes and directory entries
A file consists of an **inode** (metadata: type, permissions, owner, size, timestamps, link count, pointers to the data blocks — but **not** the name) and the data. A **directory** is a table of *names → inode numbers*. {{ls -i}} shows inode numbers; {{stat}} shows all metadata.

## Hard links
A **hard link** is an additional directory entry pointing to the **same inode**:

~~~console
$ cp notes.txt orig.txt
$ ln orig.txt orig-hard
$ ls -li orig.txt orig-hard
$ stat -c '%h links, inode %i' orig.txt
$ echo "added via hard link" >> orig-hard
$ tail -1 orig.txt
$ rm orig.txt
$ cat orig-hard | head -2
~~~

- all names are **equal** — there is no "original"
- the **link count** (2nd column of {{ls -l}}) counts the names; data is freed when it drops to 0 (and no process has the file open)
- only within the **same filesystem** (inode numbers are per filesystem) — otherwise "Invalid cross-device link"
- **not for directories** (would create loops; only the kernel makes {{.}} and {{..}} — that is why a directory's link count is 2 + number of subdirectories)
- same permissions/owner for all names (it is one inode)

## Symbolic (soft) links
A **symlink** is a small special file (type {{l}}) that contains a **path**:

~~~console
$ ln -s /etc/hosts hosts-link
$ ls -l hosts-link
$ cat hosts-link | head -2
$ ln -s ../student/poem.txt docs/poem-rel
$ ls -l docs/poem-rel
$ readlink hosts-link
$ readlink -f docs/poem-rel
$ ln -sf /etc/hostname hosts-link
$ ls -l hosts-link
~~~

- may point to **directories** and across **filesystems**
- has its own inode; permissions shown as {{lrwxrwxrwx}} — access is decided by the target
- becomes **dangling** (broken) if the target is deleted or renamed; {{find -xtype l}} finds broken links
- **relative** targets are resolved relative to the directory containing the link (not your current directory!)
- most commands follow symlinks; {{ls -l}}, {{rm}}, {{lstat}} act on the link itself. {{cp -d}}/{{-P}} copies links as links

## ln options
| Option | Meaning |
|---|---|
| (none) | hard link |
| {{-s}} | symbolic link |
| {{-f}} | remove an existing destination |
| {{-n}} | do not follow a symlink-to-directory as destination (use with {{-sf}} to replace such a link) |
| {{-v}} | verbose |
| {{-r}} | create relative symlinks |

Syntax like {{cp}}: {{ln TARGET LINKNAME}}, {{ln TARGET... DIRECTORY}}. Mnemonic: **existing first, new second**.

## Identifying links
~~~console
$ ls -l /bin /etc/localtime /usr/lib/systemd/system/runlevel3.target
$ find /etc -maxdepth 1 -type l
$ find / -samefile /etc/hosts 2>/dev/null
$ find . -inum $(stat -c %i orig-hard)
$ file /etc/localtime
~~~

## Copying vs. linking
| | copy ({{cp}}) | hard link | symlink |
|---|---|---|---|
| own data | yes — independent | shared | shared (via path) |
| changes visible in both | no | yes | yes |
| survives deleting the "original" | yes | yes | no (dangling) |
| across filesystems / dirs | yes | no / no | yes / yes |
| space | full size | one directory entry | tiny |

## Links in system administration
- **versioned files**: {{libz.so.1 -> libz.so.1.2.13}}, {{/boot/vmlinuz -> vmlinuz-6.1.0-18-amd64}}, Java/Python alternatives ({{/etc/alternatives/}}, {{update-alternatives}})
- **configuration switches**: {{/etc/localtime -> /usr/share/zoneinfo/Europe/Berlin}}, systemd {{default.target}} and {{*.wants/}} directories, SysV {{/etc/rcN.d/S20ssh -> ../init.d/ssh}}, nginx/apache {{sites-enabled/ -> ../sites-available/…}}
- **merged /usr**: {{/bin -> usr/bin}}
- **backups with hard links** (rsnapshot, {{cp -al}}): unchanged files take no extra space
`,
  quiz: [
    { q: 'Which command creates a symbolic link named {{latest}} pointing to {{release-2.4}}?', fill: ['ln -s release-2.4 latest'], e: 'Existing target first, new link name second.' },
    { q: 'Which statements about hard links are true? (Choose two.)', o: ['They share the same inode as the original.', 'They can point to directories.', 'They cannot span filesystems.', 'They break when the original name is deleted.'], a: [0, 2], e: 'Symlinks can span filesystems and point to directories; they break when the target is removed.' },
    { q: 'How can you see whether two file names are hard links to the same file?', o: ['{{ls -i}} shows the same inode number', '{{ls -s}} shows the same size', '{{file}} reports "hard link"', '{{ls -l}} shows an arrow'], a: 0, e: 'Also the link count > 1 and {{find -samefile}}.' },
    { q: 'What happens to a symbolic link when its target file is deleted?', o: ['The link is deleted too.', 'The link becomes dangling (broken).', 'The link turns into a regular file.', 'The target is restored.'], a: 1, e: 'Accessing it fails with "No such file or directory".' },
    { q: 'Which column of {{ls -l}} shows the number of hard links?', o: ['the first', 'the second', 'the fifth', 'the last'], a: 1, e: 'Mode, links, owner, group, size, date, name.' },
    { q: 'Which command shows the target a symbolic link points to? (Choose two.)', o: ['{{readlink link}}', '{{ls -l link}}', '{{stat -L link}}', '{{cat link}}'], a: [0, 1], e: '{{cat}} shows the target\'s content; {{readlink -f}} resolves fully.' },
    { q: 'Why does {{ln /home/file /var/file}} fail with "Invalid cross-device link" when {{/home}} and {{/var}} are separate filesystems?', o: ['Hard links cannot cross filesystem boundaries.', 'The user lacks permission.', '{{/var}} is read-only.', 'The -s option is mandatory for files.'], a: 0, e: 'Inode numbers are only unique within one filesystem. Use {{ln -s}}.' },
    { q: 'Which ln option replaces an existing link named {{current}}?', o: ['{{-r}}', '{{-f}}', '{{-u}}', '{{-o}}'], a: 1, e: '{{ln -sf new-target current}} (add {{-n}} if current points to a directory).' },
    { q: 'A relative symlink {{/opt/app/conf -> ../etc/app.conf}} is created. Relative to which directory is the target resolved?', o: ['the current working directory', 'the directory containing the link ({{/opt/app}})', 'the root directory', 'the home directory'], a: 1, e: 'So the target is {{/opt/etc/app.conf}}.' },
    { q: 'What is the file type character of a symbolic link in {{ls -l}}?', fill: ['l'], e: '{{lrwxrwxrwx}}' },
  ],
});

LPIC.add({
  id: '104.7',
  title: 'Find system files and place files in the correct location',
  weight: 2,
  desc: 'Candidates should be thoroughly familiar with the Filesystem Hierarchy Standard (FHS), including typical file locations and directory classifications.',
  knowledge: [
    'Understand the correct locations of files under the FHS.',
    'Find files and commands on a Linux system.',
    'Know the location and purpose of important file and directories as defined in the FHS.',
  ],
  terms: ['find', 'locate', 'updatedb', 'whereis', 'which', 'type', '/etc/updatedb.conf'],
  wiki: String.raw`
## The Filesystem Hierarchy Standard
The **FHS** defines where things belong so that software and administrators find them on any distribution. Two classifications: **shareable** vs. **unshareable** (host specific) and **static** vs. **variable** data.

| Directory | Purpose |
|---|---|
| {{/}} | root of the tree; must contain everything to boot and repair |
| {{/bin}} | essential user commands ({{ls}}, {{cp}}, {{bash}}) — today often a symlink to {{/usr/bin}} |
| {{/sbin}} | essential system administration commands ({{fsck}}, {{ip}}, {{reboot}}) |
| {{/boot}} | static boot files: kernel, initramfs, GRUB |
| {{/dev}} | device files |
| {{/etc}} | host-specific **configuration** (text files, no binaries) |
| {{/home}} | users' home directories (optional per FHS) |
| {{/root}} | root's home directory |
| {{/lib}}, {{/lib64}} | essential shared libraries and kernel modules ({{/lib/modules}}) |
| {{/media}} | mount points for removable media |
| {{/mnt}} | temporary mount point for the administrator |
| {{/opt}} | add-on application packages ({{/opt/<package>}}); config in {{/etc/opt}}, variable data in {{/var/opt}} |
| {{/proc}} | virtual: process and kernel information |
| {{/sys}} | virtual: devices, drivers (sysfs) |
| {{/run}} | runtime variable data since boot (PID files, sockets) — tmpfs, cleared at boot (formerly {{/var/run}}) |
| {{/srv}} | data served by this system (web, FTP, rsync) |
| {{/tmp}} | temporary files — may be cleared at boot |
| {{/usr}} | shareable, read-only data: {{/usr/bin}}, {{/usr/sbin}}, {{/usr/lib}}, {{/usr/include}}, {{/usr/share}} (architecture-independent: docs, man pages {{/usr/share/man}}, {{/usr/share/doc}}), {{/usr/src}} |
| {{/usr/local}} | locally installed software (not managed by the package manager), same structure: {{bin}}, {{sbin}}, {{lib}}, {{etc}}, {{share}} |
| {{/var}} | variable data: {{/var/log}} logs, {{/var/spool}} queues (mail, print, cron), {{/var/cache}}, {{/var/lib}} state data (package databases), {{/var/mail}}, {{/var/tmp}} (temporary files preserved across reboots) |

~~~console
$ ls /
$ ls -l /bin /sbin /lib
$ ls /usr/share/man | head
$ man hier
~~~

> EXAM: Typical questions: where do configuration files go ({{/etc}}), logs ({{/var/log}}), third-party software ({{/opt}} or {{/usr/local}}), files that survive a reboot but are temporary ({{/var/tmp}}), data served to the network ({{/srv}}), runtime PID files ({{/run}}).

## find (recap)
{{find}} searches the live filesystem and is very flexible, but slow on large trees — see 103.3 for tests and actions.

~~~console
$ find /etc -name "*.conf" -newer /etc/hostname 2>/dev/null | head -5
$ find / -xdev -size +10M 2>/dev/null
$ find /usr/share/doc -maxdepth 1 -iname "*bash*"
~~~

## locate and updatedb
{{locate}} searches a **database** of file names — very fast but only as current as the last {{updatedb}} run (daily via cron/systemd timer). Implementations: mlocate, plocate, (s)locate.

~~~console
$ locate sshd_config
$ locate -i README | head -3
$ locate -c '*.conf'
$ locate -b '\passwd'
$ locate -e hosts
# updatedb
~~~

- {{-i}} ignore case, {{-c}} count, {{-l N}} limit, {{-b}} match only the base name, {{-r}} regex, {{-e}} only existing files, {{-S}} statistics.
- Files created after the last update are not found; deleted ones still are (unless {{-e}}).
- Configuration **{{/etc/updatedb.conf}}**: {{PRUNEPATHS}} (directories to skip, e.g. {{/tmp /var/spool /media}}), {{PRUNEFS}} (filesystem types to skip, e.g. {{nfs proc}}), {{PRUNENAMES}}, {{PRUNE_BIND_MOUNTS}}.
- The database ({{/var/lib/mlocate/mlocate.db}} or {{/var/lib/plocate/plocate.db}}) only reveals names a user is allowed to see.

## whereis, which, type
~~~console
$ whereis ls
ls: /usr/bin/ls /usr/share/man/man1/ls.1.gz
$ whereis -b passwd
$ whereis -m passwd
$ which -a ls
$ type -a ls
$ type cd
~~~

| Command | Searches |
|---|---|
| {{which CMD}} | the **PATH** for the executable that would run ({{-a}} all matches) |
| {{whereis CMD}} | standard locations for the **binary**, **man pages** and **sources** ({{-b}}, {{-m}}, {{-s}}) |
| {{type CMD}} | what bash really executes: alias, keyword, function, builtin or file |
| {{locate NAME}} | the database of all file names |
| {{find …}} | the live filesystem with any criteria |
`,
  quiz: [
    { q: 'Which command updates the database used by {{locate}}?', fill: ['updatedb'], e: 'Usually run daily by cron or a systemd timer.' },
    { q: 'In which file can directories be excluded from the locate database?', fill: ['/etc/updatedb.conf'], e: 'Variables PRUNEPATHS, PRUNEFS, PRUNENAMES.' },
    { q: 'Which command shows the locations of the binary and the manual page of {{passwd}}?', fill: ['whereis passwd'], e: '{{whereis -b}} binaries only, {{-m}} manuals only.' },
    { q: 'According to the FHS, where should host-specific configuration files be stored?', fill: ['/etc'], e: '/etc contains no binaries.' },
    { q: 'Where should temporary files be stored that must be preserved across reboots?', o: ['{{/tmp}}', '{{/var/tmp}}', '{{/run}}', '{{/srv}}'], a: 1, e: '{{/tmp}} may be cleared at boot (often a tmpfs).' },
    { q: 'Which directory is intended for add-on software packages from third parties, each in its own subdirectory?', fill: ['/opt'], e: '{{/opt/<package>}}; locally compiled software usually goes to {{/usr/local}}.' },
    { q: 'Which directory holds data served by the system, e.g. web or FTP content?', fill: ['/srv'], e: 'e.g. {{/srv/www}}, {{/srv/ftp}}.' },
    { q: 'Which directory contains runtime data like PID files and sockets and is cleared at every boot?', o: ['{{/var/run}} only', '{{/run}}', '{{/proc}}', '{{/var/lib}}'], a: 1, e: '{{/var/run}} is a symlink to {{/run}} on modern systems.' },
    { q: 'Which statement about locate is true?', o: ['It searches the filesystem in real time.', 'It searches a database and may miss files created after the last updatedb run.', 'It needs root privileges to run.', 'It only finds executables.'], a: 1, e: 'Use {{find}} for current results.' },
    { q: 'Where are log files stored according to the FHS?', fill: ['/var/log'], e: 'Variable data goes below /var.' },
    { q: 'Which command lists **all** executables named {{python3}} in the PATH?', fill: ['which -a python3', 'type -a python3'], e: '{{which}} without {{-a}} prints only the first match.' },
    { q: 'Which directory contains architecture-independent shared data such as manual pages and documentation?', o: ['{{/usr/lib}}', '{{/usr/share}}', '{{/var/share}}', '{{/etc/doc}}'], a: 1, e: '{{/usr/share/man}}, {{/usr/share/doc}}, {{/usr/share/zoneinfo}}.' },
  ],
});
