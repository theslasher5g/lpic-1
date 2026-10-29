/* Extra questions — Topic 110: Security. */
LPIC.addQuiz('110.1', [
  { q: 'Which command scans the TCP ports 1–1024 of {{10.0.0.5}} with nmap?', fill: ['nmap -p 1-1024 10.0.0.5', 'nmap -p1-1024 10.0.0.5'], e: 'Only scan hosts you are authorized to scan.', de: 'Nur Systeme scannen, für die eine Erlaubnis besteht.' },
  { q: 'Which nmap option performs a UDP scan?', fill: ['-sU'], e: '-sS SYN, -sT connect, -sV versions, -O OS detection.', de: '-sS SYN, -sT Connect, -sV Versionen, -O Betriebssystem.' },
  { q: 'Which command lists open files belonging to the user {{alice}}?', fill: ['lsof -u alice', 'sudo lsof -u alice'], e: '', de: '{{lsof -u}} zeigt offene Dateien eines Benutzers.' },
  { q: 'Which command shows the last time each user logged in?', fill: ['lastlog'], e: '', de: '{{lastlog}} zeigt die letzte Anmeldung jedes Kontos.' },
  { q: 'Which file does {{who}} read to show current logins?', fill: ['/var/run/utmp', '/run/utmp'], e: 'last reads /var/log/wtmp, lastb /var/log/btmp.', de: 'last liest /var/log/wtmp, lastb /var/log/btmp.' },
  { q: 'Which sudoers line allows the group {{ops}} to restart nginx without a password?', o: ['{{%ops ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx}}', '{{ops ALL=NOPASSWD restart nginx}}', '{{@ops ALL: nginx}}', '{{%ops = systemctl nginx}}'], a: 0, e: '', de: '% kennzeichnet eine Gruppe, NOPASSWD verzichtet auf die Passwortabfrage.' },
  { q: 'Which command runs {{id}} as the user {{bob}} via sudo?', fill: ['sudo -u bob id'], e: '', de: '{{sudo -u}} führt den Befehl als anderer Benutzer aus.' },
  { q: 'Which command removes the cached sudo credentials so the password is asked again?', fill: ['sudo -k'], e: '', de: '{{sudo -k}} löscht die zwischengespeicherte Anmeldung.' },
  { q: 'What is the difference between {{su -}} and {{sudo -i}}?', o: ['su asks for the root password, sudo for the user\'s own password', 'there is none', 'sudo -i does not start a login shell', 'su - only works as root'], a: 0, e: 'Both start a root login shell.', de: 'Beide starten eine Root-Login-Shell; su fragt nach dem Root-Passwort, sudo nach dem eigenen.' },
  { q: 'Which ulimit option restricts the size of core dumps?', fill: ['-c', 'ulimit -c'], e: '{{ulimit -c 0}} disables core dumps.', de: '{{ulimit -c 0}} schaltet Core-Dumps ab.' },
  { q: 'Which limits.conf item restricts the number of simultaneous logins of a user?', fill: ['maxlogins'], e: 'Others: nproc, nofile, as, cpu, core, fsize.', de: 'Weitere: nproc, nofile, as, cpu, core, fsize.' },
  { q: 'Which command shows the password status (locked, no password, usable) of {{bob}}?', fill: ['passwd -S bob', 'sudo passwd -S bob'], e: 'L = locked, NP = no password, P = usable password.', de: 'L = gesperrt, NP = kein Passwort, P = gültiges Passwort.' },
  { q: 'Which command finds all files with **both** SUID and SGID set?', o: ['{{find / -perm -6000}}', '{{find / -perm /6000}}', '{{find / -perm 6}}', '{{find / -suid -sgid}}'], a: 0, e: '-6000 = all bits set; /6000 = any bit set.', de: '-6000 = alle Bits gesetzt, /6000 = mindestens eines.' },
]);

LPIC.addQuiz('110.2', [
  { q: 'Which command converts a system without shadow passwords to use {{/etc/shadow}}?', fill: ['pwconv'], e: '{{pwunconv}} does the opposite; {{grpconv}} for groups.', de: '{{pwunconv}} macht es rückgängig, {{grpconv}} für Gruppen.' },
  { q: 'Why are password hashes not stored in {{/etc/passwd}} anymore?', o: ['/etc/passwd must be world-readable, so hashes could be copied and cracked offline.', 'The file is too small.', 'The kernel cannot read it.', 'Hashes are stored in the BIOS.'], a: 0, e: '', de: '/etc/passwd muss für alle lesbar sein; Hashes könnten sonst kopiert und offline geknackt werden.' },
  { q: 'Which super-server starts services on demand and is configured in {{/etc/xinetd.conf}}?', fill: ['xinetd'], e: 'The older inetd uses /etc/inetd.conf.', de: 'Das ältere inetd nutzt /etc/inetd.conf.' },
  { q: 'Which xinetd attribute restricts access to certain client addresses?', fill: ['only_from'], e: 'no_access denies addresses.', de: '{{no_access}} verweigert Adressen.' },
  { q: 'Which command lists the services enabled at boot on a systemd system so you can disable unused ones?', fill: ['systemctl list-unit-files --state=enabled', 'systemctl list-unit-files --type=service --state=enabled'], e: '', de: 'Damit lassen sich unnötige Dienste finden und deaktivieren.' },
  { q: 'Which command prevents a service from being started at all, even manually or as a dependency?', fill: ['systemctl mask', 'systemctl mask telnet', 'systemctl mask telnet.service'], e: 'It links the unit to /dev/null; unmask reverts it.', de: 'Die Unit wird auf /dev/null verlinkt; {{unmask}} hebt es auf.' },
  { q: 'Which hosts.deny line implements a "deny everything not explicitly allowed" policy?', fill: ['ALL: ALL', 'ALL:ALL', 'ALL : ALL'], e: '', de: '{{ALL: ALL}} in hosts.deny verbietet alles nicht Erlaubte.' },
  { q: 'Which command shows whether a daemon is linked against libwrap (TCP wrappers support)?', fill: ['ldd /usr/sbin/sshd | grep libwrap', 'ldd /usr/sbin/sshd'], e: '', de: 'Mit ldd prüfen, ob libwrap eingebunden ist.' },
  { q: 'When does a change in {{/etc/hosts.allow}} take effect?', o: ['immediately for new connections', 'after restarting the service', 'after a reboot', 'after running tcpd -r'], a: 0, e: 'The files are read on every connection attempt.', de: 'Die Dateien werden bei jedem Verbindungsversuch gelesen.' },
]);

LPIC.addQuiz('110.3', [
  { q: 'Which command copies {{notes.txt}} to {{/tmp}} on {{fileserver}} via SSH?', fill: ['scp notes.txt fileserver:/tmp', 'scp notes.txt fileserver:/tmp/'], e: '{{scp -r}} copies directories.', de: '{{scp -r}} kopiert Verzeichnisse.' },
  { q: 'Which ssh option connects to port 2222?', fill: ['-p 2222', '-p2222', 'ssh -p 2222'], e: 'scp uses -P (capital) for the port.', de: 'scp nutzt dafür -P (groß).' },
  { q: 'Which command creates a remote port forwarding so that port 9000 on {{server}} reaches port 22 on your machine?', fill: ['ssh -R 9000:localhost:22 server', 'ssh -R9000:localhost:22 server'], e: '', de: '{{-R}} öffnet einen Port auf dem entfernten Rechner.' },
  { q: 'Which ssh option creates a SOCKS proxy on local port 1080?', fill: ['-D 1080', '-D1080', 'ssh -D 1080'], e: '', de: '{{-D}} startet einen dynamischen SOCKS-Proxy.' },
  { q: 'Which command removes the outdated host key of {{fileserver}} from {{~/.ssh/known_hosts}}?', fill: ['ssh-keygen -R fileserver'], e: 'Only after verifying the new key is legitimate!', de: 'Nur nachdem geprüft wurde, dass der neue Schlüssel legitim ist!' },
  { q: 'Which sshd_config directive disables password authentication?', fill: ['PasswordAuthentication no'], e: 'Reload sshd afterwards.', de: 'Danach sshd neu laden.' },
  { q: 'Which sshd_config directive forbids root logins via SSH?', fill: ['PermitRootLogin no'], e: '{{prohibit-password}} allows only key-based root logins.', de: '{{prohibit-password}} erlaubt nur schlüsselbasierte Root-Logins.' },
  { q: 'Which command shows the fingerprint of the server host key {{/etc/ssh/ssh_host_ed25519_key.pub}}?', fill: ['ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub', 'ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub'], e: 'Compare it with the fingerprint shown at the first connection.', de: 'Mit dem Fingerprint bei der ersten Verbindung vergleichen.' },
  { q: 'Which gpg command decrypts {{secret.txt.gpg}} to {{secret.txt}}?', fill: ['gpg -o secret.txt -d secret.txt.gpg', 'gpg --output secret.txt --decrypt secret.txt.gpg', 'gpg -d secret.txt.gpg > secret.txt', 'gpg --decrypt secret.txt.gpg > secret.txt', 'gpg -o secret.txt --decrypt secret.txt.gpg'], e: '', de: '{{gpg -d}} entschlüsselt, {{-o}} legt die Ausgabedatei fest.' },
  { q: 'Which gpg command lists your private keys?', fill: ['gpg --list-secret-keys', 'gpg -K'], e: '', de: '{{gpg -K}} listet private Schlüssel.' },
  { q: 'Which gpg command encrypts {{file}} symmetrically with a passphrase only?', fill: ['gpg -c file', 'gpg --symmetric file'], e: '', de: '{{gpg -c}} verschlüsselt symmetrisch mit Passphrase.' },
  { q: 'Which gpg command creates a clear-text signature that keeps the message readable?', fill: ['gpg --clearsign', 'gpg --clear-sign', 'gpg --clearsign file'], e: '', de: '{{--clearsign}} lässt den Text lesbar und hängt die Signatur an.' },
  { q: 'What happens after you import a revocation certificate for your key and upload the key to a keyserver?', o: ['Others see that the key is revoked and should no longer use it.', 'The key is deleted from all computers.', 'All encrypted files are decrypted.', 'Nothing, keyservers ignore revocations.'], a: 0, e: '', de: 'Andere sehen, dass der Schlüssel widerrufen ist und ihn nicht mehr verwenden sollen.' },
]);
