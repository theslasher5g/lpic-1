/* Extra questions — Topic 109: Networking Fundamentals. */
LPIC.addQuiz('109.1', [
  { q: 'What is the network address of {{172.16.45.200/20}}?', fill: ['172.16.32.0'], e: '/20 → third octet block size 16: 32–47. Broadcast 172.16.47.255.', de: '/20 → Blockgröße 16 im dritten Oktett: 32–47; Broadcast 172.16.47.255.' },
  { q: 'How many usable hosts does a /30 network have?', fill: ['2'], e: 'Typical for point-to-point links; /31 (RFC 3021) can use both addresses.', de: 'Typisch für Punkt-zu-Punkt-Verbindungen.' },
  { q: 'Which CIDR prefix corresponds to the netmask {{255.255.255.192}}?', fill: ['/26', '26'], e: '192 = 11000000 → 24 + 2 bits.', de: '192 = 11000000 → 24 + 2 Bit = /26.' },
  { q: 'A network must hold 50 hosts. What is the smallest suitable prefix?', fill: ['/26', '26'], e: '/26 = 62 usable hosts; /27 = 30 would be too small.', de: '/26 bietet 62 Hosts, /27 nur 30.' },
  { q: 'Which port does POP3 use?', fill: ['110'], e: 'POP3S = 995, IMAP = 143, IMAPS = 993.', de: 'POP3S 995, IMAP 143, IMAPS 993.' },
  { q: 'Which port is used by Telnet?', fill: ['23'], e: 'Telnet is unencrypted — use SSH (22).', de: 'Telnet ist unverschlüsselt – besser SSH (22).' },
  { q: 'Which ports belong to HTTP and HTTPS?', o: ['80 and 443', '8080 and 8443', '80 and 8443', '443 and 80 (in that order)'], a: 0, e: '', de: 'HTTP 80, HTTPS 443.' },
  { q: 'Which statements about TCP are correct? (Choose two.)', o: ['It establishes a connection with a three-way handshake.', 'It retransmits lost segments.', 'It has no port numbers.', 'It is used by ping.'], a: [0, 1], e: 'SYN → SYN/ACK → ACK.', de: 'Verbindungsaufbau mit SYN → SYN/ACK → ACK; verlorene Segmente werden erneut gesendet.' },
  { q: 'Which protocol does DNS mainly use for normal queries?', o: ['UDP port 53', 'TCP port 25', 'UDP port 123', 'TCP port 389'], a: 0, e: 'TCP 53 is used for large answers and zone transfers.', de: 'TCP 53 für große Antworten und Zonentransfers.' },
  { q: 'Which type of IPv6 address is similar to RFC 1918 private IPv4 addresses?', o: ['unique local addresses (fc00::/7, in practice fd00::/8)', 'link-local addresses (fe80::/10)', 'multicast (ff00::/8)', 'global unicast (2000::/3)'], a: 0, e: '', de: 'Unique Local Addresses (fd00::/8) entsprechen privaten IPv4-Adressen.' },
  { q: 'Which mechanism lets an IPv6 host configure its own address from router advertisements without a DHCP server?', fill: ['SLAAC'], ci: true, e: 'Stateless Address Autoconfiguration.', de: 'Stateless Address Autoconfiguration.' },
  { q: 'Which address is the IPv4 limited broadcast address?', fill: ['255.255.255.255'], e: '', de: '255.255.255.255 ist die eingeschränkte Broadcast-Adresse.' },
  { q: 'Which port is used by LDAPS?', fill: ['636'], e: 'LDAP = 389.', de: 'LDAP nutzt 389.' },
  { q: 'Which ICMP message types are used by ping?', o: ['echo request (8) and echo reply (0)', 'time exceeded (11)', 'destination unreachable (3)', 'redirect (5)'], a: 0, e: '', de: 'ping nutzt Echo Request (8) und Echo Reply (0).' },
]);

LPIC.addQuiz('109.2', [
  { q: 'Which command shows the FQDN of the local host?', fill: ['hostname -f', 'hostname --fqdn'], e: '', de: '{{hostname -f}} zeigt den vollständigen Namen.' },
  { q: 'What does the interface name {{enp3s5}} tell you?', o: ['Ethernet at PCI bus 3, slot 5', 'the 3rd ethernet card, port 5', 'WLAN device 3', 'an interface named by its MAC'], a: 0, e: 'en = Ethernet, p = PCI bus, s = slot; eno = on-board, ens = hotplug slot, enx = MAC.', de: 'en = Ethernet, p = PCI-Bus, s = Steckplatz; eno = Onboard, ens = Hotplug-Slot, enx = MAC.' },
  { q: 'Which prefix do predictable interface names of wireless LAN devices have?', fill: ['wl'], e: 'en Ethernet, wl WLAN, ww WWAN, ib InfiniBand, sl SLIP.', de: 'en Ethernet, wl WLAN, ww WWAN, ib InfiniBand, sl SLIP.' },
  { q: 'Which command sets the IPv4 DNS server of the NetworkManager connection {{lab}} to {{9.9.9.9}}?', fill: ['nmcli con mod lab ipv4.dns 9.9.9.9', 'nmcli connection modify lab ipv4.dns 9.9.9.9', 'nmcli c mod lab ipv4.dns 9.9.9.9', 'nmcli con modify lab ipv4.dns 9.9.9.9'], e: 'Reactivate with {{nmcli con up lab}}.', de: 'Danach mit {{nmcli con up lab}} neu aktivieren.' },
  { q: 'Which command switches the connection {{lab}} to DHCP?', fill: ['nmcli con mod lab ipv4.method auto', 'nmcli connection modify lab ipv4.method auto', 'nmcli c mod lab ipv4.method auto', 'nmcli con modify lab ipv4.method auto'], e: 'manual = static.', de: 'manual = statisch, auto = DHCP.' },
  { q: 'Which command disconnects the device {{wlp2s0}} via NetworkManager?', fill: ['nmcli device disconnect wlp2s0', 'nmcli dev disconnect wlp2s0', 'nmcli d disconnect wlp2s0'], e: '', de: '{{nmcli dev disconnect}} trennt das Gerät.' },
  { q: 'Which command shows the status of systemd-networkd managed links?', fill: ['networkctl', 'networkctl status', 'networkctl list'], e: '', de: '{{networkctl}} zeigt die Links von systemd-networkd.' },
  { q: 'In {{/etc/network/interfaces}}, which line configures {{eth0}} via DHCP?', fill: ['iface eth0 inet dhcp'], e: 'Add {{auto eth0}} to bring it up at boot.', de: 'Mit {{auto eth0}} wird es beim Start aktiviert.' },
  { q: 'Which setting in a systemd-networkd {{.network}} file enables DHCP?', o: ['{{DHCP=yes}} in [Network]', '{{BOOTPROTO=dhcp}}', '{{iface dhcp}}', '{{method=auto}} in [ipv4]'], a: 0, e: 'BOOTPROTO is Red Hat ifcfg; method=auto is a NetworkManager keyfile.', de: 'BOOTPROTO gehört zu Red Hat ifcfg, method=auto zu NetworkManager-Keyfiles.' },
  { q: 'Which statement about {{/etc/resolv.conf}} on systems with NetworkManager or systemd-resolved is correct?', o: ['It is usually generated automatically; manual changes may be overwritten.', 'It must never exist.', 'It is only read by ping.', 'It contains the host name.'], a: 0, e: 'Configure DNS in the connection profile or resolved.conf instead.', de: 'DNS besser im Verbindungsprofil bzw. in resolved.conf konfigurieren.' },
]);

LPIC.addQuiz('109.3', [
  { q: 'Which command removes the address {{10.0.0.5/24}} from {{enp0s8}}?', fill: ['ip addr del 10.0.0.5/24 dev enp0s8', 'ip address del 10.0.0.5/24 dev enp0s8', 'ip a del 10.0.0.5/24 dev enp0s8', 'ip addr delete 10.0.0.5/24 dev enp0s8'], e: '', de: '{{ip addr del}} entfernt eine Adresse.' },
  { q: 'Which command shows interface statistics such as RX/TX errors?', fill: ['ip -s link', 'ip -s link show', 'ip -s l', 'netstat -i'], e: '', de: '{{ip -s link}} zeigt Statistiken und Fehlerzähler.' },
  { q: 'Which command deletes the route to {{10.1.0.0/16}}?', fill: ['ip route del 10.1.0.0/16', 'ip r del 10.1.0.0/16', 'ip route delete 10.1.0.0/16'], e: '', de: '{{ip route del}} löscht eine Route.' },
  { q: 'A host can reach its own network but nothing else. {{ip route}} shows no "default" line. What is the fix?', o: ['add a default route via the gateway', 'restart DNS', 'increase the MTU', 'change the netmask to /8'], a: 0, e: '{{ip route add default via 192.168.56.1}}.', de: '{{ip route add default via 192.168.56.1}} ergänzt die fehlende Standardroute.' },
  { q: 'Which command shows established TCP connections with numeric addresses?', fill: ['ss -tn', 'ss -nt', 'ss -tan', 'netstat -tn', 'netstat -nt', 'ss -t -n'], e: '', de: '{{ss -tn}} zeigt bestehende TCP-Verbindungen numerisch.' },
  { q: 'Which command opens a simple TCP listener on port 5000 for testing?', fill: ['nc -l 5000', 'nc -l -p 5000', 'netcat -l 5000', 'nc -lp 5000'], e: 'Connect from another host with {{nc HOST 5000}}.', de: 'Von einem anderen Host mit {{nc HOST 5000}} verbinden.' },
  { q: 'Which traceroute option uses ICMP echo requests instead of UDP probes?', fill: ['-I', 'traceroute -I'], e: '{{-T}} uses TCP SYN (often passes firewalls on port 80/443).', de: '{{-T}} nutzt TCP-SYN, was Firewalls oft passieren lassen.' },
  { q: 'Which command sets the MTU of {{enp0s3}} to 1400?', fill: ['ip link set enp0s3 mtu 1400', 'ip link set dev enp0s3 mtu 1400', 'ip l set enp0s3 mtu 1400'], e: '', de: '{{ip link set … mtu}} ändert die MTU.' },
  { q: 'Which command shows all IP addresses of the host in one line?', fill: ['hostname -I', 'hostname --all-ip-addresses'], e: '', de: '{{hostname -I}} gibt alle IP-Adressen aus.' },
  { q: 'Which legacy command shows the routing table numerically? (Choose two.)', o: ['{{route -n}}', '{{netstat -rn}}', '{{ifconfig -r}}', '{{arp -r}}'], a: [0, 1], e: '', de: '{{route -n}} und {{netstat -rn}} zeigen die Routingtabelle.' },
  { q: 'Which command sends ping packets of 1472 bytes payload with the "don\'t fragment" flag to test the path MTU?', o: ['{{ping -M do -s 1472 host}}', '{{ping -c 1472 host}}', '{{ping -f host}}', '{{ping -I 1472 host}}'], a: 0, e: '1472 + 28 header bytes = 1500; tracepath shows the pmtu automatically.', de: '1472 + 28 Byte Header = 1500; tracepath ermittelt die PMTU automatisch.' },
  { q: 'Which statement about {{ping -c 3 host}} failing while {{nc -zv host 22}} succeeds is correct?', o: ['ICMP is probably filtered by a firewall, but the host is up.', 'The host is down.', 'DNS is broken.', 'The default route is missing.'], a: 0, e: '', de: 'ICMP wird vermutlich gefiltert; der Host ist erreichbar.' },
]);

LPIC.addQuiz('109.4', [
  { q: 'Which DNS record type creates an alias name pointing to another name?', fill: ['CNAME'], e: '', de: 'CNAME erzeugt einen Aliasnamen.' },
  { q: 'Which command queries the NS records of {{example.com}} with host?', fill: ['host -t NS example.com', 'host -t ns example.com'], e: '', de: '{{host -t NS}} fragt die Nameserver ab.' },
  { q: 'What does the flag {{aa}} in a dig answer mean?', o: ['the answer is authoritative', 'the answer is cached', 'all addresses were returned', 'an error occurred'], a: 0, e: 'rd = recursion desired, ra = recursion available.', de: 'aa = autoritative Antwort, rd/ra = Rekursion gewünscht/verfügbar.' },
  { q: 'Which three DNS classes exist?', o: ['IN, CH, HS', 'A, AAAA, MX', 'UDP, TCP, ICMP', 'NS, SOA, PTR'], a: 0, e: 'IN = Internet, CH = Chaosnet, HS = Hesiod.', de: 'IN = Internet, CH = Chaosnet, HS = Hesiod.' },
  { q: 'Which line in {{/etc/resolv.conf}} defines a single local domain used for short names?', fill: ['domain', 'domain example.com'], e: 'search accepts several domains.', de: '{{search}} erlaubt mehrere Domains.' },
  { q: 'Which command flushes the DNS cache of systemd-resolved?', fill: ['resolvectl flush-caches', 'systemd-resolve --flush-caches'], e: '', de: '{{resolvectl flush-caches}} leert den Cache.' },
  { q: 'Which statement about {{/etc/hosts}} is correct?', o: ['It is consulted for name resolution if "files" appears in the hosts line of nsswitch.conf.', 'It is only used by DNS servers.', 'It overrides nsswitch.conf.', 'It is read by dig.'], a: 0, e: '', de: '/etc/hosts wird genutzt, wenn „files“ in der hosts-Zeile von nsswitch.conf steht.' },
  { q: 'Which dig option shows the full delegation path from the root servers?', fill: ['+trace', 'dig +trace'], e: '', de: '{{+trace}} verfolgt die Delegation ab den Root-Servern.' },
]);
