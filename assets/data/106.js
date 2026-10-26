/* Topic 106: User Interfaces and Desktops */
LPIC.add({
  id: '106.1',
  title: 'Install and configure X11',
  weight: 2,
  desc: 'Candidates should be able to install and configure X11.',
  knowledge: [
    'Understanding of the X11 architecture.',
    'Basic understanding and knowledge of the X Window configuration file.',
    'Override specific aspects of Xorg configuration, such as keyboard layout.',
    'Understand the components of desktop environments, such as display managers and window managers.',
    'Manage access to the X server and display applications on remote X servers.',
    'Awareness of Wayland.',
  ],
  terms: ['/etc/X11/xorg.conf', '/etc/X11/xorg.conf.d/', '~/.xsession-errors', 'xhost', 'xauth', 'DISPLAY', 'X'],
  wiki: String.raw`
## X11 architecture
The **X Window System** (X11, current implementation **X.Org**, binary {{Xorg}} / {{X}}) is a **client/server** system — with the roles reversed from what you may expect:
- the **X server** runs on the machine with the screen, keyboard and mouse; it draws and handles input;
- **X clients** are the applications (xterm, firefox …); they can run on the same machine or **remotely** and talk to the server via the **X protocol** (Unix socket or TCP port **6000 + display number**);
- a **window manager** is a special client that draws frames, title bars and handles moving/resizing (e.g. Mutter, KWin, Xfwm, Openbox, i3);
- a **display manager** provides the graphical login screen and starts the session (GDM, SDDM, LightDM, XDM);
- a **desktop environment** bundles window manager, panels, file manager, settings and applications (GNOME, KDE Plasma, Xfce, …).

## The DISPLAY variable
{{DISPLAY=[host]:display[.screen]}} tells clients which X server to use: {{:0}} = first display on this machine, {{:0.1}} its second screen, {{remotehost:10.0}}.

~~~console
$ echo $DISPLAY
$ xrandr
$ xdpyinfo | head -5
$ DISPLAY=:0 xterm &
~~~

## Configuration: xorg.conf and xorg.conf.d
Modern Xorg **auto-detects** most hardware, so a config file is optional. It is read from **{{/etc/X11/xorg.conf}}** and snippets in **{{/etc/X11/xorg.conf.d/*.conf}}** (plus distribution defaults in {{/usr/share/X11/xorg.conf.d/}}). Generate a template with {{Xorg -configure}} (as root, with X stopped).

The file consists of **sections**:

| Section | Describes |
|---|---|
| {{ServerLayout}} | ties screens and input devices together (the overall layout) |
| {{Files}} | font paths, module paths |
| {{Module}} | modules to load (glx, …) |
| {{InputDevice}} / {{InputClass}} | keyboard, mouse, touchpad (driver {{libinput}}, options like {{XkbLayout}}) |
| {{Monitor}} | monitor properties (HorizSync, VertRefresh, modes) |
| {{Device}} | graphics card and driver ({{modesetting}}, {{amdgpu}}, {{nvidia}}, {{intel}}, {{vesa}}) |
| {{Screen}} | combination of Device + Monitor, colour depth, resolutions ({{SubSection "Display"}}) |

~~~file
Section "Device"
    Identifier  "Card0"
    Driver      "modesetting"
EndSection

Section "Screen"
    Identifier   "Screen0"
    Device       "Card0"
    Monitor      "Monitor0"
    DefaultDepth 24
    SubSection "Display"
        Depth   24
        Modes   "1920x1080" "1280x1024"
    EndSubSection
EndSection
~~~

~~~console
$ cat /etc/X11/xorg.conf
$ ls /etc/X11/xorg.conf.d/
~~~

## Overriding single aspects: keyboard layout
Instead of a full xorg.conf, drop a small file into {{xorg.conf.d}}:

~~~file
# /etc/X11/xorg.conf.d/00-keyboard.conf
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "de,us"
    Option "XkbOptions" "grp:alt_shift_toggle"
EndSection
~~~

~~~console
$ setxkbmap de
$ setxkbmap -query
# localectl set-x11-keymap de
$ localectl status
~~~

{{setxkbmap}} changes the layout for the running session; {{localectl set-x11-keymap}} writes the 00-keyboard.conf file for you.

## Logs and error files
- server log: **{{/var/log/Xorg.0.log}}** (or {{~/.local/share/xorg/Xorg.0.log}} when X runs rootless); lines marked {{(EE)}} errors, {{(WW)}} warnings, {{(II)}} info
- session errors of the user's programs: **{{~/.xsession-errors}}**

~~~console
$ grep -E '\((EE|WW)\)' /var/log/Xorg.0.log
~~~

## Access control: xhost and xauth
Who may connect to an X server?
- **{{xhost}}** — host-based: {{xhost +remotehost}} allows a host, {{xhost -remotehost}} removes it, {{xhost +}} allows **everybody** (insecure!), {{xhost -}} re-enables access control, {{xhost}} shows the list.
- **{{xauth}}** — cookie based (**MIT-MAGIC-COOKIE-1**): the display manager puts a secret cookie in {{~/.Xauthority}} ({{$XAUTHORITY}}); clients presenting it are allowed. {{xauth list}}, {{xauth extract}}, {{xauth merge}} move cookies between machines.

~~~console
$ xhost
$ xauth list
~~~

## Running applications on a remote X server
1. **SSH X11 forwarding (recommended)** — encrypted, handles DISPLAY and xauth automatically:

~~~console
$ ssh -X student@fileserver
$ ssh -Y student@fileserver
~~~

On the server {{X11Forwarding yes}} must be set in {{/etc/ssh/sshd_config}}. The remote shell gets {{DISPLAY=localhost:10.0}}.

2. **Classic (unencrypted, X over TCP)** — on the display machine allow the client host ({{xhost +apphost}}; the X server must listen on TCP, which is disabled by default with {{-nolisten tcp}}), then on the application host: {{export DISPLAY=displayhost:0}} and start the program.

## Wayland (awareness)
**Wayland** is the modern replacement for X11: the **compositor** (Mutter in GNOME, KWin in KDE, Sway, Weston) *is* the display server, window manager and compositor in one; clients render themselves and share buffers. More secure (applications cannot spy on each other's input/screen) and smoother. Legacy X11 applications run via **XWayland**. Network transparency is not built in (use RDP/VNC/waypipe). Check the session type:

~~~console
$ echo $XDG_SESSION_TYPE
$ loginctl show-session $XDG_SESSION_ID -p Type
~~~
`,
  quiz: [
    { q: 'In the X11 architecture, where does the X **server** run?', o: ['on the machine running the application', 'on the machine with the display, keyboard and mouse', 'always on a central server', 'inside the window manager'], a: 1, e: 'Applications are X clients; they may run remotely.' },
    { q: 'Which environment variable tells X clients which display to use?', fill: ['DISPLAY'], e: 'e.g. {{DISPLAY=:0}} or {{DISPLAY=host:10.0}}.' },
    { q: 'What does {{DISPLAY=:0}} mean?', o: ['the first display on the local machine', 'no display', 'display on port 0 of a remote host', 'the second screen'], a: 0, e: 'host:display.screen — empty host = local.' },
    { q: 'In which directory can configuration snippets be placed that override parts of the Xorg configuration?', fill: ['/etc/X11/xorg.conf.d', '/etc/X11/xorg.conf.d/'], e: 'Files ending in .conf, read in alphabetical order.' },
    { q: 'Which xorg.conf section describes the graphics card and its driver?', o: ['{{Monitor}}', '{{Device}}', '{{Screen}}', '{{ServerLayout}}'], a: 1, e: 'Screen combines a Device and a Monitor; ServerLayout ties screens and input devices.' },
    { q: 'Which command allows all hosts to connect to your X server (insecure)?', fill: ['xhost +'], e: '{{xhost -}} re-enables access control.' },
    { q: 'Which file stores the MIT-MAGIC-COOKIE used by xauth?', fill: ['~/.Xauthority', '.Xauthority', '$HOME/.Xauthority'], e: 'Its location can be changed with $XAUTHORITY.' },
    { q: 'Which ssh option enables X11 forwarding?', fill: ['-X', 'ssh -X'], e: '{{-Y}} enables trusted forwarding. The server needs X11Forwarding yes.' },
    { q: 'Which file contains error messages of a user\'s graphical session programs?', fill: ['~/.xsession-errors', '.xsession-errors'], e: 'The X server itself logs to /var/log/Xorg.0.log.' },
    { q: 'What is the role of a display manager?', o: ['It draws window borders.', 'It provides the graphical login and starts the user session.', 'It is the X server.', 'It manages screen resolutions only.'], a: 1, e: 'Examples: GDM, SDDM, LightDM, XDM.' },
    { q: 'Which statement about Wayland is correct?', o: ['It is a window manager for X11.', 'The compositor acts as display server; X11 applications run through XWayland.', 'It requires xhost to be configured.', 'It uses xorg.conf.'], a: 1, e: 'Wayland replaces the X11 protocol.' },
    { q: 'Which command changes the X keyboard layout of the running session to German?', fill: ['setxkbmap de'], e: '{{localectl set-x11-keymap de}} makes it persistent.' },
    { q: 'On which TCP port does the X server for display :0 listen when TCP is enabled?', fill: ['6000'], e: '6000 + display number.' },
  ],
});

LPIC.add({
  id: '106.2',
  title: 'Graphical Desktops',
  weight: 1,
  desc: 'Candidates should be aware of major Linux desktops. Furthermore, candidates should be aware of protocols used to access remote desktop sessions.',
  knowledge: ['Awareness of major desktop environments.', 'Awareness of protocols to access remote desktop sessions.'],
  terms: ['KDE', 'Gnome', 'Xfce', 'X11', 'XDMCP', 'VNC', 'Spice', 'RDP'],
  wiki: String.raw`
## Desktop environments
| Desktop | Toolkit | Notes |
|---|---|---|
| **GNOME** | GTK | default on Debian, Ubuntu, Fedora, RHEL; Mutter window manager, GDM display manager, Wayland by default |
| **KDE Plasma** | Qt | very configurable; KWin, SDDM; Dolphin, Konsole |
| **Xfce** | GTK | lightweight, traditional; Xfwm, Thunar |
| **LXQt / LXDE** | Qt / GTK | very lightweight, old hardware |
| **Cinnamon / MATE** | GTK | Linux Mint; MATE is a fork of GNOME 2 |

All of them run on top of X11 (or Wayland). A desktop environment = window manager + panels/launchers + file manager + settings + a suite of applications + common standards (freedesktop.org: menus, icons, autostart, notifications, D-Bus).

## Remote desktop protocols
| Protocol | Description |
|---|---|
| **XDMCP** | X Display Manager Control Protocol: a remote X server (thin client) asks a display manager for a login screen; the whole session runs on the remote host. UDP port 177, **unencrypted** — use only in trusted networks. |
| **VNC** | Virtual Network Computing — transmits **framebuffer images** (RFB protocol, port **5900 + display**); platform independent; servers TigerVNC, TightVNC, x11vnc; clients vncviewer, Remmina. Not encrypted by default (tunnel through SSH). |
| **RDP** | Remote Desktop Protocol (Microsoft), port **3389**; Linux server {{xrdp}} / GNOME Remote Desktop, clients {{xfreerdp}}, Remmina; encrypted, sound/clipboard/printer redirection. |
| **SPICE** | Simple Protocol for Independent Computing Environments — remote access to **virtual machine** consoles (KVM/QEMU, oVirt, Proxmox); clients {{remote-viewer}}, virt-viewer; USB redirection, audio, multi-monitor. |
| **X11 forwarding** | individual applications over SSH ({{ssh -X}}) — see 106.1. |
| NX / X2Go | compressed X11 sessions over SSH (awareness). |
`,
  quiz: [
    { q: 'Which desktop environment is based on the Qt toolkit?', o: ['GNOME', 'KDE Plasma', 'Xfce', 'MATE'], a: 1, e: 'GNOME, Xfce and MATE use GTK.' },
    { q: 'Which remote desktop protocol is mainly used to access the consoles of virtual machines (e.g. KVM/QEMU)?', fill: ['SPICE', 'Spice', 'spice'], e: 'Clients: remote-viewer, virt-viewer.' },
    { q: 'Which protocol lets a remote X server request a graphical login from a display manager?', fill: ['XDMCP'], e: 'UDP port 177, unencrypted.' },
    { q: 'Which protocol transmits screen images (framebuffer) and uses port 5900 + display number?', o: ['RDP', 'VNC', 'XDMCP', 'SSH'], a: 1, e: 'VNC uses the RFB protocol.' },
    { q: 'Which protocol was developed by Microsoft and uses TCP port 3389?', fill: ['RDP'], e: 'Linux implementations: xrdp, FreeRDP.' },
    { q: 'Which desktop environment is known as lightweight and uses the Xfwm window manager?', fill: ['Xfce', 'XFCE', 'xfce'], e: 'Its file manager is Thunar.' },
    { q: 'Which remote access methods transmit data unencrypted by default? (Choose two.)', o: ['XDMCP', 'VNC', 'SSH X11 forwarding', 'RDP with TLS'], a: [0, 1], e: 'Tunnel VNC through SSH or use TLS-enabled variants.' },
  ],
});

LPIC.add({
  id: '106.3',
  title: 'Accessibility',
  weight: 1,
  desc: 'Demonstrate knowledge and awareness of accessibility technologies.',
  knowledge: ['Basic knowledge of visual settings and themes.', 'Basic knowledge of assistive technology.'],
  terms: ['High Contrast/Large Print Desktop Themes', 'Screen Reader', 'Braille Display', 'Screen Magnifier', 'On-Screen Keyboard', 'Sticky/Repeat keys', 'Slow/Bounce/Toggle keys', 'Mouse keys', 'Gestures', 'Voice recognition'],
  wiki: String.raw`
## Visual settings and themes
Desktop environments offer accessibility settings (GNOME: *Settings → Accessibility*, KDE: *System Settings → Accessibility*):
- **High-contrast themes** — strong colour contrast for low vision or colour blindness
- **Large print / large text** — scaled fonts; adjustable cursor size
- **Screen magnifier** — zooms part of the screen (GNOME built-in zoom, KMag, {{xzoom}})
- reduced animation, visual alerts (flash the screen instead of a beep)

~~~console
$ gsettings get org.gnome.desktop.a11y.interface high-contrast
$ gsettings get org.gnome.desktop.interface text-scaling-factor
~~~

## Assistive technologies
| Technology | Purpose |
|---|---|
| **Screen reader** | reads screen content aloud via speech synthesis — **Orca** (GNOME), uses the AT-SPI accessibility bus; for consoles: Speakup, BRLTTY with speech |
| **Braille display** | refreshable tactile output device; driven by **BRLTTY** (console) and Orca (desktop) |
| **On-screen keyboard** | type with a pointing device — GOK, Onboard, Caribou, florence |
| **Voice recognition** | control the computer / dictate with speech (e.g. Simon, Julius, voice2json) |
| **Gestures** | mouse/touchpad/touch-screen gestures to trigger actions |

## Keyboard and mouse assistance (AccessX)
| Feature | What it does |
|---|---|
| **Sticky keys** | modifier keys (Shift, Ctrl, Alt) stay "pressed" so shortcuts can be typed one key at a time |
| **Repeat keys** | adjust or disable auto-repeat of a held key |
| **Slow keys** | a key must be held for a while before it is accepted — prevents accidental presses |
| **Bounce keys** | ignore quickly repeated presses of the same key (tremor) |
| **Toggle keys** | sound when Caps Lock / Num Lock are toggled |
| **Mouse keys** | move the mouse pointer with the numeric keypad |
| simulated secondary click / dwell click | click by holding the button or by keeping the pointer still |
`,
  quiz: [
    { q: 'Which accessibility feature lets a user press Ctrl, Alt and Del one after another instead of simultaneously?', o: ['Slow keys', 'Sticky keys', 'Bounce keys', 'Toggle keys'], a: 1, e: 'Modifiers "stick" until the next key press.' },
    { q: 'Which feature ignores repeated presses of the same key within a short time, helping users with tremors?', fill: ['Bounce keys', 'bounce keys'], e: 'Slow keys require holding a key; bounce keys filter rapid repeats.' },
    { q: 'Which assistive technology allows controlling the mouse pointer with the numeric keypad?', fill: ['Mouse keys', 'mouse keys', 'MouseKeys'], e: 'Part of the AccessX features.' },
    { q: 'What is Orca?', o: ['a screen magnifier', 'a screen reader for GNOME', 'an on-screen keyboard', 'a Braille driver for the console'], a: 1, e: 'Orca reads screen content via speech or Braille.' },
    { q: 'Which device presents text in tactile form for blind users?', fill: ['Braille display', 'braille display', 'Braille'], e: 'Supported by BRLTTY on the console.' },
    { q: 'Which feature requires a key to be held down for a certain time before it is registered?', o: ['Slow keys', 'Repeat keys', 'Toggle keys', 'Sticky keys'], a: 0, e: 'Prevents accidental key presses.' },
    { q: 'Which settings help users with low vision? (Choose two.)', o: ['High contrast theme', 'Screen magnifier', 'Bounce keys', 'Mouse keys'], a: [0, 1], e: 'Bounce/mouse keys are motor assistance features.' },
  ],
});
