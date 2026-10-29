/* Extra questions — Topic 108: Essential System Services. */
LPIC.addQuiz('108.1', [
  { q: 'Which command sets the system date and time to 26 October 2026, 14:30?', o: ["{{date -s '2026-10-26 14:30'}}", "{{date +'2026-10-26 14:30'}}", "{{hwclock -s '2026-10-26 14:30'}}", '{{timedatectl 2026-10-26}}'], a: 0, e: 'Or {{timedatectl set-time "2026-10-26 14:30"}} (NTP must be disabled).', de: 'Alternativ {{timedatectl set-time}} – vorher NTP deaktivieren.' },
  { q: 'Which command prints the number of seconds since 1970-01-01 00:00 UTC?', fill: ['date +%s'], e: '', de: '{{date +%s}} gibt die Unix-Zeit aus.' },
  { q: 'Which command shows the hardware clock time?', fill: ['hwclock', 'hwclock -r', 'hwclock --show', 'sudo hwclock', 'sudo hwclock -r', 'sudo hwclock --show'], e: '', de: '{{hwclock}} bzw. {{hwclock --show}} zeigt die RTC-Zeit.' },
  { q: 'In {{ntpq -p}} output, what does the character {{*}} before a peer mean?', o: ['it is the currently selected synchronization source', 'it is unreachable', 'it is a candidate rejected as false ticker', 'it is a broadcast server'], a: 0, e: '+ = good candidate, - = outlier, x = false ticker.', de: '+ guter Kandidat, - Ausreißer, x falsch tickend.' },
  { q: 'What does the {{reach}} value 377 in {{ntpq -p}} mean?', o: ['the last 8 polls were all answered', 'the server is 377 ms away', '377 polls have been sent', 'the server is unreachable'], a: 0, e: 'reach is an octal shift register; 377 = 11111111 binary.', de: 'reach ist ein oktales Schieberegister; 377 = 11111111 binär.' },
  { q: 'Which directive in chrony.conf allows the clock to be stepped if the offset is large during the first updates?', fill: ['makestep', 'makestep 1.0 3', 'makestep 1 3'], e: '', de: '{{makestep}} erlaubt Sprünge statt langsamer Korrektur.' },
  { q: 'Which command shows the offset of the local clock and the reference server used by chronyd?', fill: ['chronyc tracking'], e: '{{chronyc sources -v}} explains the columns.', de: '{{chronyc sources -v}} erklärt die Spalten.' },
  { q: 'Which statements about time keeping are correct? (Choose two.)', o: ['The hardware clock should normally be kept in UTC.', 'The system clock counts seconds since the epoch in UTC.', 'The time zone is stored in the RTC.', 'NTP always steps the clock instantly.'], a: [0, 1], e: 'NTP usually slews the clock gradually.', de: 'Die RTC sollte UTC enthalten; NTP korrigiert meist schrittweise (slewing).' },
  { q: 'Which ntpd option makes it accept a large initial time offset once at startup?', fill: ['-g', 'ntpd -g'], e: '{{ntpd -gq}} sets the time once and exits.', de: '{{ntpd -gq}} stellt die Zeit einmalig und beendet sich.' },
  { q: 'Which systemd service is a simple SNTP client often used instead of ntpd or chronyd?', fill: ['systemd-timesyncd', 'systemd-timesyncd.service', 'timesyncd'], e: 'Configured in /etc/systemd/timesyncd.conf.', de: 'Konfiguration in /etc/systemd/timesyncd.conf.' },
]);

LPIC.addQuiz('108.2', [
  { q: 'Which rsyslog selector logs only messages of priority **exactly** info from the facility local5?', fill: ['local5.=info'], e: 'local5.info would include notice, warning, err, … as well.', de: 'local5.info würde auch höhere Prioritäten einschließen.' },
  { q: 'What does {{*.*;mail.none /var/log/messages}} log?', o: ['everything except mail messages', 'only mail messages', 'nothing', 'only messages without priority'], a: 0, e: '', de: 'Alles außer Mail-Meldungen.' },
  { q: 'What does the dash in {{-/var/log/syslog}} mean in an rsyslog action?', o: ['the file is not synced to disk after every message', 'the file is deleted', 'logging is disabled', 'messages are sent to a remote host'], a: 0, e: 'Improves performance at the risk of losing messages in a crash.', de: 'Verbessert die Leistung, kann bei einem Absturz aber Meldungen kosten.' },
  { q: 'Which rsyslog modules are needed to receive syslog messages from the network? (Choose two.)', o: ['{{imudp}}', '{{imtcp}}', '{{omfwd}}', '{{imfile}}'], a: [0, 1], e: 'omfwd forwards to other hosts; imfile reads text files.', de: 'omfwd leitet weiter, imfile liest Textdateien ein.' },
  { q: 'Which command shows journal entries since yesterday?', fill: ['journalctl --since yesterday', 'journalctl -S yesterday', 'journalctl --since=yesterday'], e: 'Absolute times: {{--since "2026-10-26 08:00"}}.', de: 'Absolute Zeiten: {{--since "2026-10-26 08:00"}}.' },
  { q: 'Which journalctl option shows the disk space used by the journal?', fill: ['--disk-usage', 'journalctl --disk-usage'], e: '', de: '{{--disk-usage}} zeigt den belegten Speicherplatz.' },
  { q: 'Where does journald store the journal when {{Storage=volatile}} is set?', fill: ['/run/log/journal', '/run/log/journal/'], e: 'It is lost at reboot.', de: 'Es geht beim Neustart verloren.' },
  { q: 'Which journalctl option prints the newest entries first?', fill: ['-r', '--reverse'], e: '', de: '{{-r}} kehrt die Reihenfolge um.' },
  { q: 'Which logrotate directive rotates a log as soon as it is larger than 50 MB?', fill: ['size 50M', 'maxsize 50M', 'size=50M'], e: '', de: '{{size 50M}} rotiert ab 50 MB.' },
  { q: 'Which logrotate directive truncates the original log in place after copying it, for programs that cannot reopen their log file?', fill: ['copytruncate'], e: 'The alternative is postrotate with a reload/HUP signal.', de: 'Alternative: postrotate mit einem Reload/HUP-Signal.' },
  { q: 'Which command tests a logrotate configuration without rotating anything?', fill: ['logrotate -d /etc/logrotate.conf', 'logrotate --debug /etc/logrotate.conf', 'logrotate -d'], e: '{{-f}} forces rotation.', de: '{{-d}} testet, {{-f}} erzwingt die Rotation.' },
  { q: 'Which statement describes the relationship between systemd-journald and rsyslog on many distributions?', o: ['journald collects messages and forwards them to rsyslog, which writes text logs to /var/log.', 'rsyslog replaces journald completely.', 'They cannot run together.', 'journald reads the files written by rsyslog.'], a: 0, e: 'ForwardToSyslog=yes or the rsyslog imjournal module.', de: 'ForwardToSyslog=yes bzw. das rsyslog-Modul imjournal.' },
]);

LPIC.addQuiz('108.3', [
  { q: 'Which statement about MTA, MUA and MDA is correct?', o: ['The MUA is used by the user to read and write mail, the MTA transports it, the MDA delivers it into mailboxes.', 'The MDA transports mail between servers.', 'The MUA runs on the mail server only.', 'The MTA is a mail client.'], a: 0, e: 'e.g. mutt (MUA) → postfix (MTA) → dovecot-lda (MDA).', de: 'z. B. mutt (MUA) → Postfix (MTA) → dovecot-lda (MDA).' },
  { q: 'Which command processes the mail queue immediately (sendmail compatible)?', o: ['{{sendmail -q}}', '{{mailq -f}}', '{{newaliases -q}}', '{{mail -q}}'], a: 0, e: 'Postfix also: {{postqueue -f}}.', de: 'Bei Postfix auch {{postqueue -f}}.' },
  { q: 'Which line in {{/etc/aliases}} pipes mails for {{tickets}} into a program?', o: ['{{tickets: "|/usr/local/bin/ticket"}}', '{{tickets > /usr/local/bin/ticket}}', '{{tickets: exec ticket}}', '{{|tickets: ticket}}'], a: 0, e: '', de: 'Mit {{"|programm"}} wird die Mail an ein Programm übergeben.' },
  { q: 'Which file is the main configuration file of Postfix?', fill: ['/etc/postfix/main.cf'], e: 'master.cf defines the services/processes.', de: 'master.cf definiert die Dienste/Prozesse.' },
  { q: 'Which statement about {{~/.forward}} is correct?', o: ['It must belong to the user and must not be writable by others.', 'It must be executable.', 'It needs newaliases to be run.', 'It only works for root.'], a: 0, e: 'Otherwise the MTA ignores it for security reasons.', de: 'Sonst ignoriert der MTA die Datei aus Sicherheitsgründen.' },
  { q: 'Which MTA was the traditional default on Debian?', o: ['Exim', 'qmail', 'Sendmail', 'Postfix'], a: 0, e: 'Debian 12 still uses exim4 as the default MTA when one is installed.', de: 'Debian nutzt traditionell exim4 als Standard-MTA.' },
  { q: 'Which command reads the mailbox of the current user interactively?', fill: ['mail', 'mailx'], e: '', de: '{{mail}} öffnet die Mailbox interaktiv.' },
  { q: 'Where should mail for root normally be redirected to so that an administrator actually reads it?', o: ['to a real user via a "root:" line in /etc/aliases', 'to /dev/null', 'to /var/log/mail.log', 'to the postmaster of the ISP'], a: 0, e: 'e.g. {{root: alice}}, then {{newaliases}}.', de: 'z. B. {{root: alice}}, danach {{newaliases}}.' },
]);

LPIC.addQuiz('108.4', [
  { q: 'Which command lists all print queues and whether they are enabled?', fill: ['lpstat -p', 'lpstat -a', 'lpstat -t'], e: '-p printer state, -a accepting, -d default.', de: '-p Druckerstatus, -a Annahme von Aufträgen, -d Standarddrucker.' },
  { q: 'Which command shows the default printer?', fill: ['lpstat -d'], e: '', de: '{{lpstat -d}} zeigt den Standarddrucker.' },
  { q: 'Which command removes the print queue {{oldprinter}}?', fill: ['lpadmin -x oldprinter'], e: '', de: '{{lpadmin -x}} entfernt eine Warteschlange.' },
  { q: 'Which command makes the queue {{laser}} accept jobs again after {{cupsreject}}?', fill: ['cupsaccept laser', 'accept laser'], e: '', de: '{{cupsaccept}} nimmt wieder Aufträge an.' },
  { q: 'Which command moves the print job 42 to the queue {{pdf}}?', fill: ['lpmove 42 pdf'], e: '', de: '{{lpmove}} verschiebt Aufträge in eine andere Warteschlange.' },
  { q: 'A job hangs in the queue. Which file should you check first for error messages?', fill: ['/var/log/cups/error_log'], e: 'Increase LogLevel in cupsd.conf for more detail.', de: 'Für mehr Details LogLevel in cupsd.conf erhöhen.' },
  { q: 'Which command prints 3 copies of {{report.txt}} with the BSD command?', fill: ['lpr -#3 report.txt', 'lpr -# 3 report.txt'], e: 'System V: {{lp -n 3 report.txt}}.', de: 'System V: {{lp -n 3 report.txt}}.' },
  { q: 'Which command enables the printer {{laser}} again after it was disabled with {{cupsdisable}}?', fill: ['cupsenable laser'], e: '', de: '{{cupsenable}} aktiviert den Drucker wieder.' },
]);
