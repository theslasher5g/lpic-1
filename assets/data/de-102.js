/* Deutsche Erklärungen und Kurzfassungen — Themen 105 bis 110. */
LPIC.addDe({
  '105.1#0': 'Interaktive Nicht-Login-Shells lesen ~/.bashrc (Debian vorher /etc/bash.bashrc).',
  '105.1#1': 'Bash liest nur die erste vorhandene Datei von ~/.bash_profile, ~/.bash_login, ~/.profile.',
  '105.1#2': '/etc/profile wird von jeder Login-Shell gelesen (und lädt /etc/profile.d/*.sh).',
  '105.1#3': '{{source datei}} bzw. {{. datei}} führt die Datei in der aktuellen Shell aus.',
  '105.1#4': '{{useradd -m}} kopiert den Inhalt von /etc/skel ins neue Home-Verzeichnis.',
  '105.1#5': '~/.bash_logout wird beim Beenden einer Login-Shell ausgeführt.',
  '105.1#6': 'Funktionen definiert man mit {{name() { …; } }} oder {{function name { …; } }}.',
  '105.1#7': 'PATH erweitern und exportieren: {{export PATH=$PATH:/opt/tools/bin}}.',
  '105.1#8': 'Aliase werden nicht vererbt; daher in ~/.bashrc definieren, das jede interaktive Shell liest.',
  '105.1#9': 'In einer Funktion enthält $# die Anzahl ihrer Argumente.',
  '105.1#10': '{{unalias name}} entfernt einen Alias.',
  '105.1#11': 'Mit „.“ im PATH könnte ein Angreifer ein Programm wie „ls“ in ein Verzeichnis legen, das root betritt.',
  '105.1#12': 'Debian: /etc/bash.bashrc gilt systemweit für interaktive Shells (Red Hat: /etc/bashrc).',
  '105.1#13': '{{\\w}} zeigt im Prompt das aktuelle Verzeichnis, {{\\u}} den Benutzer, {{\\h}} den Host.',
  '105.2#0': 'Die Shebang-Zeile {{#!/bin/bash}} legt den Interpreter fest.',
  '105.2#1': '$# ist die Anzahl der Argumente, $1…$9 die Argumente, $0 der Skriptname.',
  '105.2#2': '{{-f}} prüft auf eine reguläre Datei, {{-d}} auf ein Verzeichnis, {{-e}} auf Existenz.',
  '105.2#3': 'Zahlen vergleicht man mit {{-eq}}, {{-ne}}, {{-lt}}, {{-le}}, {{-gt}}, {{-ge}}.',
  '105.2#4': '[ ist ein Befehl – nach [ und vor ] müssen Leerzeichen stehen.',
  '105.2#5': '{{seq 10}} gibt 1 bis 10 aus, je eine Zahl pro Zeile.',
  '105.2#6': 'case endet mit {{esac}} (case rückwärts), if mit {{fi}}.',
  '105.2#7': '{{read VAR}} liest eine Zeile von stdin in eine Variable.',
  '105.2#8': '{{exec}} ersetzt den aktuellen Shell-Prozess; Befehle danach werden nicht mehr ausgeführt.',
  '105.2#9': '{{||}} führt den Mailversand nur aus, wenn backup.sh fehlschlägt.',
  '105.2#10': 'Linux ignoriert SUID bei Skripten – sie laufen mit den Rechten des Aufrufers.',
  '105.2#11': 'Exit-Status 0 bedeutet Erfolg, alles andere einen Fehler.',
  '105.2#12': '{{until}} läuft, solange die Bedingung falsch ist; {{while}}, solange sie wahr ist.',
  '105.2#13': '{{bash -x}} bzw. {{set -x}} gibt jeden Befehl vor der Ausführung aus.',
  '105.2#14': '/usr/local/bin ist für lokal installierte Programme – der Paketmanager verändert es nicht.',
  '105.2#15': 'Beide Schleifen iterieren über 1 2 3: einmal direkt, einmal über die Ausgabe von seq.',
  '106.1#0': 'Der X-Server läuft dort, wo Bildschirm, Tastatur und Maus sind; Programme (Clients) können entfernt laufen.',
  '106.1#1': 'DISPLAY sagt X-Clients, welches Display sie verwenden sollen.',
  '106.1#2': ':0 ist das erste Display auf dem lokalen Rechner.',
  '106.1#3': 'Snippets in /etc/X11/xorg.conf.d/ ergänzen oder überschreiben die automatische Konfiguration.',
  '106.1#4': 'Die Section "Device" beschreibt Grafikkarte und Treiber.',
  '106.1#5': '{{xhost +}} erlaubt allen Hosts den Zugriff – unsicher.',
  '106.1#6': '~/.Xauthority enthält die MIT-MAGIC-COOKIEs für die Display-Berechtigung.',
  '106.1#7': '{{ssh -X}} leitet X11 verschlüsselt weiter.',
  '106.1#8': '~/.xsession-errors sammelt Fehlermeldungen der grafischen Sitzung.',
  '106.1#9': 'Der Display-Manager (gdm, lightdm, sddm) bietet die grafische Anmeldung und startet die Sitzung.',
  '106.1#10': 'Unter Wayland ist der Compositor der Display-Server; X11-Programme laufen über XWayland.',
  '106.1#11': '{{setxkbmap de}} stellt das Tastaturlayout der laufenden Sitzung um.',
  '106.1#12': 'Display :N lauscht auf TCP-Port 6000 + N, also 6000 für :0.',
  '106.2#0': 'KDE Plasma basiert auf Qt, GNOME und Xfce auf GTK.',
  '106.2#1': 'SPICE wird vor allem für die Konsolen virtueller Maschinen (KVM/QEMU) genutzt.',
  '106.2#2': 'Mit XDMCP fordert ein entfernter X-Server ein grafisches Login bei einem Display-Manager an.',
  '106.2#3': 'VNC überträgt Bildschirminhalte (Framebuffer) über Port 5900 + Displaynummer.',
  '106.2#4': 'RDP stammt von Microsoft und nutzt TCP-Port 3389.',
  '106.2#5': 'Xfce gilt als ressourcenschonend und nutzt den Fenstermanager Xfwm.',
  '106.2#6': 'XDMCP und VNC übertragen standardmäßig unverschlüsselt – besser per SSH tunneln.',
  '106.3#0': 'Sticky Keys: Modifikatortasten werden nacheinander statt gleichzeitig gedrückt.',
  '106.3#1': 'Bounce Keys ignorieren schnelle Wiederholungen derselben Taste (z. B. bei Tremor).',
  '106.3#2': 'Mouse Keys steuern den Mauszeiger mit dem Nummernblock.',
  '106.3#3': 'Orca ist der Bildschirmleser (Screenreader) von GNOME.',
  '106.3#4': 'Eine Braillezeile stellt Text als tastbare Punktschrift dar.',
  '106.3#5': 'Slow Keys registrieren eine Taste erst, wenn sie eine Weile gedrückt bleibt.',
  '106.3#6': 'Kontrastreiche Themes und eine Bildschirmlupe helfen bei Sehbeeinträchtigungen.',
  '107.1#0': '{{-aG}} fügt eine zusätzliche Gruppe hinzu; ohne {{-a}} würden andere Gruppen entfernt.',
  '107.1#1': '{{useradd -m}} legt das Home-Verzeichnis an und kopiert /etc/skel hinein.',
  '107.1#2': '{{userdel -r}} löscht auch Home-Verzeichnis und Mail-Spool.',
  '107.1#3': 'Die Passwort-Hashes stehen in /etc/shadow (nur für root lesbar).',
  '107.1#4': 'Feld 3 ist die letzte Passwortänderung in Tagen seit dem 1.1.1970.',
  '107.1#5': '{{chage -d 0}} oder {{passwd -e}} erzwingen eine Passwortänderung beim nächsten Login.',
  '107.1#6': '{{chage -l}} zeigt die Passwort-Alterungsinformationen.',
  '107.1#7': '{{passwd -l}} und {{usermod -L}} sperren das Passwort durch ein vorangestelltes „!“.',
  '107.1#8': '{{getent passwd}} fragt alle Quellen aus nsswitch.conf ab (Dateien, LDAP, …).',
  '107.1#9': 'Eine Gruppe, die primäre Gruppe eines Benutzers ist, kann nicht gelöscht werden.',
  '107.1#10': '/usr/sbin/nologin oder /bin/false verhindern interaktive Logins von Dienstkonten.',
  '107.1#11': 'Normale Benutzer erhalten heute UIDs ab 1000 (UID_MIN in /etc/login.defs).',
  '107.1#12': '{{groupmod -n NEU ALT}} benennt eine Gruppe um.',
  '107.1#13': '{{useradd -r}} erstellt ein Systemkonto (niedrige UID, standardmäßig ohne Home).',
  '107.1#14': '/etc/default/useradd enthält Standard-Shell, Home-Basis und Skeleton (anzeigen mit {{useradd -D}}).',
  '107.1#15': 'Ein x im Passwortfeld bedeutet: der Hash steht in /etc/shadow.',
  '107.2#0': 'Reihenfolge: Minute Stunde Tag Monat Wochentag – 15 6 * * 1 = montags 6:15.',
  '107.2#1': '{{*/10}} im Minutenfeld = alle 10 Minuten.',
  '107.2#2': '{{crontab -l}} zeigt, {{-e}} bearbeitet, {{-r}} löscht die eigene Crontab.',
  '107.2#3': '/etc/crontab und /etc/cron.d/* haben ein zusätzliches Benutzerfeld vor dem Befehl.',
  '107.2#4': 'Existiert cron.allow, dürfen nur die dort genannten Benutzer (und root) crontab nutzen.',
  '107.2#5': '{{atq}} und {{at -l}} listen anstehende at-Jobs.',
  '107.2#6': '{{atrm 7}} löscht at-Job Nummer 7.',
  '107.2#7': '{{at now + 2 hours}} – die Befehle werden von stdin gelesen.',
  '107.2#8': 'Skripte in /etc/cron.daily werden täglich von run-parts ausgeführt.',
  '107.2#9': '{{Persistent=true}} holt verpasste Läufe nach dem Einschalten nach.',
  '107.2#10': '{{systemctl list-timers}} zeigt Timer mit nächster und letzter Ausführung.',
  '107.2#11': '{{systemd-run --on-active=30m}} erzeugt einen temporären Timer ohne Unit-Dateien.',
  '107.2#12': 'Ohne at.allow verbietet /etc/at.deny den dort genannten Benutzern die Nutzung von at.',
  '107.2#13': 'cron wandelt unmaskierte % in Zeilenumbrüche um – daher {{\\%}} schreiben.',
  '107.2#14': '{{@reboot}} führt einen Job einmal beim Systemstart aus.',
  '107.3#0': 'LC_ALL überschreibt alle anderen Locale-Variablen (LC_* und LANG).',
  '107.3#1': 'LC_TIME bestimmt das Datums- und Zeitformat.',
  '107.3#2': 'Mit LANG=C liefern Programme unübersetzte, vorhersehbare Ausgaben und Sortierung.',
  '107.3#3': '{{locale -a}} listet alle verfügbaren Locales.',
  '107.3#4': '/etc/localtime (meist ein Symlink nach /usr/share/zoneinfo/…) legt die Systemzeitzone fest.',
  '107.3#5': 'TZ setzt die Zeitzone für einen Benutzer oder einen einzelnen Befehl.',
  '107.3#6': '{{iconv -f QUELLE -t ZIEL}} wandelt Zeichenkodierungen um.',
  '107.3#7': '{{tzselect}} fragt interaktiv nach der Region und gibt den passenden TZ-Wert aus, ohne etwas zu ändern.',
  '107.3#8': '{{timedatectl set-timezone}} ändert die Systemzeitzone.',
  '107.3#9': 'UTF-8 kodiert Unicode mit variabler Länge; reiner ASCII-Text ist gültiges UTF-8.',
  '107.3#10': 'Die Zeitzonendaten liegen in /usr/share/zoneinfo.',
  '107.3#11': 'ISO-8859-15 (Latin-9) enthält im Gegensatz zu ISO-8859-1 das Euro-Zeichen.',
  '107.3#12': '{{date +%F}} entspricht {{date +%Y-%m-%d}}.',
  '107.3#13': 'Debian speichert die systemweite LANG-Einstellung in /etc/default/locale.',
});

LPIC.addSummaryDe({
  '105.1': `- Login-Shell: /etc/profile (+ /etc/profile.d/*.sh), dann die erste von ~/.bash_profile, ~/.bash_login, ~/.profile; beim Beenden ~/.bash_logout.
- Interaktive Nicht-Login-Shell: /etc/bash.bashrc (Debian) bzw. /etc/bashrc, dann ~/.bashrc.
- Umgebung: {{export}}, {{env}}, {{set}}, {{unset}}, PATH ({{export PATH=$PATH:…}}, nie „.“ für root).
- Aliase ({{alias}}, {{unalias}}) und Funktionen ({{name() { …; } }}) werden nicht vererbt → in ~/.bashrc definieren.
- {{source}} / {{.}} lädt Dateien in die aktuelle Shell; /etc/skel ist die Vorlage für neue Home-Verzeichnisse.`,
  '105.2': `- Aufbau: Shebang {{#!/bin/bash}}, ausführbar machen ({{chmod +x}}), Ablage z. B. /usr/local/bin.
- Variablen und Parameter: $0, $1…$9, $#, $@, $*, $?, {{shift}}, {{read}}, Arithmetik {{$((…))}}, Befehlsersetzung {{$(…)}}.
- Bedingungen: {{if … then … elif … else … fi}}, {{case … esac}}, {{test}}/{{[ ]}} ({{-f}}, {{-d}}, {{-z}}, {{-n}}, {{=}}, {{-eq}}, {{-lt}} …), {{&&}}/{{||}}.
- Schleifen: {{for}}, {{while}}, {{until}}, {{seq}}.
- Exit-Status ({{exit N}}, 0 = Erfolg), {{exec}}, Debugging mit {{bash -x}}; SUID wirkt bei Skripten nicht.`,
  '106.1': `- X-Architektur: der **X-Server** steuert Bildschirm und Eingabegeräte, **X-Clients** (Programme) verbinden sich über DISPLAY (z. B. :0, host:1.0; TCP 6000+N).
- Konfiguration: /etc/X11/xorg.conf und /etc/X11/xorg.conf.d/*.conf (Sections Device, Monitor, Screen, InputDevice/InputClass); Log /var/log/Xorg.0.log, ~/.xsession-errors.
- Zugriff: {{xhost}} (host-basiert, unsicher), {{xauth}} mit ~/.Xauthority (Cookies), sicher per {{ssh -X}}.
- Werkzeuge: {{xrandr}}, {{setxkbmap}}, {{xdpyinfo}}, {{xwininfo}}; Display-Manager (gdm, lightdm, sddm).
- Wayland: Compositor ist Display-Server, X11-Programme über XWayland.`,
  '106.2': `- Desktops: GNOME (GTK), KDE Plasma (Qt), Xfce (GTK, leichtgewichtig), außerdem Cinnamon, MATE, LXQt.
- Gemeinsame Standards über freedesktop.org (.desktop-Dateien, XDG-Verzeichnisse, D-Bus).
- Fernzugriff: **XDMCP** (X-Login über das Netz, unverschlüsselt), **VNC** (Framebuffer, Port 5900+N), **RDP** (Microsoft, 3389, xrdp), **SPICE** (VM-Konsolen), X11-Forwarding per SSH.`,
  '106.3': `- Sehen: kontrastreiche Themes, große Schrift, Bildschirmlupe, Screenreader (Orca), Braillezeile.
- Tastatur: Sticky Keys (nacheinander drücken), Slow Keys (gedrückt halten), Bounce Keys (Wiederholungen ignorieren), Toggle Keys (Ton bei Feststelltasten), Repeat Keys, Bildschirmtastatur.
- Maus: Mouse Keys (Nummernblock), Gesten; außerdem Spracherkennung.`,
  '107.1': `- Benutzer: {{useradd}} ({{-m}}, {{-s}}, {{-G}}, {{-r}}, {{-D}}), {{usermod}} ({{-aG}}, {{-L}}/{{-U}}, {{-s}}, {{-d -m}}, {{-e}}), {{userdel -r}}.
- Gruppen: {{groupadd}}, {{groupmod -n}}, {{groupdel}}, {{gpasswd}}; Mitgliedschaft mit {{id}}, {{groups}}.
- Passwörter und Alterung: {{passwd}} ({{-l}}, {{-u}}, {{-e}}, {{-S}}), {{chage}} ({{-l}}, {{-d 0}}, {{-M}}, {{-m}}, {{-W}}, {{-E}}).
- Dateien: /etc/passwd (name:x:UID:GID:GECOS:home:shell), /etc/shadow (Hashes, Alterung), /etc/group, /etc/gshadow, /etc/skel, /etc/login.defs, /etc/default/useradd; {{getent}} fragt alle Quellen ab.
- Dienstkonten: niedrige UIDs, Shell /usr/sbin/nologin.`,
  '107.2': `- **cron**: Felder Minute Stunde Tag Monat Wochentag; {{crontab -e/-l/-r}} (/var/spool/cron/), System: /etc/crontab und /etc/cron.d/ mit Benutzerfeld; /etc/cron.{hourly,daily,weekly,monthly}; @reboot, @daily …; MAILTO; % maskieren.
- Zugriff: /etc/cron.allow und /etc/cron.deny (allow hat Vorrang); genauso /etc/at.allow und /etc/at.deny.
- **at**: {{at ZEIT}} (now + 2 hours, 23:00, teatime), {{atq}}, {{atrm}}, {{at -c}}, {{batch}}.
- **systemd-Timer**: .timer + .service, OnCalendar=, OnBootSec=, Persistent=true; {{systemctl list-timers}}, {{systemd-run --on-active=}}.
- anacron für Rechner, die nicht ständig laufen.`,
  '107.3': `- Locale: LANG, LC_* (LC_TIME, LC_NUMERIC, LC_COLLATE, LC_MESSAGES, …), LC_ALL überschreibt alles; {{locale}}, {{locale -a}}, {{localectl}}, LANG=C für Skripte.
- Kodierung: ASCII (7 Bit), ISO-8859-x (8 Bit, -15 mit €), Unicode/UTF-8 (variable Länge); Umwandlung mit {{iconv}}.
- Zeitzonen: /etc/localtime → /usr/share/zoneinfo/…, Debian zusätzlich /etc/timezone; {{timedatectl set-timezone}}, {{tzselect}}, Variable TZ; Sommerzeit-Regeln stecken in tzdata (aktuell halten).
- {{date}} mit Formaten wie {{+%F}}, {{date -u}}.`,
});

LPIC.addDe({
  '108.1#0': '{{hwclock --systohc}} ({{-w}}) schreibt die Systemzeit in die Hardware-Uhr.',
  '108.1#1': '{{hwclock --hctosys}} ({{-s}}) stellt die Systemzeit nach der Hardware-Uhr.',
  '108.1#2': '/etc/localtime legt die lokale Zeitzone fest.',
  '108.1#3': 'Die Zeitzonendateien liegen unter /usr/share/zoneinfo.',
  '108.1#4': 'Mit TZ kann ein Benutzer eine eigene Zeitzone verwenden.',
  '108.1#5': 'NTP nutzt UDP-Port 123.',
  '108.1#6': 'pool.ntp.org verteilt Anfragen per DNS-Round-Robin auf viele öffentliche NTP-Server.',
  '108.1#7': '{{ntpq -p}} zeigt die Peers von ntpd mit Stratum, Offset und Jitter.',
  '108.1#8': '{{chronyc sources}} zeigt die Zeitquellen von chronyd.',
  '108.1#9': '{{timedatectl set-ntp true}} aktiviert die NTP-Synchronisation.',
  '108.1#10': '{{timedatectl set-timezone}} setzt die Zeitzone.',
  '108.1#11': 'Stratum 0 ist die Referenzuhr selbst (GPS, Atomuhr); Stratum 1 hängt direkt daran.',
  '108.1#12': '{{date +%F}} entspricht {{date +%Y-%m-%d}}.',
  '108.1#13': 'Debian speichert den Namen der Zeitzone zusätzlich in /etc/timezone.',
  '108.1#14': 'Die Drift-Datei speichert die gemessene Gangabweichung der lokalen Uhr.',
  '108.1#15': '{{ntpdate}} stellt die Uhr einmalig und gilt als veraltet.',
  '108.2#0': 'Reihenfolge: emerg, alert, crit, err, warning, notice, info, debug (0 bis 7).',
  '108.2#1': '{{mail.err}} erfasst err und alle höheren Prioritäten (crit, alert, emerg).',
  '108.2#2': 'Zwei @@ = TCP, ein @ = UDP.',
  '108.2#3': '{{logger -p FACILITY.PRIORITÄT}} schreibt eine Meldung ins Systemlog.',
  '108.2#4': 'local0 bis local7 sind für eigene Zwecke reserviert.',
  '108.2#5': '{{journalctl -u UNIT}} zeigt nur die Meldungen einer Unit.',
  '108.2#6': '{{journalctl -f}} verfolgt das Journal fortlaufend.',
  '108.2#7': '{{journalctl -b -1}} zeigt den vorherigen Bootvorgang.',
  '108.2#8': '{{journalctl -p err}} zeigt err und höhere Prioritäten.',
  '108.2#9': 'Storage=auto speichert persistent, sobald /var/log/journal existiert.',
  '108.2#10': '{{--vacuum-size}} löscht alte Journaldateien bis zur angegebenen Größe.',
  '108.2#11': 'Mit {{-D VERZ}} oder {{--root PFAD}} liest journalctl ein fremdes Journal.',
  '108.2#12': '{{systemd-cat}} schickt die Ausgabe eines Programms ins Journal.',
  '108.2#13': 'Eigene logrotate-Konfigurationen gehören nach /etc/logrotate.d/.',
  '108.2#14': '{{rotate 7}} behält 7 rotierte Dateien.',
  '108.2#15': '{{delaycompress}} komprimiert die zuletzt rotierte Datei erst beim nächsten Durchlauf.',
  '108.2#16': '/etc/systemd/journald.conf legt Speicherort und Größenlimits des Journals fest.',
  '108.2#17': 'Syslog nutzt Port 514 (meist UDP, bei rsyslog auch TCP).',
  '108.3#0': '{{newaliases}} baut die Alias-Datenbank /etc/aliases.db neu.',
  '108.3#1': 'Mit ~/.forward kann jeder Benutzer eingehende Mail weiterleiten.',
  '108.3#2': '{{mailq}} zeigt die Mail-Warteschlange (Sendmail-Kompatibilitätsbefehl).',
  '108.3#3': 'Postfix, Exim und Sendmail sind MTAs; Mutt ist ein MUA, Dovecot ein IMAP/POP3-Server.',
  '108.3#4': 'Format: {{name: ziel1, ziel2}}.',
  '108.3#5': 'Viele Programme rufen /usr/sbin/sendmail auf – daher bieten alle MTAs diese Schnittstelle.',
  '108.3#6': 'Der Backslash vor dem eigenen Namen liefert lokal zu, ohne erneut weiterzuleiten.',
  '108.3#7': '{{mail -s BETREFF EMPFÄNGER}} liest den Text von stdin.',
  '108.3#8': 'SMTP zwischen MTAs nutzt TCP-Port 25.',
  '108.3#9': 'mbox-Postfächer liegen unter /var/mail bzw. /var/spool/mail.',
  '108.4#0': 'CUPS (IPP und Weboberfläche) lauscht auf TCP-Port 631.',
  '108.4#1': '/etc/cups/cupsd.conf ist die Hauptkonfiguration des CUPS-Dienstes.',
  '108.4#2': '{{lprm -}} entfernt alle eigenen Druckaufträge.',
  '108.4#3': '{{lpq -P QUEUE}} zeigt die Aufträge einer Warteschlange.',
  '108.4#4': '{{lpr -P}} (BSD) und {{lp -d}} (System V) drucken auf einen bestimmten Drucker.',
  '108.4#5': '{{cupsdisable}} stoppt das Drucken; neue Aufträge werden weiter angenommen.',
  '108.4#6': '{{lpadmin}} legt Warteschlangen an, ändert und löscht sie.',
  '108.4#7': '{{lpstat -t}} zeigt den vollständigen Status des Drucksystems.',
  '108.4#8': 'CUPS protokolliert nach /var/log/cups (error_log, access_log, page_log).',
  '108.4#9': '{{cancel 17}} bricht Auftrag 17 ab (BSD: {{lprm 17}}).',
  '108.4#10': '{{lpadmin -d}} setzt den systemweiten Standarddrucker.',
  '109.1#0': '/27 lässt 5 Host-Bits: 2⁵ − 2 = 30 nutzbare Adressen.',
  '109.1#1': '/26 → Blockgröße 64; 77 liegt im Bereich 64–127, Broadcast ist .127.',
  '109.1#2': '/20 = 255.255.240.0 (drittes Oktett 11110000).',
  '109.1#3': 'Privat sind 10.0.0.0/8, 172.16.0.0/12 (bis 172.31.255.255) und 192.168.0.0/16.',
  '109.1#4': 'IMAPS nutzt Port 993, IMAP 143.',
  '109.1#5': '/etc/services ordnet Dienstnamen Portnummern zu.',
  '109.1#6': 'FTP nutzt 21 (Steuerung) und 20 (Daten im aktiven Modus).',
  '109.1#7': 'LDAP 389, LDAPS 636.',
  '109.1#8': 'UDP ist verbindungslos und garantiert keine Zustellung.',
  '109.1#9': 'ping nutzt ICMP Echo Request und Echo Reply.',
  '109.1#10': 'Führende Nullen entfallen, eine Nullfolge wird einmal durch :: ersetzt.',
  '109.1#11': 'IPv6 hat 128-Bit-Adressen und keine Broadcasts (stattdessen Multicast).',
  '109.1#12': 'Link-Local-Adressen beginnen mit fe80::/10.',
  '109.1#13': '::1 ist die IPv6-Loopback-Adresse.',
  '109.1#14': 'SNMP-Traps nutzen UDP-Port 162, Abfragen UDP 161.',
  '109.1#15': 'SMTPS (implizites TLS) nutzt Port 465.',
  '109.1#16': '169.254.x.x wird automatisch vergeben, wenn kein DHCP-Server antwortet.',
  '109.1#17': 'NetBIOS-Session 139, NTP 123.',
  '109.2#0': 'Der statische Hostname steht in /etc/hostname.',
  '109.2#1': '{{hostnamectl set-hostname}} setzt den Hostnamen dauerhaft.',
  '109.2#2': 'Die hosts-Zeile in /etc/nsswitch.conf legt die Reihenfolge fest.',
  '109.2#3': '{{nameserver}} legt einen DNS-Server fest (bis zu drei).',
  '109.2#4': '{{search}} hängt Domains an kurze Hostnamen an.',
  '109.2#5': '{{nmcli connection show}} listet alle Verbindungsprofile.',
  '109.2#6': '{{nmcli connection up NAME}} aktiviert eine Verbindung.',
  '109.2#7': '{{nmcli device wifi list}} zeigt verfügbare WLANs.',
  '109.2#8': 'Aufbau: IP-Adresse, kanonischer Name, Aliase.',
  '109.2#9': 'Debian mit ifupdown: /etc/network/interfaces.',
  '109.2#10': '{{ifup}} und {{ifdown}} nutzen die Konfigurationsdatei.',
  '109.2#11': 'systemd-networkd liest /etc/systemd/network/*.network.',
  '109.2#12': '{{getent hosts}} löst Namen wie Anwendungen auf (über nsswitch.conf).',
  '109.2#13': '{{nmtui}} ist die Textoberfläche von NetworkManager.',
  '109.2#14': 'Keyfiles liegen in /etc/NetworkManager/system-connections.',
  '109.3#0': '{{ip addr add ADRESSE/PRÄFIX dev SCHNITTSTELLE}} fügt eine Adresse hinzu (nicht dauerhaft).',
  '109.3#1': '{{ip route add default via GATEWAY}} setzt das Standard-Gateway.',
  '109.3#2': 'Legacy: {{route add default gw GATEWAY}}.',
  '109.3#3': '{{ip link set SCHNITTSTELLE up}} aktiviert eine Schnittstelle.',
  '109.3#4': '{{ss -tulpn}}: TCP, UDP, lauschend, Prozesse, numerisch.',
  '109.3#5': '{{tracepath}} braucht kein root und zeigt auch die Path-MTU.',
  '109.3#6': 'Router mit TTL 0 senden ICMP „time exceeded“ zurück.',
  '109.3#7': '{{nc -zv HOST PORT}} prüft, ob ein Port offen ist, ohne Daten zu senden.',
  '109.3#8': '{{ip neigh}} ersetzt {{arp -n}}.',
  '109.3#9': '{{ip route}} zeigt die Routingtabelle.',
  '109.3#10': 'IP erreichbar, Name nicht → die Namensauflösung (DNS) funktioniert nicht.',
  '109.3#11': '{{ip route get ZIEL}} zeigt Route und Quelladresse für ein Ziel.',
  '109.3#12': 'Flag G = Route über ein Gateway, U = aktiv, H = Host-Route.',
  '109.3#13': 'ifconfig, route und netstat gehören zu net-tools; ip und ss zu iproute2.',
  '109.3#14': '{{ping -c 4}} sendet genau vier Echo Requests.',
  '109.4#0': '{{dig @SERVER NAME TYP}} fragt einen bestimmten Server ab.',
  '109.4#1': 'AAAA = IPv6-Adresse, A = IPv4.',
  '109.4#2': 'PTR-Einträge dienen der Rückwärtsauflösung (in-addr.arpa).',
  '109.4#3': '{{dig -x}} führt eine Rückwärtsabfrage durch.',
  '109.4#4': '{{hosts: dns files}} fragt zuerst DNS, dann /etc/hosts.',
  '109.4#5': 'dig fragt nur DNS und ignoriert /etc/hosts – ping nutzt nsswitch.conf.',
  '109.4#6': '{{getent hosts}} nutzt alle in nsswitch.conf konfigurierten Quellen.',
  '109.4#7': 'NXDOMAIN: der Name existiert nicht.',
  '109.4#8': 'systemd-resolved lauscht als Stub-Resolver auf 127.0.0.53.',
  '109.4#9': '{{resolvectl status}} zeigt die DNS-Server pro Schnittstelle.',
  '109.4#10': '{{dig +short}} gibt nur die Antwortdaten aus.',
  '109.4#11': 'MX-Einträge nennen die Mailserver einer Domain.',
  '110.1#0': '{{find / -perm -4000}} findet alle Dateien mit SUID-Bit.',
  '110.1#1': '{{-perm /6000}} passt, wenn SUID oder SGID gesetzt ist.',
  '110.1#2': '{{chage -d 0}} oder {{passwd -e}} erzwingen ein neues Passwort beim nächsten Login.',
  '110.1#3': '{{chage -M 60}} setzt die maximale Passwortgültigkeit auf 60 Tage.',
  '110.1#4': '{{lastb}} zeigt fehlgeschlagene Anmeldungen aus /var/log/btmp.',
  '110.1#5': '{{w}} zeigt angemeldete Benutzer und was sie gerade tun.',
  '110.1#6': '{{lsof -i :80}} und {{fuser -v 80/tcp}} zeigen die Prozesse an Port 80.',
  '110.1#7': '{{nmap -sn}} sucht nur nach aktiven Hosts, ohne Portscan.',
  '110.1#8': '/etc/security/limits.conf legt dauerhafte Grenzen fest (z. B. @students hard nproc 50).',
  '110.1#9': '{{ulimit -a}} zeigt alle Grenzen der aktuellen Shell.',
  '110.1#10': 'Das Soft-Limit darf bis zum Hard-Limit erhöht werden; das Hard-Limit können nur root-Benutzer anheben.',
  '110.1#11': '{{visudo}} sperrt die Datei und prüft die Syntax vor dem Speichern.',
  '110.1#12': 'Mitglieder der Gruppe admin dürfen alles als jeder Benutzer ohne Passwort ausführen.',
  '110.1#13': '{{sudo -l}} zeigt die erlaubten Befehle.',
  '110.1#14': 'sudo fragt nach dem eigenen Passwort des Aufrufers; su nach dem des Zielbenutzers.',
  '110.1#15': '{{fuser -k}} beendet alle Prozesse, die eine Datei oder einen Mountpunkt nutzen.',
  '110.1#16': '{{last BENUTZER}} zeigt die Anmeldungen eines Benutzers.',
  '110.2#0': 'Mit Shadow-Passwörtern stehen die Hashes in /etc/shadow.',
  '110.2#1': 'Debian: 640 root:shadow – nicht für alle lesbar.',
  '110.2#2': 'Existiert /etc/nologin, darf sich nur root anmelden; andere sehen den Inhalt der Datei.',
  '110.2#3': '/usr/sbin/nologin verweigert die Anmeldung mit einer höflichen Meldung.',
  '110.2#4': 'Kein Treffer in hosts.allow, aber ALL: ALL in hosts.deny → Zugriff verweigert.',
  '110.2#5': 'hosts.allow wird zuerst geprüft – der erste Treffer gewinnt, also Zugriff erlaubt.',
  '110.2#6': 'Ein abschließender Punkt steht für ein Netzpräfix: {{sshd: 192.168.1.}}.',
  '110.2#7': 'xinetd liest die Dienstdateien aus /etc/xinetd.d/.',
  '110.2#8': '{{disable = yes}} schaltet einen xinetd-Dienst ab.',
  '110.2#9': '{{systemctl disable --now}} stoppt sofort und verhindert den Start beim Booten.',
  '110.2#10': 'Socket-Units starten den zugehörigen Dienst erst bei einer eingehenden Verbindung.',
  '110.2#11': '$6$ = SHA-512, $5$ = SHA-256, $1$ = MD5, $y$ = yescrypt.',
  '110.2#12': '{{ss -tuln}} zeigt alle lauschenden Sockets.',
  '110.3#0': '~/.ssh/authorized_keys des Zielkontos enthält die erlaubten öffentlichen Schlüssel.',
  '110.3#1': '{{ssh-copy-id}} hängt den öffentlichen Schlüssel an authorized_keys auf dem Ziel an.',
  '110.3#2': '{{ssh-keygen -t ed25519}} erzeugt ein Ed25519-Schlüsselpaar.',
  '110.3#3': '~/.ssh/known_hosts speichert die Host-Schlüssel bekannter Server.',
  '110.3#4': 'Die Host-Schlüssel weisen den Server gegenüber Clients aus.',
  '110.3#5': '{{ssh-add}} fügt einen privaten Schlüssel zum ssh-agent hinzu.',
  '110.3#6': '{{ssh -L LOKAL:ZIEL:ZIELPORT GATEWAY}} leitet einen lokalen Port weiter.',
  '110.3#7': '{{ssh -X}} aktiviert X11-Weiterleitung.',
  '110.3#8': 'Private Schlüssel müssen 600 sein, sonst verweigert ssh sie.',
  '110.3#9': '{{eval $(ssh-agent)}} startet den Agenten und setzt SSH_AUTH_SOCK und SSH_AGENT_PID.',
  '110.3#10': '{{gpg -e -r EMPFÄNGER}} verschlüsselt mit dem öffentlichen Schlüssel des Empfängers.',
  '110.3#11': '{{gpg --detach-sign}} erstellt eine separate Signaturdatei (.sig).',
  '110.3#12': '{{gpg --export -a}} exportiert den öffentlichen Schlüssel als ASCII.',
  '110.3#13': '{{gpg --gen-revoke}} erzeugt ein Widerrufszertifikat.',
  '110.3#14': '~/.gnupg enthält Schlüsselbunde und Konfiguration.',
  '110.3#15': 'Verschlüsselt wird mit Bobs öffentlichem Schlüssel; nur Bobs privater Schlüssel entschlüsselt.',
  '110.3#16': 'gpg-agent speichert Passphrasen zwischen.',
  '110.3#17': '~/.ssh/config enthält die SSH-Client-Konfiguration pro Benutzer.',
});

LPIC.addSummaryDe({
  '108.1': `- Zwei Uhren: **Systemuhr** (Kernel, UTC-Sekunden seit 1970) und **Hardware-Uhr/RTC** (sollte UTC enthalten).
- {{date}} anzeigen/setzen ({{-s}}, {{+%F}}, {{-u}}), {{hwclock}} ({{--systohc}}/{{-w}}, {{--hctosys}}/{{-s}}), {{timedatectl}} ({{set-time}}, {{set-timezone}}, {{set-ntp}}).
- Zeitzone: /etc/localtime → /usr/share/zoneinfo/…, Debian /etc/timezone, Variable TZ.
- **NTP** (UDP 123, Strata 0–15, langsames Korrigieren): ntpd (/etc/ntp.conf, {{ntpq -p}}, Drift-Datei), chrony (/etc/chrony.conf, {{chronyc sources/tracking}}, makestep), systemd-timesyncd; Server aus pool.ntp.org; {{ntpdate}} ist veraltet.`,
  '108.2': `- **rsyslog**: /etc/rsyslog.conf + /etc/rsyslog.d/; Regeln „Facility.Priorität Aktion“ (auth, cron, daemon, kern, mail, user, local0–7; emerg … debug; {{=}}, {{!}}, {{none}}); Weiterleitung {{@host}} (UDP) / {{@@host}} (TCP), Empfang mit imudp/imtcp auf Port 514.
- {{logger -p facility.prio -t TAG}} schreibt Testmeldungen; Logs in /var/log (syslog/messages, auth.log/secure).
- **logrotate**: /etc/logrotate.conf + /etc/logrotate.d/; daily/weekly, rotate N, compress, delaycompress, missingok, notifempty, create, size, postrotate.
- **journald**: {{journalctl}} ({{-u}}, {{-p}}, {{-b}}, {{-k}}, {{-f}}, {{-r}}, {{--since}}, {{-t}}), {{systemd-cat}}; /etc/systemd/journald.conf (Storage=, SystemMaxUse=), persistent in /var/log/journal, flüchtig in /run/log/journal; {{--vacuum-size/-time}}; fremde Journale mit {{-D}} / {{--root}}; Weitergabe an rsyslog (ForwardToSyslog).`,
  '108.3': `- MUA (mail, mutt) → **MTA** (Postfix, Exim, Sendmail; SMTP Port 25) → MDA (Zustellung ins Postfach /var/mail).
- Sendmail-Emulationsschicht: {{sendmail}}, {{mailq}}, {{newaliases}} funktionieren mit jedem MTA.
- **/etc/aliases**: {{name: ziel1, ziel2}}, Datei, {{"|programm"}}, {{:include:}}; danach immer {{newaliases}}.
- **~/.forward**: persönliche Weiterleitung; {{\\benutzer, adresse}} behält eine lokale Kopie.
- Mail senden/lesen: {{mail -s BETREFF EMPFÄNGER}}, {{mail}}.`,
  '108.4': `- **CUPS**: Dienst cupsd, IPP auf Port 631, Weboberfläche http://localhost:631; Konfiguration /etc/cups/ (cupsd.conf, printers.conf, ppd/), Logs /var/log/cups/.
- Warteschlangen: {{lpadmin -p NAME -E -v URI -m everywhere}}, {{lpadmin -x}}, {{lpadmin -d}}; {{lpinfo -v}}.
- Drucken: {{lpr -P}} / {{lp -d}}; Warteschlange {{lpq}} / {{lpstat -o}}; löschen {{lprm}} / {{cancel}}; Status {{lpstat -t}}, {{lpc status}}.
- {{cupsdisable}}/{{cupsenable}} (drucken), {{cupsreject}}/{{cupsaccept}} (Aufträge annehmen), {{lpmove}}.`,
  '109.1': `- IPv4: 32 Bit, Netzmaske/CIDR, nutzbare Hosts = 2^(Hostbits) − 2, Blockgröße = 256 − Maskenoktett; privat 10/8, 172.16/12, 192.168/16; 127/8 Loopback; 169.254/16 Link-Local.
- TCP (verbindungsorientiert, zuverlässig), UDP (verbindungslos), ICMP (ping, traceroute, keine Ports).
- Ports (/etc/services): 20/21 FTP, 22 SSH, 23 Telnet, 25 SMTP, 53 DNS, 80 HTTP, 110 POP3, 123 NTP, 139 NetBIOS, 143 IMAP, 161/162 SNMP, 389 LDAP, 443 HTTPS, 465 SMTPS, 514 Syslog, 636 LDAPS, 993 IMAPS, 995 POP3S.
- IPv6: 128 Bit, Kurzschreibweise mit ::, /64-Netze, ::1, fe80::/10 Link-Local, fd00::/8 Unique Local, kein Broadcast, SLAAC, NDP statt ARP.`,
  '109.2': `- Hostname: /etc/hostname, {{hostnamectl set-hostname}}, {{hostname -f}}.
- Namensauflösung lokal: /etc/hosts (IP, Name, Aliase), /etc/resolv.conf (nameserver, search, domain), /etc/nsswitch.conf (Reihenfolge, z. B. hosts: files dns); {{getent hosts}}.
- **NetworkManager** ({{nmcli}}, {{nmtui}}): {{nmcli dev status}}, {{con show/add/mod/up/down/delete}}, {{dev wifi list/connect}}; Profile in /etc/NetworkManager/system-connections/.
- Distributionsspezifisch: Debian /etc/network/interfaces mit {{ifup}}/{{ifdown}}, Red Hat ifcfg-Dateien, Ubuntu netplan.
- systemd-networkd: /etc/systemd/network/*.network, {{networkctl}}; Schnittstellennamen en/wl/ww + eno/ens/enp…`,
  '109.3': `- iproute2: {{ip addr}} (add/del), {{ip link set … up/down/mtu}}, {{ip route}} (add/del/get, default via …), {{ip neigh}}, {{ip -s link}}; Änderungen sind nicht dauerhaft.
- Legacy net-tools: {{ifconfig}}, {{route -n}} (Flags U/G/H), {{netstat}} ({{-tulpn}}, {{-rn}}), {{arp}}.
- Sockets: {{ss -tulpn}}, {{ss -tan}}; Tests: {{ping}}/{{ping6}} ({{-c}}), {{traceroute}}/{{tracepath}} (PMTU), {{nc -zv HOST PORT}}, {{nc -l PORT}}.
- Vorgehen: Link → Adresse → Gateway → Routing → entfernte IP → DNS → Dienst/Port.`,
  '109.4': `- Ablauf: nsswitch.conf → /etc/hosts → DNS-Server aus /etc/resolv.conf (ggf. systemd-resolved auf 127.0.0.53).
- Record-Typen: A, AAAA, CNAME, MX, NS, PTR, SOA, TXT, SRV; Klassen IN, CH, HS.
- Werkzeuge: {{dig}} ({{@server}}, Typ, {{+short}}, {{-x}}, {{+trace}}; Status NOERROR/NXDOMAIN/SERVFAIL), {{host}} ({{-t}}), {{nslookup}}, {{getent hosts}} (wie Anwendungen, berücksichtigt /etc/hosts).
- systemd-resolved: {{resolvectl status/query/flush-caches}}.`,
  '110.1': `- SUID/SGID-Dateien finden: {{find / -perm -4000}}, {{-perm /6000}}.
- Passwörter: {{passwd}} ({{-l}}, {{-u}}, {{-e}}, {{-S}}), {{chage}} ({{-l}}, {{-M}}, {{-m}}, {{-W}}, {{-E}}, {{-d 0}}), {{usermod -L/-U}}.
- Anmeldungen: {{who}}, {{w}}, {{last}}, {{lastb}}, {{lastlog}}, {{id}}.
- Offene Ports: {{ss -tulpn}}, {{netstat -tulpn}}, {{lsof -i}}, {{fuser}}, {{nmap}} ({{-sT}}, {{-sS}}, {{-sU}}, {{-sn}}, {{-p}}).
- Grenzen: {{ulimit}} (soft/hard, {{-a}}, {{-n}}, {{-u}}, {{-c}}), /etc/security/limits.conf.
- **sudo**: {{sudo -l}}, {{-u}}, {{-i}}, {{-k}}, {{sudoedit}}; /etc/sudoers nur mit {{visudo}} (%gruppe, NOPASSWD, Aliase, /etc/sudoers.d/); {{su -}} fragt nach dem Root-Passwort.`,
  '110.2': `- Shadow-Passwörter: Hashes in /etc/shadow (nicht für alle lesbar), {{x}} in /etc/passwd; {{pwconv}}/{{pwunconv}}; Hash-Präfixe $1$, $5$, $6$, $y$.
- Logins sperren: /etc/nologin (nur root), Shell /usr/sbin/nologin oder /bin/false.
- Unnötige Dienste abschalten: {{ss -tuln}}, {{systemctl disable --now}}, {{systemctl mask}}, Socket-Units beachten; SysV: /etc/init.d, update-rc.d/chkconfig; /etc/inittab.
- Super-Server: inetd (/etc/inetd.conf), xinetd (/etc/xinetd.conf, /etc/xinetd.d/, {{disable = yes}}, only_from).
- **TCP-Wrapper**: zuerst /etc/hosts.allow (Treffer = erlaubt), dann /etc/hosts.deny (Treffer = verboten), sonst erlaubt; Syntax {{daemon: clients}}; heute veraltet – Firewall verwenden.`,
  '110.3': `- **SSH-Client**: {{ssh}}, {{scp}}, {{sftp}}, ~/.ssh/config, /etc/ssh/ssh_config; Schlüssel mit {{ssh-keygen}} (~/.ssh/id_rsa, id_ecdsa, id_ed25519 + .pub, Rechte 600), {{ssh-copy-id}} → ~/.ssh/authorized_keys; {{ssh-agent}} + {{ssh-add}}.
- **Host-Schlüssel**: /etc/ssh/ssh_host_*_key(.pub) identifizieren den Server; ~/.ssh/known_hosts und /etc/ssh/ssh_known_hosts; Warnung bei geändertem Schlüssel; Server-Konfiguration /etc/ssh/sshd_config.
- **Tunnel**: {{-L}} lokal, {{-R}} entfernt, {{-D}} SOCKS, {{-X}}/{{-Y}} X11.
- **GnuPG** (~/.gnupg, gpg-agent): {{--gen-key}}, {{--list-keys}}, {{--export -a}}, {{--import}}, {{-e -r}}, {{-d}}, {{-c}}, {{--sign}}, {{--clearsign}}, {{--detach-sign}}, {{--verify}}, {{--gen-revoke}}; verschlüsseln mit dem öffentlichen Schlüssel des Empfängers.`,
});
