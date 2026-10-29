/* Troubleshooting scenarios: something is broken — find the cause and fix it.
 * Same format as labs (labs.js), plus obj (related objectives), level and story. */
(function () {
  'use strict';
  const S = LPIC.scenarios;
  const asRootSh = (sh, cmds) => {
    sh.pushUser('root', false);
    try {
      sh.vars.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
      for (const c of cmds) sh.capture(c);
    } finally {
      sh.popUser();
    }
  };
  const W = (sh, path, text, mode, uid, gid) =>
    SIM.asRoot(sh, () => {
      sh.fs.mkdirp(path.replace(/\/[^/]+$/, '') || '/', '/');
      const n = sh.fs.writeFile(path, '/', text);
      if (mode !== undefined) n.mode = (n.mode & ~0o7777) | mode;
      if (uid !== undefined) n.uid = uid;
      if (gid !== undefined) n.gid = gid;
      return n;
    });
  const shadow = (sh, H, u) => ((H.read(sh, '/etc/shadow') || '').split('\n').find((l) => l.startsWith(u + ':')) || '').split(':');
  const lastIdx = (log, re) => {
    for (let i = log.length - 1; i >= 0; i--) if (re.test(log[i])) return i;
    return -1;
  };

  /* ---------------------------------------------------------------- */
  S['disk-full'] = {
    title: 'The disk is full',
    level: 'medium',
    obj: ['104.2', '103.3', '108.2'],
    story: 'Monday morning: users report *"No space left on device"* and the web application stopped writing its log. Find out what filled the root filesystem and free the space **without breaking the application**, which still has its log file open. Then make sure it does not happen again.',
    setup: (sh) => {
      const n = W(sh, '/var/log/app/debug.log', '2026-10-29 07:00:01 DEBUG request id=1 …\n');
      n.fsize = 25 * 1024 ** 3;
      W(sh, '/var/log/app/access.log', '10.0.0.7 - - "GET / HTTP/1.1" 200\n');
      sh.state.bigFiles = ['/var/log/app/debug.log'];
      sh.state.procs.push({ pid: 2210, ppid: 1, user: 'root', cmd: '/usr/local/bin/app-server --log /var/log/app/debug.log', ni: 0, stat: 'Ssl', tty: '?', cpu: 1.2, mem: 2.4, vsz: 420000, rss: 98000, start: '06:58' });
    },
    tasks: [
      { t: 'Confirm the problem: show how full the mounted filesystems are.', hint: '{{df -h}}', check: (sh, c) => c.used(/^df\b.*-[a-zA-Z]*h/), sol: ['df -h'] },
      { t: 'Find which directory below {{/var}} uses the most space.', hint: '{{sudo du -sh /var/* | sort -h}} or {{sudo du -h --max-depth=1 /var}}', check: (sh, c) => c.used(/du\b.*\/var/), sol: ['sudo du -sh /var/* 2>/dev/null | sort -h'] },
      { t: 'Locate all files larger than 1 GiB on the system.', hint: '{{sudo find / -size +1G 2>/dev/null}}', check: (sh, c) => c.used(/find\s+\/\S*\s.*-size\s+\+\d+[GM]/), sol: ['sudo find / -size +1G 2>/dev/null'] },
      { t: 'Find out which process writes to that file.', hint: '{{sudo lsof /var/log/app/debug.log}} or {{ps aux | grep debug.log}}', check: (sh, c) => c.used(/lsof\b.*debug\.log|fuser\b.*debug\.log|ps\b.*\|\s*grep\b.*(debug|app)/), sol: ['ps aux | grep debug.log'] },
      { t: 'Free the space **without deleting the file** (the process keeps it open — rm would not free anything until it restarts).', hint: '{{sudo truncate -s 0 /var/log/app/debug.log}} (or {{: | sudo tee /var/log/app/debug.log}})', check: (sh, c, H) => { const n = H.node(sh, '/var/log/app/debug.log'); return !!n && SIM.fsize(n) < 1024 * 1024; }, sol: ['sudo truncate -s 0 /var/log/app/debug.log'] },
      { t: 'Prevent it from happening again: create {{/etc/logrotate.d/app}} that rotates {{/var/log/app/*.log}} when larger than 100M, keeps 5 compressed copies and uses {{copytruncate}}.', hint: "{{printf '/var/log/app/*.log {\\n size 100M\\n rotate 5\\n compress\\n copytruncate\\n}\\n' | sudo tee /etc/logrotate.d/app}}", check: (sh, c, H) => { const s = H.read(sh, '/etc/logrotate.d/app') || ''; return /\/var\/log\/app\//.test(s) && /^\s*(size|maxsize)\s+100M/m.test(s) && /^\s*rotate\s+5/m.test(s) && /^\s*compress/m.test(s) && /^\s*copytruncate/m.test(s); }, sol: ["printf '/var/log/app/*.log {\\n size 100M\\n rotate 5\\n compress\\n copytruncate\\n}\\n' | sudo tee /etc/logrotate.d/app"] },
      { t: 'Verify with {{df -h}} that space is free again.', hint: '{{df -h /}}', check: (sh, c, H) => lastIdx(c.log, /^df\b/) > lastIdx(c.log, /truncate|debug\.log/) && SIM.fsize(H.node(sh, '/var/log/app/debug.log') || { t: 'f', data: '' }) < 1024 * 1024, sol: ['df -h /'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['service-down'] = {
    title: 'The web server does not start',
    level: 'medium',
    obj: ['101.3', '108.2', '110.2'],
    story: 'A colleague "tidied up" the Apache configuration on Friday and also tried to stop the service from coming back. Now the web server **apache2** is down and does not start. Use systemd and the journal to find out why, fix it and make sure it also starts after a reboot.',
    setup: (sh) => {
      W(sh, '/etc/apache2/ports.conf', '# If you just change the port or add more ports here, you will likely also\n# have to change the VirtualHost statement in\n# /etc/apache2/sites-enabled/000-default.conf\n\nLisen 80\n\n<IfModule ssl_module>\n\tListen 443\n</IfModule>\n');
      W(sh, '/etc/apache2/apache2.conf', '# main Apache configuration\nInclude ports.conf\nIncludeOptional sites-enabled/*.conf\n');
      Object.assign(sh.state.services.apache2, { active: false, enabled: false, failed: true, masked: true, badConf: { path: '/etc/apache2/ports.conf', re: '^\\s*Lisen\\b', msg: "AH00526: Syntax error on line 5 of /etc/apache2/ports.conf: Invalid command 'Lisen', perhaps misspelled or defined by a module not included in the server configuration" } });
      SIM.journal(sh, 'apache2', "AH00526: Syntax error on line 5 of /etc/apache2/ports.conf: Invalid command 'Lisen', perhaps misspelled or defined by a module not included in the server configuration", 3);
      SIM.journal(sh, 'systemd[1]', "apache2.service: Failed with result 'exit-code'.", 3);
    },
    tasks: [
      { t: 'Check the state of the service.', hint: '{{systemctl status apache2}}', check: (sh, c) => c.used(/systemctl\s+(status|is-failed|is-active)\s+apache2/), sol: ['systemctl status apache2'] },
      { t: 'Read the error messages of the unit in the journal.', hint: '{{sudo journalctl -u apache2}} (or {{journalctl -xeu apache2}})', check: (sh, c) => c.used(/journalctl\b.*(-u\s*|--unit[= ]|-[a-z]*u\s+)apache2/), sol: ['sudo journalctl -u apache2'] },
      { t: 'Fix the typo in the configuration file named in the error (the directive must be {{Listen 80}}).', hint: "{{sudo sed -i 's/^Lisen/Listen/' /etc/apache2/ports.conf}} or {{sudo nano /etc/apache2/ports.conf}}", check: (sh, c, H) => { const s = H.read(sh, '/etc/apache2/ports.conf') || ''; return /^\s*Listen\s+80\b/m.test(s) && !/^\s*Lisen\b/m.test(s); }, sol: ["sudo sed -i 's/^Lisen/Listen/' /etc/apache2/ports.conf"] },
      { t: 'The unit is **masked**, so it cannot be started at all. Unmask it.', hint: '{{sudo systemctl unmask apache2}}', check: (sh) => !sh.state.services.apache2.masked, sol: ['sudo systemctl unmask apache2'] },
      { t: 'Start the service now **and** enable it for the next boot with one command.', hint: '{{sudo systemctl enable --now apache2}}', check: (sh) => sh.state.services.apache2.active && sh.state.services.apache2.enabled, sol: ['sudo systemctl enable --now apache2'] },
      { t: 'Verify that something listens on TCP port 80 now.', hint: '{{systemctl is-active apache2}} and {{ss -tln}}', check: (sh, c) => sh.state.services.apache2.active && lastIdx(c.log, /systemctl\s+(is-active|status)\s+apache2|ss\s+-[a-z]*l/) > lastIdx(c.log, /systemctl\s+.*(start|enable)/), sol: ['systemctl is-active apache2'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['network-down'] = {
    title: 'No internet connection',
    level: 'easy',
    obj: ['109.3', '109.4', '109.2'],
    story: 'After a "quick network change" the server cannot reach anything outside its LAN, and host names do not resolve either. The LAN gateway is {{192.168.56.1}} and it is also the DNS server. Diagnose layer by layer and repair the configuration.',
    setup: (sh) => {
      sh.state.ip.routes = sh.state.ip.routes.filter((r) => r.dst !== 'default');
      W(sh, '/etc/resolv.conf', '# edited by hand\nsearch example.com\nnameserver 10.9.9.9\n');
    },
    tasks: [
      { t: 'Show that a host on the internet cannot be reached by name: {{ping -c 2 example.com}}.', hint: '{{ping -c 2 example.com}}', check: (sh, c) => c.used(/ping\b.*example\.com/), sol: ['ping -c 2 example.com'] },
      { t: 'Check the local network: ping the gateway {{192.168.56.1}} — does it answer?', hint: '{{ping -c 2 192.168.56.1}}', check: (sh, c) => c.used(/ping\b.*192\.168\.56\.1\b/), sol: ['ping -c 2 192.168.56.1'] },
      { t: 'Try a public IP address directly ({{8.8.8.8}}) and look at the routing table.', hint: '{{ping -c 2 8.8.8.8}} and {{ip route}}', check: (sh, c) => c.used(/ping\b.*8\.8\.8\.8/) && c.used(/^(ip\s+r(oute)?(\s+show)?|route\s+-n|netstat\s+-r)/), sol: ['ping -c 2 8.8.8.8', 'ip route'] },
      { t: 'There is no default route. Add one via the gateway.', hint: '{{sudo ip route add default via 192.168.56.1}}', check: (sh) => sh.state.ip.routes.some((r) => r.dst === 'default' && r.via === '192.168.56.1'), sol: ['sudo ip route add default via 192.168.56.1'] },
      { t: 'Names still do not resolve. Inspect the resolver configuration.', hint: '{{cat /etc/resolv.conf}}', check: (sh, c) => c.used(/\/etc\/resolv\.conf/) && c.used(/^(cat|less|more|grep|head)\b.*resolv\.conf/), sol: ['cat /etc/resolv.conf'] },
      { t: 'Fix it: the name server must be {{192.168.56.1}}.', hint: "{{sudo sed -i 's/^nameserver .*/nameserver 192.168.56.1/' /etc/resolv.conf}}", check: (sh, c, H) => /^\s*nameserver\s+192\.168\.56\.1\s*$/m.test(H.read(sh, '/etc/resolv.conf') || '') && !/10\.9\.9\.9/.test(H.read(sh, '/etc/resolv.conf') || ''), sol: ["sudo sed -i 's/^nameserver .*/nameserver 192.168.56.1/' /etc/resolv.conf"] },
      { t: 'Verify: {{ping -c 2 example.com}} must succeed now.', hint: '{{ping -c 2 example.com}}', check: (sh, c) => /ping\b.*example\.com/.test(c.last) && c.status === 0, sol: ['ping -c 2 example.com'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['login-denied'] = {
    title: 'A user cannot log in',
    level: 'medium',
    obj: ['107.1', '110.1', '110.2'],
    story: 'Bob returns from a long leave and cannot log in — neither on the console nor via SSH. Several things are wrong at the same time. Investigate his account and the login configuration and fix everything; when he logs in next time he must set a new password.',
    setup: (sh) => {
      asRootSh(sh, ['chage -E 2025-12-31 bob', 'usermod -s /usr/sbin/nologin bob']);
      W(sh, '/etc/nologin', 'System maintenance — logins disabled.\n');
    },
    tasks: [
      { t: 'Show the password status and the aging information of bob.', hint: '{{sudo passwd -S bob}} and {{sudo chage -l bob}}', check: (sh, c) => c.used(/passwd\s+-S\s+bob/) && c.used(/chage\s+-l\s+bob/), sol: ['sudo passwd -S bob', 'sudo chage -l bob'] },
      { t: 'Show bob\'s passwd entry (look at the last field).', hint: '{{getent passwd bob}}', check: (sh, c) => c.used(/(getent\s+passwd\s+bob|grep\s+.*bob.*\/etc\/passwd)/), sol: ['getent passwd bob'] },
      { t: 'Nobody except root can log in at the moment — find and remove the reason.', hint: 'the file {{/etc/nologin}}: {{sudo rm /etc/nologin}}', check: (sh, c, H) => !H.exists(sh, '/etc/nologin'), sol: ['sudo rm /etc/nologin'] },
      { t: 'Unlock bob\'s password.', hint: '{{sudo usermod -U bob}} or {{sudo passwd -u bob}}', check: (sh, c, H) => { const p = shadow(sh, H, 'bob')[1] || ''; return p.length > 3 && !p.startsWith('!'); }, sol: ['sudo usermod -U bob'] },
      { t: 'Remove the account expiry date.', hint: '{{sudo chage -E -1 bob}}', check: (sh, c, H) => (shadow(sh, H, 'bob')[7] || '') === '', sol: ['sudo chage -E -1 bob'] },
      { t: 'Give bob a real login shell again ({{/bin/bash}}).', hint: '{{sudo usermod -s /bin/bash bob}} (or {{chsh}})', check: (sh, c, H) => (H.user(sh, 'bob') || {}).shell === '/bin/bash', sol: ['sudo usermod -s /bin/bash bob'] },
      { t: 'Force bob to choose a new password at his next login.', hint: '{{sudo chage -d 0 bob}} or {{sudo passwd -e bob}}', check: (sh, c, H) => shadow(sh, H, 'bob')[2] === '0', sol: ['sudo chage -d 0 bob'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['cron-silent'] = {
    title: 'The nightly backup never runs',
    level: 'medium',
    obj: ['107.2', '105.2', '104.5'],
    story: 'The nightly backup at **02:30** has not produced a single archive for weeks. The job belongs to the user student. Find the three mistakes (access control, crontab entry, script) and fix them.',
    setup: (sh) => {
      W(sh, '/etc/cron.allow', 'alice\n');
      W(sh, '/var/spool/cron/crontabs/student', '# m h dom mon dow command\n2 30 * * * scripts/backup.sh\n', 0o600, 1000, 1000);
      const n = SIM.asRoot(sh, () => sh.fs.tryLookup('/home/student/scripts/backup.sh', '/'));
      if (n) n.node.mode = (n.node.mode & ~0o7777) | 0o644;
    },
    tasks: [
      { t: 'Try to list your crontab — what does cron say?', hint: '{{crontab -l}}', check: (sh, c) => c.used(/^crontab\s+-l/), sol: ['crontab -l'] },
      { t: 'Access is controlled by {{/etc/cron.allow}}. Allow the user student.', hint: '{{echo student | sudo tee -a /etc/cron.allow}}', check: (sh, c, H) => /^student\s*$/m.test(H.read(sh, '/etc/cron.allow') || ''), sol: ['echo student | sudo tee -a /etc/cron.allow'] },
      { t: 'Look at the crontab again: the time fields are swapped and the script path is relative. Fix the entry to {{30 2 * * * /home/student/scripts/backup.sh}}.', hint: '{{echo "30 2 * * * /home/student/scripts/backup.sh" | crontab -}} (or {{crontab -e}})', check: (sh, c, H) => { const s = H.read(sh, '/var/spool/cron/crontabs/student') || ''; return /^\s*30\s+0?2\s+\*\s+\*\s+\*\s+\/home\/student\/scripts\/backup\.sh\b/m.test(s) && !/^\s*2\s+30\b/m.test(s); }, sol: ['echo "30 2 * * * /home/student/scripts/backup.sh" | crontab -'] },
      { t: 'The script is not executable. Fix its permissions.', hint: '{{chmod u+x scripts/backup.sh}}', check: (sh, c, H) => (H.mode(sh, '/home/student/scripts/backup.sh') & 0o100) !== 0, sol: ['chmod u+x scripts/backup.sh'] },
      { t: 'Test the script once by hand with its absolute path.', hint: '{{/home/student/scripts/backup.sh}}', check: (sh, c) => c.used(/^(\/home\/student|~)\/scripts\/backup\.sh/), sol: ['/home/student/scripts/backup.sh'] },
      { t: 'Check the cron log entries in the journal.', hint: '{{journalctl -u cron}} (or {{grep CRON /var/log/syslog}})', check: (sh, c) => c.used(/journalctl\b.*cron|grep\b.*CRON.*syslog/i), sol: ['journalctl -u cron'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['shared-dir'] = {
    title: 'The team cannot share files',
    level: 'easy',
    obj: ['104.5', '107.1'],
    story: 'Alice and Bob should work together in {{/srv/team}}, but they get *"Permission denied"*. Requirements: only members of a new group **team** may access the directory, both can create files, and new files automatically belong to the group team.',
    setup: (sh) => {
      asRootSh(sh, ['mkdir -p /srv/team', 'chmod 755 /srv/team']);
      W(sh, '/srv/team/plan.txt', 'Q4 plan\n', 0o644);
    },
    tasks: [
      { t: 'Inspect owner, group and permissions of {{/srv/team}}.', hint: '{{ls -ld /srv/team}}', check: (sh, c) => c.used(/ls\s+-[a-z]*d[a-z]*\s+\/srv\/team|stat\s+\/srv\/team/), sol: ['ls -ld /srv/team'] },
      { t: 'Create the group **team**.', hint: '{{sudo groupadd team}}', check: (sh, c, H) => !!H.group(sh, 'team'), sol: ['sudo groupadd team'] },
      { t: 'Add **alice** and **bob** to the group (keep their other groups).', hint: '{{sudo usermod -aG team alice}} and {{sudo usermod -aG team bob}} (or {{gpasswd -a}})', check: (sh, c, H) => H.groupsOf(sh, 'alice').indexOf('team') >= 0 && H.groupsOf(sh, 'bob').indexOf('team') >= 0, sol: ['sudo usermod -aG team alice', 'sudo usermod -aG team bob'] },
      { t: 'Give the directory and the existing files to the group team.', hint: '{{sudo chgrp -R team /srv/team}}', check: (sh, c, H) => /:team$/.test(H.owner(sh, '/srv/team') || '') && /:team$/.test(H.owner(sh, '/srv/team/plan.txt') || ''), sol: ['sudo chgrp -R team /srv/team'] },
      { t: 'Set the directory mode so the group can write, others have no access, and new files inherit the group (SGID): {{2770}}.', hint: '{{sudo chmod 2770 /srv/team}}', check: (sh, c, H) => H.mode(sh, '/srv/team') === 0o2770, sol: ['sudo chmod 2770 /srv/team'] },
      { t: 'Make the existing file group-writable.', hint: '{{sudo chmod g+w /srv/team/plan.txt}}', check: (sh, c, H) => (H.mode(sh, '/srv/team/plan.txt') & 0o020) !== 0, sol: ['sudo chmod g+w /srv/team/plan.txt'] },
      { t: 'Test it: create a file as alice and check that its group is team.', hint: '{{sudo -u alice touch /srv/team/alice.txt}} then {{sudo ls -l /srv/team}}', check: (sh, c, H) => /^alice:team$/.test(H.owner(sh, '/srv/team/alice.txt') || ''), sol: ['sudo -u alice touch /srv/team/alice.txt', 'sudo ls -l /srv/team'] },
    ],
  };

  /* ---------------------------------------------------------------- */
  S['runaway'] = {
    title: 'The server is slow',
    level: 'hard',
    obj: ['103.5', '103.6', '107.2', '110.1'],
    story: 'The load average is high and everything feels sluggish. Find the process that eats the CPU, deal with it, and find out why it keeps coming back. (Hint: it belongs to a user account that may have been compromised.)',
    setup: (sh) => {
      asRootSh(sh, ['usermod -U bob']);
      sh.state.procs.push({ pid: 3333, ppid: 1, user: 'bob', cmd: '/home/bob/.cache/.x/miner --threads 4 --pool stratum.example.net', ni: 0, stat: 'R', tty: '?', cpu: 98.7, mem: 3.1, vsz: 90000, rss: 60000, start: '06:12' });
      W(sh, '/home/bob/.cache/.x/miner', '\x7fELF 64-bit LSB executable (unknown)\n', 0o755, 1002, 1002);
      W(sh, '/var/spool/cron/crontabs/bob', '# m h dom mon dow command\n*/5 * * * * /home/bob/.cache/.x/miner --threads 4 --pool stratum.example.net >/dev/null 2>&1\n', 0o600, 1002, 1002);
    },
    tasks: [
      { t: 'Check the load average.', hint: '{{uptime}} (or {{w}}, {{top}})', check: (sh, c) => c.used(/^(uptime|w|top)\b/), sol: ['uptime'] },
      { t: 'List the processes sorted by CPU usage and identify the culprit.', hint: '{{ps aux --sort=-%cpu | head}} or {{top}}', check: (sh, c) => c.used(/ps\b.*--sort[= ]-?%?cpu|^top\b|ps\b.*\|\s*sort/), sol: ['ps aux --sort=-%cpu | head -5'] },
      { t: 'As a first aid, give it the lowest CPU priority.', hint: '{{sudo renice -n 19 -p 3333}}', check: (sh, c) => c.used(/renice\b.*19.*3333|renice\b.*3333.*19/), sol: ['sudo renice -n 19 -p 3333'] },
      { t: 'Terminate the process.', hint: '{{sudo kill 3333}} (if it ignores SIGTERM: {{sudo kill -9 3333}})', check: (sh) => !sh.state.procs.some((p) => p.pid === 3333), sol: ['sudo kill 3333'] },
      { t: 'Find out why it would come back: look at bob\'s crontab.', hint: '{{sudo crontab -u bob -l}}', check: (sh, c) => c.used(/crontab\s+.*-u\s*bob.*-l|crontab\s+-l\s+-u\s*bob|cat\s+\/var\/spool\/cron\/crontabs\/bob/), sol: ['sudo crontab -u bob -l'] },
      { t: 'Remove bob\'s crontab entirely.', hint: '{{sudo crontab -u bob -r}}', check: (sh, c, H) => !/miner/.test(H.read(sh, '/var/spool/cron/crontabs/bob') || ''), sol: ['sudo crontab -u bob -r'] },
      { t: 'Lock bob\'s account until his password has been reset and delete the malware directory.', hint: '{{sudo usermod -L bob}} and {{sudo rm -r /home/bob/.cache/.x}}', check: (sh, c, H) => (H.read(sh, '/etc/shadow') || '').split('\n').some((l) => /^bob:!/.test(l)) && !H.exists(sh, '/home/bob/.cache/.x'), sol: ['sudo usermod -L bob', 'sudo rm -r /home/bob/.cache/.x'] },
    ],
  };
})();
