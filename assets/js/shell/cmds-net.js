/* LPIC-1 Trainer — networking, packages, security, mail, printing, X11. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const C = (SIM.cmds = SIM.cmds || {});
  const getopt = SIM.getopt;
  const note = (s) => SIM.note(s);
  const asRoot = (sh, fn) => SIM.asRoot(sh, fn);
  const needRoot = (c, m) => SIM.needRoot(c, m);
  const sbin = (...n) => n.forEach((x) => SIM.sbin.add(x));

  /* ================= name resolution ================= */
  SIM.resolve = function (sh, name) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return { ip: name, name };
    if (/^[0-9a-f:]+$/i.test(name) && name.indexOf(':') >= 0) return { ip: name, name, v6: true };
    const hosts = sh.fs.readFile('/etc/hosts', '/');
    for (const l of hosts.split('\n')) {
      const t = l.replace(/#.*/, '').trim().split(/\s+/);
      if (t.length > 1 && t.slice(1).indexOf(name) >= 0) return { ip: t[0], name: t[1], src: 'hosts' };
    }
    const n = name.replace(/\.$/, '');
    const d = sh.state.dns[n] || sh.state.dns[n + '.example.com'];
    if (d) return { ip: d.find((x) => x.indexOf(':') < 0) || d[0], v6ip: d.find((x) => x.indexOf(':') >= 0), name: n, src: 'dns', all: d };
    return null;
  };
  const reverse = (sh, ip) => {
    for (const l of sh.fs.readFile('/etc/hosts', '/').split('\n')) {
      const t = l.replace(/#.*/, '').trim().split(/\s+/);
      if (t[0] === ip) return t[1];
    }
    for (const [k, v] of Object.entries(sh.state.dns)) if (v.indexOf(ip) >= 0) return k;
    return null;
  };
  const reachable = (ip) => /^(127\.|192\.168\.56\.|10\.0\.0\.|93\.184|65\.39|151\.101|139\.178|142\.250|1\.1\.1\.1|8\.8\.|::1|fe80|2606|2a00|162\.159)/.test(ip);

  /* ================= ip / ifconfig / route ================= */
  function linkLine(l, i) {
    const flags = l.name === 'lo' ? 'LOOPBACK,UP,LOWER_UP' : l.state === 'UP' ? 'BROADCAST,MULTICAST,UP,LOWER_UP' : 'BROADCAST,MULTICAST';
    return `${i + 1}: ${l.name}: <${flags}> mtu ${l.mtu} qdisc ${l.name === 'lo' ? 'noqueue' : 'fq_codel'} state ${l.state} group default qlen 1000\n    link/${l.name === 'lo' ? 'loopback' : 'ether'} ${l.mac} brd ${l.name === 'lo' ? '00:00:00:00:00:00' : 'ff:ff:ff:ff:ff:ff'}\n`;
  }
  const bcast = (cidr) => {
    const [ip, len] = cidr.split('/');
    const n = ip.split('.').reduce((a, b) => (a << 8) + +b, 0) >>> 0;
    const mask = len === '0' ? 0 : (0xffffffff << (32 - +len)) >>> 0;
    const b = (n | ~mask) >>> 0;
    return [b >>> 24, (b >> 16) & 255, (b >> 8) & 255, b & 255].join('.');
  };
  const netmask = (len) => {
    const m = len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0;
    return [m >>> 24, (m >> 16) & 255, (m >> 8) & 255, m & 255].join('.');
  };
  C.ip = (c) => {
    const sh = c.sh;
    let args = c.args.slice();
    let fam = null;
    let brief = false;
    let stats = false;
    while (args[0] && args[0].startsWith('-')) {
      const a = args.shift();
      if (a === '-4') fam = 4;
      else if (a === '-6') fam = 6;
      else if (a === '-br' || a === '-brief') brief = true;
      else if (a === '-s') stats = true;
      else if (a === '-c' || a === '-color') {
        /* */
      }
    }
    const obj = args.shift() || 'help';
    const cmd = args.shift() || 'show';
    const net = sh.state.ip;
    const devArg = () => {
      const i = args.indexOf('dev');
      return i >= 0 ? args[i + 1] : args.find((a) => net.links.some((l) => l.name === a));
    };
    const findLink = (n) => net.links.find((l) => l.name === n);
    if (/^(a|addr|address)$/.test(obj)) {
      if (cmd === 'add' || cmd === 'del' || cmd === 'delete' || cmd === 'flush') {
        if (needRoot(c, 'RTNETLINK answers: Operation not permitted')) return 2;
        const l = findLink(devArg());
        if (!l) return c.fail(`Cannot find device "${devArg()}"`, 1);
        if (cmd === 'flush') {
          l.v4 = [];
          return 0;
        }
        const addr = args[0];
        const v6 = addr.indexOf(':') >= 0;
        const list = v6 ? l.v6 : l.v4;
        if (cmd === 'add') {
          if (list.indexOf(addr) >= 0) return c.fail('RTNETLINK answers: File exists', 2);
          list.push(addr.indexOf('/') < 0 ? addr + (v6 ? '/128' : '/32') : addr);
          if (!v6) {
            const [ip, len] = addr.split('/');
            const n = ip.split('.').map(Number);
            const m = netmask(+(len || 32)).split('.').map(Number);
            const netw = n.map((x, i) => x & m[i]).join('.') + '/' + (len || 32);
            if (!net.routes.some((r) => r.dst === netw)) net.routes.push({ dst: netw, dev: l.name, proto: 'kernel', scope: 'link', src: ip });
          }
        } else {
          const i = list.findIndex((a) => a === addr || a.split('/')[0] === addr.split('/')[0]);
          if (i < 0) return c.fail('RTNETLINK answers: Cannot assign requested address', 2);
          list.splice(i, 1);
        }
        return 0;
      }
      const only = devArg();
      net.links.forEach((l, i) => {
        if (only && l.name !== only) return;
        if (brief) {
          c.out(`${l.name.padEnd(16)} ${l.state.padEnd(14)} ${[...(fam !== 6 ? l.v4 : []), ...(fam !== 4 ? l.v6 : [])].join(' ')} \n`);
          return;
        }
        c.out(linkLine(l, i));
        if (fam !== 6) for (const a of l.v4) c.out(`    inet ${a}${l.name === 'lo' ? '' : ' brd ' + bcast(a)} scope ${l.name === 'lo' ? 'host' : 'global'} ${l.name === 'lo' ? 'lo' : 'noprefixroute ' + l.name}\n       valid_lft forever preferred_lft forever\n`);
        if (fam !== 4) for (const a of l.v6) c.out(`    inet6 ${a} scope ${a === '::1/128' ? 'host' : /^fe80/.test(a) ? 'link' : 'global'} ${a === '::1/128' ? '' : 'noprefixroute'}\n       valid_lft forever preferred_lft forever\n`);
      });
      return 0;
    }
    if (/^(l|link)$/.test(obj)) {
      if (cmd === 'set') {
        if (needRoot(c, 'RTNETLINK answers: Operation not permitted')) return 2;
        const l = findLink(devArg() || args[0]);
        if (!l) return c.fail(`Cannot find device "${args[0]}"`, 1);
        if (args.indexOf('up') >= 0) l.state = 'UP';
        if (args.indexOf('down') >= 0) l.state = 'DOWN';
        const mi = args.indexOf('mtu');
        if (mi >= 0) l.mtu = +args[mi + 1];
        return 0;
      }
      net.links.forEach((l, i) => {
        if (brief) c.out(`${l.name.padEnd(16)} ${l.state.padEnd(14)} ${l.mac} <${l.name === 'lo' ? 'LOOPBACK,UP,LOWER_UP' : 'BROADCAST,MULTICAST,UP,LOWER_UP'}>\n`);
        else {
          c.out(linkLine(l, i));
          if (stats) c.out(`    RX:  bytes packets errors dropped  missed   mcast\n     48211203   41230      0       0       0     112\n    TX:  bytes packets errors dropped carrier collsns\n      3120442   22011      0       0       0       0\n`);
        }
      });
      return 0;
    }
    if (/^(r|route)$/.test(obj)) {
      if (cmd === 'add' || cmd === 'del' || cmd === 'delete' || cmd === 'replace') {
        if (needRoot(c, 'RTNETLINK answers: Operation not permitted')) return 2;
        const dst = args[0];
        const via = args.indexOf('via') >= 0 ? args[args.indexOf('via') + 1] : null;
        const dev = devArg() || (via && via.startsWith('192.168.56.') ? 'enp0s3' : 'enp0s3');
        if (cmd === 'add' || cmd === 'replace') {
          if (cmd === 'add' && net.routes.some((r) => r.dst === dst)) return c.fail('RTNETLINK answers: File exists', 2);
          net.routes = net.routes.filter((r) => r.dst !== dst);
          net.routes.push({ dst, via, dev, proto: 'static', metric: 100 });
        } else {
          const before = net.routes.length;
          net.routes = net.routes.filter((r) => r.dst !== dst);
          if (before === net.routes.length) return c.fail('RTNETLINK answers: No such process', 2);
        }
        return 0;
      }
      if (fam === 6) {
        c.out('::1 dev lo proto kernel metric 256 pref medium\nfe80::/64 dev enp0s3 proto kernel metric 1024 pref medium\n');
        return 0;
      }
      if (cmd === 'get') {
        const t = args[0];
        const r = net.routes.find((x) => x.dst !== 'default' && t.startsWith(x.dst.split('.').slice(0, 3).join('.'))) || net.routes.find((x) => x.dst === 'default');
        c.out(`${t} ${r.via ? 'via ' + r.via + ' ' : ''}dev ${r.dev} src 192.168.56.101 uid ${sh.uid}\n    cache \n`);
        return 0;
      }
      for (const r of net.routes) c.out(`${r.dst}${r.via ? ' via ' + r.via : ''} dev ${r.dev} proto ${r.proto}${r.scope ? ' scope ' + r.scope : ''}${r.src ? ' src ' + r.src : ''}${r.metric ? ' metric ' + r.metric : ''} \n`);
      return 0;
    }
    if (/^(n|neigh|neighbor|neighbour)$/.test(obj)) {
      c.out('192.168.56.1 dev enp0s3 lladdr 0a:00:27:00:00:00 REACHABLE\n192.168.56.10 dev enp0s3 lladdr 08:00:27:aa:bb:cc STALE\n');
      return 0;
    }
    if (obj === 'help') {
      c.out('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | link | route | neigh | rule | maddress | tunnel ... }\n       OPTIONS := { -4 | -6 | -s[tatistics] | -br[ief] | -c[olor] ... }\n');
      return 0;
    }
    return c.fail(`Object "${obj}" is unknown, try "ip help".`, 255);
  };
  C.ifconfig = (c) => {
    const sh = c.sh;
    const net = sh.state.ip;
    const args = c.args.filter((a) => a !== '-a');
    const all = c.args.indexOf('-a') >= 0;
    if (args.length >= 2) {
      if (needRoot(c, 'SIOCSIFFLAGS: Operation not permitted')) return 1;
      const l = net.links.find((x) => x.name === args[0]);
      if (!l) return c.fail(`${args[0]}: ERROR while getting interface flags: No such device`);
      if (args[1] === 'up') l.state = 'UP';
      else if (args[1] === 'down') l.state = 'DOWN';
      else {
        const mi = args.indexOf('netmask');
        const mask = mi >= 0 ? args[mi + 1] : '255.255.255.0';
        const len = mask.split('.').reduce((a, b) => a + (+b).toString(2).split('1').length - 1, 0);
        l.v4 = [args[1].indexOf('/') >= 0 ? args[1] : args[1] + '/' + len];
        l.state = 'UP';
      }
      return 0;
    }
    for (const l of net.links) {
      if (args[0] && l.name !== args[0]) continue;
      if (!all && !args[0] && l.state !== 'UP' && l.name !== 'lo') continue;
      const up = l.state === 'UP' || l.name === 'lo';
      c.out(`${l.name}: flags=${l.name === 'lo' ? '73<UP,LOOPBACK,RUNNING>' : up ? '4163<UP,BROADCAST,RUNNING,MULTICAST>' : '4098<BROADCAST,MULTICAST>'}  mtu ${l.mtu}\n`);
      for (const a of l.v4) {
        const [ip, len] = a.split('/');
        c.out(`        inet ${ip}  netmask ${netmask(+len)}${l.name === 'lo' ? '' : '  broadcast ' + bcast(a)}\n`);
      }
      for (const a of l.v6) c.out(`        inet6 ${a.split('/')[0]}  prefixlen ${a.split('/')[1]}  scopeid ${/^fe80/.test(a) ? '0x20<link>' : '0x10<host>'}\n`);
      c.out(`        ${l.name === 'lo' ? 'loop  txqueuelen 1000  (Local Loopback)' : `ether ${l.mac}  txqueuelen 1000  (Ethernet)`}\n        RX packets 41230  bytes 48211203 (45.9 MiB)\n        RX errors 0  dropped 0  overruns 0  frame 0\n        TX packets 22011  bytes 3120442 (2.9 MiB)\n        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0\n\n`);
    }
  };
  sbin('ifconfig', 'route', 'ifup', 'ifdown', 'arp', 'iptables', 'nft', 'ufw', 'firewall-cmd', 'tcpdump');
  C.route = (c) => {
    const net = c.sh.state.ip;
    const args = c.args.filter((a) => a !== '-n' && a !== '-e');
    if (args[0] === 'add' || args[0] === 'del') {
      if (needRoot(c, 'SIOCADDRT: Operation not permitted')) return 7;
      const isDef = args.indexOf('default') >= 0;
      const gw = args.indexOf('gw') >= 0 ? args[args.indexOf('gw') + 1] : null;
      const netI = args.indexOf('-net');
      const dst = isDef ? 'default' : netI >= 0 ? args[netI + 1] + (args.indexOf('netmask') >= 0 ? '/' + args[args.indexOf('netmask') + 1].split('.').reduce((a, b) => a + (+b).toString(2).split('1').length - 1, 0) : '') : args[1];
      if (args[0] === 'add') net.routes.push({ dst, via: gw, dev: 'enp0s3', proto: 'static', metric: 0 });
      else net.routes = net.routes.filter((r) => r.dst !== dst);
      return 0;
    }
    const num = c.args.indexOf('-n') >= 0;
    c.out('Kernel IP routing table\nDestination     Gateway         Genmask         Flags Metric Ref    Use Iface\n');
    for (const r of net.routes) {
      const [d, len] = r.dst === 'default' ? ['0.0.0.0', 0] : r.dst.split('/');
      const dest = r.dst === 'default' && !num ? 'default' : d;
      const gw = r.via ? (num ? r.via : reverse(c.sh, r.via) || r.via) : '0.0.0.0';
      c.out(`${dest.padEnd(15)} ${(r.via ? gw : num ? '0.0.0.0' : '0.0.0.0').padEnd(15)} ${netmask(+len).padEnd(15)} ${(r.via ? 'UG' : 'U').padEnd(5)} ${String(r.metric || 0).padEnd(6)} 0        0 ${r.dev}\n`);
    }
  };
  C.ifup = (c) => {
    if (needRoot(c, 'ifup: failed to open lockfile /run/network/.ifstate.lock: Permission denied')) return 1;
    const l = c.sh.state.ip.links.find((x) => x.name === c.args[0]);
    if (!l) return c.fail(`unknown interface ${c.args[0]}`);
    l.state = 'UP';
  };
  C.ifdown = (c) => {
    if (needRoot(c, 'ifdown: failed to open lockfile /run/network/.ifstate.lock: Permission denied')) return 1;
    const l = c.sh.state.ip.links.find((x) => x.name === c.args[0]);
    if (!l) return c.fail(`unknown interface ${c.args[0]}`);
    l.state = 'DOWN';
  };
  C.arp = (c) => c.out('Address                  HWtype  HWaddress           Flags Mask            Iface\n_gateway                 ether   0a:00:27:00:00:00   C                     enp0s3\nfileserver               ether   08:00:27:aa:bb:cc   C                     enp0s3\n');
  C.ping = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'c:i:W:w:s:qn46bt:I:', {});
    const host = rest[0];
    if (!host) return c.fail('usage error: Destination address required', 2);
    const r = SIM.resolve(sh, host);
    if (!r) {
      c.err(`ping: ${host}: ${/\./.test(host) ? 'Name or service not known' : 'Temporary failure in name resolution'}\n`);
      return 2;
    }
    const v6 = c.name === 'ping6' || o['6'];
    const ip = v6 ? r.v6ip || r.ip : r.ip;
    const up = sh.state.ip.links.find((l) => l.name === 'enp0s3').state === 'UP';
    const count = o.c ? +o.c : 4;
    const size = o.s ? +o.s : 56;
    c.out(`PING ${host} (${ip}) ${size}(${size + 28}) bytes of data.\n`);
    const local = /^127\.|^::1/.test(ip) || ip === '192.168.56.101';
    const ok = local || (up && reachable(ip));
    let times = [];
    for (let i = 1; i <= count; i++) {
      const t = local ? 0.03 + Math.random() * 0.03 : ip.startsWith('192.168.56.') ? 0.4 + Math.random() * 0.6 : 11 + Math.random() * 9;
      if (ok) {
        times.push(t);
        if (!o.q) c.out(`${size + 8} bytes from ${r.src === 'dns' && !o.n ? r.name + ' (' + ip + ')' : ip}: icmp_seq=${i} ttl=${local ? 64 : 56} time=${t.toFixed(t < 1 ? 3 : 1)} ms\n`);
      }
    }
    if (!o.c) c.err(note('(ping runs until Ctrl+C on Linux — the simulator stops after 4 packets; use -c N)'));
    c.out(`\n--- ${host} ping statistics ---\n${count} packets transmitted, ${ok ? count : 0} received, ${ok ? 0 : 100}% packet loss, time ${count * 1001 - 1000}ms\n`);
    if (ok) {
      const mn = Math.min(...times);
      const mx = Math.max(...times);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      c.out(`rtt min/avg/max/mdev = ${mn.toFixed(3)}/${avg.toFixed(3)}/${mx.toFixed(3)}/${((mx - mn) / 3).toFixed(3)} ms\n`);
    }
    return ok ? 0 : 1;
  };
  C.ping6 = (c) => C.ping({ ...c, name: 'ping6' });
  function hops(c, host) {
    const r = SIM.resolve(c.sh, host);
    if (!r) return null;
    const list = [['_gateway', '192.168.56.1', 0.6]];
    if (!r.ip.startsWith('192.168.56.') && !r.ip.startsWith('127.')) {
      list.push(['10.10.0.1', '10.10.0.1', 4.2], ['core1.isp.example.net', '203.0.113.1', 8.9], ['*', null, 0], ['ae-5.edge.example.net', '198.51.100.77', 13.4]);
      if (!reachable(r.ip)) {
        for (let i = 0; i < 5; i++) list.push(['*', null, 0]);
        return { r, list };
      }
    }
    if (!r.ip.startsWith('192.168.56.1')) list.push([r.name, r.ip, 15.2]);
    return { r, list };
  }
  C.traceroute = (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!host) return c.fail('Usage: traceroute [ -46dFITnreAUDV ] host');
    const h = hops(c, host);
    if (!h) return c.fail(`${host}: Name or service not known\nCannot handle "host" cmdline arg \`${host}' on position 1 (argc 1)`, 2);
    c.out(`traceroute to ${host} (${h.r.ip}), 30 hops max, 60 byte packets\n`);
    h.list.forEach(([n, ip, t], i) => c.out(`${String(i + 1).padStart(2)}  ${ip ? `${c.args.indexOf('-n') >= 0 ? ip : n} (${ip})  ${t.toFixed(3)} ms  ${(t * 1.1).toFixed(3)} ms  ${(t * 0.95).toFixed(3)} ms` : '* * *'}\n`));
  };
  C.traceroute6 = C.traceroute;
  C.tracepath = (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0];
    const h = hops(c, host);
    if (!h) return c.fail(`${host}: Name or service not known`);
    c.out(` 1?: [LOCALHOST]                      pmtu 1500\n`);
    h.list.forEach(([n, ip, t], i) => c.out(` ${i + 1}:  ${ip ? (n + ' ').padEnd(34) + t.toFixed(3) + 'ms' : 'no reply'}\n`));
    c.out(`     Resume: pmtu 1500 hops ${h.list.length} back ${h.list.length}\n`);
  };
  C.tracepath6 = C.tracepath;
  const SOCKETS = [
    ['tcp', 'LISTEN', '0.0.0.0:22', '0.0.0.0:*', 'sshd', 901, 'ssh'],
    ['tcp', 'LISTEN', '127.0.0.1:25', '0.0.0.0:*', 'master', 1102, 'postfix'],
    ['tcp', 'LISTEN', '127.0.0.1:631', '0.0.0.0:*', 'cupsd', 640, 'cups'],
    ['tcp', 'LISTEN', '[::]:22', '[::]:*', 'sshd', 901, 'ssh'],
    ['tcp', 'ESTAB', '192.168.56.101:22', '192.168.56.1:50122', 'sshd', 1204, 'ssh'],
    ['udp', 'UNCONN', '0.0.0.0:68', '0.0.0.0:*', 'NetworkManager', 430, 'NetworkManager'],
    ['udp', 'UNCONN', '127.0.0.1:323', '0.0.0.0:*', 'chronyd', 455, 'chrony'],
    ['udp', 'UNCONN', '0.0.0.0:5353', '0.0.0.0:*', 'avahi-daemon', 480, null],
  ];
  const sockets = (sh) => {
    const list = SOCKETS.filter((s) => !s[6] || (sh.state.services[s[6]] && sh.state.services[s[6]].active));
    if (sh.state.services.apache2 && sh.state.services.apache2.active) list.push(['tcp', 'LISTEN', '*:80', '*:*', 'apache2', sh.state.services.apache2.pid, 'apache2']);
    return list;
  };
  C.ss = (c) => {
    const { o } = getopt(c.args.map((a) => (a === '-tulpn' ? '-tulpn' : a)), 'tulpnaxsr4 6eo', { tcp: 't', udp: 'u', listening: 'l', processes: 'p', numeric: 'n', all: 'a', summary: 's' });
    if (o.s) {
      c.out('Total: 182\nTCP:   5 (estab 1, closed 0, orphaned 0, timewait 0)\n\nTransport Total     IP        IPv6\nRAW\t  0         0         0\nUDP\t  3         3         0\nTCP\t  5         4         1\n');
      return 0;
    }
    const tcp = o.t || (!o.t && !o.u);
    const udp = o.u || (!o.t && !o.u);
    let list = sockets(c.sh).filter((s) => (s[0] === 'tcp' ? tcp : udp));
    if (o.l) list = list.filter((s) => s[1] !== 'ESTAB');
    else if (!o.a) list = list.filter((s) => s[1] === 'ESTAB');
    const svcName = (addr) => {
      if (o.n) return addr;
      return addr.replace(/:(22|25|631|80|68|323|5353)$/, (m, p) => ':' + ({ 22: 'ssh', 25: 'smtp', 631: 'ipp', 80: 'http', 68: 'bootpc', 323: '323', 5353: 'mdns' }[p]));
    };
    c.out(`Netid State  Recv-Q Send-Q Local Address:Port      Peer Address:Port ${o.p ? 'Process' : ''}\n`);
    for (const s of list) c.out(`${s[0].padEnd(5)} ${s[1].padEnd(6)} 0      ${s[1] === 'LISTEN' ? '128' : '0  '}    ${svcName(s[2]).padEnd(23)} ${s[3].padEnd(18)} ${o.p && c.sh.uid === 0 ? `users:(("${s[4]}",pid=${s[5]},fd=3))` : ''}\n`);
    if (o.p && c.sh.uid !== 0) c.err(note('(process names are only shown for root — use sudo ss -tulpn)'));
  };
  C.netstat = (c) => {
    const flags = c.args.join('').replace(/-/g, '');
    if (/r/.test(flags)) return C.route({ ...c, args: ['-n'] });
    if (/i/.test(flags)) {
      c.out('Kernel Interface table\nIface      MTU    RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\nenp0s3    1500    41230      0      0 0         22011      0      0      0 BMRU\nlo       65536      320      0      0 0           320      0      0      0 LRU\n');
      return 0;
    }
    if (/s/.test(flags) && !/[tul]/.test(flags)) {
      c.out('Ip:\n    Forwarding: 2\n    41520 total packets received\n    0 forwarded\nTcp:\n    120 active connection openings\n    3 failed connection attempts\nUdp:\n    830 packets received\n');
      return 0;
    }
    const tcp = /t/.test(flags) || !/[tu]/.test(flags);
    const udp = /u/.test(flags) || !/[tu]/.test(flags);
    let list = sockets(c.sh).filter((s) => (s[0] === 'tcp' ? tcp : udp));
    if (/l/.test(flags)) list = list.filter((s) => s[1] !== 'ESTAB');
    else if (!/a/.test(flags)) list = list.filter((s) => s[1] === 'ESTAB');
    c.out(`Active Internet connections ${/l/.test(flags) ? '(only servers)' : '(servers and established)'}\nProto Recv-Q Send-Q Local Address           Foreign Address         State       ${/p/.test(flags) ? 'PID/Program name' : ''}\n`);
    for (const s of list) {
      const loc = /n/.test(flags) ? s[2] : s[2].replace(/:22$/, ':ssh').replace(/:25$/, ':smtp').replace(/:631$/, ':ipp');
      c.out(`${(s[0] + (s[2].startsWith('[') ? '6' : '')).padEnd(5)}      0      0 ${loc.replace('[::]', ':::').padEnd(23)} ${s[3].replace('[::]:*', ':::*').padEnd(23)} ${(s[0] === 'udp' ? '' : s[1] === 'ESTAB' ? 'ESTABLISHED' : 'LISTEN').padEnd(11)} ${/p/.test(flags) ? (c.sh.uid === 0 ? s[5] + '/' + s[4] : '-') : ''}\n`);
    }
  };
  C.lsof = (c) => {
    const sh = c.sh;
    const i = c.args.findIndex((a) => a.startsWith('-i'));
    if (i >= 0) {
      const spec = c.args[i].length > 2 ? c.args[i].slice(2) : c.args[i + 1] || '';
      const port = (/:(\w+)$/.exec(spec) || [])[1];
      if (sh.uid !== 0) c.err(note('(as a normal user lsof only shows your own processes — use sudo lsof -i)'));
      c.out('COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n');
      for (const s of sockets(sh)) {
        const p = s[2].split(':').pop();
        if (port && port !== p && !(port === 'ssh' && p === '22')) continue;
        if (sh.uid !== 0) continue;
        c.out(`${s[4].slice(0, 9).padEnd(9)} ${String(s[5]).padStart(5)} root    3u  IPv${s[2].startsWith('[') ? 6 : 4}  2${s[5]}      0t0  ${s[0].toUpperCase()} ${s[2].replace(/:22$/, ':ssh').replace('0.0.0.0', '*')}${s[1] === 'LISTEN' ? ' (LISTEN)' : s[1] === 'ESTAB' ? '->' + s[3] + ' (ESTABLISHED)' : ''}\n`);
      }
      return 0;
    }
    if (c.args.indexOf('-u') >= 0) {
      const u = c.args[c.args.indexOf('-u') + 1];
      c.out(`COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME\nbash    1990 ${u}  cwd    DIR    8,2     4096 131074 /home/${u}\n`);
      return 0;
    }
    const f = c.args.filter((a) => !a.startsWith('-'))[0];
    if (f) {
      const r = sh.fs.tryLookup(f, sh.cwd);
      if (!r) return c.fail(`status error on ${f}: No such file or directory`);
      const m = sh.fs.mounts.find((x) => x.target === r.path);
      if (m && (sh.cwd === m.target || sh.cwd.startsWith(m.target + '/'))) c.out(`COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nbash    1990 ${sh.username}  cwd    DIR   8,17     4096    2 ${sh.cwd}\n`);
      else if (/syslog/.test(r.path)) c.out(`COMMAND  PID   USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME\nrsyslogd 480   root    7w   REG    8,2   248113 393240 ${r.path}\n`);
      return 0;
    }
    c.out('COMMAND     PID   USER   FD      TYPE DEVICE SIZE/OFF   NODE NAME\nsystemd       1   root  cwd       DIR    8,2     4096      2 /\nsshd        901   root    3u     IPv4  20901      0t0    TCP *:ssh (LISTEN)\nbash       1990 student  cwd       DIR    8,2     4096 131074 /home/student\n');
  };
  C.fuser = (c) => {
    const { o, rest } = getopt(c.args, 'vmkn:i', { verbose: 'v' });
    const sh = c.sh;
    for (const t of rest) {
      if (o.n === 'tcp' || /\/tcp$/.test(t)) {
        const port = t.split('/')[0];
        const s = sockets(sh).find((x) => x[2].endsWith(':' + port) && x[1] === 'LISTEN');
        if (s) c.out(`${port}/tcp:              ${s[5]}\n`);
        continue;
      }
      const r = sh.fs.tryLookup(t, sh.cwd);
      if (!r) {
        c.err(`${t}: No such file or directory\n`);
        continue;
      }
      if (sh.cwd === r.path || sh.cwd.startsWith(r.path + '/')) {
        if (o.v) c.out(`                     USER        PID ACCESS COMMAND\n${t}:${' '.repeat(Math.max(1, 20 - t.length))}${sh.username.padEnd(10)} 1990 ..c.. bash\n`);
        else c.out(`${t}:  1990c\n`);
      }
    }
  };
  C.nc = (c) => {
    const { o, rest } = getopt(c.args, 'zvlunw:', {});
    const [host, port] = rest;
    if (o.l) return c.out(note(`(nc -l would listen on port ${port || host} — not simulated)`));
    const r = SIM.resolve(c.sh, host || '');
    if (!r) return c.fail(`getaddrinfo for host "${host}" port ${port}: Name or service not known`);
    const local = /^127\.|192\.168\.56\.101/.test(r.ip);
    const open = local ? sockets(c.sh).some((s) => s[1] === 'LISTEN' && s[2].endsWith(':' + port)) : r.ip.startsWith('192.168.56.') ? ['22', '80', '445'].indexOf(port) >= 0 : ['80', '443'].indexOf(port) >= 0;
    if (o.z || o.v) {
      if (open) c.err(`Connection to ${host} (${r.ip}) ${port} port [tcp/${{ 22: 'ssh', 25: 'smtp', 80: 'http', 443: 'https', 631: 'ipp' }[port] || '*'}] succeeded!\n`);
      else c.err(`nc: connect to ${host} (${r.ip}) port ${port} (tcp) failed: Connection refused\n`);
    }
    return open ? 0 : 1;
  };
  C.netcat = C.nc;
  C.telnet = (c) => {
    const [host, port = '23'] = c.args;
    const r = SIM.resolve(c.sh, host || '');
    if (!r) return c.fail(`could not resolve ${host}/${port}: Name or service not known`);
    c.out(`Trying ${r.ip}...\n`);
    if (port === '25' && /^127\.|localhost/.test(host)) c.out(`Connected to ${host}.\nEscape character is '^]'.\n220 lpic-lab.example.com ESMTP Postfix (Debian/GNU)\n` + note('(SMTP dialogue: HELO, MAIL FROM:, RCPT TO:, DATA, QUIT — telnet sends everything in clear text!)'));
    else if (port === '22') c.out(`Connected to ${host}.\nEscape character is '^]'.\nSSH-2.0-OpenSSH_9.2p1 Debian-2+deb12u2\n`);
    else c.err(`telnet: Unable to connect to remote host: Connection refused\n`);
  };
  C.nmap = (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0] || 'localhost';
    const r = SIM.resolve(c.sh, host);
    if (!r) return c.fail(`Failed to resolve "${host}".`);
    const local = /^127\.|192\.168\.56\.101/.test(r.ip);
    const ports = local ? sockets(c.sh).filter((s) => s[0] === 'tcp' && s[1] === 'LISTEN' && !s[2].startsWith('[')).map((s) => +s[2].split(':').pop()) : [22, 80, 445];
    c.out(`Starting Nmap 7.93 ( https://nmap.org ) at ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\nNmap scan report for ${host} (${r.ip})\nHost is up (0.00010s latency).\nNot shown: ${1000 - ports.length} closed tcp ports (reset)\nPORT    STATE SERVICE\n`);
    for (const p of ports.sort((a, b) => a - b)) c.out(`${(p + '/tcp').padEnd(7)} open  ${{ 22: 'ssh', 25: 'smtp', 80: 'http', 445: 'microsoft-ds', 631: 'ipp' }[p]}\n`);
    c.out(`\nNmap done: 1 IP address (1 host up) scanned in 0.09 seconds\n`);
  };
  SIM.optional.add('nmap');

  /* ---- DNS clients ---- */
  C.host = (c) => {
    const { o, rest } = getopt(c.args, 't:avW:46', { type: 't' });
    const [name, server] = rest;
    if (!name) return c.fail('Usage: host [-aCdilrTvVw] [-c class] [-N ndots] [-t type] [-W time] hostname [server]');
    const sh = c.sh;
    if (server) c.out(`Using domain server:\nName: ${server}\nAddress: ${SIM.resolve(sh, server) ? SIM.resolve(sh, server).ip : server}#53\nAliases: \n\n`);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
      const n = reverse(sh, name);
      if (!n) {
        c.out(`Host ${name.split('.').reverse().join('.')}.in-addr.arpa. not found: 3(NXDOMAIN)\n`);
        return 1;
      }
      c.out(`${name.split('.').reverse().join('.')}.in-addr.arpa domain name pointer ${n}.\n`);
      return 0;
    }
    const d = sh.state.dns[name.replace(/\.$/, '')];
    if (!d) {
      c.out(`Host ${name} not found: 3(NXDOMAIN)\n`);
      return 1;
    }
    const t = (o.t || '').toUpperCase();
    if (!t || t === 'A') d.filter((x) => x.indexOf(':') < 0).forEach((ip) => c.out(`${name} has address ${ip}\n`));
    if (!t || t === 'AAAA') d.filter((x) => x.indexOf(':') >= 0).forEach((ip) => c.out(`${name} has IPv6 address ${ip}\n`));
    if (!t || t === 'MX') (sh.state.mx[name] || []).forEach((m) => c.out(`${name} mail is handled by ${m}\n`));
    if (t === 'NS') c.out(`${name} name server a.iana-servers.net.\n${name} name server b.iana-servers.net.\n`);
    return 0;
  };
  C.dig = (c) => {
    const sh = c.sh;
    let server = null;
    let short = false;
    let type = 'A';
    let rev = false;
    let name = null;
    let cls = 'IN';
    for (const a of c.args) {
      if (a.startsWith('@')) server = a.slice(1);
      else if (a === '+short') short = true;
      else if (a.startsWith('+')) {
        /* other options */
      } else if (a === '-x') rev = true;
      else if (/^(A|AAAA|MX|NS|TXT|CNAME|SOA|PTR|ANY)$/i.test(a)) type = a.toUpperCase();
      else if (/^(IN|CH|HS)$/i.test(a)) cls = a.toUpperCase();
      else name = a;
    }
    if (!name) name = '.';
    if (cls === 'CH') {
      // Chaosnet class: only server self-information such as version.bind exists today
      const v = /^(version|hostname)\.bind\.?$/i.test(name) ? (/^version/i.test(name) ? '"9.18.24-1-Debian"' : '"ns1.example.com"') : null;
      if (short) return c.out(v ? v + '\n' : '');
      c.out(`\n; <<>> DiG 9.18.24-1-Debian <<>> ${c.args.join(' ')}\n;; ->>HEADER<<- opcode: QUERY, status: ${v ? 'NOERROR' : 'REFUSED'}, id: 7311\n\n;; QUESTION SECTION:\n;${name}\t\tCH\t${type}\n\n${v ? `;; ANSWER SECTION:\n${name}\t0\tCH\t${type}\t${v}\n\n` : ''};; SERVER: ${server || '192.168.56.1'}#53(${server || '192.168.56.1'}) (UDP)\n`);
      return v ? 0 : 9;
    }
    if (rev) {
      const n = reverse(sh, name);
      const q = name.split('.').reverse().join('.') + '.in-addr.arpa.';
      if (short) return c.out(n ? n + '.\n' : '');
      c.out(`\n; <<>> DiG 9.18.24-1-Debian <<>> -x ${name}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${n ? 'NOERROR' : 'NXDOMAIN'}, id: 4211\n\n;; QUESTION SECTION:\n;${q}\t\tIN\tPTR\n\n${n ? `;; ANSWER SECTION:\n${q}\t3600\tIN\tPTR\t${n}.\n\n` : ''};; SERVER: ${server || '192.168.56.1'}#53(${server || '192.168.56.1'}) (UDP)\n`);
      return 0;
    }
    const d = sh.state.dns[name.replace(/\.$/, '')] || [];
    let answers = [];
    if (type === 'A' || type === 'ANY') answers.push(...d.filter((x) => x.indexOf(':') < 0).map((ip) => ['A', ip]));
    if (type === 'AAAA' || type === 'ANY') answers.push(...d.filter((x) => x.indexOf(':') >= 0).map((ip) => ['AAAA', ip]));
    if (type === 'MX' || type === 'ANY') answers.push(...(sh.state.mx[name.replace(/\.$/, '')] || []).map((m) => ['MX', m]));
    if (type === 'NS' && d.length) answers.push(['NS', 'a.iana-servers.net.'], ['NS', 'b.iana-servers.net.']);
    if (type === 'TXT' && d.length) answers.push(['TXT', '"v=spf1 -all"']);
    if (short) {
      answers.forEach((a) => c.out(a[1] + '\n'));
      return 0;
    }
    const fq = name.endsWith('.') ? name : name + '.';
    c.out(`\n; <<>> DiG 9.18.24-1-Debian <<>> ${server ? '@' + server + ' ' : ''}${name}${type !== 'A' ? ' ' + type : ''}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${d.length ? 'NOERROR' : 'NXDOMAIN'}, id: ${Math.floor(Math.random() * 65535)}\n;; flags: qr rd ra; QUERY: 1, ANSWER: ${answers.length}, AUTHORITY: 0, ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;${fq}\t\t\tIN\t${type}\n\n`);
    if (answers.length) {
      c.out(';; ANSWER SECTION:\n');
      answers.forEach((a) => c.out(`${fq}\t\t3600\tIN\t${a[0]}\t${a[1]}\n`));
      c.out('\n');
    }
    c.out(`;; Query time: ${Math.floor(Math.random() * 30) + 3} msec\n;; SERVER: ${server ? (SIM.resolve(sh, server) || { ip: server }).ip : '192.168.56.1'}#53(${server || '192.168.56.1'}) (UDP)\n;; WHEN: ${new Date().toString().slice(0, 24)}\n;; MSG SIZE  rcvd: ${56 + answers.length * 16}\n\n`);
    return 0;
  };
  C.nslookup = (c) => {
    const sh = c.sh;
    const args = c.args.filter((a) => !a.startsWith('-'));
    const [name, server] = args;
    if (!name) return c.out(note('(interactive nslookup: type a host name, "server 8.8.8.8", "set type=MX", "exit")'));
    const srv = server ? (SIM.resolve(sh, server) || { ip: server }).ip : '192.168.56.1';
    c.out(`Server:\t\t${srv}\nAddress:\t${srv}#53\n\n`);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
      const n = reverse(sh, name);
      if (n) c.out(`${name.split('.').reverse().join('.')}.in-addr.arpa\tname = ${n}.\n\n`);
      else c.out(`** server can't find ${name.split('.').reverse().join('.')}.in-addr.arpa: NXDOMAIN\n\n`);
      return n ? 0 : 1;
    }
    const d = sh.state.dns[name.replace(/\.$/, '')];
    if (!d) {
      c.out(`** server can't find ${name}: NXDOMAIN\n\n`);
      return 1;
    }
    c.out('Non-authoritative answer:\n');
    d.forEach((ip) => c.out(`Name:\t${name}\nAddress: ${ip}\n`));
    c.out('\n');
  };
  C.resolvectl = (c) => {
    c.out('Global\n       Protocols: +LLMNR +mDNS -DNSOverTLS DNSSEC=no/unsupported\nresolv.conf mode: foreign\n\nLink 2 (enp0s3)\n    Current Scopes: DNS\n         Protocols: +DefaultRoute\nCurrent DNS Server: 192.168.56.1\n       DNS Servers: 192.168.56.1 1.1.1.1\n        DNS Domain: example.com\n');
  };
  C.nmcli = (c) => {
    const sh = c.sh;
    const [obj = 'general', sub = 'status', ...rest] = c.args.filter((a) => !/^-[tp]$/.test(a));
    const links = sh.state.ip.links;
    if (/^g/.test(obj)) {
      if (sub === 'hostname') {
        if (rest[0]) {
          if (needRoot(c, 'Error: Could not set hostname: Insufficient privileges')) return 1;
          sh.state.hostname = rest[0];
        } else c.out(sh.state.hostname + '\n');
        return 0;
      }
      c.out('STATE      CONNECTIVITY  WIFI-HW  WIFI     WWAN-HW  WWAN    \nconnected  full          missing  enabled  missing  enabled \n');
      return 0;
    }
    if (/^d/.test(obj)) {
      if (sub === 'show') {
        const l = links.find((x) => x.name === (rest[0] || 'enp0s3'));
        c.out(`GENERAL.DEVICE:                         ${l.name}\nGENERAL.TYPE:                           ${l.name === 'lo' ? 'loopback' : 'ethernet'}\nGENERAL.HWADDR:                         ${l.mac.toUpperCase()}\nGENERAL.MTU:                            ${l.mtu}\nGENERAL.STATE:                          ${l.state === 'UP' ? '100 (connected)' : '30 (disconnected)'}\nIP4.ADDRESS[1]:                         ${l.v4[0] || ''}\nIP4.GATEWAY:                            192.168.56.1\nIP4.DNS[1]:                             192.168.56.1\n`);
        return 0;
      }
      c.out('DEVICE  TYPE      STATE                   CONNECTION         \n');
      for (const l of links) c.out(`${l.name.padEnd(7)} ${(l.name === 'lo' ? 'loopback' : 'ethernet').padEnd(9)} ${(l.name === 'lo' ? 'connected (externally)' : l.state === 'UP' ? 'connected' : 'disconnected').padEnd(23)} ${l.name === 'enp0s3' ? 'Wired connection 1' : l.name === 'lo' ? 'lo' : '--'}\n`);
      return 0;
    }
    if (/^c/.test(obj)) {
      if (sub === 'show' || sub === 's') {
        c.out('NAME                UUID                                  TYPE      DEVICE \nWired connection 1  7c1e2a9f-0b4d-4e63-9a2f-5c8d7e6f1a2b  ethernet  enp0s3 \nlo                  2b3c4d5e-6f70-4a81-92b3-c4d5e6f70812  loopback  lo     \n');
        return 0;
      }
      if (['up', 'down', 'add', 'modify', 'mod', 'delete', 'reload'].indexOf(sub) >= 0) {
        if (needRoot(c, 'Error: Failed to ' + sub + ': Insufficient privileges.')) return 1;
        if (sub === 'up' || sub === 'down') {
          links[1].state = sub === 'up' ? 'UP' : 'DOWN';
          c.out(sub === 'up' ? 'Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/3)\n' : "Connection 'Wired connection 1' successfully deactivated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/2)\n");
        }
        if (sub === 'modify' || sub === 'mod') {
          const i = rest.indexOf('ipv4.addresses');
          if (i >= 0) links[1].v4 = [rest[i + 1]];
        }
        return 0;
      }
    }
    return c.fail(`Error: argument '${obj}' not understood. Try passing --help instead.`);
  };
  C.iptables = (c) => {
    if (needRoot(c, 'iptables v1.8.9 (nf_tables): Could not fetch rule set generation id: Permission denied (you must be root)')) return 4;
    if (c.args.indexOf('-L') >= 0) c.out('Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination         \n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination         \n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination         \n');
  };
  C.ufw = (c) => {
    if (needRoot(c, 'ERROR: You need to be root to run this script')) return 1;
    c.out(c.args[0] === 'status' ? 'Status: inactive\n' : 'Rules updated\n');
  };
  C.tcpdump = (c) => {
    if (needRoot(c, 'tcpdump: enp0s3: You don\'t have permission to capture on that device\n(socket: Operation not permitted)')) return 1;
    c.out('tcpdump: verbose output suppressed, use -v[v]... for full protocol decode\nlistening on enp0s3, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n09:42:01.123456 IP 192.168.56.1.50122 > lpic-lab.ssh: Flags [P.], seq 1:37, ack 1, win 501, length 36\n' + note('(press Ctrl+C to stop capturing)'));
  };

  /* ================= ssh / gpg ================= */
  const randomart = (type, bits) => {
    const rows = [];
    for (let i = 0; i < 9; i++) {
      let r = '';
      for (let j = 0; j < 17; j++) r += ' .o+=*BOX@%&#/^SE'[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 6)];
      rows.push('|' + r + '|');
    }
    return `+---[${type.toUpperCase()} ${bits}]----+\n${rows.join('\n')}\n+----[SHA256]-----+\n`;
  };
  const b64 = (n) => Array.from({ length: n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random() * 64)]).join('');
  C['ssh-keygen'] = (c) => {
    const sh = c.sh;
    const { o } = getopt(c.args, 't:b:f:N:C:lRqyEHFvpPeiA', { 'type=': 't' });
    const home = sh.vars.HOME;
    if (o.A) {
      if (needRoot(c, 'ssh-keygen: generating new host keys: Permission denied')) return 1;
      c.out('ssh-keygen: generating new host keys: RSA ECDSA ED25519 \n');
      return 0;
    }
    if (o.R) {
      const kh = home + '/.ssh/known_hosts';
      c.out(`# Host ${o.R} found: line 1\n${kh} updated.\nOriginal contents retained as ${kh}.old\n`);
      return 0;
    }
    if (o.l) {
      const f = o.f || home + '/.ssh/id_ed25519.pub';
      const data = sh.fs.readFile(f, sh.cwd);
      const t = (data.split(' ')[0] || 'ssh-ed25519').replace('ssh-', '').toUpperCase();
      c.out(`${t === 'RSA' ? 3072 : 256} SHA256:${b64(43)} ${(data.split(' ')[2] || '').trim() || 'no comment'} (${t.replace('ECDSA-SHA2-NISTP256', 'ECDSA')})\n`);
      return 0;
    }
    if (o.y) {
      const data = sh.fs.readFile(o.f, sh.cwd);
      const m = /# pub: (.*)/.exec(data);
      c.out((m ? m[1] : 'ssh-ed25519 AAAA' + b64(64)) + '\n');
      return 0;
    }
    const type = (o.t || 'ed25519').toLowerCase();
    if (['rsa', 'dsa', 'ecdsa', 'ed25519', 'ecdsa-sk', 'ed25519-sk'].indexOf(type) < 0) return c.fail(`unknown key type ${type}`);
    const bits = o.b ? +o.b : { rsa: 3072, dsa: 1024, ecdsa: 256, ed25519: 256 }[type];
    if (type === 'dsa') c.err(note('(DSA keys are deprecated and disabled by default in OpenSSH ≥ 7.0)'));
    c.out(`Generating public/private ${type} key pair.\n`);
    let file = o.f;
    if (!file) {
      const def = `${home}/.ssh/id_${type}`;
      file = sh.promptFn ? sh.promptFn(`Enter file in which to save the key (${def}):`) || def : def;
      c.out(`Enter file in which to save the key (${def}): ${file === def ? '' : file}\n`);
    }
    file = file.replace(/^~/, home);
    if (sh.fs.exists(file, sh.cwd)) {
      const a = sh.promptFn ? sh.promptFn(`${file} already exists.\nOverwrite (y/n)?`) : 'y';
      if (!a || !/^y/i.test(a)) return 1;
    }
    let pass = o.N;
    if (pass === undefined) {
      pass = sh.promptFn ? sh.promptFn('Enter passphrase (empty for no passphrase):', true) || '' : '';
      c.out('Enter passphrase (empty for no passphrase): \nEnter same passphrase again: \n');
    }
    const dir = file.slice(0, file.lastIndexOf('/')) || '.';
    if (!sh.fs.exists(dir, sh.cwd)) {
      sh.fs.mkdir(dir, sh.cwd, 0o700);
      c.out(`Created directory '${dir}'.\n`);
    }
    const comment = o.C !== undefined ? o.C : `${sh.username}@${sh.state.hostname}`;
    const pubType = { rsa: 'ssh-rsa', dsa: 'ssh-dss', ecdsa: 'ecdsa-sha2-nistp256', ed25519: 'ssh-ed25519' }[type] || 'ssh-' + type;
    const pub = `${pubType} AAAA${b64(type === 'rsa' ? 540 : 64)} ${comment}`;
    const priv = `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64(70)}\n${b64(70)}\n${b64(40)}\n# (simulated ${type} key${pass ? ', encrypted with passphrase' : ''})\n# pub: ${pub}\n-----END OPENSSH PRIVATE KEY-----\n`;
    sh.fs.writeFile(file, sh.cwd, priv, { mode: 0o600 });
    sh.fs.lookup(file, sh.cwd).node.mode = 0o600;
    sh.fs.writeFile(file + '.pub', sh.cwd, pub + '\n');
    sh.fs.lookup(file + '.pub', sh.cwd).node.mode = 0o644;
    c.out(`Your identification has been saved in ${file}\nYour public key has been saved in ${file}.pub\nThe key fingerprint is:\nSHA256:${b64(43)} ${comment}\nThe key's randomart image is:\n${randomart(type, bits)}`);
  };
  C['ssh-agent'] = (c) => {
    const pid = c.sh.state.nextPid++;
    const sock = `/tmp/ssh-${b64(10).replace(/[+/]/g, 'x')}/agent.${pid - 1}`;
    c.sh.state.agent = { pid, sock, keys: [] };
    if (c.args.length && !c.args[0].startsWith('-')) {
      c.sh.vars.SSH_AUTH_SOCK = sock;
      c.sh.vars.SSH_AGENT_PID = String(pid);
      c.sh.exported.add('SSH_AUTH_SOCK');
      c.sh.exported.add('SSH_AGENT_PID');
      return c.sh.runArgv(c.args, c.io);
    }
    if (c.args.indexOf('-k') >= 0) {
      c.out('unset SSH_AUTH_SOCK;\nunset SSH_AGENT_PID;\necho Agent pid ' + (c.sh.vars.SSH_AGENT_PID || '') + ' killed;\n');
      c.sh.state.agent = null;
      return 0;
    }
    c.out(`SSH_AUTH_SOCK=${sock}; export SSH_AUTH_SOCK;\nSSH_AGENT_PID=${pid}; export SSH_AGENT_PID;\necho Agent pid ${pid};\n`);
  };
  C['ssh-add'] = (c) => {
    const sh = c.sh;
    if (!sh.vars.SSH_AUTH_SOCK || !sh.state.agent) {
      c.err('Could not open a connection to your authentication agent.\n');
      c.err(note('(start the agent first:  eval $(ssh-agent)  )'));
      return 2;
    }
    const ag = sh.state.agent;
    if (c.args[0] === '-l' || c.args[0] === '-L') {
      if (!ag.keys.length) {
        c.out('The agent has no identities.\n');
        return 1;
      }
      ag.keys.forEach((k) => c.out(`256 SHA256:${k.fp} ${k.comment} (${k.type})\n`));
      return 0;
    }
    if (c.args[0] === '-D') {
      ag.keys = [];
      c.out('All identities removed.\n');
      return 0;
    }
    const files = c.args.filter((a) => !a.startsWith('-'));
    const list = files.length ? files : ['id_rsa', 'id_ecdsa', 'id_ed25519'].map((f) => sh.vars.HOME + '/.ssh/' + f).filter((f) => sh.fs.exists(f));
    if (!list.length) return c.fail('no identities found');
    for (const f of list) {
      let data;
      try {
        data = sh.fs.readFile(f, sh.cwd);
      } catch (e) {
        c.err(`${f}: ${e.message}\n`);
        continue;
      }
      const n = sh.fs.lookup(f, sh.cwd).node;
      if (n.mode & 0o077) {
        c.err(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\nPermissions 0${(n.mode & 0o777).toString(8)} for '${f}' are too open.\nIt is required that your private key files are NOT accessible by others.\nThis private key will be ignored.\n`);
        continue;
      }
      if (/encrypted/.test(data) && sh.promptFn) sh.promptFn(`Enter passphrase for ${f}:`, true);
      const pub = (/# pub: (.*)/.exec(data) || [0, 'ssh-ed25519 x ' + sh.username])[1].split(' ');
      ag.keys.push({ fp: b64(43), comment: pub[2] || f, type: pub[0].replace('ssh-', '').toUpperCase() });
      c.err(`Identity added: ${f} (${pub[2] || f})\n`);
    }
  };
  C.ssh = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'p:i:l:XYvNfTtL:R:D:o:A4612qCg', {});
    if (!rest.length) return c.fail('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address] [-c cipher_spec] [-D [bind_address:]port] ... destination [command [argument ...]]', 255);
    let [dest, ...cmd] = rest;
    let user = o.l || sh.username;
    if (dest.indexOf('@') >= 0) [user, dest] = dest.split('@');
    const r = SIM.resolve(sh, dest);
    if (!r) {
      c.err(`ssh: Could not resolve hostname ${dest}: Name or service not known\n`);
      return 255;
    }
    const port = o.p || '22';
    const local = /^127\.|192\.168\.56\.101/.test(r.ip);
    if ((local && !sh.state.services.ssh.active) || (!local && !r.ip.startsWith('192.168.56.')) || port !== '22') {
      c.err(`ssh: connect to host ${dest} port ${port}: Connection ${!local && !r.ip.startsWith('192.168.56.') && reachable(r.ip) ? 'timed out' : 'refused'}\n`);
      return 255;
    }
    const kh = sh.vars.HOME + '/.ssh/known_hosts';
    const known = sh.fs.exists(kh) ? sh.fs.readFile(kh, '/') : '';
    if (known.indexOf(' ' + dest + ' ') < 0 && known.indexOf('\n' + dest + ' ') < 0 && !known.startsWith(dest + ' ')) {
      const fp = b64(43);
      const a = sh.promptFn ? sh.promptFn(`The authenticity of host '${dest} (${r.ip})' can't be established.\nED25519 key fingerprint is SHA256:${fp}.\nThis key is not known by any other names.\nAre you sure you want to continue connecting (yes/no/[fingerprint])?`) : 'yes';
      c.err(`The authenticity of host '${dest} (${r.ip})' can't be established.\nED25519 key fingerprint is SHA256:${fp}.\nThis key is not known by any other names.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? ${a || ''}\n`);
      if (a !== 'yes') {
        c.err('Host key verification failed.\n');
        return 255;
      }
      if (!sh.fs.exists(sh.vars.HOME + '/.ssh')) sh.fs.mkdir(sh.vars.HOME + '/.ssh', '/', 0o700);
      sh.fs.writeFile(kh, '/', `${dest} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${b64(40)}\n`, { append: true });
      c.err(`Warning: Permanently added '${dest}' (ED25519) to the list of known hosts.\n`);
    }
    const keyAuth = (sh.state.agent && sh.state.agent.keys.length) || (o.i && sh.fs.exists(o.i, sh.cwd)) || ['id_ed25519', 'id_rsa'].some((k) => sh.fs.exists(`${sh.vars.HOME}/.ssh/${k}`) && sh.state.copiedKeys && sh.state.copiedKeys[dest]);
    if (!keyAuth) {
      const pw = sh.promptFn ? sh.promptFn(`${user}@${dest}'s password:`, true) : 'x';
      if (!pw) {
        c.err(`${user}@${dest}: Permission denied (publickey,password).\n`);
        return 255;
      }
    }
    if (o.X || o.Y) c.err(note('(X11 forwarding requested: remote GUI programs would display on your local X server via DISPLAY=localhost:10.0)'));
    if (o.L || o.R || o.D) c.err(note(`(port forwarding ${o.L ? '-L ' + o.L : o.R ? '-R ' + o.R : '-D ' + o.D} established — traffic is tunnelled through the encrypted SSH connection)`));
    if (cmd.length) {
      c.out(note(`(simulated: "${cmd.join(' ')}" would run on ${dest} as ${user}; running it locally instead:)`));
      return sh.runSource(cmd.join(' '), c.io);
    }
    c.out(`Linux ${dest} 6.1.0-18-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 x86_64\n\nLast login: ${new Date(Date.now() - 86400000).toString().slice(0, 24)} from 192.168.56.101\n`);
    c.out(note(`(simulated: remote sessions are not emulated — connection to ${dest} closed.)`));
    c.out(`Connection to ${dest} closed.\n`);
  };
  C['ssh-copy-id'] = (c) => {
    const sh = c.sh;
    const dest = c.args.filter((a) => !a.startsWith('-') && a.indexOf('.pub') < 0).pop();
    if (!dest) return c.fail('Usage: ssh-copy-id [-i [identity_file]] [user@]hostname');
    const host = dest.split('@').pop();
    const keys = ['id_ed25519.pub', 'id_rsa.pub', 'id_ecdsa.pub'].filter((k) => sh.fs.exists(`${sh.vars.HOME}/.ssh/${k}`));
    if (!keys.length) return c.fail('ERROR: No identities found');
    c.err(`/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "${sh.vars.HOME}/.ssh/${keys[0]}"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed\n/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys\n`);
    if (sh.promptFn) sh.promptFn(`${dest}'s password:`, true);
    sh.state.copiedKeys = sh.state.copiedKeys || {};
    sh.state.copiedKeys[host] = true;
    c.out(`\nNumber of key(s) added: 1\n\nNow try logging into the machine, with:   "ssh '${dest}'"\nand check to make sure that only the key(s) you wanted were added.\n`);
    c.out(note(`(the public key was appended to ~/.ssh/authorized_keys on ${host})`));
  };
  C.scp = (c) => {
    const args = c.args.filter((a) => !a.startsWith('-'));
    if (args.length < 2) return c.fail('usage: scp [-346ABCOpqRrsTv] [-c cipher] [-D sftp_server_path] [-F ssh_config] source ... target', 1);
    const src = args[0];
    if (src.indexOf(':') < 0) {
      const r = c.sh.fs.tryLookup(src, c.sh.cwd);
      if (!r) return c.fail(`stat local "${src}": No such file or directory`);
      const size = SIM.fsize(r.node);
      c.out(`${src.split('/').pop().padEnd(40)} 100% ${String(size).padStart(5)}    ${(size / 1024).toFixed(1)}KB/s   00:00    \n`);
    } else c.out(note('(copying from a remote host is simulated — no file was created)'));
  };
  C.sftp = (c) => c.out(note('(sftp: interactive file transfer over SSH — get, put, ls, cd, lcd, bye)'));
  C.gpg = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    const has = (...f) => f.some((x) => args.indexOf(x) >= 0);
    const val = (f) => (args.indexOf(f) >= 0 ? args[args.indexOf(f) + 1] : null);
    const keys = sh.state.gpgKeys;
    const home = sh.vars.HOME;
    const ensureHome = () => {
      if (!sh.fs.exists(home + '/.gnupg')) {
        sh.fs.mkdir(home + '/.gnupg', '/', 0o700);
        c.err(`gpg: directory '${home}/.gnupg' created\ngpg: keybox '${home}/.gnupg/pubring.kbx' created\n`);
        sh.fs.writeFile(home + '/.gnupg/pubring.kbx', '/', '(binary keybox)\n');
      }
    };
    const files = args.filter((a, i) => !a.startsWith('-') && !['-r', '--recipient', '-o', '--output', '-u', '--local-user'].includes(args[i - 1]));
    if (has('--gen-key', '--full-generate-key', '--generate-key', '--quick-gen-key')) {
      ensureHome();
      let name = 'LPIC Student';
      let email = `${sh.username}@example.com`;
      if (sh.promptFn && !has('--quick-gen-key')) {
        name = sh.promptFn('Real name:') || name;
        email = sh.promptFn('Email address:') || email;
        sh.promptFn('Passphrase to protect your new key:', true);
      } else if (has('--quick-gen-key')) {
        const uid = files[0] || '';
        email = (/<(.*)>/.exec(uid) || [0, uid])[1];
        name = uid.replace(/\s*<.*>/, '') || name;
      }
      const id = Array.from({ length: 16 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
      keys.push({ id, name, email, created: new Date().toISOString().slice(0, 10), owner: sh.username });
      if (!sh.fs.exists(home + '/.gnupg/openpgp-revocs.d')) sh.fs.mkdir(home + '/.gnupg/openpgp-revocs.d', '/', 0o700);
      sh.fs.writeFile(home + '/.gnupg/openpgp-revocs.d/' + id + '.rev', '/', '-----BEGIN PGP PUBLIC KEY BLOCK-----\n(revocation certificate)\n');
      c.err(`gpg: ${home}/.gnupg/trustdb.gpg: trustdb created\ngpg: key ${id.slice(-16)} marked as ultimately trusted\ngpg: revocation certificate stored as '${home}/.gnupg/openpgp-revocs.d/${id}.rev'\n`);
      c.out(`public and secret key created and signed.\n\npub   rsa3072 ${keys[keys.length - 1].created} [SC] [expires: ${+keys[keys.length - 1].created.slice(0, 4) + 2}${keys[keys.length - 1].created.slice(4)}]\n      ${id.repeat(2).slice(0, 40)}\nuid                      ${name} <${email}>\nsub   rsa3072 ${keys[keys.length - 1].created} [E]\n`);
      return 0;
    }
    if (has('--list-keys', '-k', '--list-public-keys', '--list-secret-keys', '-K', '--fingerprint')) {
      ensureHome();
      const sec = has('--list-secret-keys', '-K');
      if (!keys.length) return 0;
      c.out(`${home}/.gnupg/pubring.kbx\n${'-'.repeat(home.length + 20)}\n`);
      for (const k of keys) c.out(`${sec ? 'sec' : 'pub'}   rsa3072 ${k.created} [SC]\n      ${k.id.repeat(2).slice(0, 40)}\nuid           [ultimate] ${k.name} <${k.email}>\n${sec ? 'ssb' : 'sub'}   rsa3072 ${k.created} [E]\n\n`);
      return 0;
    }
    const findKey = (q) => keys.find((k) => !q || k.id.endsWith(q.toUpperCase()) || (k.name + " <" + k.email + ">").toLowerCase().indexOf(q.toLowerCase().replace(/^<|>$/g, "")) >= 0);
    if (has('--export')) {
      const k = findKey(files[0]);
      if (!k) {
        c.err('gpg: WARNING: nothing exported\n');
        return 0;
      }
      const block = `-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQGNBG${b64(58)}\n${b64(64)}\n${b64(64)}\n=${b64(4)}\n-----END PGP PUBLIC KEY BLOCK-----\n# simulated key ${k.id} ${k.name} <${k.email}>\n`;
      const out = val('-o') || val('--output');
      if (out) sh.fs.writeFile(out, sh.cwd, block);
      else c.out(has('-a', '--armor') ? block : '(binary key data — use --armor/-a for ASCII)\n');
      return 0;
    }
    if (has('--import')) {
      ensureHome();
      const f = files[0];
      const data = f ? sh.fs.readFile(f, sh.cwd) : c.stdin || '';
      const m = /# simulated key (\w+) (.*) <(.*)>/.exec(data);
      if (!m) return c.fail('no valid OpenPGP data found.', 2);
      if (!keys.find((k) => k.id === m[1])) keys.push({ id: m[1], name: m[2], email: m[3], created: new Date().toISOString().slice(0, 10), imported: true });
      c.err(`gpg: key ${m[1].slice(-16)}: public key "${m[2]} <${m[3]}>" imported\ngpg: Total number processed: 1\ngpg:               imported: 1\n`);
      return 0;
    }
    if (has('--delete-keys', '--delete-key', '--delete-secret-keys')) {
      const k = findKey(files[0]);
      if (k) sh.state.gpgKeys = keys.filter((x) => x !== k);
      return 0;
    }
    if (has('-c', '--symmetric')) {
      const f = files[0];
      if (sh.promptFn) sh.promptFn('Enter passphrase:', true);
      const data = sh.fs.readFile(f, sh.cwd);
      const out = val('-o') || val('--output') || f + (has('-a', '--armor') ? '.asc' : '.gpg');
      sh.fs.writeFile(out, sh.cwd, 'GPGSIM\n' + JSON.stringify({ sym: true, data }));
      return 0;
    }
    if (has('-e', '--encrypt')) {
      const rcpt = val('-r') || val('--recipient');
      const k = findKey(rcpt);
      if (!k) {
        c.err(`gpg: ${rcpt || '(no recipient)'}: skipped: No public key\ngpg: ${files[0]}: encryption failed: No public key\n`);
        return 2;
      }
      const f = files[0];
      const data = f ? sh.fs.readFile(f, sh.cwd) : c.stdin || '';
      const out = val('-o') || val('--output') || (f ? f + (has('-a', '--armor') ? '.asc' : '.gpg') : null);
      const enc = has('-a', '--armor') ? `-----BEGIN PGP MESSAGE-----\n\nhQGMA${b64(60)}\n${b64(64)}\n-----END PGP MESSAGE-----\n#GPGSIM ${JSON.stringify({ key: k.id, data })}\n` : 'GPGSIM\n' + JSON.stringify({ key: k.id, data });
      if (out) sh.fs.writeFile(out, sh.cwd, enc);
      else c.out(enc);
      return 0;
    }
    if (has('-d', '--decrypt') || (files[0] && /\.(gpg|asc|pgp)$/.test(files[0]) && !has('--verify'))) {
      const f = files[0];
      const data = f ? sh.fs.readFile(f, sh.cwd) : c.stdin || '';
      const j = data.startsWith('GPGSIM\n') ? JSON.parse(data.slice(7)) : /#GPGSIM (.*)/.test(data) ? JSON.parse(/#GPGSIM (.*)/.exec(data)[1]) : null;
      if (!j) return c.fail('no valid OpenPGP data found.', 2);
      if (j.sym) {
        if (sh.promptFn) sh.promptFn('Enter passphrase:', true);
        c.err('gpg: AES256.CFB encrypted data\ngpg: encrypted with 1 passphrase\n');
      } else {
        const k = keys.find((x) => x.id === j.key && !x.imported);
        if (!k) {
          c.err(`gpg: encrypted with rsa3072 key, ID ${j.key.slice(-16)}\ngpg: decryption failed: No secret key\n`);
          return 2;
        }
        c.err(`gpg: encrypted with rsa3072 key, ID ${k.id.slice(-16)}, created ${k.created}\n      "${k.name} <${k.email}>"\n`);
      }
      const out = val('-o') || val('--output');
      if (out) sh.fs.writeFile(out, sh.cwd, j.data);
      else c.out(j.data);
      return 0;
    }
    if (has('-s', '--sign', '--clearsign', '--detach-sign', '-b')) {
      const k = findKey(val('-u') || val('--local-user'));
      if (!k || k.imported) return c.fail('no default secret key: No secret key', 2);
      const f = files[0];
      const data = sh.fs.readFile(f, sh.cwd);
      if (has('--clearsign')) sh.fs.writeFile(f + '.asc', sh.cwd, `-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA512\n\n${data}-----BEGIN PGP SIGNATURE-----\n\niQGz${b64(60)}\n-----END PGP SIGNATURE-----\n#SIG ${k.id} ${SIM.hash.sha256(data)}\n`);
      else sh.fs.writeFile(f + (has('--detach-sign', '-b') ? '.sig' : '.gpg'), sh.cwd, `GPGSIGSIM ${k.id} ${SIM.hash.sha256(data)}\n`);
      return 0;
    }
    if (has('--verify')) {
      const f = files[0];
      const sig = sh.fs.readFile(f, sh.cwd);
      const m = /(?:#SIG|GPGSIGSIM) (\w+) (\w+)/.exec(sig);
      const dataFile = files[1] || f.replace(/\.(sig|asc|gpg)$/, '');
      let data = '';
      try {
        data = /#SIG/.test(sig) ? sig.split('\n\n').slice(1).join('\n\n').split('-----BEGIN PGP SIGNATURE')[0] : sh.fs.readFile(dataFile, sh.cwd);
      } catch (e) {
        /* */
      }
      const k = m && keys.find((x) => x.id === m[1]);
      c.err(`gpg: Signature made ${new Date().toString().slice(0, 24)}\ngpg:                using RSA key ${m ? m[1].repeat(2).slice(0, 40) : 'unknown'}\n`);
      if (!k) {
        c.err("gpg: Can't check signature: No public key\n");
        return 2;
      }
      if (m[2] !== SIM.hash.sha256(data)) {
        c.err(`gpg: BAD signature from "${k.name} <${k.email}>" [ultimate]\n`);
        return 1;
      }
      c.err(`gpg: Good signature from "${k.name} <${k.email}>" [ultimate]\n`);
      return 0;
    }
    if (has('--gen-revoke', '--generate-revocation')) {
      c.out(`-----BEGIN PGP PUBLIC KEY BLOCK-----\nComment: This is a revocation certificate\n\niQG2BCAB${b64(56)}\n-----END PGP PUBLIC KEY BLOCK-----\n`);
      return 0;
    }
    c.out(note('(gpg options: --gen-key, --list-keys, --export -a, --import, -e -r user file, -d file.gpg, -c file, --sign, --clearsign, --verify)'));
  };
  C.gpg2 = C.gpg;

  /* ================= packages: Debian ================= */
  const debDb = (sh) => sh.state.packagesDeb;
  const debAvail = (sh) => sh.state.packagesDebAvail;
  const debAll = (sh) => Object.assign({}, debAvail(sh), debDb(sh));
  function installFiles(sh, files, pkg) {
    asRoot(sh, () => {
      for (const f of files.split(',')) {
        const path = f.trim();
        if (!path || sh.fs.exists(path)) continue;
        const dir = path.slice(0, path.lastIndexOf('/'));
        if (dir && !sh.fs.exists(dir)) sh.fs.mkdirp(dir, '/');
        const name = path.split('/').pop();
        if (/\/s?bin\//.test(path)) {
          const n = sh.fs.writeFile(path, '/', (SIM.cmds[name] ? '#!sim:' + name + '\n' : '') + '\x7fELF 64-bit LSB pie executable (' + pkg + ')\n');
          n.mode = 0o755;
        } else if (/\.(conf|cfg|ini)$/.test(path) || /\/etc\//.test(path)) sh.fs.writeFile(path, '/', `# ${pkg} configuration\n`);
        else if (/\.so/.test(path)) sh.fs.writeFile(path, '/', '\x7fELF shared object\n');
        else sh.fs.mkdirp(path, '/');
      }
    });
  }
  function removeFiles(sh, files, purge) {
    asRoot(sh, () => {
      for (const f of files.split(',')) {
        const p = f.trim();
        if (!p || /\/etc\//.test(p) && !purge) continue;
        const r = sh.fs.tryLookup(p, '/', false);
        if (r && r.node.t !== 'd') sh.fs.unlink(p, '/');
      }
    });
  }
  function resolveDeps(sh, names) {
    const all = debAll(sh);
    const inst = debDb(sh);
    const want = [];
    const rec = (n) => {
      if (inst[n] || want.indexOf(n) >= 0) return;
      if (!all[n]) return;
      for (const d of all[n][3]) rec(d);
      want.push(n);
    };
    names.forEach(rec);
    return want;
  }
  const lockErr = 'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?';
  function aptCore(c, tool) {
    const sh = c.sh;
    const args = c.args.filter((a) => !/^-(y|q|qq|-yes|-assume-yes|-quiet)$/.test(a));
    const yes = c.args.some((a) => /^-(y|-yes|-assume-yes)$/.test(a));
    const sub = args.shift();
    const pkgs = args.filter((a) => !a.startsWith('-'));
    const all = debAll(sh);
    const inst = debDb(sh);
    const priv = ['install', 'remove', 'purge', 'update', 'upgrade', 'full-upgrade', 'dist-upgrade', 'autoremove', 'clean', 'autoclean', 'reinstall'];
    if (priv.indexOf(sub) >= 0 && sh.uid !== 0) {
      c.err((sub === 'update' ? 'Reading package lists... Done\nE: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/' : lockErr) + '\n');
      return 100;
    }
    const reading = () => c.out('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n');
    if (tool === 'apt' && sh.io !== c.io) {
      /* */
    }
    switch (sub) {
      case 'update':
        c.out('Hit:1 http://deb.debian.org/debian bookworm InRelease\nGet:2 http://deb.debian.org/debian bookworm-updates InRelease [55.4 kB]\nGet:3 http://security.debian.org/debian-security bookworm-security InRelease [48.0 kB]\nGet:4 http://security.debian.org/debian-security bookworm-security/main amd64 Packages [148 kB]\nFetched 251 kB in 1s (310 kB/s)\nReading package lists... Done\n');
        if (tool === 'apt') c.out('Building dependency tree... Done\nReading state information... Done\n2 packages can be upgraded. Run \'apt list --upgradable\' to see them.\n');
        return 0;
      case 'upgrade':
      case 'full-upgrade':
      case 'dist-upgrade':
        reading();
        c.out('Calculating upgrade... Done\nThe following packages will be upgraded:\n  openssh-client openssh-server\n2 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\nNeed to get 1,563 kB of archives.\nAfter this operation, 0 B of additional disk space will be used.\n');
        if (!yes) c.out('Do you want to continue? [Y/n] Y\n');
        c.out('Get:1 http://security.debian.org/debian-security bookworm-security/main amd64 openssh-server amd64 1:9.2p1-2+deb12u3 [457 kB]\nGet:2 http://security.debian.org/debian-security bookworm-security/main amd64 openssh-client amd64 1:9.2p1-2+deb12u3 [991 kB]\nSetting up openssh-client (1:9.2p1-2+deb12u3) ...\nSetting up openssh-server (1:9.2p1-2+deb12u3) ...\nProcessing triggers for man-db (2.11.2-2) ...\n');
        inst['openssh-server'][0] = inst['openssh-client'][0] = '1:9.2p1-2+deb12u3';
        return 0;
      case 'install':
      case 'reinstall': {
        if (!pkgs.length) {
          reading();
          c.out('0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n');
          return 0;
        }
        // local .deb
        if (pkgs[0].endsWith('.deb')) return C.dpkg({ ...c, args: ['-i', pkgs[0]] });
        reading();
        for (const p of pkgs) {
          if (!all[p]) {
            c.err(`E: Unable to locate package ${p}\n`);
            return 100;
          }
        }
        const already = pkgs.filter((p) => inst[p] && sub !== 'reinstall');
        already.forEach((p) => c.out(`${p} is already the newest version (${inst[p][0]}).\n`));
        const want = sub === 'reinstall' ? pkgs : resolveDeps(sh, pkgs);
        if (!want.length) {
          c.out('0 upgraded, 0 newly installed, 0 to remove and 2 not upgraded.\n');
          return 0;
        }
        const extra = want.filter((p) => pkgs.indexOf(p) < 0);
        if (extra.length) c.out(`The following additional packages will be installed:\n  ${extra.join(' ')}\n`);
        c.out(`The following NEW packages will be installed:\n  ${want.join(' ')}\n0 upgraded, ${want.length} newly installed, 0 to remove and 2 not upgraded.\nNeed to get ${want.length * 183} kB of archives.\nAfter this operation, ${want.length * 512} kB of additional disk space will be used.\n`);
        if (!yes && extra.length) c.out('Do you want to continue? [Y/n] Y\n');
        want.forEach((p, i) => c.out(`Get:${i + 1} http://deb.debian.org/debian bookworm/main amd64 ${p} amd64 ${all[p][0]} [${150 + i * 33} kB]\n`));
        c.out(`Fetched ${want.length * 183} kB in 0s (${want.length * 900} kB/s)\n`);
        for (const p of want) {
          c.out(`Selecting previously unselected package ${p}.\n(Reading database ... 142318 files and directories currently installed.)\nPreparing to unpack .../${p}_${all[p][0]}_amd64.deb ...\nUnpacking ${p} (${all[p][0]}) ...\n`);
        }
        for (const p of want) {
          c.out(`Setting up ${p} (${all[p][0]}) ...\n`);
          inst[p] = all[p];
          installFiles(sh, all[p][4], p);
          if (p === 'apache2') {
            sh.state.services.apache2.active = true;
            sh.state.services.apache2.enabled = true;
            sh.state.services.apache2.pid = sh.state.nextPid++;
            c.out('Created symlink /etc/systemd/system/multi-user.target.wants/apache2.service → /lib/systemd/system/apache2.service.\n');
          }
        }
        c.out('Processing triggers for man-db (2.11.2-2) ...\n');
        asRoot(sh, () => sh.fs.writeFile('/var/log/dpkg.log', '/', want.map((p) => `${new Date().toISOString().replace('T', ' ').slice(0, 19)} install ${p}:amd64 <none> ${all[p][0]}\n`).join(''), { append: true }));
        return 0;
      }
      case 'remove':
      case 'purge': {
        reading();
        const rm = pkgs.filter((p) => inst[p]);
        pkgs.filter((p) => !inst[p]).forEach((p) => c.out(`Package '${p}' is not installed, so not removed\n`));
        if (!rm.length) {
          c.out('0 upgraded, 0 newly installed, 0 to remove and 2 not upgraded.\n');
          return 0;
        }
        if (rm.some((p) => ['bash', 'coreutils', 'libc6'].indexOf(p) >= 0)) {
          c.out('WARNING: The following essential packages will be removed.\nThis should NOT be done unless you know exactly what you are doing!\n');
          c.err('E: Removing essential system-critical packages is not permitted. This might break the system.\n');
          return 100;
        }
        c.out(`The following packages will be REMOVED:\n  ${rm.map((p) => p + (sub === 'purge' ? '*' : '')).join(' ')}\n0 upgraded, 0 newly installed, ${rm.length} to remove and 2 not upgraded.\nAfter this operation, ${rm.length * 512} kB disk space will be freed.\n`);
        if (!yes) c.out('Do you want to continue? [Y/n] Y\n');
        c.out('(Reading database ... 142318 files and directories currently installed.)\n');
        for (const p of rm) {
          c.out(`Removing ${p} (${inst[p][0]}) ...\n`);
          if (sub === 'purge') c.out(`Purging configuration files for ${p} (${inst[p][0]}) ...\n`);
          removeFiles(sh, inst[p][4], sub === 'purge');
          delete inst[p];
          if (p === 'apache2') sh.state.services.apache2.active = false;
        }
        c.out('Processing triggers for man-db (2.11.2-2) ...\n');
        return 0;
      }
      case 'autoremove':
        reading();
        c.out('0 upgraded, 0 newly installed, 0 to remove and 2 not upgraded.\n');
        return 0;
      case 'clean':
      case 'autoclean':
        return 0;
      case 'search': {
        const kw = pkgs.join(' ').toLowerCase();
        if (tool === 'apt') c.out('Sorting... Done\nFull Text Search... Done\n');
        for (const [k, v] of Object.entries(all).sort()) {
          if (k.indexOf(kw) >= 0 || v[1].toLowerCase().indexOf(kw) >= 0) {
            if (tool === 'apt') c.out(`\x1b[32m${k}\x1b[0m/stable ${v[0]} amd64${inst[k] ? ' [installed]' : ''}\n  ${v[1]}\n\n`);
            else c.out(`${k} - ${v[1]}\n`);
          }
        }
        return 0;
      }
      case 'show':
      case 'showpkg': {
        for (const p of pkgs) {
          const v = all[p];
          if (!v) {
            c.err(`N: Unable to locate package ${p}\nE: No packages found\n`);
            return 100;
          }
          c.out(`Package: ${p}\nVersion: ${v[0]}\nPriority: optional\nSection: ${v[2]}\nMaintainer: Debian Developers <debian-devel@lists.debian.org>\nInstalled-Size: 512 kB\nDepends: ${v[3].join(', ') || 'libc6 (>= 2.34)'}\nHomepage: https://packages.debian.org/${p}\n${tool === 'apt' && inst[p] ? 'APT-Manual-Installed: yes\n' : ''}APT-Sources: http://deb.debian.org/debian bookworm/main amd64 Packages\nDescription: ${v[1]}\n\n`);
        }
        return 0;
      }
      case 'depends': {
        for (const p of pkgs) {
          const v = all[p];
          if (!v) return c.fail(`E: No packages found`, 100);
          c.out(`${p}\n${v[3].map((d) => '  Depends: ' + d).join('\n')}${v[3].length ? '\n' : ''}  Depends: libc6\n`);
        }
        return 0;
      }
      case 'rdepends': {
        for (const p of pkgs) {
          c.out(`${p}\nReverse Depends:\n`);
          for (const [k, v] of Object.entries(all)) if (v[3].indexOf(p) >= 0) c.out(`  ${k}\n`);
        }
        return 0;
      }
      case 'policy': {
        for (const p of pkgs) {
          const v = all[p];
          if (!v) continue;
          c.out(`${p}:\n  Installed: ${inst[p] ? inst[p][0] : '(none)'}\n  Candidate: ${v[0]}\n  Version table:\n ${inst[p] ? '***' : '   '} ${v[0]} 500\n        500 http://deb.debian.org/debian bookworm/main amd64 Packages\n${inst[p] ? '        100 /var/lib/dpkg/status\n' : ''}`);
        }
        return 0;
      }
      case 'pkgnames':
        Object.keys(all).sort().forEach((k) => c.out(k + '\n'));
        return 0;
      case 'list': {
        const installed = c.args.indexOf('--installed') >= 0;
        const upg = c.args.indexOf('--upgradable') >= 0;
        c.out('Listing... Done\n');
        if (upg) {
          c.out('openssh-client/stable-security 1:9.2p1-2+deb12u3 amd64 [upgradable from: 1:9.2p1-2+deb12u2]\nopenssh-server/stable-security 1:9.2p1-2+deb12u3 amd64 [upgradable from: 1:9.2p1-2+deb12u2]\n');
          return 0;
        }
        for (const [k, v] of Object.entries(installed ? inst : all).sort()) {
          if (pkgs.length && !pkgs.some((p) => SIM.patMatch(k, p))) continue;
          c.out(`${k}/stable ${v[0]} amd64${inst[k] ? ' [installed]' : ''}\n`);
        }
        return 0;
      }
      case 'download': {
        for (const p of pkgs) {
          if (!all[p]) return c.fail(`E: Unable to locate package ${p}`, 100);
          sh.fs.writeFile(`${p}_${all[p][0].replace(/^\d+:/, '')}_amd64.deb`, sh.cwd, `!<arch>\ndebian-binary (simulated .deb of ${p})\n`);
          c.out(`Get:1 http://deb.debian.org/debian bookworm/main amd64 ${p} amd64 ${all[p][0]} [183 kB]\nFetched 183 kB in 0s (1,210 kB/s)\n`);
        }
        return 0;
      }
      case 'source':
        c.out(note('(apt-get source downloads the source package — needs deb-src lines in sources.list)'));
        return 0;
    }
    c.err(`E: Invalid operation ${sub || ''}\n`);
    return 100;
  }
  C.apt = (c) => {
    if (c.io.tty && c.io.out !== c.io.tty) c.err('\nWARNING: apt does not have a stable CLI interface. Use with caution in scripts.\n\n');
    return aptCore(c, 'apt');
  };
  C['apt-get'] = (c) => aptCore(c, 'apt-get');
  C['apt-cache'] = (c) => aptCore(c, 'apt-cache');
  C.aptitude = (c) => aptCore(c, 'apt-get');
  C['apt-file'] = (c) => {
    const [sub, term] = c.args;
    if (sub !== 'search') return c.fail('usage: apt-file search <pattern>');
    for (const [k, v] of Object.entries(debAll(c.sh))) for (const f of v[4].split(',')) if (f.indexOf(term) >= 0) c.out(`${k}: ${f}\n`);
  };
  C.dpkg = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    const op = args.shift();
    const rest = args;
    const inst = debDb(sh);
    const all = debAll(sh);
    const priv = ['-i', '--install', '-r', '--remove', '-P', '--purge', '--configure', '--unpack'];
    if (priv.indexOf(op) >= 0 && sh.uid !== 0) {
      c.err('dpkg: error: requested operation requires superuser privilege\n');
      return 2;
    }
    const listRows = (names) => {
      c.out('Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name                          Version                Architecture Description\n+++-=============================-======================-============-===================================\n');
      for (const n of names) {
        const v = inst[n];
        if (v) c.out(`ii  ${n.padEnd(29)} ${v[0].padEnd(22)} amd64        ${v[1].slice(0, 50)}\n`);
        else if (sh.state.removedConf && sh.state.removedConf[n]) c.out(`rc  ${n.padEnd(29)} ${sh.state.removedConf[n].padEnd(22)} amd64        (config files remain)\n`);
      }
    };
    switch (op) {
      case '-l':
      case '--list': {
        let names = Object.keys(inst).sort();
        if (rest.length) {
          names = names.filter((n) => rest.some((p) => SIM.patMatch(n, p)));
          if (!names.length) {
            c.err(`dpkg-query: no packages found matching ${rest[0]}\n`);
            return 1;
          }
        }
        listRows(names);
        return 0;
      }
      case '-L':
      case '--listfiles': {
        for (const p of rest) {
          if (!inst[p]) {
            c.err(`dpkg-query: package '${p}' is not installed\nUse dpkg --contents (= dpkg-deb --contents) to list archive files contents.\n`);
            return 1;
          }
          const files = inst[p][4].split(',');
          const dirs = new Set();
          files.forEach((f) => f.split('/').slice(1, -1).reduce((acc, x) => (dirs.add(acc + '/' + x), acc + '/' + x), ''));
          c.out('/.\n' + [...dirs].sort().join('\n') + '\n' + files.join('\n') + `\n/usr/share/doc/${p}\n/usr/share/doc/${p}/copyright\n`);
        }
        return 0;
      }
      case '-S':
      case '--search': {
        const t = rest[0];
        const hits = Object.entries(inst).filter(([, v]) => v[4].split(',').some((f) => f === t || f.indexOf(t) >= 0 || ('/usr' + f) === t || f.split('/').pop() === t.split('/').pop() && t.indexOf('/') >= 0));
        if (!hits.length) {
          c.err(`dpkg-query: no path found matching pattern *${t}*\n`);
          return 1;
        }
        hits.forEach(([k, v]) => c.out(`${k}: ${v[4].split(',').find((f) => f.indexOf(t.split('/').pop()) >= 0)}\n`));
        return 0;
      }
      case '-s':
      case '--status': {
        const p = rest[0];
        const v = inst[p];
        if (!v) {
          c.err(`dpkg-query: package '${p}' is not installed and no information is available\n`);
          return 1;
        }
        c.out(`Package: ${p}\nStatus: install ok installed\nPriority: optional\nSection: ${v[2]}\nInstalled-Size: 512\nMaintainer: Debian Developers\nArchitecture: amd64\nVersion: ${v[0]}\nDepends: ${v[3].join(', ') || 'libc6 (>= 2.34)'}\nDescription: ${v[1]}\n`);
        return 0;
      }
      case '-p':
      case '--print-avail':
        return C['apt-cache']({ ...c, args: ['show', ...rest] });
      case '--get-selections':
        Object.keys(inst).sort().forEach((n) => c.out(`${n.padEnd(48)}install\n`));
        return 0;
      case '-c':
      case '--contents':
      case '-I':
      case '--info': {
        const f = rest[0];
        const data = sh.fs.readFile(f, sh.cwd);
        if (!data.startsWith('!<arch>')) return c.fail(`dpkg-deb: error: '${f}' is not a Debian format archive`, 2);
        const name = f.split('/').pop().split('_')[0];
        const v = all[name] || ['1.0', 'local package', 'misc', [], `/usr/bin/${name}`];
        if (op === '-c' || op === '--contents') v[4].split(',').forEach((x) => c.out(`-rwxr-xr-x root/root    152416 2023-01-15 10:00 .${x}\n`));
        else c.out(` new Debian package, version 2.0.\n size 152416 bytes: control archive=1120 bytes.\n Package: ${name}\n Version: ${v[0]}\n Architecture: amd64\n Depends: ${v[3].join(', ') || 'libc6'}\n Description: ${v[1]}\n`);
        return 0;
      }
      case '-i':
      case '--install': {
        for (const f of rest) {
          let data;
          try {
            data = sh.fs.readFile(f, sh.cwd);
          } catch (e) {
            c.err(`dpkg: error: cannot access archive '${f}': No such file or directory\n`);
            return 1;
          }
          if (!data.startsWith('!<arch>')) {
            c.err(`dpkg-deb: error: '${f}' is not a Debian format archive\n`);
            return 1;
          }
          const name = f.split('/').pop().split('_')[0];
          const v = all[name] || [f.split('_')[1] || '1.0', 'locally installed package', 'misc', [], `/usr/bin/${name}`];
          const missing = v[3].filter((d) => !inst[d]);
          c.out(`Selecting previously unselected package ${name}.\n(Reading database ... 142318 files and directories currently installed.)\nPreparing to unpack ${f} ...\nUnpacking ${name} (${v[0]}) ...\n`);
          if (missing.length) {
            c.err(`dpkg: dependency problems prevent configuration of ${name}:\n ${name} depends on ${missing[0]}; however:\n  Package ${missing[0]} is not installed.\n\ndpkg: error processing package ${name} (--install):\n dependency problems - leaving unconfigured\nErrors were encountered while processing:\n ${name}\n`);
            c.err(note('(fix with: sudo apt-get install -f   — apt resolves and installs the missing dependencies)'));
            sh.state.brokenDeb = { name, v };
            return 1;
          }
          c.out(`Setting up ${name} (${v[0]}) ...\nProcessing triggers for man-db (2.11.2-2) ...\n`);
          inst[name] = v;
          installFiles(sh, v[4], name);
        }
        return 0;
      }
      case '-r':
      case '--remove':
      case '-P':
      case '--purge': {
        for (const p of rest) {
          if (!inst[p]) {
            c.err(`dpkg: warning: ignoring request to remove ${p} which isn't installed\n`);
            continue;
          }
          const deps = Object.entries(inst).filter(([, v]) => v[3].indexOf(p) >= 0).map(([k]) => k);
          if (deps.length) {
            c.err(`dpkg: dependency problems prevent removal of ${p}:\n ${deps[0]} depends on ${p}.\n\ndpkg: error processing package ${p} (--remove):\n dependency problems - not removing\n`);
            return 1;
          }
          c.out(`(Reading database ... 142318 files and directories currently installed.)\nRemoving ${p} (${inst[p][0]}) ...\n`);
          if (op === '-P' || op === '--purge') c.out(`Purging configuration files for ${p} (${inst[p][0]}) ...\n`);
          else (sh.state.removedConf = sh.state.removedConf || {})[p] = inst[p][0];
          removeFiles(sh, inst[p][4], op === '-P' || op === '--purge');
          delete inst[p];
        }
        return 0;
      }
      case '--configure':
        c.out(rest[0] === '-a' ? '' : `Setting up ${rest[0]} ...\n`);
        return 0;
      case '--version':
        c.out("Debian 'dpkg' package management program version 1.21.22 (amd64).\n");
        return 0;
    }
    c.err(`dpkg: error: need an action option\n\nType dpkg --help for help about installing and deinstalling packages [*];\nUse 'apt' or 'aptitude' for user-friendly package management;\n`);
    return 2;
  };
  C['dpkg-query'] = (c) => {
    if (c.args[0] === '-W' || c.args[0] === '--show') {
      const inst = debDb(c.sh);
      const pat = c.args.filter((a) => !a.startsWith('-'))[0];
      for (const [k, v] of Object.entries(inst).sort()) if (!pat || SIM.patMatch(k, pat)) c.out(`${k}\t${v[0]}\n`);
      return 0;
    }
    return C.dpkg(c);
  };
  C['dpkg-deb'] = (c) => C.dpkg({ ...c, args: c.args.map((a) => (a === '--contents' ? '-c' : a)) });
  const origAptGet = C['apt-get'];
  C['apt-get'] = (c) => {
    if ((c.args[0] === 'install' || c.args[0] === '-f') && c.args.indexOf('-f') >= 0 && c.sh.state.brokenDeb) {
      if (c.sh.uid !== 0) {
        c.err(lockErr + '\n');
        return 100;
      }
      const b = c.sh.state.brokenDeb;
      const need = b.v[3].filter((d) => !debDb(c.sh)[d]);
      c.out('Reading package lists... Done\nBuilding dependency tree... Done\nCorrecting dependencies... Done\n');
      for (const d of need) {
        const v = debAll(c.sh)[d];
        if (v) {
          debDb(c.sh)[d] = v;
          c.out(`Setting up ${d} (${v[0]}) ...\n`);
        }
      }
      debDb(c.sh)[b.name] = b.v;
      installFiles(c.sh, b.v[4], b.name);
      c.out(`Setting up ${b.name} (${b.v[0]}) ...\n`);
      c.sh.state.brokenDeb = null;
      return 0;
    }
    return origAptGet(c);
  };

  /* ================= packages: RPM ================= */
  const rpmDb = (sh) => sh.state.packagesRpm;
  const rpmAvail = (sh) => sh.state.packagesRpmAvail;
  C.rpm = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    const flagStr = args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join('').replace(/-/g, '');
    const long = args.filter((a) => a.startsWith('--'));
    const targets = args.filter((a) => !a.startsWith('-'));
    const db = rpmDb(sh);
    const full = (n) => `${n}-${db[n][0]}.${db[n][1]}`;
    if (long.indexOf('--import') >= 0) {
      if (needRoot(c, 'error: cannot open Packages index using db5 - Permission denied (13)')) return 1;
      return 0;
    }
    if (/q/.test(flagStr) || long.indexOf('--query') >= 0) {
      const findByName = (t) => db[t] ? t : Object.keys(db).find((n) => full(n) === t);
      if (/a/.test(flagStr)) {
        let names = Object.keys(db).sort();
        if (targets.length) names = names.filter((n) => targets.some((t) => SIM.patMatch(n, t)));
        names.forEach((n) => c.out(full(n) + '\n'));
        return 0;
      }
      if (/f/.test(flagStr)) {
        for (const t of targets) {
          const hit = Object.keys(db).find((n) => db[n][3].split(',').some((f) => f === t));
          if (hit) c.out(full(hit) + '\n');
          else c.out(`file ${t} is not owned by any package\n`);
        }
        return 0;
      }
      if (/p/.test(flagStr)) {
        for (const t of targets) {
          if (!sh.fs.exists(t, sh.cwd)) return c.fail(`error: open of ${t} failed: No such file or directory`);
          const name = t.split('/').pop().replace(/-\d.*$/, '');
          const v = rpmAvail(sh)[name] || db[name] || ['1.0-1', 'x86_64', 'local package', '/usr/bin/' + name];
          if (/i/.test(flagStr)) c.out(`Name        : ${name}\nVersion     : ${v[0].split('-')[0]}\nRelease     : ${v[0].split('-').slice(1).join('-')}\nArchitecture: ${v[1]}\nSummary     : ${v[2]}\n`);
          else if (/l/.test(flagStr)) c.out(v[3].split(',').join('\n') + '\n');
          else if (/R/.test(flagStr)) c.out('libc.so.6()(64bit)\nlibncursesw.so.6()(64bit)\nrtld(GNU_HASH)\n');
          else c.out(`${name}-${v[0]}.${v[1]}\n`);
        }
        return 0;
      }
      let st = 0;
      for (const t of targets) {
        const n = findByName(t);
        if (!n) {
          c.out(`package ${t} is not installed\n`);
          st = 1;
          continue;
        }
        const v = db[n];
        if (/i/.test(flagStr)) c.out(`Name        : ${n}\nVersion     : ${v[0].split('-')[0]}\nRelease     : ${v[0].split('-').slice(1).join('-')}\nArchitecture: ${v[1]}\nInstall Date: ${new Date(Date.now() - 30 * 86400000).toString().slice(0, 24)}\nGroup       : Unspecified\nSize        : 2154801\nLicense     : GPLv3+\nSignature   : RSA/SHA256, Key ID 702d426d350d275d\nSource RPM  : ${n}-${v[0]}.src.rpm\nBuild Date  : ${new Date(Date.now() - 90 * 86400000).toString().slice(0, 24)}\nPackager    : Rocky Linux Build System\nSummary     : ${v[2]}\nDescription :\n${v[2]}.\n`);
        else if (/l/.test(flagStr)) c.out(v[3].split(',').join('\n') + '\n');
        else if (/c/.test(flagStr)) c.out(v[3].split(',').filter((f) => f.startsWith('/etc')).join('\n') + '\n');
        else if (/d/.test(flagStr)) c.out(`/usr/share/doc/${n}/README\n/usr/share/man/man1/${n}.1.gz\n`);
        else if (/R/.test(flagStr) || long.indexOf('--requires') >= 0) c.out('/bin/sh\nlibc.so.6()(64bit)\nrpmlib(CompressedFileNames) <= 3.0.4-1\n');
        else if (long.indexOf('--changelog') >= 0) c.out(`* ${new Date().toDateString()} Rocky Build System - ${v[0]}\n- Security fixes\n`);
        else c.out(full(n) + '\n');
      }
      return st;
    }
    if (/[iUF]/.test(flagStr) || long.indexOf('--install') >= 0) {
      if (needRoot(c, 'error: can\'t create transaction lock on /var/lib/rpm/.rpm.lock (Permission denied)')) return 1;
      for (const t of targets) {
        if (!sh.fs.exists(t, sh.cwd)) return c.fail(`error: open of ${t} failed: No such file or directory`);
        const name = t.split('/').pop().replace(/-\d.*$/, '');
        const v = rpmAvail(sh)[name] || ['1.0-1', 'x86_64', 'local package', '/usr/bin/' + name];
        if (/F/.test(flagStr) && !db[name]) continue;
        if (db[name] && /i/.test(flagStr)) return c.fail(`\tpackage ${name}-${db[name][0]}.${db[name][1]} is already installed`);
        if (/v|h/.test(flagStr)) c.out(`Verifying...                          ################################# [100%]\nPreparing...                          ################################# [100%]\n${db[name] ? 'Updating / installing...' : 'Updating / installing...'}\n   1:${name}-${v[0]}${' '.repeat(Math.max(1, 31 - name.length - v[0].length))}################################# [100%]\n`);
        db[name] = v;
        installFiles(sh, v[3], name);
      }
      return 0;
    }
    if (/e/.test(flagStr) || long.indexOf('--erase') >= 0) {
      if (needRoot(c, 'error: can\'t create transaction lock on /var/lib/rpm/.rpm.lock (Permission denied)')) return 1;
      for (const t of targets) {
        const n = db[t] ? t : null;
        if (!n) return c.fail(`error: package ${t} is not installed`);
        if (/test/.test(long.join())) continue;
        removeFiles(sh, db[n][3], true);
        delete db[n];
      }
      return 0;
    }
    if (/V/.test(flagStr)) {
      for (const t of targets) {
        if (!db[t]) return c.fail(`package ${t} is not installed`);
        if (t === 'openssh-server') c.out('S.5....T.  c /etc/ssh/sshd_config\n');
      }
      return 0;
    }
    if (/K/.test(flagStr) || long.indexOf('--checksig') >= 0) {
      for (const t of targets) c.out(`${t}: digests signatures OK\n`);
      return 0;
    }
    c.out('RPM version 4.18.0\nUsage: rpm [-aKfgpqVcdLilsiv?] [-q|--query] [-V|--verify] [-i|--install] [-U|--upgrade] [-e|--erase] ...\n');
  };
  C.rpm2cpio = (c) => {
    const f = c.args[0];
    if (!f) return c.fail('usage: rpm2cpio <package>');
    if (!c.fs.exists(f, c.sh.cwd)) return c.fail(`${f}: No such file or directory`);
    const name = f.split('/').pop().replace(/-\d.*$/, '');
    const v = rpmAvail(c.sh)[name] || ['1.0-1', 'x86_64', 'pkg', '/usr/bin/' + name];
    const entries = [];
    const dirs = new Set();
    for (const p of v[3].split(',')) {
      p.split('/').slice(1, -1).reduce((acc, x) => (dirs.add(acc + '/' + x), acc + '/' + x), '.');
    }
    [...dirs].sort().forEach((d) => entries.push({ p: d.slice(2), t: 'd', mode: 0o755, uid: 0, gid: 0, mtime: Date.now(), size: 0 }));
    for (const p of v[3].split(',')) entries.push({ p: '.' + p, t: 'f', mode: 0o755, uid: 0, gid: 0, mtime: Date.now(), data: `#!sim:${name}\n(extracted from ${f})\n`, size: 152416 });
    c.out('SIMCPIO\n' + JSON.stringify(entries.map((e) => ({ ...e, p: e.p.replace(/^\.\//, '') }))));
  };
  function yumCore(c, tool) {
    const sh = c.sh;
    const yes = c.args.some((a) => /^-(y|-assumeyes)$/.test(a));
    const args = c.args.filter((a) => !/^-(y|q|-assumeyes|-quiet)$/.test(a));
    const sub = args.shift();
    const pkgs = args.filter((a) => !a.startsWith('-'));
    const db = rpmDb(sh);
    const av = rpmAvail(sh);
    const all = Object.assign({}, av, db);
    const priv = ['install', 'remove', 'erase', 'update', 'upgrade', 'reinstall', 'downgrade', 'autoremove', 'groupinstall', 'localinstall'];
    if (priv.indexOf(sub) >= 0 && sh.uid !== 0) {
      c.err('Error: This command has to be run with superuser privileges (under the root user on most systems).\n');
      return 1;
    }
    const meta = () => c.out(`Last metadata expiration check: 0:42:13 ago on ${new Date(Date.now() - 2533000).toString().slice(0, 24)}.\n`);
    switch (sub) {
      case 'install':
      case 'localinstall':
      case 'reinstall': {
        meta();
        const want = [];
        for (const p of pkgs) {
          if (p.endsWith('.rpm')) return C.rpm({ ...c, args: ['-ivh', p] });
          if (db[p] && sub !== 'reinstall') {
            c.out(`Package ${p}-${db[p][0]}.${db[p][1]} is already installed.\n`);
            continue;
          }
          if (!all[p]) {
            c.out(`No match for argument: ${p}\n`);
            c.err('Error: Unable to find a match: ' + p + '\n');
            return 1;
          }
          want.push(p);
        }
        if (!want.length) {
          c.out('Dependencies resolved.\nNothing to do.\nComplete!\n');
          return 0;
        }
        c.out(`Dependencies resolved.\n${'='.repeat(80)}\n Package          Architecture   Version                 Repository        Size\n${'='.repeat(80)}\nInstalling:\n`);
        want.forEach((p) => c.out(` ${p.padEnd(16)} ${all[p][1].padEnd(14)} ${all[p][0].padEnd(23)} ${'appstream'.padEnd(13)} 152 k\n`));
        c.out(`\nTransaction Summary\n${'='.repeat(80)}\nInstall  ${want.length} Package${want.length > 1 ? 's' : ''}\n\nTotal download size: ${want.length * 152} k\nInstalled size: ${want.length * 412} k\n`);
        if (!yes) c.out('Is this ok [y/N]: y\n');
        c.out('Downloading Packages:\nRunning transaction check\nTransaction check succeeded.\nRunning transaction test\nTransaction test succeeded.\nRunning transaction\n');
        want.forEach((p, i) => {
          c.out(`  Installing       : ${p}-${all[p][0]}.${all[p][1]}${' '.repeat(10)}${i + 1}/${want.length}\n`);
          db[p] = all[p];
          installFiles(sh, all[p][3], p);
        });
        c.out(`\nInstalled:\n  ${want.map((p) => `${p}-${all[p][0]}.${all[p][1]}`).join('  ')}\n\nComplete!\n`);
        return 0;
      }
      case 'remove':
      case 'erase': {
        const rm = pkgs.filter((p) => db[p]);
        if (!rm.length) {
          c.out(`No match for argument: ${pkgs[0]}\nNo packages marked for removal.\nDependencies resolved.\nNothing to do.\nComplete!\n`);
          return 0;
        }
        if (rm.indexOf('bash') >= 0 || rm.indexOf('coreutils') >= 0) {
          c.err('Error: \n Problem: The operation would result in removing the following protected packages: ' + rm.join(', ') + '\n');
          return 1;
        }
        c.out(`Dependencies resolved.\nRemoving:\n${rm.map((p) => ` ${p.padEnd(16)} ${db[p][1].padEnd(14)} ${db[p][0]}`).join('\n')}\n\nTransaction Summary\nRemove  ${rm.length} Package\n`);
        if (!yes) c.out('Is this ok [y/N]: y\n');
        rm.forEach((p) => {
          removeFiles(sh, db[p][3], true);
          delete db[p];
        });
        c.out(`\nRemoved:\n  ${rm.join('  ')}\n\nComplete!\n`);
        return 0;
      }
      case 'update':
      case 'upgrade':
        meta();
        c.out('Dependencies resolved.\nUpgrading:\n kernel           x86_64         5.14.0-362.13.1.el9_3   baseos            4.9 M\n\nTransaction Summary\nUpgrade  1 Package\n');
        if (!yes) c.out('Is this ok [y/N]: y\n');
        c.out('Complete!\n');
        return 0;
      case 'check-update':
        meta();
        c.out('\nkernel.x86_64                     5.14.0-362.13.1.el9_3                 baseos\n');
        return 100;
      case 'search': {
        meta();
        const kw = pkgs.join(' ').toLowerCase();
        c.out(`================== Name ${tool === 'zypper' ? '' : '& Summary'} Matched: ${kw} ==================\n`);
        for (const [k, v] of Object.entries(all)) if (k.indexOf(kw) >= 0 || v[2].toLowerCase().indexOf(kw) >= 0) c.out(`${k}.${v[1]} : ${v[2]}\n`);
        return 0;
      }
      case 'info': {
        for (const p of pkgs) {
          const v = all[p];
          if (!v) {
            c.err('Error: No matching Packages to list\n');
            return 1;
          }
          c.out(`${db[p] ? 'Installed Packages' : 'Available Packages'}\nName         : ${p}\nVersion      : ${v[0].split('-')[0]}\nRelease      : ${v[0].split('-').slice(1).join('-')}\nArchitecture : ${v[1]}\nSize         : 2.1 M\nRepository   : ${db[p] ? '@System' : 'appstream'}\nSummary      : ${v[2]}\nLicense      : GPLv2+\n\n`);
        }
        return 0;
      }
      case 'list': {
        const which = pkgs[0];
        if (which !== 'available') {
          c.out('Installed Packages\n');
          for (const [k, v] of Object.entries(db).sort()) if (!which || which === 'installed' || SIM.patMatch(k, which)) c.out(`${(k + '.' + v[1]).padEnd(34)} ${v[0].padEnd(28)} @baseos\n`);
        }
        if (which !== 'installed') {
          c.out('Available Packages\n');
          for (const [k, v] of Object.entries(av).sort()) if (!db[k] && (!which || which === 'available' || SIM.patMatch(k, which))) c.out(`${(k + '.' + v[1]).padEnd(34)} ${v[0].padEnd(28)} appstream\n`);
        }
        return 0;
      }
      case 'provides':
      case 'whatprovides': {
        const t = pkgs[0] || '';
        for (const [k, v] of Object.entries(all)) {
          if (v[3].split(',').some((f) => f === t || f.endsWith('/' + t) || SIM.patMatch(f, t))) c.out(`${k}-${v[0]}.${v[1]} : ${v[2]}\nRepo        : ${db[k] ? '@System' : 'appstream'}\nMatched from:\nFilename    : ${v[3].split(',').find((f) => f.endsWith(t.split('/').pop()) || SIM.patMatch(f, t))}\n\n`);
        }
        return 0;
      }
      case 'repolist':
        c.out('repo id                   repo name\nappstream                 Rocky Linux 9 - AppStream\nbaseos                    Rocky Linux 9 - BaseOS\nextras                    Rocky Linux 9 - Extras\n');
        return 0;
      case 'clean':
        c.out('25 files removed\n');
        return 0;
      case 'makecache':
        c.out('Metadata cache created.\n');
        return 0;
      case 'history':
        c.out('ID     | Command line             | Date and time    | Action(s)      | Altered\n-------------------------------------------------------------------------------\n     2 | install vim-enhanced     | 2026-09-12 10:11 | Install        |    3\n     1 |                          | 2026-09-01 08:00 | Install        |  412 EE\n');
        return 0;
      case 'download':
        for (const p of pkgs) {
          if (!all[p]) return c.fail(`No package ${p} available.`);
          sh.fs.writeFile(`${p}-${all[p][0]}.${all[p][1]}.rpm`, sh.cwd, '\xed\xab\xee\xdb(simulated rpm)\n');
          c.out(`${p}-${all[p][0]}.${all[p][1]}.rpm   152 kB/s | 152 kB     00:01\n`);
        }
        return 0;
      case 'autoremove':
        c.out('Dependencies resolved.\nNothing to do.\nComplete!\n');
        return 0;
      case 'groupinstall':
      case 'grouplist':
        c.out('Available Environment Groups:\n   Server\n   Minimal Install\n   Workstation\nAvailable Groups:\n   Development Tools\n   System Tools\n');
        return 0;
    }
    c.err(`No such command: ${sub}. Please use /usr/bin/${tool} --help\n`);
    return 1;
  }
  C.yum = (c) => yumCore(c, 'yum');
  C.dnf = (c) => yumCore(c, 'dnf');
  C.yumdownloader = (c) => yumCore({ ...c, args: ['download', ...c.args] }, 'yum');
  C.zypper = (c) => {
    const sh = c.sh;
    const map = { in: 'install', install: 'install', rm: 'remove', remove: 'remove', se: 'search', search: 'search', if: 'info', info: 'info', up: 'update', update: 'update', ref: 'refresh', refresh: 'refresh', lr: 'repos', repos: 'repos', ar: 'addrepo', addrepo: 'addrepo', rr: 'removerepo', patches: 'patches', lu: 'list-updates', 'list-updates': 'list-updates', wp: 'what-provides', 'what-provides': 'what-provides', se2: 'search' };
    const args = c.args.filter((a) => !/^(-n|--non-interactive|-y)$/.test(a));
    const sub = map[args[0]];
    const rest = args.slice(1);
    if (!sub) return c.fail(`Unknown command '${args[0] || ''}'`);
    if (['install', 'remove', 'update', 'refresh', 'addrepo', 'removerepo'].indexOf(sub) >= 0 && sh.uid !== 0) {
      c.err('Root privileges are required to run this command.\n');
      return 5;
    }
    if (sub === 'refresh') {
      c.out("Repository 'Main Repository' is up to date.\nRepository 'Main Update Repository' is up to date.\nAll repositories have been refreshed.\n");
      return 0;
    }
    if (sub === 'repos') {
      c.out('# | Alias    | Name                   | Enabled | GPG Check | Refresh\n--+----------+------------------------+---------+-----------+--------\n1 | repo-oss | Main Repository        | Yes     | (r ) Yes  | Yes\n2 | repo-upd | Main Update Repository | Yes     | (r ) Yes  | Yes\n');
      return 0;
    }
    if (sub === 'addrepo') {
      c.out(`Adding repository '${rest[rest.length - 1]}' ...[done]\nRepository '${rest[rest.length - 1]}' successfully added\n`);
      return 0;
    }
    if (sub === 'search') {
      const kw = rest[0] || '';
      const all = Object.assign({}, rpmAvail(sh), rpmDb(sh));
      c.out('Loading repository data...\nReading installed packages...\n\nS | Name           | Summary                                   | Type\n--+----------------+-------------------------------------------+--------\n');
      for (const [k, v] of Object.entries(all)) if (k.indexOf(kw) >= 0) c.out(`${rpmDb(sh)[k] ? 'i' : ' '} | ${k.padEnd(14)} | ${v[2].slice(0, 41).padEnd(41)} | package\n`);
      return 0;
    }
    if (sub === 'install') {
      c.out('Loading repository data...\nReading installed packages...\nResolving package dependencies...\n\n');
      const r = yumCore({ ...c, args: ['install', '-y', ...rest], out: () => {} }, 'zypper');
      if (!r) c.out(`The following NEW package is going to be installed:\n  ${rest.join(' ')}\n\n1 new package to install.\nContinue? [y/n/v/...? shows all options] (y): y\nRetrieving: ${rest[0]} ...[done]\n(1/1) Installing: ${rest[0]} ...[done]\n`);
      return r;
    }
    if (sub === 'remove') {
      c.out('Loading repository data...\nReading installed packages...\nResolving package dependencies...\n\n');
      const r = yumCore({ ...c, args: ['remove', '-y', ...rest], out: () => {} }, 'zypper');
      if (!r) c.out(`The following package is going to be REMOVED:\n  ${rest.join(' ')}\n\n(1/1) Removing ${rest[0]} ...[done]\n`);
      return r;
    }
    if (sub === 'info') return yumCore({ ...c, args: ['info', ...rest] }, 'zypper');
    if (sub === 'what-provides') return yumCore({ ...c, args: ['provides', ...rest] }, 'zypper');
    if (sub === 'update' || sub === 'list-updates' || sub === 'patches') {
      c.out('Loading repository data...\nReading installed packages...\nNothing to do.\n');
      return 0;
    }
  };

  /* ================= mail ================= */
  function deliver(sh, to, from, subject, body) {
    const aliases = sh.fs.readFile('/etc/aliases', '/');
    let target = to.replace(/@.*/, '');
    const seen = new Set();
    for (;;) {
      const m = new RegExp('^' + target + ':\\s*(\\S+)', 'm').exec(aliases);
      if (!m || seen.has(target)) break;
      seen.add(target);
      target = m[1].replace(/@.*/, '');
    }
    const home = sh.user(target) ? sh.user(target).home : null;
    const fwd = home && sh.fs.exists(home + '/.forward') ? asRoot(sh, () => sh.fs.readFile(home + '/.forward', '/').trim()) : null;
    if (fwd) target = fwd.replace(/@.*/, '');
    if (!sh.user(target)) return `${to}: User unknown`;
    asRoot(sh, () => sh.fs.writeFile('/var/mail/' + target, '/', `From ${from}@${sh.state.hostname}  ${new Date().toString().slice(0, 24)}\nFrom: ${from}@${sh.state.hostname}\nTo: ${to}\nSubject: ${subject}\n\n${body.replace(/\n?$/, '\n')}\n`, { append: true }));
    asRoot(sh, () => sh.fs.writeFile('/var/log/mail.log', '/', `${SIM.strftime('%b %e %T', Date.now(), 'UTC')} ${sh.state.hostname} postfix/local[${sh.state.nextPid++}]: to=<${target}@${sh.state.hostname}>, orig_to=<${to}>, relay=local, status=sent (delivered to mailbox)\n`, { append: true }));
    return null;
  }
  SIM.deliverMail = deliver;
  C.mail = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 's:c:b:a:r:fuNH', { 'subject=': 's' });
    if (rest.length) {
      let body = c.stdin;
      if (body === null) body = sh.promptFn ? (sh.promptFn('Message body (single line, Ctrl-D in a real terminal ends input):') || '') : '';
      for (const to of rest) {
        const e = deliver(sh, to, sh.username, o.s || '', body);
        if (e) c.err(e + '\n');
      }
      return 0;
    }
    const box = '/var/mail/' + (o.u || sh.username);
    let data = '';
    try {
      data = sh.fs.readFile(box, '/');
    } catch (e) {
      c.out(`No mail for ${sh.username}\n`);
      return 1;
    }
    const msgs = data.split(/\n(?=From \S+  )/).filter((m) => m.trim());
    if (!msgs.length) {
      c.out(`No mail for ${sh.username}\n`);
      return 1;
    }
    c.out(`"${box}": ${msgs.length} message${msgs.length > 1 ? 's' : ''} ${msgs.length} new\n`);
    msgs.forEach((m, i) => {
      const from = (/^From:? (\S+)/m.exec(m) || [0, '?'])[1];
      const subj = (/^Subject: (.*)$/m.exec(m) || [0, ''])[1];
      c.out(`>N   ${i + 1} ${from.padEnd(18)} ${new Date().toString().slice(0, 10)} ${String(m.split('\n').length).padStart(3)}/${String(m.length).padEnd(4)} ${subj}\n`);
    });
    c.out(note('(mail is interactive: type a number to read, d to delete, q to quit — the simulator lists the headers. Read the mbox with: cat ' + box + ')'));
  };
  C.mailx = C.mail;
  C['bsd-mailx'] = C.mail;
  C.sendmail = (c) => {
    const sh = c.sh;
    const data = c.stdin || '';
    const hdr = data.split('\n\n')[0];
    let to = c.args.filter((a) => !a.startsWith('-'));
    if (c.args.indexOf('-t') >= 0) to = ((/^To: (.*)$/m.exec(hdr) || [0, ''])[1]).split(',').map((x) => x.trim()).filter(Boolean);
    if (c.args.indexOf('-bp') >= 0) return C.mailq(c);
    if (!to.length) return c.fail('fatal: no recipient addresses specified', 64);
    const subj = (/^Subject: (.*)$/m.exec(hdr) || [0, ''])[1];
    for (const t of to) {
      const e = deliver(sh, t, sh.username, subj, data.indexOf('\n\n') >= 0 ? data.split('\n\n').slice(1).join('\n\n') : data);
      if (e) c.err(e + '\n');
    }
  };
  sbin('sendmail', 'newaliases', 'postfix', 'postqueue', 'postsuper', 'exim');
  C.mailq = (c) => {
    const q = c.sh.state.mailq;
    if (!q.length) {
      c.out('Mail queue is empty\n');
      return 0;
    }
    c.out('-Queue ID-  --Size-- ----Arrival Time---- -Sender/Recipient-------\n');
    for (const m of q) c.out(`${m.id}*    ${String(m.size).padStart(6)} ${m.time}  ${m.from}\n                                         ${m.to}\n`);
  };
  C.postqueue = (c) => (c.args.indexOf('-p') >= 0 ? C.mailq(c) : c.args.indexOf('-f') >= 0 ? ((c.sh.state.mailq = []), 0) : 0);
  C.postsuper = (c) => {
    if (needRoot(c, 'postsuper: fatal: use of this command is reserved for the superuser')) return 1;
    if (c.args[0] === '-d') c.sh.state.mailq = [];
  };
  C.newaliases = (c) => {
    if (needRoot(c, 'postalias: fatal: open /etc/aliases.db: Permission denied')) return 1;
    const n = c.fs.readFile('/etc/aliases', '/').split('\n').filter((l) => l && !l.startsWith('#')).length;
    c.err(note(`(rebuilt /etc/aliases.db — ${n} aliases)`));
    asRoot(c.sh, () => c.fs.writeFile('/etc/aliases.db', '/', '(hashed alias database)\n'));
  };
  C.postfix = (c) => {
    if (needRoot(c, 'postfix: fatal: the postfix command is reserved for the superuser')) return 1;
    const sub = c.args[0];
    if (sub === 'check') return 0;
    if (sub === 'status') c.out(`postfix/postfix-script: the Postfix mail system is running: PID: 1102\n`);
    else if (sub === 'reload') c.out('postfix/postfix-script: refreshing the Postfix mail system\n');
    else if (sub === 'flush') c.sh.state.mailq = [];
  };
  C.postconf = (c) => {
    const cf = c.fs.readFile('/etc/postfix/main.cf', '/');
    if (c.args[0] === '-n' || !c.args.length) return c.out(cf);
    for (const k of c.args) {
      const m = new RegExp('^' + k + '\\s*=\\s*(.*)$', 'm').exec(cf);
      c.out(`${k} = ${m ? m[1] : ''}\n`);
    }
  };

  /* ================= printing (CUPS) ================= */
  const printers = (sh) => {
    const st = sh.state;
    st.printers = st.printers || { 'office-laser': { enabled: true, accepting: true, uri: 'ipp://192.168.56.50/ipp/print', desc: 'HP LaserJet Office' }, pdf: { enabled: true, accepting: true, uri: 'cups-pdf:/', desc: 'Virtual PDF printer' } };
    st.defaultPrinter = st.defaultPrinter || 'office-laser';
    return st.printers;
  };
  function submit(c, printer, files, copies, title) {
    const sh = c.sh;
    const ps = printers(sh);
    const p = printer || sh.vars.PRINTER || sh.state.defaultPrinter;
    if (!ps[p]) return c.fail(`Error - The printer or class does not exist.`);
    if (!ps[p].accepting) return c.fail(`Error - Destination "${p}" is not accepting jobs.`);
    const list = files.length ? files : ['(stdin)'];
    const ids = [];
    for (const f of list) {
      let size = 0;
      if (f !== '(stdin)') {
        try {
          size = SIM.byteLen(sh.fs.readFile(f, sh.cwd));
        } catch (e) {
          c.err(`${c.name}: Error - unable to access "${f}" - ${e.message}\n`);
          return 1;
        }
      } else size = SIM.byteLen(c.stdin || '');
      const id = sh.state.printJob++;
      sh.state.printQueue.push({ id, printer: p, user: sh.username, file: title || f, size: size * (copies || 1), time: new Date().toTimeString().slice(0, 8) });
      ids.push(id);
    }
    return { p, ids };
  }
  C.lpr = (c) => {
    const args = c.args.map((a) => (/^-#\d+$/.test(a) ? '-#' + a.slice(2) : a));
    const { o, rest } = getopt(args, 'P:#:T:J:rhlo:U:', {});
    const r = submit(c, o.P, rest, +(o['#'] || 1), o.T || o.J);
    if (typeof r === 'number') return r;
    if (o.r) for (const f of rest) c.fs.unlink(f, c.sh.cwd);
  };
  C.lp = (c) => {
    const { o, rest } = getopt(c.args, 'd:n:t:o:qsP:', {});
    const r = submit(c, o.d, rest, +(o.n || 1), o.t);
    if (typeof r === 'number') return r;
    if (!o.s) r.ids.forEach((id) => c.out(`request id is ${r.p}-${id} (${rest.length || 1} file(s))\n`));
  };
  C.lpq = (c) => {
    const sh = c.sh;
    const ps = printers(sh);
    const { o } = getopt(c.args, 'P:al', {});
    const which = o.a ? Object.keys(ps) : [o.P || sh.vars.PRINTER || sh.state.defaultPrinter];
    for (const p of which) {
      if (!ps[p]) return c.fail(`Unknown destination "${p}".`);
      const jobs = sh.state.printQueue.filter((j) => j.printer === p);
      c.out(`${p} is ${ps[p].enabled ? 'ready' : 'not ready'}${jobs.length && ps[p].enabled ? ' and printing' : ''}\n`);
      if (!jobs.length) {
        c.out('no entries\n');
        continue;
      }
      c.out('Rank    Owner   Job     File(s)                         Total Size\n');
      jobs.forEach((j, i) => c.out(`${(i === 0 && ps[p].enabled ? 'active' : i + 'th').padEnd(7)} ${j.user.padEnd(7)} ${String(j.id).padEnd(7)} ${j.file.slice(0, 31).padEnd(31)} ${j.size} bytes\n`));
    }
  };
  C.lprm = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'P:U:h:', {});
    const q = sh.state.printQueue;
    const mine = (j) => sh.uid === 0 || j.user === sh.username;
    if (rest[0] === '-' || (!rest.length && false)) {
      sh.state.printQueue = q.filter((j) => !(mine(j) && (!o.P || j.printer === o.P)));
      return 0;
    }
    if (!rest.length) {
      const j = q.filter((x) => mine(x) && (!o.P || x.printer === o.P)).pop();
      if (j) sh.state.printQueue = q.filter((x) => x !== j);
      return 0;
    }
    for (const id of rest) {
      const j = q.find((x) => String(x.id) === id || x.user === id);
      if (!j) return c.fail(`Error - unknown job ID ${id}`);
      if (!mine(j)) return c.fail(`Error - You don't own job ID ${id}!`);
      sh.state.printQueue = sh.state.printQueue.filter((x) => x !== j);
    }
  };
  C.cancel = (c) => {
    const sh = c.sh;
    if (c.args.indexOf('-a') >= 0) {
      sh.state.printQueue = sh.state.printQueue.filter((j) => !(sh.uid === 0 || j.user === sh.username));
      return 0;
    }
    for (const a of c.args) {
      const id = a.split('-').pop();
      const before = sh.state.printQueue.length;
      sh.state.printQueue = sh.state.printQueue.filter((j) => String(j.id) !== id || !(sh.uid === 0 || j.user === sh.username));
      if (before === sh.state.printQueue.length) c.err(`cancel: cancel-job failed: Job #${id} does not exist.\n`);
    }
  };
  C.lpstat = (c) => {
    const sh = c.sh;
    const ps = printers(sh);
    const a = c.args.join(' ');
    const all = /-t/.test(a);
    if (/-r/.test(a) || all) c.out('scheduler is running\n');
    if (/-d/.test(a) || all) c.out(`system default destination: ${sh.state.defaultPrinter}\n`);
    if (/-v/.test(a) || all) for (const [k, p] of Object.entries(ps)) c.out(`device for ${k}: ${p.uri}\n`);
    if (/-a/.test(a) || all) for (const [k, p] of Object.entries(ps)) c.out(`${k} ${p.accepting ? 'accepting' : 'not accepting'} requests since ${new Date(Date.now() - 86400000).toString().slice(0, 24)}\n`);
    if (/-p/.test(a) || all) for (const [k, p] of Object.entries(ps)) c.out(`printer ${k} is ${p.enabled ? 'idle' : 'disabled'}.  enabled since ${new Date(Date.now() - 86400000).toString().slice(0, 24)}\n`);
    if (/-s/.test(a)) {
      c.out(`system default destination: ${sh.state.defaultPrinter}\n`);
      for (const [k, p] of Object.entries(ps)) c.out(`device for ${k}: ${p.uri}\n`);
    }
    if (!c.args.length || /-o/.test(a) || all) for (const j of sh.state.printQueue) c.out(`${(j.printer + '-' + j.id).padEnd(20)} ${j.user.padEnd(12)} ${String(j.size).padStart(8)}   ${new Date().toString().slice(0, 24)}\n`);
  };
  C.lpadmin = (c) => {
    if (needRoot(c, 'lpadmin: Forbidden')) return 1;
    const { o } = getopt(c.args, 'p:x:d:v:m:EP:D:L:', {});
    const ps = printers(c.sh);
    if (o.x) {
      if (!ps[o.x]) return c.fail('The printer or class does not exist.');
      delete ps[o.x];
      return 0;
    }
    if (o.d) {
      if (!ps[o.d]) return c.fail('The printer or class does not exist.');
      c.sh.state.defaultPrinter = o.d;
      return 0;
    }
    if (o.p) {
      ps[o.p] = Object.assign(ps[o.p] || { enabled: false, accepting: false, desc: o.p }, { uri: o.v || (ps[o.p] || {}).uri || 'file:/dev/null' });
      if (o.E) {
        ps[o.p].enabled = true;
        ps[o.p].accepting = true;
      }
      if (o.D) ps[o.p].desc = o.D;
    }
  };
  const toggle = (field, val) => (c) => {
    if (needRoot(c, `${c.name}: Operation not permitted.`)) return 1;
    const ps = printers(c.sh);
    for (const p of c.args.filter((a) => !a.startsWith('-'))) {
      if (!ps[p]) return c.fail(`Invalid destination name in list "${p}".`);
      ps[p][field] = val;
    }
  };
  C.cupsenable = toggle('enabled', true);
  C.cupsdisable = toggle('enabled', false);
  C.cupsaccept = toggle('accepting', true);
  C.cupsreject = toggle('accepting', false);
  C.accept = C.cupsaccept;
  C.reject = C.cupsreject;
  C.lpc = (c) => {
    const ps = printers(c.sh);
    if (c.args[0] === 'status') {
      for (const [k, p] of Object.entries(ps)) c.out(`${k}:\n\tprinter is on device '${p.uri.split(':')[0]}' speed -1\n\tqueuing is ${p.accepting ? 'enabled' : 'disabled'}\n\tprinting is ${p.enabled ? 'enabled' : 'disabled'}\n\t${c.sh.state.printQueue.filter((j) => j.printer === k).length || 'no'} entries\n\tdaemon present\n`);
      return 0;
    }
    c.out(note('(lpc is a legacy BSD printer control program; CUPS supports only "lpc status")'));
  };
  C.cupsd = (c) => c.out(note('(cupsd is managed by systemd: systemctl status cups — web UI on http://localhost:631)'));
  C.cupsctl = (c) => {
    if (c.args.length && needRoot(c)) return 1;
    c.out('_debug_logging=0\n_remote_admin=0\n_remote_any=0\n_share_printers=0\n_user_cancel_any=0\nBrowseLocalProtocols=dnssd\nDefaultAuthType=Basic\n');
  };

  /* ================= X11 / desktop ================= */
  const needDisplay = (c) => {
    if (!c.sh.vars.DISPLAY) {
      c.err(`${c.name === 'xrandr' ? "Can't open display " : c.name + ':  unable to open display ""'}\n`);
      return true;
    }
    return false;
  };
  C.xrandr = (c) => {
    if (needDisplay(c)) return 1;
    if (c.args.length && c.args[0] !== '-q' && c.args[0] !== '--query') return 0;
    c.out(`Screen 0: minimum 320 x 200, current 1920 x 1080, maximum 16384 x 16384
Virtual-1 connected primary 1920x1080+0+0 (normal left inverted right x axis y axis) 0mm x 0mm
   1920x1080     60.00*+
   1680x1050     59.95
   1280x1024     60.02
   1024x768      60.00
   800x600       60.32
`);
  };
  C.xdpyinfo = (c) => {
    if (needDisplay(c)) return 1;
    c.out(`name of display:    ${c.sh.vars.DISPLAY}\nversion number:    11.0\nvendor string:    The X.Org Foundation\nvendor release number:    12101007\nX.Org version: 21.1.7\nmaximum request size:  16777212 bytes\nnumber of screens:    1\n\nscreen #0:\n  dimensions:    1920x1080 pixels (508x285 millimeters)\n  resolution:    96x96 dots per inch\n  depths (7):    24, 1, 4, 8, 15, 16, 32\n  default visual id:  0x21\n`);
  };
  C.xwininfo = (c) => {
    if (needDisplay(c)) return 1;
    c.out(`\nxwininfo: Please select the window about which you\n          would like information by clicking the\n          mouse in that window.\n\nxwininfo: Window id: 0x2800003 "Terminal"\n\n  Absolute upper-left X:  120\n  Absolute upper-left Y:  80\n  Width: 1024\n  Height: 640\n  Depth: 24\n  Map State: IsViewable\n`);
  };
  C.xhost = (c) => {
    if (needDisplay(c)) return 1;
    const st = c.sh.state;
    st.xhost = st.xhost || { enabled: true, hosts: [] };
    const a = c.args[0];
    if (!a) {
      c.out(`access control ${st.xhost.enabled ? 'enabled, only authorized clients can connect' : 'disabled, clients can connect from any host'}\n${st.xhost.hosts.map((h) => 'INET:' + h).join('\n')}${st.xhost.hosts.length ? '\n' : ''}SI:localuser:${c.sh.username}\n`);
      return 0;
    }
    if (a === '+') {
      st.xhost.enabled = false;
      c.out('access control disabled, clients can connect from any host\n');
      c.err(note('(insecure! anyone can now open windows on and read input from your display)'));
    } else if (a === '-') {
      st.xhost.enabled = true;
      c.out('access control enabled, only authorized clients can connect\n');
    } else if (a[0] === '+' || /^\w/.test(a)) {
      st.xhost.hosts.push(a.replace(/^\+/, ''));
      c.out(`${a.replace(/^\+/, '')} being added to access control list\n`);
    } else if (a[0] === '-') {
      st.xhost.hosts = st.xhost.hosts.filter((h) => h !== a.slice(1));
      c.out(`${a.slice(1)} being removed from access control list\n`);
    }
  };
  C.xauth = (c) => {
    if (c.args[0] === 'list') c.out(`${c.sh.state.hostname}/unix:0  MIT-MAGIC-COOKIE-1  4f8a2c1d9e3b7f6a0c5d8e2b1a4f7c3d\n`);
  };
  C.startx = (c) => c.out(note('(startx starts an X session via xinit using ~/.xinitrc — a display manager (gdm/lightdm/sddm) is already running on tty2)'));
  C.Xorg = (c) => c.out(note('(Xorg is already running on :0 — log file /var/log/Xorg.0.log; configuration in /etc/X11/xorg.conf(.d))'));
  C.X = C.Xorg;
  C.loginctl = (c) => {
    if (c.args[0] === 'show-session') c.out('Type=wayland\nRemote=no\nActive=yes\n');
    else c.out('SESSION  UID USER    SEAT  TTY\n      2 1000 student seat0 tty2\n     14 1000 student       pts/0\n\n2 sessions listed.\n');
  };
  C.orca = (c) => c.out(note('(Orca: screen reader for GNOME — reads screen content aloud via speech synthesis or Braille display)'));
  SIM.optional.add('orca');
  C.gsettings = (c) => {
    if (c.args[0] === 'get') c.out(/high-contrast/.test(c.args[2] || '') ? 'false\n' : /text-scaling/.test(c.args[2] || '') ? '1.0\n' : "'default'\n");
  };
  // X11 clients: print what would happen (no real display in the browser)
  const xclient = (desc) => (c) => {
    const d = c.sh.vars.DISPLAY;
    if (!d) return c.fail(`Error: Can't open display: ${''}`, 1);
    c.err(note(`(${c.name}: ${desc} — would open a window on display ${d})`));
    return 0;
  };
  C.xterm = xclient('X terminal emulator');
  C.xclock = xclient('analog clock');
  C.xeyes = xclient('eyes following the mouse');
  C.setxkbmap = (c) => {
    const st = c.sh.state;
    if (c.args[0] === '-query') return c.out(`rules:      evdev\nmodel:      pc105\nlayout:     ${st.xkb || 'de'}\n`);
    if (c.args[0]) st.xkb = c.args[0];
    return 0;
  };
  C.lpinfo = (c) => {
    if (c.args[0] === '-m') return c.out('everywhere IPP Everywhere\ndrv:///sample.drv/generic.ppd Generic PostScript Printer\nlsb/usr/cupsfilters/Generic-PDF_Printer-PDF.ppd Generic PDF Printer\n');
    c.out('network socket\nnetwork ipp\nnetwork ipps\nnetwork lpd\nnetwork http\nnetwork https\ndirect usb://HP/LaserJet%20Pro?serial=VNB3K12345\nnetwork dnssd://HP%20LaserJet%20Office._ipp._tcp.local/\nfile cups-pdf:/\n');
  };
  sbin('lpinfo');
  C['ssh-keyscan'] = (c) => {
    const hosts = c.args.filter((a) => !a.startsWith('-'));
    if (!hosts.length) return c.fail('usage: ssh-keyscan [-46cDHv] [-f file] [-p port] [-T timeout] [-t type] [host | addrlist namelist]');
    for (const h of hosts) {
      if (!SIM.resolve(c.sh, h)) {
        c.err(`getaddrinfo ${h}: Name or service not known\n`);
        continue;
      }
      c.err(`# ${h}:22 SSH-2.0-OpenSSH_9.2p1 Debian-2+deb12u2\n`);
      c.out(`${h} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${SIM.uuid().replace(/-/g, '').slice(0, 30)}\n${h} ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ${SIM.uuid().replace(/-/g, '')}\n`);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
