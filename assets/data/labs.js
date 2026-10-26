/* Hands-on labs. Each lab runs in a fresh simulated system. A task is done when
 * its check(sh, ctx, H) returns true (run with root file access after every command).
 * ctx: { last, status, log, used(re) }  ·  H: helpers from app.js (window.LABH)
 * sol: a reference solution, used by the automated tests (tests/run.js). */
(function () {
  'use strict';
  const L = LPIC.labs;
  const W = (sh, path, text, mode) =>
    SIM.asRoot(sh, () => {
      sh.fs.mkdirp(path.replace(/\/[^/]+$/, '') || '/', '/');
      sh.fs.writeFile(path, '/', text);
      const r = sh.fs.tryLookup(path, '/');
      if (mode !== undefined) r.node.mode = (r.node.mode & ~0o7777) | mode;
      if (path.startsWith('/home/student/')) own(r.node, 1000, 1000);
      return r.node;
    });
  const own = (node, uid, gid) => {
    node.uid = uid;
    node.gid = gid;
  };
  const shadowOf = (sh, H, user) => ((H.read(sh, '/etc/shadow') || '').split('\n').find((l) => l.startsWith(user + ':')) || '').split(':');
  const jobsLike = (sh, re) => (sh.jobs || []).filter((j) => !j.done && re.test(j.text));

  /* ---------------- 101.3 ---------------- */
  L['101.3'] = {
    title: 'Runlevels, targets and shutdown',
    intro: 'Explore and change the systemd boot target. Root commands need {{sudo}}.',
    tasks: [
      { t: 'Show the current default target.', hint: '{{systemctl get-default}}', check: (sh, c) => c.used(/systemctl\s+get-default/), sol: ['systemctl get-default'] },
      { t: 'Make **multi-user.target** the default target (text mode).', hint: '{{sudo systemctl set-default multi-user.target}}', check: (sh, c, H) => /multi-user\.target$/.test((H.node(sh, '/etc/systemd/system/default.target', false) || {}).target || ''), sol: ['sudo systemctl set-default multi-user.target'] },
      { t: 'Switch the running system to multi-user.target now (without reboot).', hint: '{{sudo systemctl isolate multi-user.target}}', check: (sh) => sh.state.target === 'multi-user.target', sol: ['sudo systemctl isolate multi-user.target'] },
      { t: 'Display the previous and current SysV runlevel.', hint: '{{sudo runlevel}}', check: (sh, c) => c.used(/\brunlevel\b/), sol: ['sudo runlevel'] },
      { t: 'Send the message "maintenance at 18:00" to all logged-in users.', hint: '{{wall "maintenance at 18:00"}}', check: (sh, c) => c.used(/\bwall\b.*maintenance/), sol: ['wall "maintenance at 18:00"'] },
    ],
  };

  /* ---------------- 102.4 ---------------- */
  L['102.4'] = {
    title: 'Debian package management',
    intro: 'Install, query and remove packages with {{apt}} and {{dpkg}}.',
    tasks: [
      { t: 'Update the package index.', hint: '{{sudo apt update}}', check: (sh, c) => c.used(/^sudo\s+apt(-get)?\s+update/), sol: ['sudo apt update'] },
      { t: 'Search the repository for a package containing **tree**.', hint: '{{apt search tree}}', check: (sh, c) => c.used(/apt(-cache)?\s+search\s+\S*tree/), sol: ['apt search tree'] },
      { t: 'Install the package **tree** and run it in your home directory.', hint: '{{sudo apt install -y tree}} then {{tree}}', check: (sh, c) => !!sh.state.packagesDeb.tree && c.used(/^tree\b/), sol: ['sudo apt install -y tree', 'tree'] },
      { t: 'Find out which package owns the file {{/bin/bash}}.', hint: '{{dpkg -S /bin/bash}}', check: (sh, c) => c.used(/dpkg\s+(-S|--search)\s+\S*bash/), sol: ['dpkg -S /bin/bash'] },
      { t: 'List the files installed by the package **openssh-server**.', hint: '{{dpkg -L openssh-server}}', check: (sh, c) => c.used(/dpkg\s+(-L|--listfiles)\s+openssh-server/), sol: ['dpkg -L openssh-server'] },
      { t: 'Remove the package **tree** again, including its configuration files.', hint: '{{sudo apt purge -y tree}}', check: (sh, c) => !sh.state.packagesDeb.tree && c.used(/(apt(-get)?|dpkg)\s+.*(purge|remove|-P|-r)\b.*tree/), sol: ['sudo apt purge -y tree'] },
    ],
  };

  /* ---------------- 103.1 ---------------- */
  L['103.1'] = {
    title: 'Work on the command line',
    intro: 'Variables, quoting, history and the PATH.',
    tasks: [
      { t: 'Print your current working directory.', hint: '{{pwd}}', check: (sh, c) => c.used(/^pwd\b/), sol: ['pwd'] },
      { t: 'Create a shell variable {{COURSE}} with the value {{LPIC-1}} and **export** it.', hint: '{{export COURSE=LPIC-1}}', check: (sh) => sh.vars.COURSE === 'LPIC-1' && sh.exported.has('COURSE'), sol: ['export COURSE=LPIC-1'] },
      { t: 'Print the text {{Course: $COURSE}} literally (the dollar sign must not be expanded).', hint: "{{echo 'Course: $COURSE'}}", check: (sh, c) => c.used(/^echo\s+('Course: \$COURSE'|"Course: \\\$COURSE"|Course:\s+\\\$COURSE)/), sol: ["echo 'Course: $COURSE'"] },
      { t: 'Show what kind of command {{cd}} and {{ls}} are.', hint: '{{type cd ls}}', check: (sh, c) => c.used(/^type\b.*\bcd\b/) && c.used(/^type\b.*\bls\b/), sol: ['type cd ls'] },
      { t: 'Add {{/home/student/scripts}} to the end of your PATH.', hint: '{{export PATH=$PATH:/home/student/scripts}}', check: (sh) => /(^|:)(\/home\/student|~)\/scripts\/?$/.test(sh.vars.PATH || ''), sol: ['export PATH=$PATH:/home/student/scripts'] },
      { t: 'Make {{scripts/hello.sh}} executable and run it by its name only.', hint: '{{chmod +x scripts/hello.sh}} then {{hello.sh}}', check: (sh, c, H) => (H.mode(sh, '/home/student/scripts/hello.sh') & 0o100) !== 0 && c.used(/^hello\.sh\b/), sol: ['chmod +x scripts/hello.sh', 'hello.sh'] },
      { t: 'Show the last 5 commands of your history.', hint: '{{history 5}}', check: (sh, c) => c.used(/^history\s+5\b|^history\s*\|\s*tail\s+-(n\s*)?5/), sol: ['history 5'] },
    ],
  };

  /* ---------------- 103.2 ---------------- */
  L['103.2'] = {
    title: 'Process text streams using filters',
    intro: 'Your home directory contains {{fruits.txt}}, {{employees.csv}}, {{access.log}} and {{numbers.txt}}.',
    tasks: [
      { t: 'Show only the first 3 lines of {{employees.csv}}.', hint: '{{head -n 3 employees.csv}}', check: (sh, c) => c.used(/^head\s+(-n\s*3|-3)\s+employees\.csv/), sol: ['head -n 3 employees.csv'] },
      { t: 'Create {{sorted.txt}} containing the lines of {{fruits.txt}} sorted alphabetically and without duplicates.', hint: '{{sort -u fruits.txt > sorted.txt}}', check: (sh, c, H) => { const s = H.read(sh, 'sorted.txt'); const f = H.read(sh, 'fruits.txt'); if (s === null || f === null) return false; const got = s.split('\n').filter(Boolean); const want = new Set(f.split('\n').filter(Boolean)); return got.length === want.size && got.every((l, i) => want.has(l) && (i === 0 || got[i - 1].localeCompare(l) <= 0)); }, sol: ['sort -u fruits.txt > sorted.txt'] },
      { t: 'Count how often each fruit appears and show the list sorted by count, highest first.', hint: '{{sort fruits.txt | uniq -c | sort -rn}}', check: (sh, c) => c.used(/sort.*\|\s*uniq\s+-c\s*\|\s*sort\s+-[a-z]*n/), sol: ['sort fruits.txt | uniq -c | sort -rn'] },
      { t: 'Write the second field (name) of every line of {{employees.csv}} into {{names.txt}} (fields are separated by commas).', hint: '{{cut -d, -f2 employees.csv > names.txt}}', check: (sh, c, H) => { const n = H.read(sh, 'names.txt'); const e = H.read(sh, 'employees.csv'); return n !== null && e !== null && n.trim() === e.trim().split('\n').map((l) => l.split(',')[1]).join('\n'); }, sol: ['cut -d, -f2 employees.csv > names.txt'] },
      { t: 'Display {{numbers.txt}} with line numbers.', hint: '{{nl numbers.txt}} or {{cat -n numbers.txt}}', check: (sh, c) => c.used(/^(nl\b.*numbers\.txt|cat\s+-n\s+numbers\.txt)/), sol: ['nl numbers.txt'] },
      { t: 'Convert {{fruits.txt}} to upper case and save it as {{FRUITS.txt}}.', hint: "{{tr 'a-z' 'A-Z' < fruits.txt > FRUITS.txt}}", check: (sh, c, H) => { const u = H.read(sh, 'FRUITS.txt'); const f = H.read(sh, 'fruits.txt'); return u !== null && f !== null && u === f.toUpperCase(); }, sol: ["tr 'a-z' 'A-Z' < fruits.txt > FRUITS.txt"] },
      { t: 'Compute the SHA-256 checksum of {{fruits.txt}} and store it in {{fruits.sha256}}.', hint: '{{sha256sum fruits.txt > fruits.sha256}}, verify with {{sha256sum -c fruits.sha256}}', check: (sh, c, H) => /^[0-9a-f]{64}\s+fruits\.txt/.test(H.read(sh, 'fruits.sha256') || ''), sol: ['sha256sum fruits.txt > fruits.sha256'] },
    ],
  };

  /* ---------------- 103.3 ---------------- */
  L['103.3'] = {
    title: 'Basic file management',
    intro: 'Create, copy, move, archive and find files.',
    tasks: [
      { t: 'Create the directory tree {{project/src/lib}} with one command.', hint: '{{mkdir -p project/src/lib}}', check: (sh, c, H) => H.isDir(sh, 'project/src/lib'), sol: ['mkdir -p project/src/lib'] },
      { t: 'Copy {{notes.txt}} into {{project/src/}} preserving its timestamps.', hint: '{{cp -p notes.txt project/src/}}', check: (sh, c, H) => { const a = H.node(sh, 'notes.txt'); const b = H.node(sh, 'project/src/notes.txt'); return !!a && !!b && a.mtime === b.mtime; }, sol: ['cp -p notes.txt project/src/'] },
      { t: 'Rename {{project/src/notes.txt}} to {{README}} inside the same directory.', hint: '{{mv project/src/notes.txt project/src/README}}', check: (sh, c, H) => H.isFile(sh, 'project/src/README') && !H.exists(sh, 'project/src/notes.txt'), sol: ['mv project/src/notes.txt project/src/README'] },
      { t: 'Create a gzip-compressed tar archive {{project.tar.gz}} of the directory {{project}}.', hint: '{{tar czf project.tar.gz project}}', check: (sh, c, H) => /^\x1f\x8b|^#!sim:gzip|gzip/.test((H.read(sh, 'project.tar.gz') || '').slice(0, 40)) || (H.isFile(sh, 'project.tar.gz') && c.used(/tar\s+-?c\S*z\S*f?\s+project\.tar\.gz|tar\s+-?czf\s+project\.tar\.gz/)), sol: ['tar czf project.tar.gz project'] },
      { t: 'Delete the directory {{project}} with all its contents.', hint: '{{rm -r project}}', check: (sh, c, H) => !H.exists(sh, 'project') && H.isFile(sh, 'project.tar.gz'), sol: ['rm -r project'] },
      { t: 'Extract the archive again into {{/tmp}}.', hint: '{{tar xzf project.tar.gz -C /tmp}}', check: (sh, c, H) => H.isFile(sh, '/tmp/project/src/README'), sol: ['tar xzf project.tar.gz -C /tmp'] },
      { t: 'Find all files below {{/home/student}} whose name ends in {{.sh}}.', hint: "{{find ~ -name '*.sh'}}", check: (sh, c) => c.used(/^find\s+.*-i?name\s+['"]?\*\.sh/), sol: ["find ~ -name '*.sh'"] },
    ],
  };

  /* ---------------- 103.4 ---------------- */
  L['103.4'] = {
    title: 'Streams, pipes and redirects',
    intro: 'Redirect stdout and stderr, use pipes, {{tee}} and {{xargs}}.',
    tasks: [
      { t: 'Save the output of {{ls -l /etc}} in {{etc.txt}}.', hint: '{{ls -l /etc > etc.txt}}', check: (sh, c, H) => /hosts/.test(H.read(sh, 'etc.txt') || '') && /^total|^[-dl]/m.test(H.read(sh, 'etc.txt') || ''), sol: ['ls -l /etc > etc.txt'] },
      { t: 'Append the current date to {{etc.txt}} without overwriting it.', hint: '{{date >> etc.txt}}', check: (sh, c, H) => /hosts[\s\S]*\d{4}\s*$/.test(H.read(sh, 'etc.txt') || '') && c.used(/>>\s*etc\.txt/), sol: ['date >> etc.txt'] },
      { t: 'Run {{ls /etc /nonexistent}} so that errors go to {{errors.log}} and normal output to the terminal.', hint: '{{ls /etc /nonexistent 2> errors.log}}', check: (sh, c, H) => /nonexistent/.test(H.read(sh, 'errors.log') || ''), sol: ['ls /etc /nonexistent 2> errors.log'] },
      { t: 'Run {{find /etc -name "*.conf"}} and send **both** stdout and stderr to {{all.log}}.', hint: "{{find /etc -name '*.conf' > all.log 2>&1}}", check: (sh, c, H) => /\.conf/.test(H.read(sh, 'all.log') || '') && /Permission denied/.test(H.read(sh, 'all.log') || ''), sol: ["find /etc -name '*.conf' > all.log 2>&1"] },
      { t: 'Show the number of lines of {{/etc/passwd}} on screen **and** save the passwd lines containing "bash" to {{bashusers.txt}} using {{tee}}.', hint: '{{grep bash /etc/passwd | tee bashusers.txt | wc -l}}', check: (sh, c, H) => /student/.test(H.read(sh, 'bashusers.txt') || '') && c.used(/\|\s*tee\s/), sol: ['grep bash /etc/passwd | tee bashusers.txt | wc -l'] },
      { t: 'Use {{xargs}} to create the files listed in {{list.txt}} (it contains a.txt b.txt c.txt).', hint: '{{xargs touch < list.txt}} or {{cat list.txt | xargs touch}}', check: (sh, c, H) => ['a.txt', 'b.txt', 'c.txt'].every((f) => H.isFile(sh, f)) && c.used(/xargs/), sol: ['xargs touch < list.txt'] },
    ],
    setup: (sh) => W(sh, '/home/student/list.txt', 'a.txt\nb.txt\nc.txt\n'),
  };

  /* ---------------- 103.5 ---------------- */
  L['103.5'] = {
    title: 'Create, monitor and kill processes',
    intro: 'Run jobs in the background, inspect them and send signals.',
    tasks: [
      { t: 'Start {{sleep 900}} in the background.', hint: '{{sleep 900 &}}', check: (sh) => jobsLike(sh, /sleep 900/).length > 0, sol: ['sleep 900 &'] },
      { t: 'Start a second background job {{sleep 1200}}, then list your jobs.', hint: '{{sleep 1200 &}} then {{jobs}}', check: (sh, c) => jobsLike(sh, /sleep 1200/).length > 0 && c.used(/^jobs/), sol: ['sleep 1200 &', 'jobs'] },
      { t: 'Find the PID of the {{sleep 900}} process.', hint: '{{pgrep -a sleep}} or {{ps aux | grep sleep}}', check: (sh, c) => c.used(/pgrep|pidof|ps\b.*(\|\s*grep|-C)/), sol: ['pgrep -a sleep'] },
      { t: 'Terminate the {{sleep 900}} job with SIGTERM.', hint: '{{kill %1}} or {{kill PID}}', check: (sh, c) => jobsLike(sh, /sleep 900/).length === 0 && c.used(/sleep 900/) && c.used(/^(kill|pkill|killall)\b/), sol: ['kill %1'] },
      { t: 'Start {{sleep 1500}} in the background with a niceness of 15.', hint: '{{nice -n 15 sleep 1500 &}}', check: (sh) => jobsLike(sh, /sleep 1500/).some((j) => j.ni === 15), sol: ['nice -n 15 sleep 1500 &'] },
      { t: 'Show the system uptime and load average.', hint: '{{uptime}}', check: (sh, c) => c.used(/^(uptime|w)\b/), sol: ['uptime'] },
      { t: 'Kill all remaining {{sleep}} processes with one command.', hint: '{{killall sleep}} or {{pkill sleep}}', check: (sh, c) => jobsLike(sh, /sleep/).length === 0 && c.used(/sleep 1500/) && c.used(/^(pkill|killall)\s+.*sleep/), sol: ['pkill sleep'] },
    ],
  };

  /* ---------------- 103.7 ---------------- */
  L['103.7'] = {
    title: 'Search text with regular expressions',
    intro: 'Use {{grep}}, {{grep -E}} and {{sed}} on {{access.log}}, {{employees.csv}} and {{poem.txt}}.',
    tasks: [
      { t: 'Show all lines of {{access.log}} containing the HTTP status code {{404}}.', hint: "{{grep ' 404 ' access.log}}", check: (sh, c) => c.used(/grep\b.*404.*access\.log/), sol: ["grep ' 404 ' access.log"] },
      { t: 'Count the lines in {{/etc/passwd}} that do **not** end with {{nologin}}.', hint: "{{grep -vc 'nologin$' /etc/passwd}}", check: (sh, c) => c.used(/grep\s+(-vc|-cv|-v\s+-c|-c\s+-v)\s+['"]?nologin\$/) || c.used(/grep\s+-v\s+['"]?nologin\$['"]?\s+\/etc\/passwd\s*\|\s*wc\s+-l/), sol: ["grep -vc 'nologin$' /etc/passwd"] },
      { t: 'Show lines of {{access.log}} that start with an IP address beginning with {{10.}} or {{192.}} (extended regex).', hint: "{{grep -E '^(10|192)\\.' access.log}}", check: (sh, c) => c.used(/(grep\s+-E|egrep)\s+['"]\^\(10\|192\)/), sol: ["grep -E '^(10|192)\\.' access.log"] },
      { t: 'Show all lines of {{poem.txt}} that contain the whole word "the", case-insensitively.', hint: '{{grep -iw the poem.txt}}', check: (sh, c) => c.used(/grep\s+(-iw|-wi|-i\s+-w|-w\s+-i)\s+['"]?the['"]?\s+poem\.txt/), sol: ['grep -iw the poem.txt'] },
      { t: 'Using {{sed}}, replace every "lazy" with "busy" in {{poem.txt}} and write the result to {{poem2.txt}}.', hint: "{{sed 's/lazy/busy/g' poem.txt > poem2.txt}}", check: (sh, c, H) => { const p = H.read(sh, 'poem2.txt'); return p !== null && /busy/.test(p) && !/lazy/.test(p); }, sol: ["sed 's/lazy/busy/g' poem.txt > poem2.txt"] },
      { t: 'Delete all empty lines and comment lines from {{data/config.ini}} and save the result as {{clean.ini}}.', hint: "{{grep -Ev '^(#|;|$)' data/config.ini > clean.ini}} or {{sed '/^#/d;/^$/d'}}", check: (sh, c, H) => { const s = H.read(sh, 'clean.ini'); return s !== null && s.trim() !== '' && !/^\s*$|^\s*[#;]/m.test(s.replace(/\n$/, '')); }, sol: ["grep -Ev '^\\s*([#;]|$)' data/config.ini > clean.ini"] },
    ],
  };

  /* ---------------- 104.1 / 104.2 / 104.3 ---------------- */
  L['104.1'] = {
    title: 'Partitions and filesystems on /dev/sdb',
    intro: 'The second disk {{/dev/sdb}} (20 GiB) is empty. Partition it, create filesystems and swap. All commands need {{sudo}}.',
    tasks: [
      { t: 'List all block devices.', hint: '{{lsblk}}', check: (sh, c) => c.used(/^(sudo\s+)?(lsblk|fdisk\s+-l)/), sol: ['lsblk'] },
      { t: 'Create a GPT partition table on {{/dev/sdb}} with two partitions: 10 GiB and 2 GiB.', hint: '{{sudo parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 10GiB mkpart swap linux-swap 10GiB 12GiB}}', check: (sh, c, H) => H.exists(sh, '/dev/sdb1') && H.exists(sh, '/dev/sdb2'), sol: ['sudo parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 10GiB mkpart swap linux-swap 10GiB 12GiB'] },
      { t: 'Create an **ext4** filesystem with the label {{data}} on {{/dev/sdb1}}.', hint: '{{sudo mkfs.ext4 -L data /dev/sdb1}}', check: (sh) => { const d = sh.fs.devices['/dev/sdb1']; return !!d && d.fstype === 'ext4' && d.label === 'data'; }, sol: ['sudo mkfs.ext4 -L data /dev/sdb1'] },
      { t: 'Initialize {{/dev/sdb2}} as swap space and activate it.', hint: '{{sudo mkswap /dev/sdb2}} and {{sudo swapon /dev/sdb2}}', check: (sh, c) => { const d = sh.fs.devices['/dev/sdb2']; return !!d && d.fstype === 'swap' && c.used(/swapon\s+\/dev\/sdb2/); }, sol: ['sudo mkswap /dev/sdb2', 'sudo swapon /dev/sdb2'] },
      { t: 'Show the UUIDs and types of all filesystems.', hint: '{{sudo blkid}} or {{lsblk -f}}', check: (sh, c) => c.used(/blkid|lsblk\s+-f/), sol: ['sudo blkid'] },
    ],
  };
  L['104.3'] = {
    title: 'Mount filesystems and /etc/fstab',
    intro: 'The partition {{/dev/sdb1}} already contains an ext4 filesystem labelled {{data}}. Mount it temporarily and permanently. Use {{sudo}}.',
    setup: (sh) => {
      sh.pushUser('root', false);
      try {
        sh.vars.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
        sh.capture('parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 10GiB; mkfs.ext4 -L data /dev/sdb1');
      } finally {
        sh.popUser();
      }
    },
    tasks: [
      { t: 'Create the mount point {{/data}}.', hint: '{{sudo mkdir /data}}', check: (sh, c, H) => H.isDir(sh, '/data'), sol: ['sudo mkdir /data'] },
      { t: 'Mount {{/dev/sdb1}} on {{/data}}.', hint: '{{sudo mount /dev/sdb1 /data}}', check: (sh) => sh.fs.mounts.some((m) => m.target === '/data'), sol: ['sudo mount /dev/sdb1 /data'] },
      { t: 'Show the mounted filesystem with its usage in human-readable form.', hint: '{{df -h /data}}', check: (sh, c) => c.used(/^(df\s+-h|findmnt)/), sol: ['df -h /data'] },
      { t: 'Unmount {{/data}} again.', hint: '{{sudo umount /data}}', check: (sh, c) => !sh.fs.mounts.some((m) => m.target === '/data') && c.used(/umount/), sol: ['sudo umount /data'] },
      { t: 'Add a line to {{/etc/fstab}} that mounts the filesystem with **LABEL=data** on {{/data}} as ext4 with default options.', hint: "{{echo 'LABEL=data /data ext4 defaults 0 2' | sudo tee -a /etc/fstab}}", check: (sh, c, H) => /^\s*(LABEL=data|\/dev\/sdb1|UUID=\S+)\s+\/data\s+ext4\s+\S+\s+\d\s+\d/m.test(H.read(sh, '/etc/fstab') || ''), sol: ["echo 'LABEL=data /data ext4 defaults 0 2' | sudo tee -a /etc/fstab"] },
      { t: 'Mount everything from fstab and verify that {{/data}} is mounted.', hint: '{{sudo mount -a}} then {{findmnt /data}}', check: (sh, c) => sh.fs.mounts.some((m) => m.target === '/data') && c.used(/mount\s+-a/), sol: ['sudo mount -a', 'findmnt /data'] },
    ],
  };

  /* ---------------- 104.5 ---------------- */
  L['104.5'] = {
    title: 'Permissions and ownership',
    intro: 'Set modes with octal and symbolic notation, change ownership, use special bits.',
    tasks: [
      { t: 'Give {{scripts/backup.sh}} the permissions {{rwxr-x---}}.', hint: '{{chmod 750 scripts/backup.sh}}', check: (sh, c, H) => H.mode(sh, 'scripts/backup.sh') === 0o750, sol: ['chmod 750 scripts/backup.sh'] },
      { t: 'Remove all permissions for "others" from {{notes.txt}} using symbolic notation.', hint: '{{chmod o= notes.txt}} or {{chmod o-rwx notes.txt}}', check: (sh, c, H) => (H.mode(sh, 'notes.txt') & 0o7) === 0 && c.used(/chmod\s+o[-=]/), sol: ['chmod o-rwx notes.txt'] },
      { t: 'Create the directory {{/srv/share}} owned by **root:developers** with mode {{2770}} (setgid).', hint: '{{sudo mkdir /srv/share}}, {{sudo chown root:developers /srv/share}}, {{sudo chmod 2770 /srv/share}}', check: (sh, c, H) => H.mode(sh, '/srv/share') === 0o2770 && H.owner(sh, '/srv/share') === 'root:developers', sol: ['sudo mkdir -p /srv/share', 'sudo chown root:developers /srv/share', 'sudo chmod 2770 /srv/share'] },
      { t: 'Create {{/srv/drop}} as a world-writable directory with the **sticky bit** (mode {{1777}}).', hint: '{{sudo mkdir /srv/drop}} and {{sudo chmod 1777 /srv/drop}}', check: (sh, c, H) => H.mode(sh, '/srv/drop') === 0o1777, sol: ['sudo mkdir -p /srv/drop', 'sudo chmod 1777 /srv/drop'] },
      { t: 'Set your umask so that new files get {{rw-r-----}} (640).', hint: '{{umask 027}}', check: (sh) => sh.fs.umask === 0o027 || sh.fs.umask === 0o137, sol: ['umask 027'] },
      { t: 'Create {{secret.txt}} and verify its permissions are {{-rw-r-----}}.', hint: '{{touch secret.txt}} then {{ls -l secret.txt}}', check: (sh, c, H) => H.mode(sh, 'secret.txt') === 0o640, sol: ['touch secret.txt', 'ls -l secret.txt'] },
      { t: 'Change the group of {{secret.txt}} to **users** (you are a member of that group).', hint: '{{chgrp users secret.txt}}', check: (sh, c, H) => /:users$/.test(H.owner(sh, 'secret.txt') || ''), sol: ['chgrp users secret.txt'] },
    ],
  };

  /* ---------------- 104.6 ---------------- */
  L['104.6'] = {
    title: 'Hard and symbolic links',
    intro: 'Observe inode numbers and link counts with {{ls -li}}.',
    setup: (sh) => W(sh, '/home/student/orig.txt', 'original content\n'),
    tasks: [
      { t: 'Create a hard link {{orig-hard}} to {{orig.txt}}.', hint: '{{ln orig.txt orig-hard}}', check: (sh, c, H) => H.ino(sh, 'orig-hard') !== null && H.ino(sh, 'orig-hard') === H.ino(sh, 'orig.txt'), sol: ['ln orig.txt orig-hard'] },
      { t: 'Create a symbolic link {{orig-sym}} pointing to {{orig.txt}}.', hint: '{{ln -s orig.txt orig-sym}}', check: (sh, c, H) => H.isLink(sh, 'orig-sym') && /orig\.txt$/.test(H.node(sh, 'orig-sym', false).target), sol: ['ln -s orig.txt orig-sym'] },
      { t: 'Display the inode numbers of all three names.', hint: '{{ls -li orig*}}', check: (sh, c) => c.used(/ls\s+-[a-z]*i/), sol: ['ls -li orig*'] },
      { t: 'Delete {{orig.txt}}. Then show that {{orig-hard}} still has the content but {{orig-sym}} is dangling.', hint: '{{rm orig.txt}}, {{cat orig-hard}}, {{cat orig-sym}}', check: (sh, c, H) => !H.exists(sh, 'orig.txt') && c.used(/cat\s+orig-hard/) && c.used(/cat\s+orig-sym|ls\s+-l/), sol: ['rm orig.txt', 'cat orig-hard', 'cat orig-sym'] },
      { t: 'Create a symbolic link {{~/logs}} pointing to the directory {{/var/log}}.', hint: '{{ln -s /var/log ~/logs}}', check: (sh, c, H) => H.isLink(sh, '/home/student/logs') && H.node(sh, '/home/student/logs', false).target.replace(/\/$/, '') === '/var/log', sol: ['ln -s /var/log ~/logs'] },
    ],
  };

  /* ---------------- 104.7 ---------------- */
  L['104.7'] = {
    title: 'Find system files',
    intro: 'Locate files with {{find}}, {{locate}}, {{which}}, {{whereis}} and {{type}}.',
    tasks: [
      { t: 'Show the full path of the {{passwd}} executable that is run from your PATH.', hint: '{{which passwd}}', check: (sh, c) => c.used(/^(which|type\s+-p|command\s+-v)\s+passwd/), sol: ['which passwd'] },
      { t: 'Find the binary, source and manual page locations of {{ls}}.', hint: '{{whereis ls}}', check: (sh, c) => c.used(/^whereis\s+ls/), sol: ['whereis ls'] },
      { t: 'Update the locate database and search for files named {{fstab}}.', hint: '{{sudo updatedb}} then {{locate fstab}}', check: (sh, c) => c.used(/updatedb/) && c.used(/^(locate|plocate|mlocate)\s+\S*fstab/), sol: ['sudo updatedb', 'locate fstab'] },
      { t: 'Find all files in {{/etc}} larger than 1 KiB that were modified less than 30 days ago.', hint: '{{find /etc -type f -size +1k -mtime -30}}', check: (sh, c) => c.used(/find\s+\/etc\b.*-size\s+\+1k/) && c.used(/-mtime\s+-30/), sol: ['find /etc -type f -size +1k -mtime -30 2>/dev/null'] },
      { t: 'Find all files below your home directory owned by **student** and with the extension {{.txt}}, and list them in long format.', hint: "{{find ~ -user student -name '*.txt' -ls}}", check: (sh, c) => c.used(/find\s+\S+.*-user\s+student/) && c.used(/-name\s+['"]?\*\.txt/), sol: ["find ~ -user student -name '*.txt' -ls"] },
    ],
  };

  /* ---------------- 105.1 ---------------- */
  L['105.1'] = {
    title: 'Customize the shell environment',
    intro: 'Aliases, functions and startup files. Changes to {{~/.bashrc}} only affect *new* shells — use {{source ~/.bashrc}}.',
    tasks: [
      { t: 'Create an alias {{lt}} for {{ls -lt}}.', hint: "{{alias lt='ls -lt'}}", check: (sh) => /^ls -lt\s*$/.test(sh.aliases.lt || ''), sol: ["alias lt='ls -lt'"] },
      { t: 'Make the alias permanent by appending it to {{~/.bashrc}}.', hint: "{{echo \"alias lt='ls -lt'\" >> ~/.bashrc}}", check: (sh, c, H) => /^\s*alias\s+lt=/m.test(H.read(sh, '/home/student/.bashrc') || ''), sol: ["echo \"alias lt='ls -lt'\" >> ~/.bashrc"] },
      { t: 'Define a shell function {{mkcd}} that creates a directory and changes into it, then use it to create {{~/work}}.', hint: '{{mkcd() { mkdir -p "$1" && cd "$1"; }}} then {{mkcd ~/work}}', check: (sh, c, H) => !!sh.funcs.mkcd && H.isDir(sh, '/home/student/work') && sh.cwd === '/home/student/work', sol: ['mkcd() { mkdir -p "$1" && cd "$1"; }', 'mkcd ~/work'] },
      { t: 'Add the environment variable {{EDITOR=nano}} to {{~/.profile}} (exported).', hint: "{{echo 'export EDITOR=nano' >> ~/.profile}}", check: (sh, c, H) => /^\s*export\s+EDITOR=['"]?nano/m.test(H.read(sh, '/home/student/.profile') || ''), sol: ["echo 'export EDITOR=nano' >> ~/.profile"] },
      { t: 'Load {{~/.profile}} into the current shell and check the variable.', hint: '{{source ~/.profile}} then {{echo $EDITOR}}', check: (sh) => sh.vars.EDITOR === 'nano' && sh.exported.has('EDITOR'), sol: ['source ~/.profile', 'echo $EDITOR'] },
      { t: 'Make sure every **new user** gets a file {{welcome.txt}} in the home directory.', hint: "{{echo 'Welcome!' | sudo tee /etc/skel/welcome.txt}}", check: (sh, c, H) => H.isFile(sh, '/etc/skel/welcome.txt'), sol: ["echo 'Welcome!' | sudo tee /etc/skel/welcome.txt"] },
    ],
  };

  /* ---------------- 105.2 ---------------- */
  L['105.2'] = {
    title: 'Write a simple shell script',
    intro: 'Write {{~/check.sh}} with {{nano}}, {{vi}} or a here-document ({{cat > check.sh <<\'EOF\'}} … {{EOF}}).',
    tasks: [
      { t: 'Create the script {{check.sh}} whose first line is the shebang {{#!/bin/bash}}.', hint: "{{cat > check.sh <<'EOF'}} … or {{nano check.sh}}", check: (sh, c, H) => /^#!\s*\/(usr\/)?bin\/(env\s+)?bash/.test(H.read(sh, 'check.sh') || ''), sol: ["printf '#!/bin/bash\\n' > check.sh"] },
      { t: 'The script must print "usage: check.sh FILE" and exit with status **1** if it is called without an argument.', hint: 'Test {{$#}}: {{if [ $# -eq 0 ]; then echo "usage: check.sh FILE"; exit 1; fi}}', check: (sh, c, H) => { const s = H.read(sh, 'check.sh'); return !!s && /\$#|-z\s+"?\$1/.test(s) && /exit\s+1/.test(s); }, sol: ["printf 'if [ $# -eq 0 ]; then\\n  echo \"usage: check.sh FILE\"\\n  exit 1\\nfi\\n' >> check.sh"] },
      { t: 'For an existing regular file it prints "FILE exists" (with the file name), otherwise "FILE missing" and exits with 2.', hint: 'Use {{if [ -f "$1" ]; then … else … exit 2; fi}}', check: (sh, c, H) => { const s = H.read(sh, 'check.sh'); return !!s && /-[fe]\s+"?\$(1|\{1\}|file|f)/.test(s) && /exit\s+2/.test(s); }, sol: ["printf 'if [ -f \"$1\" ]; then\\n  echo \"$1 exists\"\\nelse\\n  echo \"$1 missing\"\\n  exit 2\\nfi\\n' >> check.sh"] },
      { t: 'Make the script executable for its owner.', hint: '{{chmod u+x check.sh}}', check: (sh, c, H) => (H.mode(sh, 'check.sh') & 0o100) !== 0, sol: ['chmod u+x check.sh'] },
      { t: 'Run {{./check.sh notes.txt}} and then display the exit status of the last command.', hint: '{{./check.sh notes.txt; echo $?}}', check: (sh, c) => c.used(/\.\/check\.sh\s+notes\.txt/) && c.used(/echo\s+\$\?/), sol: ['./check.sh notes.txt; echo $?'] },
      { t: 'Run {{./check.sh nothere}} — it must exit with status 2.', hint: '{{./check.sh nothere; echo $?}}', check: (sh, c) => (c.log.some((l) => /^\.\/check\.sh\s+nothere\s*$/.test(l)) && c.status === 2) || c.used(/\.\/check\.sh\s+nothere\s*;\s*echo\s+\$\?/), sol: ['./check.sh nothere; echo $?'] },
      { t: 'Write a {{for}} loop that prints each line of {{data/servers.txt}} prefixed with "host: ".', hint: '{{for h in $(cat data/servers.txt); do echo "host: $h"; done}}', check: (sh, c) => c.used(/^(for\s+\w+\s+in\s+.*servers\.txt|while\s+read)/), sol: ['for h in $(cat data/servers.txt); do echo "host: $h"; done'] },
    ],
  };

  /* ---------------- 107.1 ---------------- */
  L['107.1'] = {
    title: 'Manage users and groups',
    intro: 'Create and modify accounts. All commands need {{sudo}}.',
    tasks: [
      { t: 'Create the group **webteam**.', hint: '{{sudo groupadd webteam}}', check: (sh, c, H) => !!H.group(sh, 'webteam'), sol: ['sudo groupadd webteam'] },
      { t: 'Create the user **dave** with a home directory, the shell {{/bin/bash}} and the comment "Dave Web".', hint: '{{sudo useradd -m -s /bin/bash -c "Dave Web" dave}}', check: (sh, c, H) => { const u = H.user(sh, 'dave'); return !!u && u.shell === '/bin/bash' && /Dave Web/.test(u.gecos) && H.isDir(sh, '/home/dave'); }, sol: ['sudo useradd -m -s /bin/bash -c "Dave Web" dave'] },
      { t: 'Add **dave** to the supplementary group **webteam** (keep other groups).', hint: '{{sudo usermod -aG webteam dave}}', check: (sh, c, H) => H.groupsOf(sh, 'dave').indexOf('webteam') >= 0, sol: ['sudo usermod -aG webteam dave'] },
      { t: 'Set a password for dave.', hint: '{{sudo passwd dave}}', check: (sh, c, H) => /^\$/.test(shadowOf(sh, H, 'dave')[1] || ''), sol: ['sudo passwd dave'] },
      { t: 'Force dave to change the password at the next login and let it expire every 90 days.', hint: '{{sudo chage -d 0 -M 90 dave}}', check: (sh, c, H) => { const s = shadowOf(sh, H, 'dave'); return s[2] === '0' && s[4] === '90'; }, sol: ['sudo chage -d 0 -M 90 dave'] },
      { t: 'Lock the password of **alice** (bob is already locked — check with {{sudo passwd -S bob}}).', hint: '{{sudo usermod -L alice}} or {{sudo passwd -l alice}}', check: (sh, c, H) => /^!/.test(shadowOf(sh, H, 'alice')[1] || ''), sol: ['sudo usermod -L alice'] },
      { t: 'Show the identity (UID, GID, groups) of dave.', hint: '{{id dave}}', check: (sh, c) => c.used(/^(id|groups)\s+dave/), sol: ['id dave'] },
    ],
  };

  /* ---------------- 107.2 ---------------- */
  L['107.2'] = {
    title: 'Schedule jobs',
    intro: 'Use {{crontab}}, {{at}} and systemd timers.',
    tasks: [
      { t: 'Add a personal cron job that runs {{/home/student/scripts/backup.sh}} every day at 02:30.', hint: '{{crontab -e}} and add {{30 2 * * * /home/student/scripts/backup.sh}} — or {{echo "30 2 * * * /home/student/scripts/backup.sh" | crontab -}}', check: (sh, c, H) => /^\s*30\s+0?2\s+\*\s+\*\s+\*\s+\S*backup\.sh/m.test(H.read(sh, '/var/spool/cron/crontabs/student') || ''), sol: ['echo "30 2 * * * /home/student/scripts/backup.sh" | crontab -'] },
      { t: 'List your crontab.', hint: '{{crontab -l}}', check: (sh, c) => c.used(/^crontab\s+-l/), sol: ['crontab -l'] },
      { t: 'Create a system-wide cron file {{/etc/cron.d/cleanup}} that runs {{/usr/bin/find /tmp -mtime +7 -delete}} as **root** every Sunday at 04:00.', hint: "{{echo '0 4 * * 0 root /usr/bin/find /tmp -mtime +7 -delete' | sudo tee /etc/cron.d/cleanup}}", check: (sh, c, H) => /^\s*0\s+0?4\s+\*\s+\*\s+(0|7|sun)\s+root\s+\S*find/im.test(H.read(sh, '/etc/cron.d/cleanup') || ''), sol: ["echo '0 4 * * 0 root /usr/bin/find /tmp -mtime +7 -delete' | sudo tee /etc/cron.d/cleanup"] },
      { t: 'Schedule the command {{touch /tmp/at-was-here}} with {{at}} to run in 10 minutes.', hint: "{{echo 'touch /tmp/at-was-here' | at now + 10 minutes}}", check: (sh) => (sh.state.atJobs || []).some((j) => /at-was-here/.test(j.cmd)), sol: ["echo 'touch /tmp/at-was-here' | at now + 10 minutes"] },
      { t: 'List your pending at jobs, then remove that job.', hint: '{{atq}} then {{atrm NUMBER}}', check: (sh, c) => c.used(/^(atq|at\s+-l)/) && !(sh.state.atJobs || []).some((j) => /at-was-here/.test(j.cmd)) && c.used(/atrm|at\s+-[dr]/), sol: ['atq', 'atrm $(atq | cut -f1)'] },
      { t: 'List all systemd timers.', hint: '{{systemctl list-timers}}', check: (sh, c) => c.used(/systemctl\s+list-timers/), sol: ['systemctl list-timers'] },
    ],
  };

  /* ---------------- 107.3 ---------------- */
  L['107.3'] = {
    title: 'Localisation and time zones',
    intro: 'Inspect and change locale and time zone settings.',
    tasks: [
      { t: 'Show the current locale settings.', hint: '{{locale}}', check: (sh, c) => c.used(/^locale\s*$|^localectl\s*(status)?\s*$/), sol: ['locale'] },
      { t: 'Run {{date}} once with the locale {{de_DE.UTF-8}} without changing your settings.', hint: '{{LANG=de_DE.UTF-8 date}}', check: (sh, c) => c.used(/^(LANG|LC_ALL|LC_TIME)=de_DE\S*\s+date/), sol: ['LANG=de_DE.UTF-8 date'] },
      { t: 'Show the time in Tokyo using the {{TZ}} variable.', hint: '{{TZ=Asia/Tokyo date}}', check: (sh, c) => c.used(/^TZ=['"]?Asia\/Tokyo['"]?\s+date/), sol: ['TZ=Asia/Tokyo date'] },
      { t: 'Change the system time zone to **Europe/Vienna**.', hint: '{{sudo timedatectl set-timezone Europe/Vienna}}', check: (sh, c, H) => /Europe\/Vienna$/.test((H.node(sh, '/etc/localtime', false) || {}).target || '') || sh.state.timezone === 'Europe/Vienna', sol: ['sudo timedatectl set-timezone Europe/Vienna'] },
      { t: 'Convert the file {{latin1.txt}} from ISO-8859-1 to UTF-8 and save it as {{utf8.txt}}.', hint: '{{iconv -f ISO-8859-1 -t UTF-8 latin1.txt > utf8.txt}}', check: (sh, c, H) => H.isFile(sh, 'utf8.txt') && c.used(/iconv\s+-f\s+(ISO-?8859-?1|LATIN1)\s+-t\s+UTF-?8/i), sol: ['iconv -f ISO-8859-1 -t UTF-8 latin1.txt > utf8.txt'] },
    ],
    setup: (sh) => W(sh, '/home/student/latin1.txt', 'Grüße aus München\n'),
  };

  /* ---------------- 108.2 ---------------- */
  L['108.2'] = {
    title: 'Logging with rsyslog and journald',
    intro: 'Write and query log messages, configure logrotate and journald.',
    tasks: [
      { t: 'Write the message "lab test" with facility **local0** and priority **warning** to syslog, with the tag {{lab}}.', hint: '{{logger -p local0.warning -t lab "lab test"}}', check: (sh, c, H) => /lab: lab test/.test(H.read(sh, '/var/log/syslog') || ''), sol: ['logger -p local0.warning -t lab "lab test"'] },
      { t: 'Show the last 5 lines of {{/var/log/syslog}}.', hint: '{{tail -n 5 /var/log/syslog}}', check: (sh, c) => c.used(/tail\s+(-n\s*5|-5)\s+\/var\/log\/syslog/), sol: ['tail -n 5 /var/log/syslog'] },
      { t: 'Show all journal entries of the **ssh** service.', hint: '{{journalctl -u ssh}}', check: (sh, c) => c.used(/journalctl\s+.*(-u\s*|--unit[= ])ssh/), sol: ['sudo journalctl -u ssh'] },
      { t: 'Show only journal messages of priority **err** and higher from the current boot.', hint: '{{journalctl -p err -b}}', check: (sh, c) => c.used(/journalctl\b.*-p\s*(err|3)/) && c.used(/journalctl\b.*-b/), sol: ['sudo journalctl -p err -b'] },
      { t: 'Make the journal persistent: create {{/var/log/journal}} and set {{Storage=persistent}} in {{/etc/systemd/journald.conf}}.', hint: "{{sudo mkdir -p /var/log/journal}} and {{sudo sed -i 's/^#\\?Storage=.*/Storage=persistent/' /etc/systemd/journald.conf}}", check: (sh, c, H) => H.isDir(sh, '/var/log/journal') && /^Storage=persistent/m.test(H.read(sh, '/etc/systemd/journald.conf') || ''), sol: ['sudo mkdir -p /var/log/journal', "sudo sed -i 's/^#\\?Storage=.*/Storage=persistent/' /etc/systemd/journald.conf"] },
      { t: 'Create {{/etc/logrotate.d/lab}} that rotates {{/var/log/lab.log}} **daily**, keeps **7** files and compresses them.', hint: "{{printf '/var/log/lab.log {\\n daily\\n rotate 7\\n compress\\n}\\n' | sudo tee /etc/logrotate.d/lab}}", check: (sh, c, H) => { const s = H.read(sh, '/etc/logrotate.d/lab') || ''; return /\/var\/log\/lab\.log/.test(s) && /^\s*daily/m.test(s) && /^\s*rotate\s+7/m.test(s) && /^\s*compress/m.test(s); }, sol: ["printf '/var/log/lab.log {\\n daily\\n rotate 7\\n compress\\n}\\n' | sudo tee /etc/logrotate.d/lab"] },
    ],
  };

  /* ---------------- 108.3 ---------------- */
  L['108.3'] = {
    title: 'Mail aliases and forwarding',
    intro: 'Configure aliases and forwarding on a host running Postfix.',
    tasks: [
      { t: 'Add an alias so that mail for **helpdesk** is delivered to **alice** and **bob**.', hint: "{{echo 'helpdesk: alice, bob' | sudo tee -a /etc/aliases}}", check: (sh, c, H) => /^helpdesk:\s*(alice\s*,\s*bob|bob\s*,\s*alice)\s*$/m.test(H.read(sh, '/etc/aliases') || ''), sol: ["echo 'helpdesk: alice, bob' | sudo tee -a /etc/aliases"] },
      { t: 'Rebuild the alias database.', hint: '{{sudo newaliases}}', check: (sh, c) => c.used(/newaliases|sendmail\s+-bi/), sol: ['sudo newaliases'] },
      { t: 'Forward your own mail to {{student@example.org}} while keeping a local copy.', hint: "{{echo '\\student, student@example.org' > ~/.forward}}", check: (sh, c, H) => { const s = H.read(sh, '/home/student/.forward') || ''; return /student@example\.org/.test(s) && /\\student/.test(s); }, sol: ["echo '\\student, student@example.org' > ~/.forward"] },
      { t: 'Send a mail with the subject "Test" to root.', hint: '{{echo "hello" | mail -s Test root}}', check: (sh, c) => c.used(/mailx?\s+-s\s+['"]?Test['"]?\s+root/), sol: ['echo "hello" | mail -s Test root'] },
      { t: 'Show the mail queue.', hint: '{{mailq}}', check: (sh, c) => c.used(/^(sudo\s+)?(mailq|sendmail\s+-bp|postqueue\s+-p)/), sol: ['mailq'] },
    ],
  };

  /* ---------------- 108.4 ---------------- */
  L['108.4'] = {
    title: 'Printing with CUPS',
    intro: 'Two queues exist: {{office-laser}} (default) and {{pdf}}.',
    tasks: [
      { t: 'Show the complete status of the printing system.', hint: '{{lpstat -t}}', check: (sh, c) => c.used(/lpstat\s+-t/), sol: ['lpstat -t'] },
      { t: 'Print {{notes.txt}} on the queue **pdf**.', hint: '{{lpr -P pdf notes.txt}} or {{lp -d pdf notes.txt}}', check: (sh, c) => c.used(/(lpr\s+-P\s*pdf|lp\s+-d\s*pdf)\s+.*notes\.txt|(lpr|lp)\s+notes\.txt\s+-(P|d)\s*pdf/), sol: ['lpr -P pdf notes.txt'] },
      { t: 'Show the jobs waiting in the **pdf** queue.', hint: '{{lpq -P pdf}}', check: (sh, c) => c.used(/lpq\s+-P\s*pdf|lpstat\s+-o\s*pdf/), sol: ['lpq -P pdf'] },
      { t: 'Remove all your print jobs.', hint: '{{lprm -}} or {{cancel -a}}', check: (sh, c) => c.used(/lprm\s+-(\s|$)|lprm\s+-P\s*pdf\s+-|cancel\s+-a/), sol: ['lprm -P pdf -'] },
      { t: 'Stop the queue **office-laser** from printing (jobs are still accepted).', hint: '{{sudo cupsdisable office-laser}}', check: (sh, c) => c.used(/cupsdisable\s+.*office-laser/), sol: ['sudo cupsdisable office-laser'] },
    ],
  };

  /* ---------------- 109.2 / 109.3 / 109.4 ---------------- */
  L['109.3'] = {
    title: 'Configure and troubleshoot the network',
    intro: 'Interface {{enp0s8}} is down and unconfigured. Configure it with iproute2 and test connectivity. Use {{sudo}} for changes.',
    tasks: [
      { t: 'Show all interfaces and their addresses in brief form.', hint: '{{ip -br addr}}', check: (sh, c) => c.used(/^ip\s+(-br\s+)?a(ddr(ess)?)?\b/), sol: ['ip -br addr'] },
      { t: 'Assign the address {{10.0.0.5/24}} to {{enp0s8}}.', hint: '{{sudo ip addr add 10.0.0.5/24 dev enp0s8}}', check: (sh, c) => c.used(/ip\s+a(ddr(ess)?)?\s+add\s+10\.0\.0\.5\/24\s+dev\s+enp0s8/), sol: ['sudo ip addr add 10.0.0.5/24 dev enp0s8'] },
      { t: 'Bring {{enp0s8}} up.', hint: '{{sudo ip link set enp0s8 up}}', check: (sh, c) => c.used(/ip\s+l(ink)?\s+set\s+(dev\s+)?enp0s8\s+up/), sol: ['sudo ip link set enp0s8 up'] },
      { t: 'Add a route to the network {{10.1.0.0/16}} via the gateway {{10.0.0.1}}.', hint: '{{sudo ip route add 10.1.0.0/16 via 10.0.0.1}}', check: (sh, c) => c.used(/ip\s+r(oute)?\s+add\s+10\.1\.0\.0\/16\s+via\s+10\.0\.0\.1/), sol: ['sudo ip route add 10.1.0.0/16 via 10.0.0.1'] },
      { t: 'Test whether the default gateway {{192.168.56.1}} answers to exactly 3 pings.', hint: '{{ping -c 3 192.168.56.1}}', check: (sh, c) => c.used(/ping\s+-c\s*3\s+192\.168\.56\.1/), sol: ['ping -c 3 192.168.56.1'] },
      { t: 'Show which TCP ports are listening on this host (numeric).', hint: '{{ss -tln}}', check: (sh, c) => c.used(/^(sudo\s+)?(ss|netstat)\s+-[a-z]*l/), sol: ['ss -tln'] },
      { t: 'Check whether TCP port 22 on {{fileserver}} is open using netcat.', hint: '{{nc -zv fileserver 22}}', check: (sh, c) => c.used(/(nc|netcat)\s+-[a-z]*z[a-z]*\s+.*fileserver\s+22/), sol: ['nc -zv fileserver 22'] },
      { t: 'Trace the route to {{8.8.8.8}}.', hint: '{{traceroute 8.8.8.8}} or {{tracepath 8.8.8.8}}', check: (sh, c) => c.used(/(traceroute|tracepath)\s+(-n\s+)?8\.8\.8\.8/), sol: ['tracepath 8.8.8.8'] },
    ],
  };
  L['109.4'] = {
    title: 'Client side DNS',
    intro: 'Query DNS and configure local name resolution.',
    tasks: [
      { t: 'Query the A record of {{example.com}} with {{dig}}, short output only.', hint: '{{dig +short example.com}}', check: (sh, c) => c.used(/dig\s+(.*\+short.*example\.com|example\.com.*\+short)/), sol: ['dig +short example.com'] },
      { t: 'Ask the server {{1.1.1.1}} directly for the MX records of {{example.com}}.', hint: '{{dig @1.1.1.1 example.com MX}}', check: (sh, c) => c.used(/dig\s+.*@1\.1\.1\.1.*MX|host\s+-t\s+MX\s+example\.com\s+1\.1\.1\.1/i), sol: ['dig @1.1.1.1 example.com MX'] },
      { t: 'Add {{192.168.56.30 intranet.example.com intranet}} to {{/etc/hosts}}.', hint: "{{echo '192.168.56.30 intranet.example.com intranet' | sudo tee -a /etc/hosts}}", check: (sh, c, H) => /^192\.168\.56\.30\s+intranet\.example\.com\s+intranet\b/m.test(H.read(sh, '/etc/hosts') || ''), sol: ["echo '192.168.56.30 intranet.example.com intranet' | sudo tee -a /etc/hosts"] },
      { t: 'Resolve {{intranet}} the way applications do (using nsswitch.conf).', hint: '{{getent hosts intranet}}', check: (sh, c) => c.used(/getent\s+a?hosts\s+intranet/), sol: ['getent hosts intranet'] },
      { t: 'Show which sources are used for host name lookups and in which order.', hint: '{{grep hosts /etc/nsswitch.conf}}', check: (sh, c) => c.used(/(grep|cat|less|more).*\/etc\/nsswitch\.conf/), sol: ['grep hosts /etc/nsswitch.conf'] },
      { t: 'Add {{lab.example.com}} to the DNS search list in {{/etc/resolv.conf}}.', hint: "{{sudo sed -i 's/^search .*/& lab.example.com/' /etc/resolv.conf}}", check: (sh, c, H) => /^search\b.*\blab\.example\.com\b/m.test(H.read(sh, '/etc/resolv.conf') || ''), sol: ["sudo sed -i 's/^search .*/& lab.example.com/' /etc/resolv.conf"] },
    ],
  };
  L['109.2'] = {
    title: 'Persistent network configuration',
    intro: 'Set the host name and create a NetworkManager profile.',
    tasks: [
      { t: 'Set the static host name to **web01** permanently.', hint: '{{sudo hostnamectl set-hostname web01}}', check: (sh, c, H) => /^web01\s*$/.test(H.read(sh, '/etc/hostname') || '') , sol: ['sudo hostnamectl set-hostname web01'] },
      { t: 'List the NetworkManager devices and connections.', hint: '{{nmcli device status}} and {{nmcli connection show}}', check: (sh, c) => c.used(/nmcli\s+d(ev(ice)?)?(\s|$)/) && c.used(/nmcli\s+c(on(nection)?)?(\s|$)/), sol: ['nmcli device status', 'nmcli connection show'] },
      { t: 'Create a connection **lab** for {{enp0s8}} with the static address {{10.0.0.5/24}} and gateway {{10.0.0.1}}.', hint: '{{sudo nmcli con add type ethernet ifname enp0s8 con-name lab ipv4.method manual ipv4.addresses 10.0.0.5/24 ipv4.gateway 10.0.0.1}}', check: (sh, c) => c.used(/nmcli\s+c(on(nection)?)?\s+add\b.*con-name\s+lab\b/) && c.used(/ipv4\.addresses\s+10\.0\.0\.5\/24/), sol: ['sudo nmcli con add type ethernet ifname enp0s8 con-name lab ipv4.method manual ipv4.addresses 10.0.0.5/24 ipv4.gateway 10.0.0.1'] },
      { t: 'Activate the connection **lab**.', hint: '{{sudo nmcli con up lab}}', check: (sh, c) => c.used(/nmcli\s+c(on(nection)?)?\s+up\s+(id\s+)?lab/), sol: ['sudo nmcli con up lab'] },
      { t: 'Show the DNS servers configured for the system.', hint: '{{cat /etc/resolv.conf}} or {{resolvectl status}}', check: (sh, c) => c.used(/\/etc\/resolv\.conf|resolvectl|nmcli\s+dev(ice)?\s+show/), sol: ['cat /etc/resolv.conf'] },
    ],
  };

  /* ---------------- 110.1 ---------------- */
  L['110.1'] = {
    title: 'Security administration',
    intro: 'Audit SUID files, logins, open ports and sudo rights.',
    tasks: [
      { t: 'Find all SUID files on the system (hide error messages).', hint: '{{find / -perm -4000 -type f 2>/dev/null}}', check: (sh, c) => c.used(/find\s+\/\s+.*-perm\s+(-|\/)?(4000|u[+=]s)/), sol: ['find / -perm -4000 -type f 2>/dev/null'] },
      { t: 'Show who is logged in and what they are doing.', hint: '{{w}}', check: (sh, c) => c.used(/^w(\s|$)/), sol: ['w'] },
      { t: 'Show the last logins of **alice** and the failed login attempts.', hint: '{{last alice}} and {{sudo lastb}}', check: (sh, c) => c.used(/^last\s+.*alice/) && c.used(/lastb/), sol: ['last alice', 'sudo lastb'] },
      { t: 'Show which process listens on TCP port 22.', hint: '{{sudo lsof -i :22}} or {{sudo ss -tlpn}} or {{sudo fuser -v 22/tcp}}', check: (sh, c) => c.used(/^sudo\s+(lsof\s+-i\s*(tcp)?:22|ss\s+-[a-z]*p|netstat\s+-[a-z]*p|fuser\s+.*22\/tcp)/i), sol: ['sudo lsof -i :22'] },
      { t: 'Allow **alice** to restart the ssh service via sudo: create {{/etc/sudoers.d/alice}} with {{alice ALL=(root) /usr/bin/systemctl restart ssh}}.', hint: "{{echo 'alice ALL=(root) /usr/bin/systemctl restart ssh' | sudo tee /etc/sudoers.d/alice}} (in real life: {{sudo visudo -f /etc/sudoers.d/alice}})", check: (sh, c, H) => /^alice\s+ALL\s*=\s*\(root\)\s*\/usr\/bin\/systemctl restart ssh/m.test(H.read(sh, '/etc/sudoers.d/alice') || ''), sol: ["echo 'alice ALL=(root) /usr/bin/systemctl restart ssh' | sudo tee /etc/sudoers.d/alice"] },
      { t: 'Limit the number of open files of your current shell to **512**.', hint: '{{ulimit -n 512}}', check: (sh, c) => c.used(/ulimit\s+(-S\s+|-H\s+)?-n\s*512|ulimit\s+-[SH]?n\s*512/), sol: ['ulimit -n 512'] },
      { t: 'Set a hard limit of 20 processes for the group **students** in {{/etc/security/limits.conf}}.', hint: "{{echo '@students hard nproc 20' | sudo tee -a /etc/security/limits.conf}}", check: (sh, c, H) => /^@students\s+hard\s+nproc\s+20\s*$/m.test(H.read(sh, '/etc/security/limits.conf') || ''), sol: ["echo '@students hard nproc 20' | sudo tee -a /etc/security/limits.conf"] },
    ],
  };

  /* ---------------- 110.2 ---------------- */
  L['110.2'] = {
    title: 'Host security',
    intro: 'Shadow passwords, nologin, unneeded services and TCP wrappers.',
    tasks: [
      { t: 'Show the permissions of {{/etc/passwd}} and {{/etc/shadow}}.', hint: '{{ls -l /etc/passwd /etc/shadow}}', check: (sh, c) => c.used(/ls\s+-[a-z]*l.*\/etc\/(passwd|shadow)/), sol: ['ls -l /etc/passwd /etc/shadow'] },
      { t: 'Prevent non-root logins during maintenance by creating {{/etc/nologin}} with a message.', hint: "{{echo 'Maintenance until 18:00' | sudo tee /etc/nologin}}", check: (sh, c, H) => H.isFile(sh, '/etc/nologin'), sol: ["echo 'Maintenance until 18:00' | sudo tee /etc/nologin"] },
      { t: 'Give the user **bob** the shell {{/usr/sbin/nologin}}.', hint: '{{sudo usermod -s /usr/sbin/nologin bob}}', check: (sh, c, H) => /nologin$/.test((H.user(sh, 'bob') || {}).shell || ''), sol: ['sudo usermod -s /usr/sbin/nologin bob'] },
      { t: 'The printing service is not needed: stop and disable **cups** (service and socket).', hint: '{{sudo systemctl disable --now cups.service cups.socket}}', check: (sh) => !sh.state.services.cups.active && !sh.state.services.cups.enabled && !sh.state.services['cups.socket'].enabled, sol: ['sudo systemctl disable --now cups.service cups.socket'] },
      { t: 'TCP wrappers: {{/etc/hosts.allow}} already allows sshd from 192.168.56.0/24. Additionally allow sshd from the network **10.0.0.0/8** …', hint: "{{echo 'sshd: 10.' | sudo tee -a /etc/hosts.allow}}", check: (sh, c, H) => /^sshd\s*:.*(\s|,)10\.(0\.0\.0\/(8|255\.0\.0\.0))?(\s|,|$)/m.test(H.read(sh, '/etc/hosts.allow') || ''), sol: ["echo 'sshd: 10.' | sudo tee -a /etc/hosts.allow"] },
      { t: '… and deny everything else in {{/etc/hosts.deny}}.', hint: "{{echo 'ALL: ALL' | sudo tee -a /etc/hosts.deny}}", check: (sh, c, H) => /^ALL\s*:\s*ALL\s*$/m.test(H.read(sh, '/etc/hosts.deny') || ''), sol: ["echo 'ALL: ALL' | sudo tee -a /etc/hosts.deny"] },
      { t: 'Turn off the xinetd telnet service: make sure {{/etc/xinetd.d/telnet}} contains {{disable = yes}}.', hint: '{{grep disable /etc/xinetd.d/telnet}} — it is already off. Check it!', check: (sh, c, H) => /disable\s*=\s*yes/.test(H.read(sh, '/etc/xinetd.d/telnet') || '') && c.used(/xinetd\.d\/telnet/), sol: ['grep disable /etc/xinetd.d/telnet'] },
    ],
  };

  /* ---------------- 110.3 ---------------- */
  L['110.3'] = {
    title: 'SSH keys and GnuPG',
    intro: 'Create and use SSH keys, then encrypt and sign files with gpg.',
    tasks: [
      { t: 'Generate an **Ed25519** SSH key pair (default location).', hint: '{{ssh-keygen -t ed25519}}', check: (sh, c, H) => H.isFile(sh, '/home/student/.ssh/id_ed25519') && H.isFile(sh, '/home/student/.ssh/id_ed25519.pub'), sol: ['ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519'] },
      { t: 'Check that the private key has mode 600.', hint: '{{ls -l ~/.ssh}}', check: (sh, c, H) => H.mode(sh, '/home/student/.ssh/id_ed25519') === 0o600 && c.used(/ls\s+-[a-z]*l.*\.ssh/), sol: ['ls -l ~/.ssh'] },
      { t: 'Start an ssh-agent and add your key to it.', hint: '{{eval $(ssh-agent)}} then {{ssh-add}}', check: (sh, c) => !!sh.vars.SSH_AUTH_SOCK && c.used(/^ssh-add/), sol: ['eval $(ssh-agent)', 'ssh-add'] },
      { t: 'Install your public key for **alice** on {{fileserver}}.', hint: '{{ssh-copy-id alice@fileserver}}', check: (sh, c) => c.used(/ssh-copy-id\s+(-i\s+\S+\s+)?alice@fileserver/), sol: ['ssh-copy-id alice@fileserver'] },
      { t: 'Open a tunnel: local port 8080 → port 80 on {{fileserver}}.', hint: '{{ssh -L 8080:localhost:80 fileserver}}', check: (sh, c) => c.used(/ssh\s+.*-L\s*8080:[\w.]+:80\b/), sol: ['ssh -L 8080:localhost:80 fileserver'] },
      { t: 'Create a GnuPG key pair for "Student <student@example.org>".', hint: '{{gpg --quick-gen-key "Student <student@example.org>"}}', check: (sh, c, H) => H.isDir(sh, '/home/student/.gnupg') && c.used(/gpg\s+.*--(quick-)?(gen|generate)-key|gpg\s+--full-generate-key/), sol: ['gpg --quick-gen-key "Student <student@example.org>"'] },
      { t: 'Encrypt {{notes.txt}} for the recipient **student** (→ {{notes.txt.gpg}}).', hint: '{{gpg -e -r student notes.txt}}', check: (sh, c, H) => H.isFile(sh, 'notes.txt.gpg') && c.used(/gpg\s+.*(-e|--encrypt)/), sol: ['gpg -e -r student notes.txt'] },
      { t: 'Create a detached signature for {{notes.txt}} and verify it.', hint: '{{gpg --detach-sign notes.txt}} then {{gpg --verify notes.txt.sig notes.txt}}', check: (sh, c, H) => H.isFile(sh, 'notes.txt.sig') && c.used(/gpg\s+--verify/), sol: ['gpg --detach-sign notes.txt', 'gpg --verify notes.txt.sig notes.txt'] },
    ],
  };
})();
