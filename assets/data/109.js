/* Topic 109: Networking Fundamentals */
LPIC.add({
  id: '109.1',
  title: 'Fundamentals of internet protocols',
  weight: 4,
  desc: 'Candidates should demonstrate a proper understanding of TCP/IP network fundamentals.',
  knowledge: [
    'Demonstrate an understanding of network masks and CIDR notation.',
    'Knowledge of the differences between private and public "dotted quad" IP addresses.',
    'Knowledge about common TCP and UDP ports and services (20, 21, 22, 23, 25, 53, 80, 110, 123, 139, 143, 161, 162, 389, 443, 465, 514, 636, 993, 995).',
    'Knowledge about the differences and major features of UDP, TCP and ICMP.',
    'Knowledge of the major differences between IPv4 and IPv6.',
    'Knowledge of the basic features of IPv6.',
  ],
  terms: ['/etc/services', 'IPv4, IPv6', 'Subnetting', 'TCP, UDP, ICMP'],
  sims: ['ipcalc', 'ports'],
  wiki: String.raw`
## IPv4 addresses and netmasks
An IPv4 address has **32 bits**, written as four decimal octets ("dotted quad"): {{192.168.56.101}}. The **netmask** says which leading bits identify the *network*; the rest identify the *host*.

| CIDR | Netmask | Host bits | Usable hosts | Old class |
|---|---|---|---|---|
| /8 | 255.0.0.0 | 24 | 16 777 214 | A (1–126) |
| /16 | 255.255.0.0 | 16 | 65 534 | B (128–191) |
| /24 | 255.255.255.0 | 8 | 254 | C (192–223) |
| /25 | 255.255.255.128 | 7 | 126 | |
| /26 | 255.255.255.192 | 6 | 62 | |
| /27 | 255.255.255.224 | 5 | 30 | |
| /28 | 255.255.255.240 | 4 | 14 | |
| /30 | 255.255.255.252 | 2 | 2 (point-to-point) | |
| /32 | 255.255.255.255 | 0 | single host | |

Usable hosts = 2^(host bits) − 2: the **first** address is the *network address*, the **last** the *broadcast address*.

### Worked example: 192.168.10.77/26
- /26 → mask 255.255.255.**192** → block size 256 − 192 = **64**.
- Subnets in the last octet: 0, 64, 128, 192 → 77 lies in **64–127**.
- Network {{192.168.10.64}}, first host {{.65}}, last host {{.126}}, broadcast {{192.168.10.127}}, 62 hosts.

> TIP: Try it in the **Subnet calculator** simulation — and in your head: *block size = 256 − mask octet*.

**Classes** (A/B/C/D multicast 224–239/E experimental) are historical; today **CIDR** (Classless Inter-Domain Routing) uses arbitrary prefix lengths. Combining networks into a shorter prefix is called *supernetting/route aggregation*.

### Private, special and public addresses
| Range | Purpose |
|---|---|
| **10.0.0.0/8** | private (RFC 1918) |
| **172.16.0.0/12** (172.16.0.0–172.31.255.255) | private |
| **192.168.0.0/16** | private |
| 127.0.0.0/8 | loopback ({{127.0.0.1}} = localhost) |
| 169.254.0.0/16 | link-local / APIPA (no DHCP answer) |
| 100.64.0.0/10 | carrier-grade NAT |
| 224.0.0.0/4 | multicast |
| 0.0.0.0 | "this host / any address"; {{0.0.0.0/0}} = default route |
| 255.255.255.255 | limited broadcast |

Private addresses are not routed on the Internet; routers translate them to a public address (**NAT**/masquerading). All other unicast addresses are **public** and globally unique (assigned by IANA → RIRs → providers).

## TCP, UDP and ICMP
| | **TCP** | **UDP** | **ICMP** |
|---|---|---|---|
| Layer | transport | transport | network (part of IP) |
| Connection | connection-oriented (3-way handshake SYN, SYN-ACK, ACK) | connectionless | — |
| Reliability | acknowledgements, retransmission, ordering, flow control | none (best effort), low overhead | — |
| Ports | yes | yes | no ports — *types* (echo request 8, echo reply 0, destination unreachable 3, time exceeded 11) |
| Examples | SSH, HTTP, SMTP, IMAP | DNS queries, NTP, DHCP, SNMP, syslog | ping, traceroute (time exceeded), path MTU discovery |

## Ports and /etc/services
Ports 0–1023 are **well-known/privileged** (only root may bind), 1024–49151 registered, 49152–65535 dynamic/ephemeral. The mapping of names to numbers is in **{{/etc/services}}**.

| Port | Service | | Port | Service |
|---|---|---|---|---|
| 20, 21 | FTP data, FTP control (TCP) | | 143 | IMAP |
| 22 | SSH (scp, sftp) | | 161, 162 | SNMP, SNMP traps (UDP) |
| 23 | Telnet | | 389 | LDAP |
| 25 | SMTP | | 443 | HTTPS |
| 53 | DNS (UDP + TCP) | | 465 | SMTPS (SMTP over TLS) |
| 80 | HTTP | | 514 | syslog (UDP) / rsh (TCP) |
| 110 | POP3 | | 636 | LDAPS |
| 123 | NTP (UDP) | | 993 | IMAPS |
| 139 | NetBIOS session (Samba/SMB) | | 995 | POP3S |

~~~console
$ grep -w 22 /etc/services
$ grep -E '^(smtp|imaps|pop3s)\s' /etc/services
$ getent services 443
$ getent services ldap
~~~
> EXAM: The list of 20 ports above is literally in the objective. Drill them with the **Well-known ports** simulation. Secure variants: 465 (SMTPS), 636 (LDAPS), 993 (IMAPS), 995 (POP3S), 443 (HTTPS).

## IPv6
- **128-bit** addresses in 8 groups of 4 hex digits: {{2001:0db8:0000:0000:0000:ff00:0042:8329}}.
- Shortening: drop leading zeros in a group ({{0db8}} → {{db8}}) and replace **one** run of all-zero groups with {{::}} → {{2001:db8::ff00:42:8329}}.
- Usually **/64** subnets: 64 bits network prefix + 64 bits interface ID.
- Special addresses: {{::1}} loopback, {{::}} unspecified, {{fe80::/10}} **link-local** (always present on every interface), {{fc00::/7}} unique local ({{fd00::/8}} in practice, ≈ private), {{2000::/3}} global unicast, {{ff00::/8}} multicast ({{ff02::1}} all nodes).
- **No broadcast** — multicast and anycast instead.
- **SLAAC** (stateless address autoconfiguration) via router advertisements; DHCPv6 optional. Interface IDs may be derived from the MAC (EUI-64) or random (privacy extensions).
- **NDP** (Neighbor Discovery Protocol, ICMPv6) replaces ARP. ICMPv6 must not be blocked entirely.
- Simplified fixed-size header (40 bytes) with extension headers; fragmentation only by the sender (path MTU discovery); IPsec designed in; no NAT needed thanks to the large address space.
- In URLs, IPv6 addresses go in brackets: {{http://[2001:db8::1]:8080/}}.

~~~console
$ ip -6 addr
$ ping6 -c 2 ::1
$ ping -6 -c 1 ::1
~~~

| IPv4 | IPv6 |
|---|---|
| 32 bit, dotted decimal | 128 bit, hexadecimal with colons |
| broadcast | multicast / anycast, no broadcast |
| ARP | NDP (ICMPv6) |
| DHCP or manual | SLAAC, DHCPv6 or manual |
| header with checksum, routers fragment | simpler header, no checksum, no router fragmentation |
| NAT widely used | NAT normally not needed |
`,
  quiz: [
    { q: 'How many usable host addresses does a /27 network provide?', fill: ['30'], e: '2^5 − 2 = 30.' },
    { q: 'What is the broadcast address of the network {{192.168.10.77/26}}?', fill: ['192.168.10.127'], e: 'Block size 64: subnet 192.168.10.64–127.' },
    { q: 'Which netmask corresponds to the prefix /20?', fill: ['255.255.240.0'], e: '20 bits = 8 + 8 + 4 → third octet 11110000 = 240.' },
    { q: 'Which of the following are private IPv4 addresses according to RFC 1918? (Choose three.)', o: ['{{10.20.30.40}}', '{{172.20.1.1}}', '{{192.168.200.1}}', '{{172.32.0.1}}', '{{169.254.10.1}}'], a: [0, 1, 2], e: '172.16.0.0/12 ends at 172.31.255.255; 169.254/16 is link-local.' },
    { q: 'Which port does the IMAP protocol over TLS (IMAPS) use?', fill: ['993'], e: 'IMAP 143, POP3 110, POP3S 995.' },
    { q: 'Which file maps service names to port numbers?', fill: ['/etc/services'], e: '' },
    { q: 'Which ports are used by FTP? (Choose two.)', o: ['20', '21', '22', '69'], a: [0, 1], e: '21 control, 20 data (active mode). 69 is TFTP.' },
    { q: 'Which services use port 389 and port 636?', o: ['LDAP and LDAPS', 'SNMP and SNMP traps', 'IMAP and IMAPS', 'SMB and NetBIOS'], a: 0, e: '' },
    { q: 'Which protocol is connectionless and does not guarantee delivery?', o: ['TCP', 'UDP', 'SSH', 'HTTP'], a: 1, e: 'TCP is connection-oriented with acknowledgements.' },
    { q: 'Which protocol is used by {{ping}}?', fill: ['ICMP', 'icmp'], e: 'Echo request (type 8) and echo reply (type 0).' },
    { q: 'What is the correct abbreviated form of {{2001:0db8:0000:0000:0000:0000:1428:57ab}}?', o: ['{{2001:db8::1428:57ab}}', '{{2001:db8:0:1428:57ab}}', '{{2001::db8::1428:57ab}}', '{{21:db8::1428:57ab}}'], a: 0, e: ':: may appear only once; leading zeros of a group may be dropped.' },
    { q: 'Which statements about IPv6 are true? (Choose two.)', o: ['IPv6 addresses are 128 bits long.', 'IPv6 has no broadcast addresses.', 'IPv6 uses ARP to resolve MAC addresses.', 'IPv6 requires NAT for private networks.'], a: [0, 1], e: 'Neighbor Discovery (ICMPv6) replaces ARP.' },
    { q: 'Which IPv6 prefix is used for link-local addresses?', o: ['{{fe80::/10}}', '{{fc00::/7}}', '{{ff00::/8}}', '{{2000::/3}}'], a: 0, e: 'fc00::/7 unique local, ff00::/8 multicast, 2000::/3 global unicast.' },
    { q: 'Which is the IPv6 loopback address?', fill: ['::1'], e: '' },
    { q: 'Which port and transport protocol are used by SNMP traps?', o: ['UDP 162', 'TCP 161', 'UDP 514', 'TCP 162'], a: 0, e: 'SNMP queries use UDP 161.' },
    { q: 'Which port does SMTP over implicit TLS (SMTPS) use?', fill: ['465'], e: '25 = SMTP, 587 = submission.' },
    { q: 'An IPv4 host got the address 169.254.33.7. What does this most likely indicate?', o: ['It is behind carrier-grade NAT.', 'It did not receive an answer from a DHCP server and configured a link-local address.', 'It uses a static public address.', 'It is a multicast group member.'], a: 1, e: 'APIPA / IPv4 link-local addresses.' },
    { q: 'Which ports are used by NetBIOS session service and NTP?', o: ['139 and 123', '137 and 119', '445 and 123', '139 and 514'], a: 0, e: '' },
  ],
});

LPIC.add({
  id: '109.2',
  title: 'Persistent network configuration',
  weight: 4,
  desc: 'Candidates should be able to manage the persistent network configuration of a Linux host.',
  knowledge: [
    'Understand basic TCP/IP host configuration.',
    'Configure ethernet and wi-fi network configuration using NetworkManager.',
    'Awareness of systemd-networkd.',
  ],
  terms: ['/etc/hostname', '/etc/hosts', '/etc/nsswitch.conf', '/etc/resolv.conf', 'nmcli', 'hostnamectl', 'ifup', 'ifdown'],
  wiki: String.raw`
## What a host needs
1. an **IP address** and **netmask/prefix** per interface,
2. a **default gateway** (route to other networks),
3. one or more **DNS servers** (name resolution),
4. a **host name**.

These come from DHCP or static configuration. The commands {{ip addr}}/{{ip route}} change the running kernel configuration only (see 109.3) — **persistent** configuration lives in configuration files or NetworkManager profiles.

## Host name
~~~console
$ hostname                         # current name
$ hostname -f                      # FQDN (resolved via /etc/hosts or DNS)
$ cat /etc/hostname                # persistent static name
$ hostnamectl
# hostnamectl set-hostname web01.example.com
# hostnamectl set-hostname "Web Server 01" --pretty
~~~
systemd knows three names: **static** ({{/etc/hostname}}), **transient** (kernel, e.g. from DHCP) and **pretty** (free text, {{/etc/machine-info}}). {{hostname NAME}} only changes the transient name until reboot.

## Local name resolution files
### /etc/hosts
~~~file
127.0.0.1       localhost
127.0.1.1       lpic-lab.example.com lpic-lab
192.168.56.10   fileserver.example.com fileserver
::1             localhost ip6-localhost ip6-loopback
~~~
Format: **IP address, canonical name (FQDN), aliases**.

### /etc/resolv.conf — DNS client
~~~file
search example.com lab.example.com   # appended to short names
nameserver 192.168.56.1              # up to 3 servers, tried in order
nameserver 1.1.1.1
options timeout:2 attempts:3 rotate
~~~
{{domain}} sets one local domain (alternative to {{search}}). This file is often **generated** (NetworkManager, systemd-resolved → {{nameserver 127.0.0.53}}, resolvconf) — manual edits may be overwritten.

### /etc/nsswitch.conf — order of lookups
~~~file
passwd:   files systemd
group:    files systemd
hosts:    files dns          # first /etc/hosts, then DNS
networks: files
~~~
{{hosts: files mdns4_minimal [NOTFOUND=return] dns}} is typical with Avahi. {{getent hosts NAME}} resolves exactly as applications do.
~~~console
$ cat /etc/hosts
$ cat /etc/resolv.conf
$ grep hosts /etc/nsswitch.conf
$ getent hosts fileserver
$ getent ahosts localhost
~~~

## NetworkManager — nmcli
NetworkManager is the default on desktops and on RHEL/Fedora/Ubuntu Desktop. It manages **connections** (profiles) that are bound to **devices**. Profiles are stored in {{/etc/NetworkManager/system-connections/}} (keyfiles) or, on older RHEL, {{/etc/sysconfig/network-scripts/ifcfg-*}}. Front ends: {{nmcli}} (CLI), {{nmtui}} (text UI), GUI applets.

~~~console
$ nmcli general status
$ nmcli device status              # = nmcli dev
$ nmcli connection show            # = nmcli con show
$ nmcli con show "Wired connection 1"
~~~
### Static Ethernet configuration
~~~console
# nmcli con add type ethernet ifname enp0s8 con-name lab ipv4.method manual ipv4.addresses 10.0.0.5/24 ipv4.gateway 10.0.0.1 ipv4.dns "10.0.0.1 1.1.1.1"
# nmcli con mod lab ipv4.dns-search example.com
# nmcli con mod lab connection.autoconnect yes
# nmcli con up lab
# nmcli con down lab
# nmcli con mod "Wired connection 1" ipv4.method auto     # back to DHCP
# nmcli con delete lab
~~~
{{+ipv4.addresses}} adds an additional address, {{-ipv4.addresses}} removes one.

### Wi-Fi
~~~console
$ nmcli radio wifi                 # enabled/disabled; nmcli radio wifi on
$ nmcli dev wifi list              # scan for networks
# nmcli dev wifi connect HomeNet password 'S3cret!'
# nmcli dev disconnect wlp2s0
~~~

## Distribution-specific / legacy configuration
### Debian ifupdown — /etc/network/interfaces
~~~file
auto lo
iface lo inet loopback

auto enp0s3
iface enp0s3 inet static
    address 192.168.56.101/24
    gateway 192.168.56.1
    dns-nameservers 192.168.56.1

allow-hotplug enp0s8
iface enp0s8 inet dhcp
iface enp0s8 inet6 auto
~~~
~~~console
$ cat /etc/network/interfaces
# ifdown enp0s8
# ifup enp0s8
~~~
{{ifup}}/{{ifdown}} bring interfaces up/down **according to the configuration file** (Red Hat's legacy versions read {{ifcfg-*}} files).

### Red Hat legacy — /etc/sysconfig/network-scripts/ifcfg-eth0
~~~file
DEVICE=eth0
BOOTPROTO=none        # dhcp | static | none
ONBOOT=yes
IPADDR=192.168.1.10
PREFIX=24
GATEWAY=192.168.1.1
DNS1=192.168.1.1
~~~

### Ubuntu netplan
YAML files in {{/etc/netplan/}} are rendered to NetworkManager or systemd-networkd configuration; apply with {{netplan apply}}.

## systemd-networkd (awareness)
A lightweight network manager of systemd, popular on servers and containers. Configuration in **{{/etc/systemd/network/*.network}}** (plus {{.link}}, {{.netdev}}); status with {{networkctl}}. DNS is usually handled by **systemd-resolved** ({{resolvectl}}).
~~~file
# /etc/systemd/network/20-wired.network
[Match]
Name=enp0s3

[Network]
Address=192.168.56.101/24
Gateway=192.168.56.1
DNS=192.168.56.1
# or simply: DHCP=yes
~~~
~~~console
# systemctl enable --now systemd-networkd
$ resolvectl status
~~~

## Network interface names
Old systems named interfaces in detection order: {{eth0}}, {{eth1}}, {{wlan0}} … — names could even swap after a reboot. systemd/udev uses **predictable interface names** with a two-letter type prefix:

| Prefix | Type |
|---|---|
| {{en}} | Ethernet |
| {{wl}} | wireless LAN |
| {{ww}} | wireless WAN (mobile) |
| {{ib}} | InfiniBand |
| {{sl}} | serial line IP (SLIP) |

The rest of the name is chosen by these rules, in descending priority:
1. index provided by firmware/BIOS for on-board devices → {{eno1}}
2. PCI Express hot-plug slot index → {{ens1}}
3. physical location on the bus → {{enp3s5}} (bus 3, slot 5 — matches {{03:05.0}} in {{lspci}})
4. MAC address → {{enx78e7d1ea46da}} (not used by default)
5. classic kernel name → {{eth0}}

~~~console
$ ip -br link
$ lspci | grep -i ethernet
$ udevadm info /sys/class/net/enp0s3 | grep ID_NET_NAME
~~~
`,
  quiz: [
    { q: 'Which file contains the persistent static host name on a systemd-based system?', fill: ['/etc/hostname'], e: '' },
    { q: 'Which command permanently sets the host name to {{web01}} on a systemd system?', fill: ['hostnamectl set-hostname web01', 'hostnamectl hostname web01'], e: '{{hostname web01}} only changes the transient name.' },
    { q: 'Which file defines that {{/etc/hosts}} is consulted before DNS?', fill: ['/etc/nsswitch.conf'], e: 'The hosts: line, e.g. "hosts: files dns".' },
    { q: 'Which keyword in {{/etc/resolv.conf}} specifies a DNS server?', fill: ['nameserver'], e: 'Up to three nameserver lines are used.' },
    { q: 'What is the purpose of the {{search}} directive in {{/etc/resolv.conf}}?', o: ['It lists DNS servers to search.', 'It lists domains that are appended to unqualified host names.', 'It enables DNSSEC.', 'It defines the order of /etc/hosts and DNS.'], a: 1, e: '{{ping fileserver}} tries fileserver.example.com.' },
    { q: 'Which command lists all NetworkManager connection profiles?', fill: ['nmcli connection show', 'nmcli con show', 'nmcli c show', 'nmcli connection', 'nmcli con', 'nmcli c s', 'nmcli con s'], e: '{{nmcli device status}} lists the devices.' },
    { q: 'Which command activates the NetworkManager connection {{office}}?', fill: ['nmcli connection up office', 'nmcli con up office', 'nmcli c up office', 'nmcli con up id office'], e: '' },
    { q: 'Which command lists available Wi-Fi networks?', fill: ['nmcli device wifi list', 'nmcli dev wifi list', 'nmcli dev wifi', 'nmcli d wifi list', 'nmcli device wifi', 'nmcli d wifi'], e: 'Connect with {{nmcli dev wifi connect SSID password PW}}.' },
    { q: 'Which order of columns is correct for a line in {{/etc/hosts}}?', o: ['IP address, canonical host name, aliases', 'host name, IP address, aliases', 'aliases, IP address', 'IP address, netmask, host name'], a: 0, e: '' },
    { q: 'On a Debian system using ifupdown, which file holds the persistent interface configuration?', fill: ['/etc/network/interfaces'], e: 'Activated with {{ifup}} / {{ifdown}}.' },
    { q: 'Which commands bring an interface up or down according to its configuration file? (Choose two.)', o: ['{{ifup}}', '{{ifdown}}', '{{ipup}}', '{{netctl}}'], a: [0, 1], e: '' },
    { q: 'Where does systemd-networkd read its network configuration from?', o: ['{{/etc/systemd/network/*.network}}', '{{/etc/network/interfaces}}', '{{/etc/networkd.conf}}', '{{/etc/sysconfig/network}}'], a: 0, e: 'Status: {{networkctl}}.' },
    { q: 'Which command resolves a host name using the same sources as applications (as configured in nsswitch.conf)?', o: ['{{getent hosts NAME}}', '{{dig NAME}}', '{{host NAME}}', '{{nslookup NAME}}'], a: 0, e: 'dig, host and nslookup query DNS directly and ignore /etc/hosts.' },
    { q: 'Which NetworkManager text user interface can be used to edit connections?', fill: ['nmtui'], e: '' },
    { q: 'In which directory does NetworkManager store connection profiles as keyfiles?', fill: ['/etc/NetworkManager/system-connections', '/etc/NetworkManager/system-connections/'], e: '' },
  ],
});

LPIC.add({
  id: '109.3',
  title: 'Basic network troubleshooting',
  weight: 4,
  desc: 'Candidates should be able to troubleshoot networking issues on client hosts.',
  knowledge: [
    'Manually configure network interfaces, including viewing and changing the configuration of network interfaces using iproute2.',
    'Manually configure routing, including viewing and changing routing tables and setting the default route using iproute2.',
    'Debug problems associated with the network configuration.',
    'Awareness of legacy net-tools commands.',
  ],
  terms: ['ip', 'hostname', 'ss', 'ping', 'ping6', 'traceroute', 'traceroute6', 'tracepath', 'tracepath6', 'netcat', 'ifconfig', 'netstat', 'route'],
  wiki: String.raw`
## iproute2: the ip command
The {{ip}} command replaces the legacy *net-tools* ({{ifconfig}}, {{route}}, {{arp}}, {{netstat}}). Objects can be abbreviated: {{ip a}} = {{ip addr}}, {{ip r}} = {{ip route}}, {{ip l}} = {{ip link}}, {{ip n}} = {{ip neigh}}.

### Interfaces and addresses
~~~console
$ ip link show
$ ip addr show
$ ip -br addr                      # brief, one line per interface
$ ip -4 addr show dev enp0s3
$ ip -s link show enp0s3           # statistics (RX/TX, errors)
# ip link set enp0s8 up
# ip addr add 10.0.0.5/24 dev enp0s8
$ ip addr show enp0s8
# ip addr del 10.0.0.5/24 dev enp0s8
# ip link set dev enp0s8 mtu 9000
~~~
Changes made with {{ip}} are **not persistent** — they are lost at reboot or when NetworkManager reconfigures the interface.

### Routing
~~~console
$ ip route                         # = ip route show
$ ip route get 8.8.8.8             # which route/source would be used?
# ip route add 10.1.0.0/16 via 192.168.56.254
# ip route add default via 192.168.56.1
# ip route del 10.1.0.0/16
# ip route replace default via 192.168.56.254 dev enp0s3
$ ip -6 route
~~~
The most specific matching route (longest prefix) wins; {{default}} ({{0.0.0.0/0}}) is the last resort.

### Neighbours (ARP / NDP cache)
~~~console
$ ip neigh
# ip neigh flush dev enp0s3
~~~

## Legacy net-tools (awareness)
| Legacy | iproute2 / modern |
|---|---|
| {{ifconfig}} | {{ip addr}}, {{ip link}} |
| {{ifconfig eth0 10.0.0.5 netmask 255.255.255.0 up}} | {{ip addr add 10.0.0.5/24 dev eth0}} + {{ip link set eth0 up}} |
| {{route -n}} | {{ip route}} |
| {{route add default gw 192.168.1.1}} | {{ip route add default via 192.168.1.1}} |
| {{route add -net 10.1.0.0 netmask 255.255.0.0 gw 192.168.1.254}} | {{ip route add 10.1.0.0/16 via 192.168.1.254}} |
| {{arp -n}} | {{ip neigh}} |
| {{netstat -tulpn}} | {{ss -tulpn}} |
| {{netstat -r}} | {{ip route}} |
| {{netstat -i}} | {{ip -s link}} |

~~~console
# ifconfig enp0s3
# route -n
$ netstat -rn
$ netstat -tuln
~~~
In {{route -n}}, Flags: **U** = up, **G** = uses a gateway, **H** = host route.

## Sockets: ss and netstat
~~~console
$ ss -tuln                         # TCP+UDP listening sockets, numeric
# ss -tulpn                        # + owning process (root sees all)
$ ss -tan                          # all TCP sockets incl. ESTABLISHED
$ ss -s                            # summary
$ ss -o state established '( dport = :ssh or sport = :ssh )'
$ netstat -tulpn                   # legacy equivalent
~~~
Options: {{-t}} TCP, {{-u}} UDP, {{-l}} listening, {{-a}} all, {{-n}} numeric, {{-p}} processes, {{-x}} Unix sockets. A service listening on {{127.0.0.1}} is only reachable locally; {{0.0.0.0}}/{{[::]}} means all addresses.

## Connectivity tests
### ping / ping6
~~~console
$ ping -c 3 192.168.56.1           # default gateway reachable?
$ ping -c 2 fileserver             # name resolution + reachability
$ ping6 -c 2 ::1
$ ping -c 3 -i 0.5 -W 1 10.99.99.99
~~~
{{-c}} count, {{-i}} interval, {{-W}} timeout, {{-s}} packet size, {{-b}} broadcast. **Note**: many hosts/firewalls block ICMP — no reply does not prove the host is down.

### traceroute / tracepath
~~~console
$ traceroute 8.8.8.8               # UDP probes with increasing TTL (-I ICMP, -T TCP)
$ traceroute -n example.com        # no reverse DNS lookups
$ tracepath example.com            # no root needed, also shows the path MTU
$ traceroute6 ::1
$ tracepath6 ::1
~~~
Each hop decrements the TTL; the router where it reaches 0 sends **ICMP time exceeded** back — that reveals the path. {{* * *}} means no answer from that hop.

### netcat (nc) — the TCP/UDP "Swiss army knife"
~~~console
$ nc -zv localhost 22              # is TCP port 22 open? (-z scan, -v verbose)
$ nc -zv fileserver 20-25
$ nc -u -zv 192.168.56.1 53        # UDP
$ nc -l 9999                       # listen on port 9999 (receiver)
$ echo hello | nc fileserver 9999  # sender
$ printf 'HEAD / HTTP/1.0\r\n\r\n' | nc example.com 80
~~~

## A systematic troubleshooting order
1. **Link** — cable/Wi-Fi up? {{ip link}} (state UP, LOWER_UP), {{ip -s link}} errors.
2. **Address** — correct IP/prefix? {{ip addr}}. 169.254.x.x → no DHCP.
3. **Local network** — {{ping}} the gateway; {{ip neigh}} shows MAC addresses.
4. **Routing** — {{ip route}}: is there a default route? {{ip route get TARGET}}.
5. **Remote IP** — {{ping 8.8.8.8}}, {{traceroute}} / {{tracepath}} to find where it breaks.
6. **Name resolution** — {{ping NAME}} fails but the IP works → check {{/etc/resolv.conf}}, {{dig}}, {{getent hosts}} (see 109.4).
7. **Service/port** — {{ss -tulpn}} on the server, {{nc -zv host port}} from the client, firewall rules.

Also useful: {{hostname -I}} (all addresses), {{hostname -f}}, {{dmesg | grep -i eth}}, {{journalctl -u NetworkManager}}.
`,
  quiz: [
    { q: 'Which command adds the address {{10.0.0.5/24}} to the interface {{eth1}}?', fill: ['ip addr add 10.0.0.5/24 dev eth1', 'ip address add 10.0.0.5/24 dev eth1', 'ip a add 10.0.0.5/24 dev eth1', 'ip addr add dev eth1 10.0.0.5/24'], e: 'Not persistent.' },
    { q: 'Which command sets the default gateway to {{192.168.1.1}} using iproute2?', fill: ['ip route add default via 192.168.1.1', 'ip r add default via 192.168.1.1', 'ip route replace default via 192.168.1.1', 'ip route add 0.0.0.0/0 via 192.168.1.1'], e: 'Legacy: {{route add default gw 192.168.1.1}}.' },
    { q: 'Which legacy command adds a default gateway?', o: ['{{route add default gw 192.168.1.1}}', '{{route add default via 192.168.1.1}}', '{{ifconfig default 192.168.1.1}}', '{{netstat -g 192.168.1.1}}'], a: 0, e: '' },
    { q: 'Which command activates the network interface {{enp0s8}} with iproute2?', fill: ['ip link set enp0s8 up', 'ip link set dev enp0s8 up', 'ip l set enp0s8 up', 'ip link set up dev enp0s8', 'ip link set up enp0s8'], e: '' },
    { q: 'Which command lists all listening TCP and UDP sockets with numeric ports and the owning processes?', fill: ['ss -tulpn', 'ss -tulnp', 'ss -lntup', 'ss -ltunp', 'ss -plunt', 'ss -nltup', 'ss -tunlp', 'netstat -tulpn', 'netstat -tulnp', 'netstat -lntup'], e: 'Run as root to see processes of other users.' },
    { q: 'Which tool determines the route to a host and the path MTU without requiring root privileges?', fill: ['tracepath'], e: 'traceroute can need root for some probe methods.' },
    { q: 'Which ICMP message does traceroute rely on to identify the routers along the path?', o: ['echo reply', 'time exceeded', 'redirect', 'source quench'], a: 1, e: 'Sent when the TTL reaches 0.' },
    { q: 'Which command checks whether TCP port 443 on {{www.example.com}} is reachable, without sending data?', fill: ['nc -zv www.example.com 443', 'nc -z www.example.com 443', 'nc -vz www.example.com 443', 'netcat -zv www.example.com 443', 'netcat -z www.example.com 443'], e: '' },
    { q: 'Which iproute2 command replaces {{arp -n}}?', fill: ['ip neigh', 'ip neighbour', 'ip neighbor', 'ip n', 'ip neigh show'], e: '' },
    { q: 'Which iproute2 command shows the routing table?', fill: ['ip route', 'ip r', 'ip route show', 'ip route list', 'ip r s'], e: 'Legacy: {{route -n}} or {{netstat -rn}}.' },
    { q: 'A host can ping {{8.8.8.8}} but not {{www.example.com}}. What is the most likely cause?', o: ['the default route is missing', 'the network cable is unplugged', 'name resolution (DNS) is not working', 'ICMP is blocked by the target'], a: 2, e: 'Check /etc/resolv.conf, dig, getent hosts.' },
    { q: 'Which command shows which route and source address the kernel would use to reach {{10.1.2.3}}?', fill: ['ip route get 10.1.2.3', 'ip r get 10.1.2.3'], e: '' },
    { q: 'Which flag in the output of {{route -n}} marks a route that uses a gateway?', fill: ['G'], e: 'U = up, H = host route.' },
    { q: 'Which commands are part of the legacy net-tools package? (Choose three.)', o: ['{{ifconfig}}', '{{route}}', '{{netstat}}', '{{ss}}', '{{ip}}'], a: [0, 1, 2], e: 'ss and ip belong to iproute2.' },
    { q: 'Which command sends exactly 4 ICMP echo requests to the gateway {{192.168.1.1}}?', fill: ['ping -c 4 192.168.1.1', 'ping -c4 192.168.1.1'], e: '' },
  ],
});

LPIC.add({
  id: '109.4',
  title: 'Configure client side DNS',
  weight: 2,
  desc: 'Candidates should be able to configure DNS on a client host.',
  knowledge: [
    'Query remote DNS servers.',
    'Configure local name resolution and use remote DNS servers.',
    'Modify the order in which name resolution is done.',
    'Debug errors related to name resolution.',
    'Awareness of systemd-resolved.',
  ],
  terms: ['/etc/hosts', '/etc/resolv.conf', '/etc/nsswitch.conf', 'host', 'dig', 'getent'],
  wiki: String.raw`
## How a name is resolved
1. The application calls the C library resolver ({{getaddrinfo()}}).
2. glibc reads **{{/etc/nsswitch.conf}}** — line {{hosts: files dns}} → first **{{/etc/hosts}}**, then **DNS**.
3. For DNS it uses the servers in **{{/etc/resolv.conf}}** (possibly the local stub {{127.0.0.53}} of systemd-resolved, which forwards to the real servers).

Changing the order: edit the {{hosts:}} line, e.g. {{hosts: dns files}} (DNS first) or add {{myhostname}}, {{resolve}} (systemd-resolved), {{mdns4_minimal}}.

## DNS record types you should know
| Type | Meaning |
|---|---|
| **A** | name → IPv4 address |
| **AAAA** | name → IPv6 address |
| **CNAME** | alias → canonical name |
| **MX** | mail exchanger for a domain (with preference) |
| **NS** | authoritative name servers of a zone |
| **PTR** | reverse lookup: address → name ({{in-addr.arpa}}, {{ip6.arpa}}) |
| **SOA** | start of authority (zone serial, timers) |
| **TXT** | free text (SPF, DKIM, verification) |
| **SRV** | service location ({{_ldap._tcp.example.com}}) |

DNS uses **port 53** (UDP for queries, TCP for large answers and zone transfers).

## dig — the DNS debugging tool
~~~console
$ dig example.com                  # A record, full output
$ dig example.com MX
$ dig AAAA example.com
$ dig +short example.com
$ dig +short example.com MX
$ dig @1.1.1.1 example.com         # ask a specific server
$ dig -x 93.184.215.14             # reverse lookup (PTR)
$ dig example.com NS +noall +answer
$ dig +trace example.com           # follow the delegation from the root
~~~
Read the output: **status** ({{NOERROR}}, {{NXDOMAIN}} = name does not exist, {{SERVFAIL}} = server problem), **flags** ({{aa}} = authoritative answer, {{rd}}/{{ra}} = recursion desired/available), the ANSWER section (name, TTL, class, type, data) and the SERVER that answered.

## host and nslookup
~~~console
$ host www.example.com
$ host -t MX example.com
$ host 93.184.215.14               # reverse lookup
$ host example.com 1.1.1.1         # use a specific server
$ nslookup example.com
~~~

## getent — resolve like an application
{{dig}}, {{host}} and {{nslookup}} talk to DNS directly and **ignore {{/etc/hosts}} and nsswitch.conf**. To see what programs really get, use {{getent}}:
~~~console
$ getent hosts fileserver          # found in /etc/hosts
$ getent hosts example.com
$ getent ahosts localhost          # all addresses (IPv4 + IPv6)
$ host fileserver                  # DNS only → may fail
~~~

## /etc/resolv.conf and /etc/hosts
~~~file
# /etc/resolv.conf
search example.com
nameserver 192.168.56.1
nameserver 1.1.1.1
options timeout:2 attempts:3 rotate ndots:1
~~~
~~~file
# /etc/hosts — static entries, also for testing before DNS changes
192.168.56.30   intranet.example.com intranet
~~~
~~~console
$ cat /etc/resolv.conf
$ cat /etc/hosts
$ grep ^hosts /etc/nsswitch.conf
~~~

## systemd-resolved (awareness)
A local caching stub resolver: listens on **127.0.0.53**, supports DNSSEC, DNS-over-TLS, LLMNR and mDNS, and keeps per-interface DNS servers. {{/etc/resolv.conf}} is then usually a symlink to {{/run/systemd/resolve/stub-resolv.conf}}. Configuration: {{/etc/systemd/resolved.conf}}.
~~~console
$ resolvectl status
$ resolvectl query example.com
# resolvectl flush-caches
$ resolvectl statistics
~~~
(Older name: {{systemd-resolve --status}}.)

## Debugging name resolution
- {{ping 8.8.8.8}} works but {{ping example.com}} doesn't → DNS problem.
- {{getent hosts NAME}} vs. {{dig NAME}}: different results → /etc/hosts or nsswitch order is involved.
- {{dig @SERVER NAME}} against each nameserver in resolv.conf → which one fails? Is port 53 blocked?
- {{NXDOMAIN}} → typo or missing record; {{SERVFAIL}}/timeout → server or network problem.
- Short names fail but FQDNs work → check the {{search}} line.
- Stale answers → flush caches ({{resolvectl flush-caches}}, restart nscd/dnsmasq).

## DNS classes
Every DNS record has a **class** besides its type. There are three: **IN** (Internet — practically everything you will see), **CH** (Chaosnet, obsolete; today used for server information queries like {{dig CH TXT version.bind @server}}) and **HS** (Hesiod, storing user/group data in DNS). The class appears in dig output between TTL and type: {{example.com. 3600 IN A 93.184.215.14}}.

## nsswitch.conf actions
Entries in {{/etc/nsswitch.conf}} may carry actions in brackets that control the fallback: {{hosts: dns [!UNAVAIL=return] files}} means "if DNS is reachable, take its answer (even 'not found') and do not consult /etc/hosts". Status values: {{SUCCESS}}, {{NOTFOUND}}, {{UNAVAIL}}, {{TRYAGAIN}}; actions: {{return}}, {{continue}}. See {{man nsswitch.conf}}.
`,
  quiz: [
    { q: 'Which command queries the DNS server {{1.1.1.1}} directly for the MX records of {{example.com}}?', fill: ['dig @1.1.1.1 example.com MX', 'dig @1.1.1.1 MX example.com', 'dig @1.1.1.1 -t MX example.com', 'host -t MX example.com 1.1.1.1', 'dig MX example.com @1.1.1.1', 'dig example.com MX @1.1.1.1'], e: '' },
    { q: 'Which DNS record type maps a host name to an IPv6 address?', fill: ['AAAA'], e: 'A = IPv4.' },
    { q: 'Which record type is used for reverse lookups?', fill: ['PTR'], e: 'Under in-addr.arpa / ip6.arpa.' },
    { q: 'Which command performs a reverse lookup of {{192.0.2.10}} with dig?', fill: ['dig -x 192.0.2.10'], e: '{{host 192.0.2.10}} does the same.' },
    { q: 'Which line in {{/etc/nsswitch.conf}} makes the system query DNS **before** {{/etc/hosts}}?', o: ['{{hosts: dns files}}', '{{hosts: files dns}}', '{{order dns,hosts}}', '{{lookup: dns hosts}}'], a: 0, e: '{{order hosts,bind}} was the syntax of the ancient /etc/host.conf.' },
    { q: 'Why may {{dig fileserver}} fail while {{ping fileserver}} works?', o: ['dig does not support short names.', 'dig only queries DNS and ignores /etc/hosts, where fileserver is defined.', 'ping uses a different DNS server.', 'dig requires root privileges.'], a: 1, e: 'Use getent hosts to resolve like applications do.' },
    { q: 'Which command resolves a host name using all sources configured in nsswitch.conf?', fill: ['getent hosts', 'getent ahosts'], e: '' },
    { q: 'What does the status {{NXDOMAIN}} in a dig answer mean?', o: ['The server is not reachable.', 'The queried name does not exist.', 'The answer is not authoritative.', 'The record is cached.'], a: 1, e: 'SERVFAIL indicates a server problem.' },
    { q: 'On which address does the stub resolver of systemd-resolved listen?', fill: ['127.0.0.53'], e: '' },
    { q: 'Which command shows the DNS servers used per interface by systemd-resolved?', fill: ['resolvectl status', 'resolvectl', 'systemd-resolve --status', 'resolvectl dns'], e: '' },
    { q: 'Which command prints only the IP address(es) of {{example.com}} with dig?', fill: ['dig +short example.com', 'dig example.com +short'], e: '' },
    { q: 'Which DNS record type specifies the mail servers of a domain?', fill: ['MX'], e: 'Lower preference value = higher priority.' },
  ],
});
