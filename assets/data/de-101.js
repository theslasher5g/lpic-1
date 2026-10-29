/* Deutsche Erklärungen und Kurzfassungen — Themen 101 und 102. */
LPIC.addDe({
  '101.1#0': '/proc/interrupts zeigt, welche IRQs von welchen Geräten genutzt werden und wie oft sie ausgelöst wurden.',
  '101.1#1': '{{lsmod}} listet die geladenen Kernelmodule (Name, Größe, verwendet von) aus /proc/modules auf.',
  '101.1#2': '{{modprobe}} lädt ein Modul samt Abhängigkeiten (aus modules.dep); {{insmod}} kann das nicht.',
  '101.1#3': '{{lspci -k}} zeigt zu jedem PCI-Gerät den verwendeten Kerneltreiber und mögliche Module.',
  '101.1#4': 'sysfs, eingehängt unter /sys, bildet das Gerätemodell des Kernels als Verzeichnisse und Attributdateien ab.',
  '101.1#5': 'udev reagiert auf Kernel-Ereignisse und legt Gerätedateien in /dev dynamisch an (auch symbolische Namen).',
  '101.1#6': '{{lsusb -t}} zeigt die USB-Busse und angeschlossenen Geräte als Baum.',
  '101.1#7': '/proc/ioports listet die von Geräten belegten I/O-Port-Adressbereiche.',
  '101.1#8': 'Eine Zeile {{blacklist MODUL}} in einer Datei unter /etc/modprobe.d/ verhindert das automatische Laden.',
  '101.1#9': 'NVMe: Controller 0, Namespace 1, Partition 1 → /dev/nvme0n1p1.',
  '101.1#10': 'D-Bus ist ein Nachrichtenbus für die Kommunikation zwischen Prozessen; Desktop-Programme erfahren darüber z. B. von neuer Hardware.',
  '101.1#11': '{{modinfo}} zeigt Beschreibung, Lizenz, Autor, Abhängigkeiten und Parameter eines Moduls.',
  '101.1#12': 'Nur im BIOS-/UEFI-Setup deaktivierte Geräte sind für das Betriebssystem vollständig unsichtbar.',
  '101.1#13': 'lsmod liest /proc/modules und formatiert die Ausgabe.',
  '101.2#0': '{{dmesg}} gibt den Kernel-Ringpuffer mit den Meldungen seit dem Start aus.',
  '101.2#1': '/proc/cmdline enthält die Kernelparameter, mit denen der laufende Kernel gestartet wurde.',
  '101.2#2': '{{journalctl -b -1}} zeigt das Journal des vorherigen Bootvorgangs (persistentes Journal nötig).',
  '101.2#3': 'Das initramfs ist ein temporäres Root-Dateisystem mit Treibern und Werkzeugen, um das echte Root-Dateisystem einzuhängen.',
  '101.2#4': 'UEFI startet eine EFI-Anwendung (.efi) von der EFI-Systempartition, z. B. grubx64.efi oder shimx64.efi.',
  '101.2#5': '{{systemd.unit=rescue.target}} startet in den Rettungsmodus (Einzelbenutzer).',
  '101.2#6': 'Mit {{e}} bearbeitet man den markierten GRUB-Eintrag (z. B. Kernelparameter), {{Ctrl+X}} bzw. {{F10}} startet ihn.',
  '101.2#7': 'init bzw. systemd ist der erste Prozess und hat immer die PID 1.',
  '101.2#8': 'Upstart war ereignisbasiert und wurde von Ubuntu vor systemd verwendet.',
  '101.2#9': 'Firmware (BIOS/UEFI) → Bootloader → Kernel → initramfs → init/systemd.',
  '101.2#10': 'SysVinit wird über /etc/inittab konfiguriert; die Runlevel-Skripte werden über S- und K-Symlinks in /etc/rcN.d/ gestartet/gestoppt.',
  '101.2#11': '{{init=/bin/bash}} startet statt init direkt eine Root-Shell – nützlich zum Zurücksetzen des Root-Passworts.',
  '101.2#12': '{{journalctl -k}} zeigt nur Kernelmeldungen (wie dmesg) aus dem Journal.',
  '101.2#13': '{{ro}} hängt das Root-Dateisystem zunächst schreibgeschützt ein, damit fsck es prüfen kann; später wird es rw eingehängt.',
  '101.3#0': '{{systemctl set-default multi-user.target}} setzt den Symlink default.target für den nächsten Start.',
  '101.3#1': 'Die Zeile {{id:3:initdefault:}} in /etc/inittab legt den Standard-Runlevel 3 fest.',
  '101.3#2': 'Runlevel 5 (grafisch) entspricht graphical.target.',
  '101.3#3': '{{shutdown -c}} bricht ein geplantes Herunterfahren ab.',
  '101.3#4': '{{shutdown -r +5 "Nachricht"}} startet in 5 Minuten neu und benachrichtigt alle Benutzer.',
  '101.3#5': '{{wall}} sendet eine Nachricht an die Terminals aller angemeldeten Benutzer.',
  '101.3#6': '„N“ bedeutet: es gab keinen vorherigen Runlevel; der aktuelle ist 3.',
  '101.3#7': '{{telinit 1}} oder {{init 1}} wechseln sofort in den Einzelbenutzermodus.',
  '101.3#8': 'Eigene oder geänderte Unit-Dateien gehören nach /etc/systemd/system/ – sie haben Vorrang vor /lib/systemd/system/.',
  '101.3#9': '{{systemctl isolate ZIEL}} wechselt sofort und stoppt alle Units, die das Ziel nicht benötigt.',
  '101.3#10': '{{shutdown -k}} sendet nur die Warnung, ohne herunterzufahren.',
  '101.3#11': 'Die SysV-Init-Skripte liegen in /etc/init.d/.',
  '101.3#12': 'emergency.target bietet eine minimale Root-Shell; das Root-Dateisystem ist meist nur lesbar eingehängt.',
  '102.1#0': '/etc (mit fstab) und /sbin (mit mount, fsck) werden zum Booten benötigt und müssen auf dem Root-Dateisystem liegen.',
  '102.1#1': 'Die EFI-Systempartition muss FAT (vfat, meist FAT32) formatiert sein.',
  '102.1#2': 'MBR erlaubt höchstens 4 primäre Partitionen (oder 3 primäre plus eine erweiterte).',
  '102.1#3': 'Mails (/var/mail, /var/spool) und Logs (/var/log) liegen unter /var – es braucht viel Platz.',
  '102.1#4': 'Die Volume Group fasst ein oder mehrere Physical Volumes zu einem Speicherpool zusammen.',
  '102.1#5': '{{pvcreate}} initialisiert eine Partition oder Platte als Physical Volume.',
  '102.1#6': 'Eine eigene /home-Partition übersteht eine Neuinstallation, und Benutzer können das Root-Dateisystem nicht füllen.',
  '102.1#7': 'Swap kann eine Partition oder eine Datei sein; vorbereitet mit {{mkswap}}, aktiviert mit {{swapon}}.',
  '102.1#8': 'GPT unterstützt Platten über 2 TiB und speichert eine Sicherungskopie der Partitionstabelle am Ende der Platte.',
  '102.1#9': 'Liegt Root auf LVM oder ist verschlüsselt, braucht der Bootloader eine separate, lesbare /boot-Partition.',
  '102.1#10': 'Ein LVM-Snapshot friert den Zustand eines Logical Volumes ein – ideal für konsistente Backups.',
  '102.2#0': 'GRUB 2 liest /boot/grub/grub.cfg; diese Datei wird generiert und nicht direkt bearbeitet.',
  '102.2#1': '{{grub-mkconfig -o /boot/grub/grub.cfg}} (Debian-Kurzform: {{update-grub}}) erzeugt die Konfiguration neu.',
  '102.2#2': 'GRUB Legacy verwendet /boot/grub/menu.lst (Red Hat: grub.conf).',
  '102.2#3': 'In GRUB 2 werden Platten ab 0, Partitionen ab 1 gezählt: (hd0,1) = erste Platte, erste Partition.',
  '102.2#4': '{{grub-install /dev/sda}} installiert GRUB in den MBR der ersten Platte.',
  '102.2#5': 'GRUB_TIMEOUT legt fest, wie viele Sekunden das Menü angezeigt wird.',
  '102.2#6': 'Eigene Einträge gehören nach /etc/grub.d/40_custom; danach die Konfiguration neu erzeugen.',
  '102.2#7': '{{chainloader +1}} übergibt an den Bootsektor einer anderen Partition, z. B. Windows.',
  '102.2#8': 'GRUB_CMDLINE_LINUX_DEFAULT gilt nur für normale Einträge, GRUB_CMDLINE_LINUX für alle (auch Recovery).',
  '102.2#9': 'Mit {{chroot /mnt}} arbeitet man im installierten System und führt dort {{grub-install}} und {{update-grub}} aus.',
  '102.2#10': 'Der MBR hat 512 Byte: 446 Byte Bootcode, 64 Byte Partitionstabelle, 2 Byte Signatur (0x55AA).',
  '102.3#0': '{{ldd}} zeigt die benötigten Shared Libraries eines Programms und wo sie gefunden werden.',
  '102.3#1': '{{ldconfig}} aktualisiert den Cache /etc/ld.so.cache und die soname-Symlinks.',
  '102.3#2': 'LD_LIBRARY_PATH nennt zusätzliche Verzeichnisse, die vor dem Cache durchsucht werden.',
  '102.3#3': '/etc/ld.so.cache ist der binäre Cache, den der dynamische Linker verwendet.',
  '102.3#4': '{{ldconfig -p}} gibt den Inhalt des Bibliotheks-Caches aus.',
  '102.3#5': 'Shared Libraries enden auf .so (shared object), meist mit Versionsnummer, z. B. libz.so.1.',
  '102.3#6': 'ldd meldet fehlende Bibliotheken mit „=> not found“.',
  '102.3#7': 'System-Bibliotheken liegen typischerweise in /lib und /usr/lib (bzw. lib64 / x86_64-linux-gnu).',
  '102.3#8': 'Der dynamische Linker ld-linux.so lädt beim Programmstart die benötigten Bibliotheken.',
  '102.4#0': '{{dpkg -S DATEI}} zeigt das installierte Paket, zu dem eine Datei gehört.',
  '102.4#1': '{{apt-get purge}} (bzw. {{dpkg -P}}) entfernt ein Paket mitsamt Konfigurationsdateien.',
  '102.4#2': '{{apt-get update}} lädt die Paketlisten der Repositories neu.',
  '102.4#3': '{{dpkg -L PAKET}} listet alle Dateien eines installierten Pakets.',
  '102.4#4': 'Die Paketquellen stehen in /etc/apt/sources.list und /etc/apt/sources.list.d/.',
  '102.4#5': '{{apt-get install -f}} (fix broken) installiert fehlende Abhängigkeiten nach.',
  '102.4#6': '{{dpkg-reconfigure PAKET}} startet den Konfigurationsdialog eines Pakets erneut, z. B. tzdata.',
  '102.4#7': 'dist-upgrade (bzw. full-upgrade) darf zur Auflösung geänderter Abhängigkeiten Pakete neu installieren oder entfernen.',
  '102.4#8': '{{apt-cache depends}} zeigt die Abhängigkeiten eines Pakets ohne Installation.',
  '102.4#9': '„rc“: Paket entfernt (removed), Konfigurationsdateien noch vorhanden (config-files).',
  '102.4#10': '{{apt-file search DATEI}} findet Pakete, die eine Datei enthalten – auch nicht installierte.',
  '102.4#11': '{{dpkg -c datei.deb}} listet den Inhalt einer .deb-Datei.',
  '102.4#12': 'dpkg installiert lokale .deb-Dateien, löst aber keine Abhängigkeiten auf – das macht apt.',
  '102.5#0': '{{rpm -qa}} listet alle installierten RPM-Pakete.',
  '102.5#1': '{{rpm -qf DATEI}} zeigt, zu welchem Paket eine Datei gehört.',
  '102.5#2': '-U aktualisiert oder installiert; -F (freshen) aktualisiert nur bereits installierte Pakete.',
  '102.5#3': '{{-p}} bezieht die Abfrage auf eine Paketdatei: {{rpm -qpl datei.rpm}} listet deren Dateien.',
  '102.5#4': '{{rpm2cpio}} wandelt das RPM in ein cpio-Archiv, das {{cpio -idmv}} entpackt.',
  '102.5#5': 'Die Repository-Definitionen (*.repo) liegen in /etc/yum.repos.d/.',
  '102.5#6': '{{yum provides DATEI}} (oder {{whatprovides}}) findet das Paket, das eine Datei bereitstellt.',
  '102.5#7': '{{rpm -V}} prüft installierte Dateien gegen die RPM-Datenbank (Größe, Prüfsumme, Rechte …).',
  '102.5#8': '{{zypper refresh}} ({{ref}}) aktualisiert die Repository-Metadaten.',
  '102.5#9': '{{rpm -K}} (bzw. {{--checksig}}) prüft Signatur und Prüfsummen einer Paketdatei.',
  '102.5#10': 'dnf ist der Nachfolger von yum (Fedora, RHEL 8+); die Syntax ist weitgehend gleich.',
  '102.5#11': '{{rpm -qR}} zeigt die Abhängigkeiten (Requires) eines installierten Pakets.',
  '102.5#12': '{{zypper install}} und die Kurzform {{zypper in}} installieren Pakete.',
  '102.6#0': 'SSH-Host-Schlüssel und /etc/machine-id müssen in jedem Klon eindeutig sein und neu erzeugt werden.',
  '102.6#1': 'Container teilen sich den Kernel des Hosts; sie werden per Namespaces und cgroups isoliert.',
  '102.6#2': 'cloud-init konfiguriert Cloud-Instanzen beim ersten Start (Hostname, Benutzer, SSH-Schlüssel, Pakete).',
  '102.6#3': 'vmx (Intel VT-x) und svm (AMD-V) in /proc/cpuinfo zeigen Hardware-Virtualisierung an.',
  '102.6#4': 'Gasttreiber (virtio, Guest Additions) verbessern Leistung und Integration (Grafik, Maus, Zwischenablage).',
  '102.6#5': 'Block Storage (Volume) ist eine persistente virtuelle Festplatte, die an Instanzen angehängt wird.',
  '102.6#6': 'Anwendungscontainer (z. B. Docker) enthalten eine einzelne Anwendung mit ihren Abhängigkeiten.',
  '102.6#7': '{{systemd-detect-virt}} meldet die Virtualisierungstechnik, z. B. kvm, vmware oder none.',
  '102.6#8': '/etc/machine-id enthält die eindeutige Maschinen-ID, die systemd und D-Bus verwenden.',
});

LPIC.addSummaryDe({
  '101.1': `- **sysfs** (/sys), **procfs** (/proc), **udev** (legt /dev-Gerätedateien an) und **D-Bus** (Nachrichtenbus) bilden die Grundlage der Hardwareerkennung.
- Hardware anzeigen: {{lspci}} ({{-k}} Treiber, {{-v}} Details), {{lsusb}} ({{-t}} Baum), {{lsblk}}, {{lscpu}}.
- Ressourcen: /proc/interrupts (IRQ), /proc/ioports (I/O), /proc/dma (DMA).
- Module: {{lsmod}}, {{modinfo}}, {{modprobe}} (mit Abhängigkeiten), {{modprobe -r}}, {{insmod}}/{{rmmod}} (ohne). Dauerhaft: /etc/modprobe.d/ ({{blacklist}}, {{options}}), /etc/modules-load.d/.
- Integrierte Geräte vollständig abschalten: im BIOS/UEFI-Setup.
- Massenspeicher: HDD/SSD als /dev/sdX, NVMe als /dev/nvme0n1p1.`,
  '101.2': `- Ablauf: **Firmware (BIOS/UEFI, POST)** → **Bootloader (GRUB)** → **Kernel** → **initramfs** → **init/systemd (PID 1)**.
- BIOS liest den Bootloader aus dem MBR, UEFI startet eine .efi-Datei von der EFI-Systempartition (FAT, /boot/efi).
- Kernelparameter im GRUB-Menü mit {{e}} ändern: {{init=/bin/bash}}, {{systemd.unit=rescue.target}}, {{single}}, {{quiet}}, {{ro}}; aktueller Stand in /proc/cmdline.
- Init-Systeme: SysVinit (/etc/inittab, Runlevel), Upstart (ereignisbasiert), systemd (Units, Targets).
- Bootmeldungen: {{dmesg}}, {{journalctl -b}}, {{journalctl -k}}, {{journalctl -b -1}}, /var/log/boot.log.`,
  '101.3': `- Runlevel: 0 Halt, 1/S Einzelbenutzer, 2–5 Mehrbenutzer (5 grafisch), 6 Neustart. Standard in /etc/inittab ({{id:3:initdefault:}}).
- systemd-Targets: rescue.target, multi-user.target (3), graphical.target (5), poweroff/reboot.target.
- {{systemctl get-default}} / {{set-default}} (nächster Start), {{systemctl isolate}} (sofort wechseln).
- SysV: {{runlevel}}, {{telinit N}} / {{init N}}, Skripte in /etc/init.d/, Links in /etc/rcN.d/ (S… start, K… kill).
- Herunterfahren: {{shutdown -h now}}, {{shutdown -r +5 "Text"}}, {{shutdown -c}} (abbrechen), {{shutdown -k}} (nur warnen), {{wall}}, {{halt}}, {{poweroff}}, {{reboot}}.
- acpid bzw. systemd-logind reagieren auf ACPI-Ereignisse (Power-Taste, Deckel).`,
  '102.1': `- Mountpunkte trennen sinnvoll: **/boot** (Bootloader-lesbar), **/home** (Benutzerdaten), **/var** (Logs, Mail, Spool), **/tmp**, **/opt**; /etc, /bin, /sbin, /lib, /dev gehören aufs Root-Dateisystem.
- UEFI braucht eine **EFI-Systempartition** (FAT, /boot/efi); BIOS + GPT eine kleine BIOS-Boot-Partition.
- **Swap**: Partition oder Datei, {{mkswap}}, {{swapon}}; Faustregel abhängig von RAM und Hibernation.
- **LVM**: Physical Volume ({{pvcreate}}) → Volume Group ({{vgcreate}}, {{vgextend}}) → Logical Volume ({{lvcreate}}, {{lvextend -r}}); Übersicht {{pvs}}, {{vgs}}, {{lvs}}; Snapshots für Backups.
- MBR: max. 4 primäre Partitionen, 2 TiB; GPT: 128 Partitionen, größere Platten, Sicherungskopie.`,
  '102.2': `- **GRUB 2**: Konfiguration in /etc/default/grub (GRUB_TIMEOUT, GRUB_DEFAULT, GRUB_CMDLINE_LINUX[_DEFAULT]) und /etc/grub.d/ (eigene Einträge in 40_custom); erzeugen mit {{grub-mkconfig -o /boot/grub/grub.cfg}} bzw. {{update-grub}} (Red Hat: grub2-mkconfig, /boot/grub2/).
- Installieren: {{grub-install /dev/sda}} (BIOS: MBR; UEFI: .efi auf der ESP). Reparatur: Rettungssystem, mounten, {{chroot}}, grub-install.
- Notation: GRUB 2 (hd0,1) = erste Platte, erste Partition; GRUB Legacy (hd0,0).
- **GRUB Legacy**: /boot/grub/menu.lst mit {{title}}, {{root}}, {{kernel}}, {{initrd}}, {{chainloader +1}}.
- Interaktiv: {{e}} bearbeiten, {{c}} Kommandozeile ({{ls}}, {{set root=}}, {{linux}}, {{initrd}}, {{boot}}).`,
  '102.3': `- Shared Libraries (.so) werden zur Laufzeit vom dynamischen Linker **ld-linux.so** geladen; statische Bibliotheken (.a) sind fest eingebaut.
- Abhängigkeiten anzeigen: {{ldd PROGRAMM}} („not found“ = fehlt).
- Suchpfade: /lib, /usr/lib, Einträge in **/etc/ld.so.conf** und **/etc/ld.so.conf.d/*.conf**; danach {{ldconfig}} → Cache **/etc/ld.so.cache** ({{ldconfig -p}} zeigt ihn).
- Temporär: **LD_LIBRARY_PATH** (wird vor dem Cache durchsucht, nicht für SUID-Programme).`,
  '102.4': `- **dpkg** (lokale .deb, keine Abhängigkeitsauflösung): {{-i}} installieren, {{-r}}/{{-P}} entfernen/purgen, {{-l}} Liste, {{-L}} Dateien, {{-S}} Besitzer, {{-s}} Status, {{-c}} Inhalt einer .deb; {{dpkg-reconfigure}}.
- **apt / apt-get / apt-cache**: {{update}}, {{install}}, {{remove}}, {{purge}}, {{upgrade}}, {{full-upgrade}}/{{dist-upgrade}}, {{autoremove}}, {{install -f}}, {{search}}, {{show}}, {{depends}}, {{rdepends}}; {{apt-file search}} für nicht installierte Pakete.
- Quellen: /etc/apt/sources.list und sources.list.d/ ({{deb URI suite komponenten}}); Cache in /var/cache/apt/archives.`,
  '102.5': `- **rpm**: {{-ivh}} installieren, {{-Uvh}} aktualisieren/installieren, {{-F}} nur aktualisieren, {{-e}} entfernen, {{-qa}}, {{-qi}}, {{-ql}}, {{-qc}}, {{-qf DATEI}}, {{-qR}}, {{-qp…}} für Paketdateien, {{-V}} prüfen, {{-K}} Signatur, {{--import}} GPG-Schlüssel.
- **yum/dnf**: {{install}}, {{remove}}, {{update}}/{{upgrade}}, {{search}}, {{info}}, {{provides}}, {{list installed}}, {{repolist}}; Repos in /etc/yum.repos.d/*.repo; {{yumdownloader}} / {{dnf download}}.
- **zypper** (SUSE): {{in}}, {{rm}}, {{up}}, {{se}}, {{ref}}, {{lr}}, {{ar}}.
- {{rpm2cpio paket.rpm | cpio -idmv}} entpackt ohne Installation.`,
  '102.6': `- **Hypervisor** Typ 1 (KVM, Xen, ESXi) direkt auf Hardware, Typ 2 (VirtualBox) als Programm. Voll- vs. Paravirtualisierung; Gasttreiber (virtio, Guest Additions).
- CPU-Unterstützung: Flags vmx (Intel) / svm (AMD) in /proc/cpuinfo; Erkennung im Gast: {{systemd-detect-virt}}.
- **Vorlagen/Klone**: eindeutige Daten neu erzeugen – /etc/machine-id, SSH-Host-Schlüssel, Hostname, MAC/D-Bus-ID.
- **Cloud**: IaaS (VMs, Block Storage, Netzwerk), Zugang per SSH-Schlüssel, Erstkonfiguration mit **cloud-init**.
- **Container** teilen den Host-Kernel (Namespaces, cgroups); Anwendungs- vs. Systemcontainer.`,
});

LPIC.addDe({
  '103.1#0': 'In einfachen Anführungszeichen wird nichts ersetzt – ausgegeben wird wörtlich $HOME.',
  '103.1#1': '{{export}} macht eine Variable zur Umgebungsvariable, die an Kindprozesse vererbt wird.',
  '103.1#2': '{{set}} zeigt alle Shell-Variablen und Funktionen; {{env}} nur exportierte Variablen.',
  '103.1#3': '{{type}} zeigt, ob ein Name ein Alias, Schlüsselwort, eine Funktion, ein Builtin oder eine Datei ist.',
  '103.1#4': 'Das aktuelle Verzeichnis steht nicht im PATH; man ruft das Programm mit {{./run.sh}} auf.',
  '103.1#5': '{{!!}} wiederholt den letzten Befehl, z. B. {{sudo !!}}.',
  '103.1#6': 'Die History wird beim Beenden der Shell in ~/.bash_history (HISTFILE) gespeichert.',
  '103.1#7': '{{&&}} führt den zweiten Befehl nur aus, wenn der erste erfolgreich war (Exit-Status 0).',
  '103.1#8': '{{$?}} enthält den Exit-Status des letzten Befehls (0 = Erfolg).',
  '103.1#9': '{{unset VARIABLE}} entfernt eine Variable.',
  '103.1#10': '{{uname -r}} zeigt das Kernel-Release, z. B. 6.1.0-18-amd64.',
  '103.1#11': 'Abschnitt 5 der Manpages beschreibt Dateiformate, z. B. {{man 5 passwd}}.',
  '103.1#12': '{{apropos}} und {{man -k}} durchsuchen die Kurzbeschreibungen aller Manpages.',
  '103.1#13': 'Ohne export kennt die neue bash die Variable X nicht – es wird eine leere Zeile ausgegeben.',
  '103.1#14': 'HISTCONTROL (z. B. ignoreboth) steuert, ob Duplikate und Befehle mit führendem Leerzeichen gespeichert werden.',
  '103.2#0': '{{tail -n 20}} zeigt die letzten 20 Zeilen, {{-f}} verfolgt neue Zeilen fortlaufend.',
  '103.2#1': '{{cut -d: -f1,3}} wählt mit dem Trennzeichen „:“ die Felder 1 und 3.',
  '103.2#2': 'uniq entfernt nur direkt aufeinanderfolgende Duplikate – daher vorher sortieren.',
  '103.2#3': 'tr liest nur von stdin: {{tr a-z A-Z < datei}}.',
  '103.2#4': '{{wc -l}} zählt Zeilen.',
  '103.2#5': '{{sort -n}} sortiert numerisch, {{-r}} umgekehrt (größte zuerst).',
  '103.2#6': '{{od}} (octal dump) zeigt Dateien oktal, hexadezimal ({{-x}}) oder als Zeichen ({{-c}}).',
  '103.2#7': '{{xzcat}} gibt den entpackten Inhalt einer .xz-Datei auf stdout aus.',
  '103.2#8': '{{nl -b a}} nummeriert alle Zeilen, auch leere (Standard: nur nicht-leere).',
  '103.2#9': '{{sha256sum -c}} prüft Dateien gegen eine Liste von Prüfsummen.',
  '103.2#10': '{{split -l 1000}} teilt eine Datei in Stücke zu 1000 Zeilen (xaa, xab, …).',
  '103.2#11': '{{-n}} unterdrückt die normale Ausgabe, {{5p}} druckt nur Zeile 5.',
  '103.2#12': '{{paste}} fügt Zeilen mehrerer Dateien nebeneinander zusammen, getrennt durch Tab.',
  '103.2#13': '{{tr -s}} fasst Wiederholungen eines Zeichens zu einem zusammen: „aaa“ wird „a“.',
  '103.2#14': '{{tail -n +2}} gibt alles ab Zeile 2 aus.',
  '103.3#0': '{{cp -a}} (archive) kopiert rekursiv und erhält Rechte, Besitzer, Zeitstempel und Symlinks.',
  '103.3#1': '{{mkdir -p}} legt auch fehlende Elternverzeichnisse an.',
  '103.3#2': '{{rmdir}} löscht nur leere Verzeichnisse.',
  '103.3#3': 'Jedes ? steht für genau ein Zeichen – ??? für genau drei.',
  '103.3#4': 'Der Klammerausdruck [aeiou] passt auf genau einen dieser Buchstaben.',
  '103.3#5': '{{-type f}} nur Dateien, {{-size +100M}} größer als 100 MiB.',
  '103.3#6': '{{-mtime -2}} = vor weniger als 2 Tagen geändert.',
  '103.3#7': '{{-exec cmd {} \;}} führt cmd für jede Datei einzeln aus; mit {{+}} gesammelt.',
  '103.3#8': '{{tar -cjf}}: c = erstellen, j = bzip2, f = Dateiname.',
  '103.3#9': '{{tar -tzf}}: t = Inhalt anzeigen, z = gzip.',
  '103.3#10': '{{-C VERZ}} wechselt vor dem Entpacken in das Zielverzeichnis.',
  '103.3#11': '{{gzip -k}} behält die Originaldatei (keep).',
  '103.3#12': 'cpio liest die Liste der Dateinamen von stdin, z. B. von find.',
  '103.3#13': '{{dd}} mit if=/dev/zero, bs=1M und count=10 schreibt 10 MiB Nullen.',
  '103.3#14': '{{file}} erkennt den Typ am Inhalt (Magic Numbers), nicht an der Endung.',
  '103.3#15': 'find mit {{-delete}} oder {{-exec rm {} \;}} löscht die gefundenen Dateien.',
  '103.3#16': 'Klammererweiterung kombiniert alle Möglichkeiten: a1 a2 b1 b2.',
  '103.4#0': '{{> out.log 2>&1}} und {{&> out.log}} leiten stdout und stderr in dieselbe Datei.',
  '103.4#1': 'Standardfehlerausgabe ist Dateideskriptor 2 (stdin 0, stdout 1).',
  '103.4#2': '{{>>}} hängt an eine Datei an, {{>}} überschreibt.',
  '103.4#3': '{{tee}} schreibt die Eingabe in eine Datei und gleichzeitig nach stdout.',
  '103.4#4': '{{2>/dev/null}} verwirft alle Fehlermeldungen.',
  '103.4#5': '{{-print0}} und {{xargs -0}} trennen Namen mit NUL-Zeichen – sicher bei Leerzeichen.',
  '103.4#6': 'Ein Here-Dokument ({{<<ENDE}}) übergibt mehrere Zeilen an stdin bis zum Endwort.',
  '103.4#7': 'Ein Here-String ({{<<<}}) übergibt eine einzelne Zeichenkette an stdin.',
  '103.4#8': 'Die Umleitung macht die eigene, unprivilegierte Shell – nicht sudo. Lösung: {{| sudo tee}}.',
  '103.4#9': '{{xargs -n 1}} ruft den Befehl für jedes Argument einzeln auf.',
  '103.4#10': '{{$(befehl)}} und Backticks setzen die Ausgabe eines Befehls in die Kommandozeile ein.',
  '103.4#11': 'noclobber verhindert, dass {{>}} bestehende Dateien überschreibt ({{>|}} erzwingt es).',
  '103.4#12': 'Eine Pipe übergibt nur stdout; stderr braucht {{2>&1}} oder {{|&}}.',
  '103.5#0': 'Ohne Angabe sendet kill SIGTERM (15) – der Prozess kann sauber beenden.',
  '103.5#1': 'SIGKILL (9) und SIGSTOP können weder abgefangen noch ignoriert werden.',
  '103.5#2': '{{bg}} setzt einen gestoppten Job im Hintergrund fort.',
  '103.5#3': '{{nohup}} lässt den Prozess SIGHUP ignorieren; die Ausgabe landet in nohup.out.',
  '103.5#4': '{{jobs}} listet die Jobs der aktuellen Shell.',
  '103.5#5': 'SIGHUP (1) veranlasst viele Dienste, ihre Konfiguration neu zu lesen.',
  '103.5#6': '{{ps aux}} zeigt alle Prozesse aller Benutzer im BSD-Stil mit %CPU und %MEM.',
  '103.5#7': '{{killall NAME}} sendet SIGTERM an alle Prozesse mit diesem Namen.',
  '103.5#8': '{{pgrep}} gibt die PIDs passender Prozesse aus.',
  '103.5#9': 'Die Load Average ist die durchschnittliche Zahl laufender/wartender Prozesse über 1, 5 und 15 Minuten.',
  '103.5#10': 'In top sortiert {{M}} nach Speicher, {{P}} nach CPU.',
  '103.5#11': '{{watch -n 10}} führt den Befehl alle 10 Sekunden im Vollbild aus.',
  '103.5#12': '{{screen -r}} verbindet wieder mit einer abgetrennten Sitzung ({{tmux attach}} bei tmux).',
  '103.5#13': 'Ctrl+Z stoppt den Vordergrundprozess (SIGTSTP); danach {{bg}} oder {{fg}}.',
  '103.5#14': 'Ein Zombie ist beendet, aber sein Elternprozess hat den Exit-Status noch nicht abgeholt.',
  '103.5#15': '{{free -h}} zeigt RAM und Swap in lesbaren Einheiten.',
  '103.6#0': 'Neue Prozesse starten mit Nice-Wert 0 (bzw. dem Wert des Elternprozesses).',
  '103.6#1': '{{nice}} ohne Wert erhöht die Niceness um 10.',
  '103.6#2': '-20 ist der niedrigste Nice-Wert und damit die höchste Priorität.',
  '103.6#3': '{{renice -n 10 -p 4711}} ändert den Nice-Wert eines laufenden Prozesses.',
  '103.6#4': 'Nur root darf die Niceness senken (Priorität erhöhen); normale Benutzer erhalten „Permission denied“.',
  '103.6#5': '{{nice -n 19}} gibt die niedrigste Priorität.',
  '103.6#6': 'In ps STAT steht N für niedrige Priorität (positiver Nice-Wert), < für hohe.',
  '103.6#7': '{{ps -el}} und {{ps -eo pid,ni,cmd}} zeigen eine NI-Spalte.',
  '103.6#8': 'In top ändert {{r}} (renice) den Nice-Wert eines Prozesses.',
  '103.7#0': '{{^}} Zeilenanfang, {{$}} Zeilenende – also genau „apple“.',
  '103.7#1': '{{grep -Ev "^#|^$"}} entfernt Kommentar- und Leerzeilen.',
  '103.7#2': '{{grep -c}} zählt die passenden Zeilen.',
  '103.7#3': 'In BRE muss + maskiert werden: {{[0-9]\\+}} (GNU); in ERE einfach {{[0-9]+}}.',
  '103.7#4': '{{fgrep}} entspricht {{grep -F}}: feste Zeichenketten statt regulärer Ausdrücke.',
  '103.7#5': '{{^[^#]}}: am Zeilenanfang ein Zeichen, das kein # ist.',
  '103.7#6': '{{sed -i}} bearbeitet die Datei direkt; {{g}} ersetzt alle Vorkommen pro Zeile.',
  '103.7#7': '{{/^$/d}} löscht leere Zeilen.',
  '103.7#8': '{{-r}} bzw. {{-R}} durchsucht Verzeichnisse rekursiv.',
  '103.7#9': '{{-w}} findet nur ganze Wörter – „this“ passt nicht.',
  '103.7#10': '{{&}} steht im Ersetzungsteil für den gesamten gefundenen Text.',
  '103.7#11': '{{u?}} macht das u optional: colour und color.',
  '103.7#12': 'In ERE ({{grep -E}}) sind + ? | ( ) { } ohne Backslash Sonderzeichen.',
  '103.7#13': '{{sed -n "10,20p"}} druckt nur die Zeilen 10 bis 20.',
  '103.7#14': '{{grep -rl}} durchsucht rekursiv und gibt nur Dateinamen aus.',
  '103.8#0': '{{:wq}} und {{ZZ}} speichern und beenden.',
  '103.8#1': '{{:q!}} beendet ohne Speichern.',
  '103.8#2': '{{o}} öffnet eine neue Zeile darunter, {{O}} darüber.',
  '103.8#3': '{{dd}} löscht die aktuelle Zeile (und kopiert sie in den Puffer).',
  '103.8#4': '{{yy}} kopiert (yank) die aktuelle Zeile; {{p}} fügt ein.',
  '103.8#5': '{{?muster}} sucht rückwärts, {{/muster}} vorwärts.',
  '103.8#6': '{{:%s/alt/neu/g}} ersetzt in allen Zeilen alle Vorkommen.',
  '103.8#7': 'h links, j runter, k hoch, l rechts.',
  '103.8#8': 'Esc wechselt vom Einfüge- in den Befehlsmodus.',
  '103.8#9': 'Programme wie crontab -e nutzen VISUAL bzw. EDITOR.',
  '103.8#10': '{{G}} springt zur letzten Zeile, {{gg}} zur ersten.',
  '103.8#11': '{{:w!}} erzwingt das Schreiben, wenn man Besitzer der Datei ist.',
  '103.8#12': '{{u}} macht die letzte Änderung rückgängig, Ctrl+R wiederholt sie.',
  '103.8#13': 'In nano speichert Ctrl+O, Ctrl+X beendet.',
  '103.8#14': '{{A}} hängt Text am Zeilenende an.',
});

LPIC.addSummaryDe({
  '103.1': `- Quoting: "…" ersetzt Variablen, '…' nicht, {{\\}} maskiert ein Zeichen.
- Variablen: {{VAR=wert}}, {{export VAR}}, {{unset VAR}}, {{env}}/{{printenv}} (Umgebung), {{set}} (alles); wichtig: PATH, HOME, $?.
- Befehle suchen und verstehen: {{type}}, {{which}}, {{man}} (Abschnitte 1, 5, 8), {{apropos}}/{{man -k}}, {{whatis}}, {{uname -a/-r}}, {{pwd}}.
- History: ~/.bash_history, {{history}}, {{!!}}, {{!n}}, {{!text}}, Ctrl+R; HISTSIZE, HISTFILESIZE, HISTCONTROL.
- Verketten: {{;}} immer, {{&&}} bei Erfolg, {{||}} bei Fehler. Programme im aktuellen Verzeichnis: {{./prog}}.`,
  '103.2': `- Anzeigen: {{cat}}, {{less}}, {{head}}/{{tail}} ({{-n}}, {{-f}}, {{+N}}), {{tac}}, {{nl}}, {{od}}, {{zcat}}/{{bzcat}}/{{xzcat}}.
- Zerlegen/Zusammenfügen: {{cut}} ({{-d}}, {{-f}}, {{-c}}), {{paste}}, {{join}}, {{split}}.
- Sortieren/Zählen: {{sort}} ({{-n}}, {{-r}}, {{-k}}, {{-t}}, {{-u}}), {{uniq}} ({{-c}}, nur benachbarte Duplikate!), {{wc}} ({{-l}}, {{-w}}, {{-c}}).
- Umwandeln: {{tr}} (nur stdin; {{-d}}, {{-s}}), {{sed}} (Grundlagen, s. 103.7).
- Prüfsummen: {{md5sum}}, {{sha256sum}}, {{sha512sum}}, jeweils {{-c}} zum Prüfen.`,
  '103.3': `- Dateien: {{cp}} ({{-r}}, {{-a}}, {{-p}}, {{-i}}, {{-u}}), {{mv}}, {{rm}} ({{-r}}, {{-f}}), {{touch}}, {{file}}, {{ls}}; Verzeichnisse {{mkdir -p}}, {{rmdir}}.
- Globbing: {{*}} beliebig viele Zeichen, {{?}} genau eins, {{[abc]}}/{{[!abc]}} eines aus/nicht aus der Menge; Klammererweiterung {a,b}.
- find: {{-name}}, {{-type}}, {{-size +100M}}, {{-mtime -2}}, {{-user}}, {{-perm}}, {{-exec … {} \;}}, {{-delete}}.
- Archive: {{tar}} (c/x/t, f, z gzip, j bzip2, J xz, {{-C}}), {{cpio}} (Dateiliste von stdin), {{dd}} (if/of/bs/count).
- Komprimieren: {{gzip}}/{{gunzip}}, {{bzip2}}/{{bunzip2}}, {{xz}}/{{unxz}}; {{-k}} behält das Original.`,
  '103.4': `- Deskriptoren: 0 stdin, 1 stdout, 2 stderr. {{>}} überschreiben, {{>>}} anhängen, {{<}} Eingabe, {{2>}} Fehler, {{2>&1}} bzw. {{&>}} beides, {{/dev/null}} verwerfen.
- Reihenfolge zählt: {{cmd > datei 2>&1}} ≠ {{cmd 2>&1 > datei}}.
- Here-Dokument {{<<ENDE}}, Here-String {{<<<}}.
- Pipes {{|}} verbinden stdout mit stdin; {{tee}} (Datei + Bildschirm, {{-a}} anhängen); {{xargs}} ({{-n}}, {{-0}} mit {{find -print0}}).
- Befehlsersetzung: {{$(befehl)}} oder Backticks. noclobber schützt vor Überschreiben.`,
  '103.5': `- Jobs: {{befehl &}}, {{jobs}}, {{fg}}, {{bg}}, Ctrl+Z, {{nohup}}; Terminal-Multiplexer {{screen}} (Ctrl+A) und {{tmux}} (Ctrl+B).
- Prozesse anzeigen: {{ps}} ({{aux}}, {{-ef}}, {{-u}}), {{top}} (M, P, k, r), {{pstree}}, {{pgrep}}, {{pidof}}, {{uptime}} (Load Average), {{free}}, {{watch}}.
- Signale: {{kill}} (Standard SIGTERM 15), SIGKILL 9 und SIGSTOP nicht abfangbar, SIGHUP 1 (Konfiguration neu lesen), {{kill -l}}; {{killall}}, {{pkill}} nach Namen/Benutzer.
- STAT-Codes: R läuft, S schläft, D wartet auf I/O, T gestoppt, Z Zombie.`,
  '103.6': `- Nice-Werte von **-20** (höchste Priorität) bis **19** (niedrigste), Standard 0.
- {{nice -n N befehl}} startet (ohne Angabe +10), {{renice -n N -p PID}} / {{-u benutzer}} ändert laufende Prozesse.
- Nur root darf den Nice-Wert senken.
- Anzeigen: {{ps -l}} / {{ps -eo pid,ni,cmd}} (Spalten PRI, NI), {{top}} (PR = 20 + NI, Taste r).
- Kernel-Prioritäten: 0–99 Echtzeit, 100–139 normal (Standard 120, /proc/PID/sched).`,
  '103.7': `- Grundbausteine: {{.}} beliebiges Zeichen, {{*}} 0-mal oder öfter, {{^}}/{{$}} Zeilenanfang/-ende, {{[ ]}} Zeichenklassen ({{[[:digit:]]}}), {{\\<}}/{{\\>}} Wortgrenzen.
- ERE (grep -E/egrep): {{+}}, {{?}}, {{|}}, {{( )}}, {{{n,m} }} ohne Backslash; in BRE mit Backslash.
- grep-Optionen: {{-i}}, {{-v}}, {{-c}}, {{-n}}, {{-l}}, {{-r}}, {{-w}}, {{-o}}, {{-A/-B/-C}}, {{-E}}, {{-F}}.
- sed: {{s/alt/neu/g}}, {{-i}} direkt bearbeiten, {{-n … p}}, {{/muster/d}}, {{&}} und Rückverweise {{\\1}}.`,
  '103.8': `- vi-Modi: Befehlsmodus (Esc), Einfügemodus ({{i}}, {{a}}, {{A}}, {{I}}, {{o}}, {{O}}), Doppelpunktbefehle.
- Bewegen: {{h j k l}}, {{w}}/{{b}}, {{0}}/{{$}}, {{gg}}/{{G}}, {{:N}}.
- Bearbeiten: {{x}}, {{dd}}, {{dw}}, {{yy}}, {{p}}/{{P}}, {{u}}, {{r}}/{{R}}, {{.}}.
- Suchen/Ersetzen: {{/muster}}, {{?muster}}, {{n}}/{{N}}, {{:%s/alt/neu/g}}.
- Speichern/Beenden: {{:w}}, {{:w datei}}, {{:wq}}/{{ZZ}}, {{:q!}}, {{:w!}}, {{:e datei}}.
- Standard-Editor über EDITOR/VISUAL; Alternativen: nano (Ctrl+O speichern, Ctrl+X beenden), emacs.`,
});

LPIC.addDe({
  '104.1#0': '{{mkfs.ext4 GERÄT}} und {{mkfs -t ext4 GERÄT}} sind gleichwertig (beides ruft mke2fs auf).',
  '104.1#1': '{{mkswap}} richtet eine Partition als Swap ein; aktiviert wird sie mit {{swapon}}.',
  '104.1#2': 'In fdisk schreibt {{w}} die Tabelle und beendet; {{q}} beendet ohne Speichern.',
  '104.1#3': '{{gdisk}} ist das fdisk-Gegenstück für GPT und nutzt Typcodes wie 8300 (Linux) oder EF00 (EFI).',
  '104.1#4': '{{parted}} wendet Änderungen sofort an – Vorsicht!',
  '104.1#5': 'MBR-Typ 82 = Linux Swap, 83 = Linux, 8e = Linux LVM, ef = EFI.',
  '104.1#6': 'XFS lässt sich mit {{xfs_growfs}} vergrößern, aber nicht verkleinern.',
  '104.1#7': 'Btrfs bietet Subvolumes, Snapshots (Copy-on-Write), Prüfsummen und transparente Kompression.',
  '104.1#8': 'Die EFI-Systempartition braucht FAT (vfat); FAT wird auch auf USB-Sticks verwendet.',
  '104.1#9': '{{-L}} setzt bei ext4 (und XFS) die Dateisystem-Bezeichnung.',
  '104.1#10': '{{fdisk -l}} listet die Partitionstabellen aller Platten.',
  '104.1#11': 'exFAT ist für große Flash-Medien gedacht, erlaubt Dateien > 4 GiB, kennt aber keine Unix-Rechte.',
  '104.2#0': '{{df -i}} zeigt belegte und freie Inodes.',
  '104.2#1': '{{du -sh}} gibt die Gesamtgröße eines Verzeichnisses lesbar aus.',
  '104.2#2': 'fsck darf nur auf ausgehängten (oder nur lesbar eingehängten) Dateisystemen laufen.',
  '104.2#3': '{{xfs_repair}} prüft und repariert XFS (fsck.xfs tut nichts).',
  '104.2#4': '{{xfs_fsr}} defragmentiert ein eingehängtes XFS.',
  '104.2#5': '{{tune2fs -l}} und {{dumpe2fs -h}} zeigen die Superblock-Informationen.',
  '104.2#6': '{{tune2fs -c N}} setzt die maximale Mount-Anzahl bis zur nächsten Prüfung; {{-i}} das Zeitintervall.',
  '104.2#7': '{{fsck -N}} zeigt nur, was ausgeführt würde.',
  '104.2#8': '{{e2fsck -f}} erzwingt die Prüfung, auch wenn das Dateisystem sauber wirkt.',
  '104.2#9': '{{tune2fs -j}} fügt ein Journal hinzu und macht so aus ext2 ein ext3.',
  '104.2#10': 'Wiedergefundene Dateien ohne Verzeichniseintrag landen in lost+found im Wurzelverzeichnis des Dateisystems.',
  '104.2#11': '{{xfs_db -c frag -r GERÄT}} meldet die Fragmentierung eines XFS.',
  '104.3#0': '{{mount -a}} hängt alle fstab-Einträge ohne noauto ein.',
  '104.3#1': 'Das 6. Feld (pass) legt die fsck-Reihenfolge fest: 1 Root, 2 andere, 0 keine Prüfung.',
  '104.3#2': 'Mit {{user}} darf jeder einhängen, aushängen aber nur derselbe Benutzer oder root ({{users}}: jeder).',
  '104.3#3': '{{blkid}} und {{lsblk -f}} zeigen UUIDs, Labels und Dateisystemtypen.',
  '104.3#4': '{{lsof MOUNTPUNKT}} und {{fuser -vm MOUNTPUNKT}} zeigen die Prozesse, die das Dateisystem benutzen.',
  '104.3#5': 'Die UUID bleibt gleich, auch wenn sich Gerätenamen (sda/sdb) ändern.',
  '104.3#6': '{{mount -o remount,rw /}} hängt Root ohne Aushängen beschreibbar neu ein.',
  '104.3#7': '{{defaults}} = rw, suid, dev, exec, auto, nouser, async.',
  '104.3#8': 'Der Mountpunkt /var/backup ergibt die Unit var-backup.mount.',
  '104.3#9': 'Desktops hängen Wechselmedien automatisch unter /media (bzw. /run/media/BENUTZER) ein.',
  '104.3#10': '{{umount}} (ohne n!) hängt ein Dateisystem aus.',
  '104.3#11': '{{_netdev}} sorgt dafür, dass erst nach dem Netzwerk eingehängt wird.',
  '104.5#0': 'rwx = 7, r-x = 5, --- = 0 → 750.',
  '104.5#1': '{{chmod u+x}} fügt nur dem Besitzer das Ausführungsrecht hinzu.',
  '104.5#2': 'Dateien starten bei 666; minus umask 027 ergibt 640 (rw-r-----).',
  '104.5#3': 'SGID auf einem Verzeichnis vererbt dessen Gruppe an neue Dateien.',
  '104.5#4': 'Das Sticky-Bit (t) erlaubt das Löschen/Umbenennen nur dem Dateibesitzer (oder root).',
  '104.5#5': '4 = SUID, dazu 755 → {{chmod 4755}}.',
  '104.5#6': '{{chown benutzer:gruppe datei}} ändert Besitzer und Gruppe gleichzeitig.',
  '104.5#7': '{{find / -perm -4000}} findet Dateien mit gesetztem SUID-Bit.',
  '104.5#8': 'Großes S: SUID gesetzt, aber das Ausführungsrecht des Besitzers fehlt.',
  '104.5#9': 'Als Besitzer und Gruppenmitglied darf man mit {{chgrp}} bzw. {{chown :gruppe}} die Gruppe ändern.',
  '104.5#10': 'x auf einem Verzeichnis erlaubt, es zu betreten und auf Einträge zuzugreifen.',
  '104.5#11': '{{umask -S}} zeigt die umask symbolisch, z. B. u=rwx,g=rx,o=rx.',
  '104.5#12': 'Großes X setzt Ausführung nur für Verzeichnisse und bereits ausführbare Dateien.',
  '104.5#13': 'SUID lässt ein Programm mit den Rechten seines Besitzers laufen; bei Skripten ignoriert Linux es.',
  '104.6#0': '{{ln -s ZIEL NAME}} – erst das Ziel, dann der Name des Links.',
  '104.6#1': 'Hardlinks teilen sich die Inode und funktionieren nur innerhalb eines Dateisystems.',
  '104.6#2': '{{ls -i}} zeigt die Inode-Nummer; gleiche Nummer = derselbe Inhalt.',
  '104.6#3': 'Ein Symlink zeigt dann ins Leere (dangling/broken).',
  '104.6#4': 'Die zweite Spalte von {{ls -l}} ist der Hardlink-Zähler.',
  '104.6#5': '{{readlink}} und {{ls -l}} zeigen das Ziel eines Symlinks.',
  '104.6#6': 'Hardlinks können keine Dateisystemgrenzen überschreiten – dafür braucht man Symlinks.',
  '104.6#7': '{{ln -sf}} ersetzt einen bestehenden Link.',
  '104.6#8': 'Relative Ziele werden vom Verzeichnis aus aufgelöst, in dem der Link liegt.',
  '104.6#9': 'In {{ls -l}} steht l für einen symbolischen Link.',
  '104.7#0': '{{updatedb}} aktualisiert die Datenbank für locate (meist täglich per cron).',
  '104.7#1': 'In /etc/updatedb.conf (PRUNEPATHS, PRUNEFS) werden Pfade ausgeschlossen.',
  '104.7#2': '{{whereis}} zeigt Programm, Quellen und Manpage.',
  '104.7#3': 'Rechnerspezifische Konfiguration gehört nach /etc.',
  '104.7#4': '/var/tmp bleibt beim Neustart erhalten, /tmp wird oft geleert.',
  '104.7#5': '/opt ist für zusätzliche Softwarepakete, jeweils in einem eigenen Unterverzeichnis.',
  '104.7#6': '/srv enthält Daten, die das System bereitstellt (Web, FTP).',
  '104.7#7': '/run enthält Laufzeitdaten (PID-Dateien, Sockets) und wird bei jedem Start geleert (tmpfs).',
  '104.7#8': 'locate durchsucht eine Datenbank – neue Dateien fehlen bis zum nächsten updatedb.',
  '104.7#9': 'Logdateien liegen unter /var/log.',
  '104.7#10': '{{which -a}} zeigt alle Fundstellen im PATH.',
  '104.7#11': '/usr/share enthält architekturunabhängige Daten wie Manpages und Dokumentation.',
});

LPIC.addSummaryDe({
  '104.1': `- Partitionieren: {{fdisk}} (MBR/GPT; n, d, t, p, w), {{gdisk}} (GPT, Typcodes 8300/8200/EF00), {{parted}} (schreibt sofort; mklabel, mkpart, print).
- MBR: max. 4 primäre Partitionen (logische ab Nr. 5), 2 TiB, Typ 83 Linux / 82 Swap / 8e LVM. GPT: 128 Partitionen, Backup-Header.
- Dateisysteme anlegen: {{mkfs.ext4}} / {{mkfs -t ext4}} ({{-L}} Label, {{-m}} reservierte Blöcke), {{mkfs.xfs}} (nur vergrößerbar), {{mkfs.vfat}} ({{-n}} Label), {{mkfs.exfat}}, Btrfs (Subvolumes, Snapshots, Kompression).
- Swap: {{mkswap}}, {{swapon}}, {{swapoff}}, {{swapon --show}}.`,
  '104.2': `- Platz prüfen: {{df -h}} (Belegung), {{df -i}} (Inodes), {{du -sh}} / {{du -h --max-depth=1}}.
- Prüfen/Reparieren (ausgehängt!): {{fsck}} / {{e2fsck}} ({{-f}} erzwingen, {{-y}} alles bestätigen, {{-n}}/{{-N}} nur anzeigen), lost+found.
- ext-Werkzeuge: {{tune2fs}} ({{-l}} Infos, {{-c}} Mount-Anzahl, {{-i}} Intervall, {{-j}} Journal, {{-L}} Label), {{dumpe2fs -h}}, {{debugfs}}, {{e2label}}.
- XFS: {{xfs_repair}} ({{-n}} nur prüfen), {{xfs_fsr}} (Defragmentierung), {{xfs_db}}, {{xfs_info}}, {{xfs_admin}}.`,
  '104.3': `- Einhängen: {{mount GERÄT ZIEL}} ({{-t}} Typ, {{-o}} Optionen wie ro, noexec, nosuid, remount), {{umount}} ({{-l}} lazy), {{mount -a}}.
- /etc/fstab: Gerät (UUID=, LABEL=, /dev/…), Mountpunkt, Typ, Optionen (defaults, noauto, user, _netdev), dump, pass (1 Root, 2 andere, 0 nie).
- Geräte erkennen: {{blkid}}, {{lsblk -f}}; „busy“ klären mit {{lsof}} und {{fuser -vm}}.
- Anzeige: {{findmnt}}, /proc/mounts. systemd erzeugt Mount-Units ({{/var/backup}} → var-backup.mount). Wechselmedien unter /media.`,
  '104.5': `- Rechte r=4, w=2, x=1 für Besitzer/Gruppe/Andere; {{chmod}} oktal (750) oder symbolisch (u+x, go-w, a=r).
- Besitz: {{chown benutzer:gruppe}}, {{chgrp}}; {{-R}} rekursiv.
- umask: Dateien 666, Verzeichnisse 777 minus umask (022 → 644/755); {{umask -S}} symbolisch.
- Sonderrechte: SUID 4000 (s beim Besitzer, Programm läuft mit Besitzerrechten), SGID 2000 (Gruppe vererben), Sticky 1000 (t, nur Besitzer darf löschen, z. B. /tmp). Großes S/T = ohne x.
- x auf Verzeichnissen = betreten; X setzt x nur bei Verzeichnissen/ausführbaren Dateien.`,
  '104.6': `- **Hardlink** ({{ln ZIEL NAME}}): weiterer Name für dieselbe Inode; nicht über Dateisystemgrenzen, nicht für Verzeichnisse; Daten bleiben, bis der Zähler 0 ist.
- **Symlink** ({{ln -s ZIEL NAME}}): eigene Inode mit Pfad; über Dateisysteme und für Verzeichnisse möglich; wird „dangling“, wenn das Ziel verschwindet.
- Erkennen: {{ls -li}} (Inode, Linkzähler in Spalte 2), Typ l, {{readlink}}, {{stat}}; {{ln -f}} ersetzt bestehende Links.
- Relative Symlink-Ziele beziehen sich auf das Verzeichnis des Links; {{cp -d}}/{{-a}} kopiert Links als Links.`,
  '104.7': `- FHS: /etc Konfiguration, /bin /sbin /usr/bin Programme, /lib Bibliotheken, /var variable Daten (log, spool, cache, lib), /tmp & /var/tmp (überlebt Neustart), /run Laufzeitdaten, /home, /root, /opt Zusatzsoftware, /srv bereitgestellte Daten, /usr/local lokal installiert, /usr/share architekturunabhängig, /media & /mnt Mountpunkte, /dev, /proc, /sys.
- Suchen: {{find}} (live), {{locate}} (Datenbank, {{updatedb}}, /etc/updatedb.conf), {{which}} ({{-a}}), {{whereis}}, {{type}}.`,
});
