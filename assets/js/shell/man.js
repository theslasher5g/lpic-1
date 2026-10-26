/* LPIC-1 Trainer — condensed manual pages (LPIC-relevant options only). */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  SIM.optional = SIM.optional || new Set();
  SIM.optional.add('tree');

  // name(section) - description :: synopsis :: option text ;; option text ...
  const RAW = `
ls(1) - list directory contents :: ls [OPTION]... [FILE]... :: -a  show hidden entries (starting with .) ;; -A  like -a but without . and .. ;; -l  long listing (permissions, links, owner, group, size, mtime) ;; -h  human readable sizes (with -l) ;; -i  print inode numbers ;; -d  list directories themselves, not their contents ;; -R  recursive ;; -t  sort by modification time, newest first ;; -S  sort by size ;; -r  reverse sort order ;; -F  append indicator (/ dir, * exec, @ link) ;; -1  one entry per line ;; -n  numeric UID/GID
cd(1) - change the shell working directory (builtin) :: cd [-L|-P] [dir] :: cd  go to $HOME ;; cd -  go to $OLDPWD ;; cd ..  parent directory ;; -P  use the physical directory structure (resolve symlinks)
pwd(1) - print name of current/working directory :: pwd [-LP] :: -L  logical path (default, keeps symlinks) ;; -P  physical path
cp(1) - copy files and directories :: cp [OPTION]... SOURCE... DEST :: -r, -R  copy directories recursively ;; -a  archive: -dR --preserve=all ;; -p  preserve mode, ownership, timestamps ;; -i  prompt before overwrite ;; -f  force ;; -u  copy only when SOURCE is newer ;; -v  verbose ;; -l  hard link instead of copying ;; -s  symbolic link instead of copying
mv(1) - move (rename) files :: mv [OPTION]... SOURCE... DEST :: -i  prompt before overwrite ;; -f  do not prompt ;; -n  never overwrite ;; -u  move only when SOURCE is newer ;; -v  verbose
rm(1) - remove files or directories :: rm [OPTION]... FILE... :: -r, -R  remove directories and their contents recursively ;; -f  ignore nonexistent files, never prompt ;; -i  prompt before every removal ;; -d  remove empty directories ;; -v  verbose
mkdir(1) - make directories :: mkdir [OPTION]... DIRECTORY... :: -p  create parent directories as needed, no error if existing ;; -m MODE  set file mode (as in chmod) ;; -v  print a message for each created directory
rmdir(1) - remove empty directories :: rmdir [OPTION]... DIRECTORY... :: -p  remove DIRECTORY and its ancestors ;; --ignore-fail-on-non-empty
touch(1) - change file timestamps / create empty files :: touch [OPTION]... FILE... :: -a  change only access time ;; -m  change only modification time ;; -c  do not create files ;; -t STAMP  use [[CC]YY]MMDDhhmm[.ss] ;; -d STRING  parse STRING as date ;; -r FILE  use FILE's times
file(1) - determine file type :: file [-bLiz] FILE... :: -b  brief (no filename) ;; -i  print MIME type ;; -L  follow symlinks ;; -z  look inside compressed files
find(1) - search for files in a directory hierarchy :: find [-L] [path...] [expression] :: -name PATTERN  base name matches shell pattern (quote it!) ;; -iname  case-insensitive -name ;; -type f|d|l|b|c|p|s ;; -size [+-]N[ckMG] ;; -perm MODE | -MODE (all bits) | /MODE (any bit) ;; -user NAME, -group NAME, -nouser, -nogroup ;; -mtime [+-]N  modified N*24h ago ;; -mmin [+-]N ;; -newer FILE ;; -empty ;; -maxdepth N, -mindepth N ;; -exec CMD {} \\;   or   -exec CMD {} + ;; -ok CMD {} \\;  ask before running ;; -delete ;; -print, -print0, -ls ;; !  -not  -a  -o  ( )  operators
locate(1) - find files by name, quickly (uses a database) :: locate [OPTION]... PATTERN... :: -i  ignore case ;; -c  count matches ;; -l N  limit output ;; -b  match only the base name ;; -r REGEX ;; -e  only existing files ;; the database is updated by updatedb (usually daily via cron)
updatedb(8) - update the locate database :: updatedb [OPTION]... :: configuration: /etc/updatedb.conf (PRUNEPATHS, PRUNEFS) ;; must run as root
whereis(1) - locate the binary, source, and manual page files for a command :: whereis [-bms] name... :: -b  binaries only ;; -m  manual pages only ;; -s  sources only
which(1) - locate a command in $PATH :: which [-a] command... :: -a  print all matches in PATH
type(1) - display information about command type (builtin) :: type [-afptP] name... :: -t  print one of alias, keyword, function, builtin, file ;; -a  all locations ;; -p  path of the file
cat(1) - concatenate files and print on the standard output :: cat [OPTION]... [FILE]... :: -n  number all lines ;; -b  number non-blank lines ;; -s  squeeze repeated blank lines ;; -A  show all (-vET) ;; -E  show $ at end of lines ;; -T  show tabs as ^I
tac(1) - concatenate and print files in reverse (last line first) :: tac [FILE]...
head(1) - output the first part of files :: head [OPTION]... [FILE]... :: -n N  first N lines (default 10) ;; -n -N  all but the last N lines ;; -c N  first N bytes ;; -q  never print headers
tail(1) - output the last part of files :: tail [OPTION]... [FILE]... :: -n N  last N lines (default 10) ;; -n +N  start at line N ;; -c N  last N bytes ;; -f  follow: output appended data as the file grows ;; -F  follow by name, retry (log rotation)
less(1) - opposite of more: pager with backward movement :: less [options] file :: Space/f next page ;; b previous page ;; /pattern search forward, ?pattern backward ;; n / N next/previous match ;; g / G start / end ;; q quit
more(1) - file perusal filter (simple pager) :: more file :: Space next page ;; Enter next line ;; q quit
wc(1) - print newline, word, and byte counts :: wc [OPTION]... [FILE]... :: -l  lines ;; -w  words ;; -c  bytes ;; -m  characters ;; -L  length of the longest line
sort(1) - sort lines of text files :: sort [OPTION]... [FILE]... :: -n  numeric sort ;; -r  reverse ;; -k POS1[,POS2]  sort by key (field) ;; -t SEP  field separator ;; -u  unique ;; -f  ignore case ;; -h  human numeric (2K 1G) ;; -M  month sort ;; -R  random ;; -o FILE  write result to FILE ;; -c  check if sorted
uniq(1) - report or omit repeated lines (input must be sorted!) :: uniq [OPTION]... [INPUT [OUTPUT]] :: -c  prefix lines by number of occurrences ;; -d  only print duplicated lines ;; -u  only print unique lines ;; -i  ignore case ;; -f N  skip N fields ;; -s N  skip N chars
cut(1) - remove sections from each line of files :: cut OPTION... [FILE]... :: -d DELIM  field delimiter (default TAB) ;; -f LIST  select fields e.g. 1,3 or 2-4 ;; -c LIST  select characters ;; -b LIST  select bytes ;; -s  only lines containing delimiters ;; --complement ;; --output-delimiter=STR
paste(1) - merge lines of files :: paste [OPTION]... [FILE]... :: -d LIST  use characters from LIST instead of TABs ;; -s  paste one file at a time (serial)
join(1) - join lines of two files on a common field :: join [OPTION]... FILE1 FILE2 :: -t CHAR  field separator ;; -1 FIELD, -2 FIELD  join fields ;; -a 1|2  also print unpairable lines ;; -i  ignore case
tr(1) - translate, squeeze, and/or delete characters (reads only stdin!) :: tr [OPTION]... SET1 [SET2] :: -d  delete characters in SET1 ;; -s  squeeze repeats ;; -c  complement SET1 ;; classes: [:upper:] [:lower:] [:digit:] [:space:] [:alpha:] [:punct:] ;; ranges: a-z A-Z 0-9
nl(1) - number lines of files :: nl [OPTION]... [FILE]... :: -b a  number all lines (default t = non-empty) ;; -n ln|rn|rz  number format ;; -w N  width ;; -s STR  separator ;; -v N  start number ;; -i N  increment
od(1) - dump files in octal and other formats :: od [OPTION]... [FILE]... :: -c  printable characters / escapes ;; -x  hexadecimal 2-byte units ;; -b  octal bytes ;; -A x|o|d|n  address radix ;; -t TYPE  e.g. x1, c, o2, d4
expand(1) - convert tabs to spaces :: expand [-t N] [FILE]... :: -t N  tab stops every N columns ;; -i  only leading tabs
unexpand(1) - convert spaces to tabs :: unexpand [-a] [FILE]... :: -a  convert all blanks, not just leading
fmt(1) - simple optimal text formatter :: fmt [-w WIDTH] [FILE]... :: -w N  maximum line width (default 75) ;; -u  uniform spacing
pr(1) - convert text files for printing (pagination, headers) :: pr [OPTION]... [FILE]... :: -l N  page length ;; -h HEADER ;; -t  omit headers ;; -d  double space ;; -n  number lines ;; -COLUMN  multi-column output
split(1) - split a file into pieces :: split [OPTION]... [FILE [PREFIX]] :: -l N  N lines per output file ;; -b SIZE  bytes per file (e.g. 1M) ;; -n N  N chunks ;; -d  numeric suffixes ;; -a N  suffix length
md5sum(1) - compute and check MD5 message digest :: md5sum [OPTION]... [FILE]... :: -c  read sums from FILE and check them ;; --quiet  only print failures
sha256sum(1) - compute and check SHA256 message digest :: sha256sum [OPTION]... [FILE]... :: -c  check sums listed in a file ;; --status  no output, exit code only
sha512sum(1) - compute and check SHA512 message digest :: sha512sum [OPTION]... [FILE]... :: -c  check
sha1sum(1) - compute and check SHA1 message digest :: sha1sum [FILE]...
zcat(1) - print gzip-compressed files :: zcat FILE.gz...
bzcat(1) - print bzip2-compressed files :: bzcat FILE.bz2...
xzcat(1) - print xz-compressed files :: xzcat FILE.xz...
grep(1) - print lines that match patterns :: grep [OPTION...] PATTERNS [FILE...] :: -i  ignore case ;; -v  invert match ;; -c  count matching lines ;; -n  line numbers ;; -l  only names of matching files ;; -L  files without match ;; -r, -R  recursive ;; -E  extended regex (egrep) ;; -F  fixed strings (fgrep) ;; -w  whole words ;; -x  whole lines ;; -o  only the matching part ;; -h/-H  suppress / force filename ;; -q  quiet, exit status only ;; -A N, -B N, -C N  context lines ;; -e PATTERN  multiple patterns ;; -f FILE  patterns from file
egrep(1) - grep -E (extended regular expressions; deprecated alias) :: egrep PATTERN [FILE]...
fgrep(1) - grep -F (fixed strings, no regex; deprecated alias) :: fgrep STRING [FILE]...
sed(1) - stream editor for filtering and transforming text :: sed [OPTION]... {script} [input-file]... :: -n  no auto-print (use with p) ;; -e SCRIPT  add script ;; -f FILE  script from file ;; -i[SUFFIX]  edit files in place (optional backup) ;; -E, -r  extended regex ;; s/re/repl/flags  substitute (g=all, i=ignore case, N=Nth, p=print) ;; d  delete line ;; p  print ;; a TEXT / i TEXT / c TEXT  append / insert / change ;; y/abc/xyz/  transliterate ;; q  quit ;; addresses: N, $, /re/, N,M, /a/,/b/, first~step, addr!
awk(1) - pattern scanning and processing language :: awk [-F fs] [-v var=val] 'program' [file]... :: -F SEP  field separator ;; $0 whole line, $1..$NF fields ;; NR record number, NF number of fields ;; BEGIN{...} / END{...} ;; /regex/ {action} ;; printf, length(), substr(), split(), gsub(), toupper()
tee(1) - read from stdin and write to stdout and files :: tee [OPTION]... [FILE]... :: -a  append to the given files instead of overwriting
xargs(1) - build and execute command lines from standard input :: xargs [options] [command [initial-arguments]] :: -n N  max N arguments per command line ;; -I {}  replace string (one command per input line) ;; -0  input items separated by NUL (find -print0) ;; -t  print commands before running ;; -p  prompt ;; -r  do not run if input is empty
chmod(1) - change file mode bits :: chmod [OPTION]... MODE[,MODE]... FILE... :: octal: 4=r 2=w 1=x per u/g/o, leading digit 4=SUID 2=SGID 1=sticky ;; symbolic: [ugoa][+-=][rwxXst] e.g. u+x,g-w,o= ;; -R  recursive ;; -v / -c  verbose / report changes
chown(1) - change file owner and group :: chown [OPTION]... [OWNER][:[GROUP]] FILE... :: user:group  set both ;; user:  set group to user's login group ;; :group  only group ;; -R  recursive ;; only root may change the owner
chgrp(1) - change group ownership :: chgrp [OPTION]... GROUP FILE... :: -R  recursive ;; owner may change to any group they are a member of
umask(1) - get or set the file mode creation mask (builtin) :: umask [-S] [mode] :: files get 666 & ~umask, directories 777 & ~umask ;; -S  symbolic output (u=rwx,g=rx,o=rx)
ln(1) - make links between files :: ln [OPTION]... TARGET LINK_NAME :: (no option)  hard link: same inode, same filesystem only, not for directories ;; -s  symbolic (soft) link: points to a path name, may cross filesystems, may dangle ;; -f  remove existing destination ;; -v  verbose ;; -n  treat LINK_NAME as normal file if it is a symlink to a dir
readlink(1) - print resolved symbolic links or canonical file names :: readlink [-f] FILE :: -f  canonicalize by following every symlink
stat(1) - display file or file system status :: stat [OPTION]... FILE... :: -c FORMAT  e.g. %a octal mode, %A symbolic, %U owner, %G group, %s size, %i inode, %h links ;; -f  file system status ;; -L  follow links
tar(1) - an archiving utility :: tar [-]{c|x|t}[vzjJf] archive [FILE]... :: -c  create ;; -x  extract ;; -t  list ;; -r  append ;; -v  verbose ;; -f FILE  archive file (- = stdin/stdout) ;; -z  gzip ;; -j  bzip2 ;; -J  xz ;; -C DIR  change to DIR first ;; -p  preserve permissions ;; --exclude=PATTERN
gzip(1) - compress or expand files (.gz) :: gzip [-cdfklrv19] [file...] :: -d  decompress (= gunzip) ;; -c  write to stdout, keep original ;; -k  keep input file ;; -l  list compression info ;; -r  recursive ;; -1 fastest ... -9 best
gunzip(1) - decompress .gz files :: gunzip [-ck] file.gz...
bzip2(1) - block-sorting file compressor (.bz2) :: bzip2 [-cdkfv19] [file...] :: -d  decompress ;; -k  keep input files ;; -c  stdout
bunzip2(1) - decompress .bz2 files :: bunzip2 [-k] file.bz2...
xz(1) - compress or decompress .xz files (LZMA2) :: xz [-dkcl] [file...] :: -d  decompress ;; -k  keep ;; -c  stdout ;; -l  list ;; -T N  threads
unxz(1) - decompress .xz files :: unxz [-k] file.xz...
cpio(1) - copy files to and from archives :: cpio -o|-i|-t [options] < name-list :: -o  copy-out: create archive from file names on stdin (find . | cpio -o > a.cpio) ;; -i  copy-in: extract archive from stdin ;; -t  list ;; -d  create leading directories ;; -v  verbose ;; -H newc  archive format
dd(1) - convert and copy a file :: dd if=SOURCE of=TARGET [bs=SIZE] [count=N] [skip=N] [status=progress] :: if=  input file (default stdin) ;; of=  output file ;; bs=  block size (e.g. 4M) ;; count=  number of blocks ;; e.g. dd if=/dev/zero of=file bs=1M count=10 ;; e.g. dd if=/dev/sda of=mbr.img bs=512 count=1  (backup MBR)
mount(8) - mount a filesystem :: mount [-t type] [-o options] device dir :: (no args)  list mounted filesystems ;; -a  mount everything in /etc/fstab (except noauto) ;; -t TYPE  filesystem type (ext4, xfs, vfat, iso9660 ...) ;; -o OPTS  ro, rw, remount, noexec, nosuid, nodev, user, defaults ... ;; -L LABEL / -U UUID ;; mount DIR  uses /etc/fstab entry
umount(8) - unmount filesystems :: umount [-lf] {dir|device} :: -l  lazy unmount ;; -f  force (NFS) ;; fails with "target is busy" when in use (see lsof, fuser)
lsblk(8) - list block devices :: lsblk [options] [device...] :: -f  show filesystems, labels, UUIDs ;; -p  full paths ;; -d  no partitions
blkid(8) - locate/print block device attributes (UUID, TYPE, LABEL) :: blkid [device...]
fdisk(8) - manipulate disk partition table (MBR and GPT) :: fdisk [options] device :: -l  list partition tables ;; interactive: m help, p print, n new, d delete, t type, a boot flag, g new GPT, o new DOS table, w write, q quit
gdisk(8) - interactive GUID partition table (GPT) manipulator :: gdisk [-l] device :: -l  list ;; interactive: n new, d delete, t type code (8300 Linux, 8200 swap, EF00 EFI), p print, w write
parted(8) - a partition manipulation program :: parted [-s] [device [command [options]]] :: -l  list all ;; mklabel gpt|msdos ;; mkpart [type|name] [fs] START END ;; rm N ;; print ;; resizepart N END ;; changes are written immediately!
mkfs(8) - build a Linux filesystem :: mkfs [-t type] [fs-options] device :: front end for mkfs.ext4, mkfs.xfs, mkfs.vfat, mkfs.btrfs, mkfs.exfat ...
mkfs.ext4(8) - create an ext2/ext3/ext4 filesystem (mke2fs) :: mkfs.ext4 [-L label] [-m reserved%] [-b blocksize] device :: -L LABEL ;; -m PCT  reserved blocks for root (default 5%) ;; -j  add journal (ext3) ;; -T usage type ;; -N inodes
mkfs.xfs(8) - construct an XFS filesystem :: mkfs.xfs [-f] [-L label] device :: -f  force overwrite of existing filesystem ;; -L LABEL (max 12 chars)
mkfs.vfat(8) - create an MS-DOS FAT filesystem :: mkfs.vfat [-F 12|16|32] [-n NAME] device
mkswap(8) - set up a Linux swap area :: mkswap [-L label] device|file :: then activate with swapon
swapon(8) - enable devices and files for paging and swapping :: swapon [-a] [-s] [device] :: -s / --show  display swap usage ;; -a  enable all swap from /etc/fstab
swapoff(8) - disable swapping :: swapoff [-a] device
fsck(8) - check and repair a Linux filesystem :: fsck [-t type] [-A] [-N] [-y] device :: front end for e2fsck / fsck.vfat / ... ;; NEVER run on a mounted filesystem ;; -A  check all in /etc/fstab (pass column) ;; -N  dry run ;; -y  answer yes ;; -f  force (e2fsck) ;; exit codes: 0 ok, 1 errors corrected, 4 errors left, 8 operational error
e2fsck(8) - check a Linux ext2/ext3/ext4 file system :: e2fsck [-pfnyv] device :: -f  force check even if clean ;; -p  automatic repair ;; -n  open read-only, answer no ;; -y  answer yes
tune2fs(8) - adjust tunable filesystem parameters on ext2/3/4 :: tune2fs [options] device :: -l  list superblock contents ;; -c N  max mount count between checks ;; -i Nd|w|m  interval between checks ;; -L LABEL ;; -m PCT  reserved blocks ;; -j  add a journal (ext2 -> ext3) ;; -O feature  e.g. ^has_journal ;; -U UUID
dumpe2fs(8) - dump ext2/ext3/ext4 superblock and block group information :: dumpe2fs [-h] device :: -h  superblock only
debugfs(8) - ext2/ext3/ext4 file system debugger :: debugfs [-w] [-R request] device
xfs_repair(8) - repair an XFS filesystem :: xfs_repair [-n] [-L] device :: -n  no-modify mode (check only) ;; -L  zero the log (last resort) ;; filesystem must be unmounted
xfs_db(8) - debug an XFS filesystem :: xfs_db [-r] [-c cmd] device :: -c frag  report fragmentation
xfs_fsr(8) - filesystem reorganizer (defragment) for XFS :: xfs_fsr [-v] [device|file]
df(1) - report file system disk space usage :: df [OPTION]... [FILE]... :: -h  human readable ;; -T  print filesystem type ;; -i  inode information ;; -t TYPE / -x TYPE  include / exclude type
du(1) - estimate file space usage :: du [OPTION]... [FILE]... :: -s  summary per argument ;; -h  human readable ;; -a  all files ;; -c  grand total ;; -d N, --max-depth=N
ps(1) - report a snapshot of the current processes :: ps [options] :: ps aux  BSD style: all processes with user, %CPU, %MEM ;; ps -ef  UNIX style full listing (UID PID PPID ...) ;; -e / -A  all processes ;; -u USER ;; -p PID ;; -C NAME ;; -o FORMAT  e.g. -o pid,ni,cmd ;; --forest  process tree ;; --sort=-%cpu
pstree(1) - display a tree of processes :: pstree [-p] [-u] [pid|user] :: -p  show PIDs
top(1) - display Linux processes (interactive) :: top [-b] [-n N] [-d SEC] [-u user] :: keys: k kill, r renice, M sort by memory, P sort by CPU, 1 per-CPU, q quit ;; -b batch mode ;; -n iterations
kill(1) - send a signal to a process :: kill [-s SIGNAL | -SIGNAL] PID|%JOB... :: -l  list signal names ;; default signal: 15 SIGTERM ;; 1 SIGHUP (reload/hang up) ;; 2 SIGINT (Ctrl+C) ;; 9 SIGKILL (cannot be caught) ;; 15 SIGTERM ;; 18 SIGCONT ;; 19 SIGSTOP ;; 20 SIGTSTP (Ctrl+Z)
killall(1) - kill processes by name :: killall [-s SIGNAL] [-u user] [-v] name...
pkill(1) - signal processes based on name and other attributes :: pkill [-SIGNAL] [-u user] [-f] pattern :: -f  match against full command line ;; -u USER
pgrep(1) - look up processes based on name and other attributes :: pgrep [-l] [-a] [-u user] [-f] pattern :: -l  show names ;; -a  full command line ;; -c  count
nice(1) - run a program with modified scheduling priority :: nice [-n ADJUSTMENT] COMMAND :: niceness ranges -20 (highest priority) .. 19 (lowest), default adjustment 10 ;; only root may use negative values
renice(1) - alter priority of running processes :: renice [-n] PRIORITY [-p PID...] [-u USER...] [-g PGRP...] :: normal users may only increase niceness (lower priority) of their own processes
nohup(1) - run a command immune to hangups :: nohup COMMAND [ARG]... :: output goes to nohup.out if stdout is a terminal
jobs(1) - display status of jobs (builtin) :: jobs [-lp] :: -l  include PIDs ;; %N refers to job N, %+ current, %- previous
fg(1) - move job to the foreground (builtin) :: fg [%job]
bg(1) - resume a stopped job in the background (builtin) :: bg [%job] :: Ctrl+Z stops the foreground job, bg continues it in the background
free(1) - display amount of free and used memory :: free [-h] [-m] [-g] [-t] [-s N] :: -h  human readable ;; -m / -g  MiB / GiB ;; -s N  repeat every N seconds
uptime(1) - tell how long the system has been running :: uptime [-p] [-s] :: shows load averages for 1, 5 and 15 minutes
watch(1) - execute a program periodically, showing output fullscreen :: watch [-n SECONDS] [-d] command :: -n  interval (default 2s) ;; -d  highlight differences
screen(1) - screen manager with VT100/ANSI terminal emulation :: screen [-S name] [-r [session]] [-ls] :: Ctrl+a d detach ;; Ctrl+a c new window ;; screen -r reattach ;; screen -ls list sessions
tmux(1) - terminal multiplexer :: tmux [new -s name | attach -t name | ls] :: Ctrl+b d detach ;; Ctrl+b c new window ;; Ctrl+b % split pane ;; tmux attach reattach
vi(1) - Vi IMproved, a programmer's text editor :: vi [file] :: modes: normal (command), insert (i a o), command-line (:) ;; i insert, a append, o open line below, O above ;; Esc back to normal mode ;; h j k l move, w b words, 0 $ line, gg G file ;; x delete char, dd delete line, yy yank line, p put ;; u undo, Ctrl+r redo ;; /pattern search, n next ;; :w write, :q quit, :wq or :x or ZZ save+quit, :q! quit without saving ;; :e! revert ;; :%s/old/new/g substitute ;; :set number ;; :!cmd run shell command
vim(1) - Vi IMproved, a programmer's text editor :: vim [file] :: see vi(1)
nano(1) - Nano's ANOther editor, an enhanced free Pico clone :: nano [file] :: ^O write out (save) ;; ^X exit ;; ^K cut line ;; ^U paste ;; ^W search ;; ^G help
echo(1) - display a line of text (builtin) :: echo [-neE] [STRING]... :: -n  no trailing newline ;; -e  interpret backslash escapes (\\n \\t)
printf(1) - format and print data :: printf FORMAT [ARGUMENT]... :: %s string, %d integer, %f float, %x hex, %5s width, %-5s left aligned, \\n newline
export(1) - set export attribute for shell variables (builtin) :: export [-n] [name[=value] ...] | export -p :: exported variables are inherited by child processes ;; -n  remove export property ;; -p  list exported variables
set(1) - set or unset shell options and positional parameters (builtin) :: set [-exuC] [-o option] [--] [arg ...] :: (no args)  print all shell variables and functions ;; -x  trace commands ;; -e  exit on error ;; -u  error on unset variables ;; -C / -o noclobber  > does not overwrite files ;; -o vi / -o emacs  command line editing mode ;; set -- a b c  set positional parameters
unset(1) - unset values and attributes of shell variables and functions (builtin) :: unset [-fv] name... :: -f  remove function ;; -v  remove variable
env(1) - run a program in a modified environment / print environment :: env [-i] [-u NAME] [NAME=VALUE]... [COMMAND [ARG]...] :: (no args)  print exported environment ;; -i  start with an empty environment ;; -u NAME  remove variable
alias(1) - define or display aliases (builtin) :: alias [name[='value'] ...] :: alias ll='ls -l' ;; remove with unalias name ;; bypass with \\name or command name
source(1) - execute commands from a file in the current shell (builtin) :: source FILE [ARGS] | . FILE :: changes (variables, cd, aliases) stay in the current shell — unlike running ./script
history(1) - display or manipulate the history list (builtin) :: history [N] | history -c | history -d N :: !!  repeat last command ;; !N  run command number N ;; !string  last command starting with string ;; !$  last argument ;; Ctrl+r  reverse search ;; stored in ~/.bash_history (HISTFILE, HISTSIZE, HISTFILESIZE, HISTCONTROL)
test(1) - check file types and compare values :: test EXPRESSION | [ EXPRESSION ] :: -e exists, -f regular file, -d directory, -L symlink, -r -w -x permissions, -s size > 0 ;; -z empty string, -n non-empty ;; = != string compare ;; -eq -ne -lt -le -gt -ge integer compare ;; ! not, -a and, -o or ;; spaces around [ and ] are mandatory!
read(1) - read a line from standard input (builtin) :: read [-r] [-p prompt] [-s] [-t timeout] [name ...] :: -p  prompt ;; -s  silent (passwords) ;; -r  do not interpret backslashes ;; default variable REPLY
seq(1) - print a sequence of numbers :: seq [FIRST [INCREMENT]] LAST :: -w  equal width (pad with zeros) ;; -s SEP  separator ;; -f FORMAT
exec(1) - replace the shell with the given command (builtin) :: exec [command [arguments]] :: the current shell process is replaced (no return) ;; exec > file  redirects all following output of the shell
expr(1) - evaluate expressions :: expr ARG1 OP ARG2 :: + - \\* / %  integer arithmetic ;; = != < > comparisons ;; length STRING ;; substr STRING POS LEN ;; STRING : REGEX
id(1) - print real and effective user and group IDs :: id [-u|-g|-G] [-n] [USER]
whoami(1) - print effective user name :: whoami
who(1) - show who is logged on :: who [-a -b -H -q -r] :: -b  last boot ;; -r  current runlevel ;; who am i  your own session
w(1) - show who is logged on and what they are doing :: w [user]
last(1) - show a listing of last logged in users (from /var/log/wtmp) :: last [-n N] [user] [reboot]
lastb(1) - show failed login attempts (from /var/log/btmp) :: lastb
su(1) - run a command with substitute user and group ID :: su [-] [-c command] [user] :: su -  (or -l) start a login shell (load target user's environment) ;; without user: root ;; asks for the TARGET user's password
sudo(8) - execute a command as another user :: sudo [-u user] [-i|-s] [command] :: asks for YOUR password; rules in /etc/sudoers (edit with visudo) and /etc/sudoers.d/ ;; -i  login shell as target user ;; -s  shell ;; -l  list allowed commands ;; -k  forget cached credentials
visudo(8) - edit the sudoers file safely (locking + syntax check) :: visudo [-c] [-f file]
passwd(1) - change user password :: passwd [options] [LOGIN] :: -l  lock account (prefix ! in /etc/shadow) ;; -u  unlock ;; -d  delete password ;; -e  expire (force change at next login) ;; -S  status ;; -n MIN -x MAX -w WARN -i INACTIVE  aging
useradd(8) - create a new user or update default new user information :: useradd [options] LOGIN :: -m  create home directory (copies /etc/skel) ;; -d HOME ;; -s SHELL ;; -u UID ;; -g GROUP  primary group ;; -G G1,G2  supplementary groups ;; -c COMMENT  GECOS field ;; -e YYYY-MM-DD  account expiry ;; -r  system account ;; -D  show/set defaults (/etc/default/useradd)
userdel(8) - delete a user account and related files :: userdel [-r] [-f] LOGIN :: -r  also remove home directory and mail spool
usermod(8) - modify a user account :: usermod [options] LOGIN :: -aG GROUP  append to supplementary group (without -a the user is REMOVED from other groups!) ;; -G list  set supplementary groups ;; -g GROUP  primary group ;; -s SHELL ;; -d DIR -m  move home ;; -l NEW  rename ;; -L / -U  lock / unlock ;; -e DATE  expire ;; -u UID
groupadd(8) - create a new group :: groupadd [-g GID] [-r] GROUP
groupdel(8) - delete a group :: groupdel GROUP :: cannot delete the primary group of an existing user
groupmod(8) - modify a group definition :: groupmod [-n NEW_NAME] [-g GID] GROUP
gpasswd(1) - administer /etc/group and /etc/gshadow :: gpasswd [-a user] [-d user] [-M users] group
chage(1) - change user password expiry information :: chage [options] LOGIN :: -l  list aging info ;; -M MAX  maximum days ;; -m MIN  minimum days ;; -W WARN  warning days ;; -I INACTIVE  days after expiry until lock ;; -E DATE  account expiration (-1 = never) ;; -d 0  force password change
getent(1) - get entries from Name Service Switch libraries :: getent DATABASE [KEY...] :: databases: passwd, group, shadow, hosts, services ;; honours /etc/nsswitch.conf (files, dns, ldap ...)
crontab(1) - maintain crontab files for individual users :: crontab [-u user] {-l | -r | -e | file} :: -e  edit ;; -l  list ;; -r  remove ;; format: min hour day-of-month month day-of-week command ;; access control: /etc/cron.allow, /etc/cron.deny ;; user tables: /var/spool/cron/crontabs/USER
crontab(5) - tables for driving cron :: m h dom mon dow command :: * any, 1-5 range, 1,15 list, */5 step ;; @reboot @hourly @daily @weekly @monthly @yearly ;; /etc/crontab and /etc/cron.d/* have an extra USER field
at(1) - queue jobs for later execution :: at [-f file] TIME :: TIME: now + 5 minutes, 16:00, noon, midnight, teatime, tomorrow ;; commands read from stdin ;; atq lists, atrm N removes ;; access: /etc/at.allow, /etc/at.deny
atq(1) - list pending at jobs :: atq
atrm(1) - delete at jobs :: atrm JOB...
systemctl(1) - control the systemd system and service manager :: systemctl [OPTIONS] COMMAND [UNIT...] :: start / stop / restart / reload UNIT ;; status UNIT ;; enable / disable [--now] UNIT  (boot-time activation via symlinks) ;; mask / unmask ;; is-active / is-enabled ;; list-units [--type=service] [--all] ;; list-unit-files ;; get-default / set-default TARGET ;; isolate TARGET  switch target now ;; reboot / poweroff / rescue / emergency ;; daemon-reload  after editing unit files ;; list-timers
journalctl(1) - print log entries from the systemd journal :: journalctl [OPTIONS] :: -u UNIT ;; -f  follow ;; -n N  last N entries ;; -b [-1]  this / previous boot ;; -p err  by priority ;; -k  kernel messages ;; --since "1 hour ago" ;; -r  reverse ;; --list-boots ;; --disk-usage ;; --vacuum-size=100M ;; persistent storage: /var/log/journal (Storage= in /etc/systemd/journald.conf)
logger(1) - enter messages into the system log :: logger [-t TAG] [-p FACILITY.LEVEL] MESSAGE :: e.g. logger -t backup -p local0.err "disk full"
logrotate(8) - rotates, compresses, and mails system logs :: logrotate [-d] [-f] config_file :: config: /etc/logrotate.conf and /etc/logrotate.d/ ;; directives: daily/weekly/monthly, rotate N, compress, delaycompress, missingok, notifempty, create MODE OWNER GROUP, postrotate ... endscript
dmesg(1) - print or control the kernel ring buffer :: dmesg [-H] [-T] [-w] [-l level] :: -T  human-readable timestamps ;; -w  follow ;; -C  clear
lspci(8) - list all PCI devices :: lspci [-v] [-k] [-nn] :: -k  show kernel driver in use and modules ;; -v  verbose ;; -nn  numeric vendor:device IDs
lsusb(8) - list USB devices :: lsusb [-t] [-v] :: -t  tree view ;; -v  verbose
lsmod(8) - show the status of modules in the Linux Kernel (reads /proc/modules) :: lsmod
modprobe(8) - add and remove modules from the Linux Kernel (resolves dependencies) :: modprobe [-r] [-v] [-n] module [params] :: -r  remove module (and unused dependencies) ;; -n  dry run ;; config: /etc/modprobe.d/*.conf (blacklist, options, alias) ;; dependencies: modules.dep (depmod)
insmod(8) - insert a single module file (no dependency handling) :: insmod /path/to/module.ko [params]
rmmod(8) - remove a module from the Linux Kernel :: rmmod module
modinfo(8) - show information about a Linux Kernel module :: modinfo module :: shows filename, description, license, depends, parameters (parm)
lscpu(1) - display information about the CPU architecture :: lscpu
udevadm(8) - udev management tool :: udevadm info|monitor|trigger|control :: udevadm info /dev/sda ;; udevadm monitor ;; rules: /etc/udev/rules.d/ and /lib/udev/rules.d/
sysctl(8) - configure kernel parameters at runtime (/proc/sys) :: sysctl [-a] [-w key=value] [-p [file]] :: persistent settings: /etc/sysctl.conf and /etc/sysctl.d/
uname(1) - print system information :: uname [-a|-s|-n|-r|-m] :: -r  kernel release ;; -m  machine hardware ;; -n  node (host) name ;; -a  all
hostname(1) - show or set the system's host name :: hostname [-f|-I|-s] [NAME] :: -f FQDN ;; -I all IP addresses ;; permanent: hostnamectl set-hostname NAME or /etc/hostname
hostnamectl(1) - control the system hostname :: hostnamectl [status | set-hostname NAME]
runlevel(8) - print previous and current SysV runlevel :: runlevel :: output e.g. "N 5" (N = no previous)
telinit(8) - change SysV runlevel :: telinit RUNLEVEL :: 0 halt, 1/S single user, 2-4 multi-user, 5 graphical, 6 reboot ;; init RUNLEVEL does the same
shutdown(8) - halt, power-off or reboot the machine :: shutdown [-h|-P|-r|-c|-k] [TIME] [WALL...] :: TIME: now, +MINUTES, hh:mm ;; -h / -P  power off ;; -r  reboot ;; -c  cancel pending shutdown ;; -k  only send warning ;; logged-in users get the wall message
wall(1) - write a message to all users :: wall [message]
reboot(8) - reboot the machine :: reboot [-f]
poweroff(8) - power off the machine :: poweroff
grub-install(8) - install GRUB to a device :: grub-install [--target=i386-pc|x86_64-efi] [--efi-directory=DIR] [DEVICE] :: BIOS: install to the disk's MBR, e.g. /dev/sda ;; UEFI: install to the EFI system partition
grub-mkconfig(8) - generate a GRUB configuration file :: grub-mkconfig -o /boot/grub/grub.cfg :: reads /etc/default/grub and /etc/grub.d/* ;; Debian: update-grub ;; RHEL: grub2-mkconfig -o /boot/grub2/grub.cfg
update-grub(8) - stub for grub-mkconfig -o /boot/grub/grub.cfg (Debian) :: update-grub
ldd(1) - print shared object dependencies :: ldd PROGRAM :: requires a path, e.g. ldd /usr/bin/ls
ldconfig(8) - configure dynamic linker run-time bindings :: ldconfig [-p] [-v] :: rebuilds /etc/ld.so.cache from /etc/ld.so.conf and /etc/ld.so.conf.d/*.conf ;; -p  print the cache ;; LD_LIBRARY_PATH adds directories at run time
apt(8) - command-line interface for the package management system :: apt [options] command [pkg...] :: update  refresh package index ;; upgrade / full-upgrade ;; install PKG / remove PKG / purge PKG (also config files) ;; autoremove ;; search TERM ;; show PKG ;; list --installed ;; sources: /etc/apt/sources.list(.d)
apt-get(8) - APT package handling utility -- command-line interface :: apt-get [-y] {update|upgrade|dist-upgrade|install|remove|purge|autoremove|download|source|clean} :: -y  assume yes ;; install -f  fix broken dependencies
apt-cache(8) - query the APT cache :: apt-cache {search|show|depends|rdepends|policy|pkgnames} ...
dpkg(1) - package manager for Debian :: dpkg ACTION ... :: -i FILE.deb  install ;; -r PKG  remove (keep config) ;; -P PKG  purge ;; -l [PATTERN]  list ;; -L PKG  list files of a package ;; -S FILE  which package owns FILE ;; -s PKG  status ;; -c FILE.deb  contents ;; -I FILE.deb  info ;; --get-selections ;; dpkg-reconfigure PKG  rerun configuration
dpkg-reconfigure(8) - reconfigure an already installed package :: dpkg-reconfigure PACKAGE :: e.g. tzdata, locales, keyboard-configuration
rpm(8) - RPM Package Manager :: rpm {-q|-V|-i|-U|-F|-e} [options] :: -qa  all installed ;; -qi PKG  info ;; -ql PKG  file list ;; -qf FILE  owning package ;; -qc PKG  config files ;; -qd PKG  docs ;; -qR PKG  requirements ;; -qp FILE.rpm  query a package file ;; -ivh FILE.rpm  install ;; -Uvh  upgrade or install ;; -Fvh  freshen (only upgrade) ;; -e PKG  erase ;; -V PKG  verify ;; -K FILE  check signature ;; --import KEY
rpm2cpio(8) - extract cpio archive from RPM package :: rpm2cpio FILE.rpm | cpio -idmv
yum(8) - package manager (RHEL/CentOS 7; today an alias for dnf) :: yum [options] command :: install / remove / update ;; search TERM ;; info PKG ;; list installed|available ;; provides FILE ;; repolist ;; clean all ;; history ;; config: /etc/yum.conf, /etc/yum.repos.d/*.repo
dnf(8) - DNF package manager (Fedora, RHEL 8+) :: dnf [options] command :: same commands as yum: install, remove, upgrade, search, info, provides, repolist, history ;; config: /etc/dnf/dnf.conf, /etc/yum.repos.d/
zypper(8) - command-line interface to ZYpp system management library (openSUSE/SLES) :: zypper command :: in / install ;; rm / remove ;; se / search ;; if / info ;; up / update ;; ref / refresh ;; lr / repos ;; ar URL ALIAS / addrepo ;; config: /etc/zypp/repos.d/
ip(8) - show / manipulate routing, network devices, interfaces and tunnels :: ip [OPTIONS] OBJECT COMMAND :: ip addr show [dev X] ;; ip addr add 192.168.1.10/24 dev eth0 ;; ip link set eth0 up|down ;; ip route show ;; ip route add default via 192.168.1.1 ;; ip neigh ;; -4 / -6 ;; -br  brief
ifconfig(8) - configure a network interface (legacy, net-tools) :: ifconfig [-a] [interface] [address [netmask MASK]] [up|down]
route(8) - show / manipulate the IP routing table (legacy) :: route [-n] | route add default gw IP | route add -net NET netmask MASK gw IP :: -n  numeric
ping(8) - send ICMP ECHO_REQUEST to network hosts :: ping [-c COUNT] [-i INTERVAL] [-W TIMEOUT] host :: -c N  stop after N packets ;; ping6 / ping -6 for IPv6
traceroute(8) - print the route packets trace to network host :: traceroute [-n] [-I] [-T] host :: -n  no DNS lookups ;; -I  ICMP ;; -T  TCP SYN
tracepath(8) - traces path to a network host discovering MTU along this path :: tracepath host :: does not need root
ss(8) - another utility to investigate sockets :: ss [options] :: -t  TCP ;; -u  UDP ;; -l  listening ;; -p  processes ;; -n  numeric ;; -a  all ;; -s  summary ;; ss -tulpn  listening TCP/UDP ports with processes
netstat(8) - print network connections, routing tables, interface statistics (legacy) :: netstat [-tulpn] [-r] [-i] [-a] [-s] :: -r  routing table ;; -i  interfaces ;; -tulpn  listening ports
host(1) - DNS lookup utility :: host [-t TYPE] name [server] :: -t MX|A|AAAA|NS ;; reverse lookup with an IP address
dig(1) - DNS lookup utility :: dig [@server] name [type] [+short] :: @server  query a specific DNS server ;; -x IP  reverse lookup ;; +short  answers only
nslookup(1) - query Internet name servers interactively :: nslookup [name] [server]
nmcli(1) - command-line tool for controlling NetworkManager :: nmcli [OPTIONS] OBJECT {COMMAND | help} :: nmcli general status ;; nmcli device status ;; nmcli connection show ;; nmcli con up|down NAME ;; nmcli con mod NAME ipv4.addresses 192.168.1.10/24 ipv4.method manual
nc(1) - arbitrary TCP and UDP connections and listens (netcat) :: nc [-zv] host port | nc -l port :: -z  scan, no data ;; -v  verbose ;; -l  listen
lsof(8) - list open files :: lsof [-i [:port]] [-u user] [file] :: -i  network files / sockets ;; -i :22  who uses port 22 ;; lsof /mnt  who keeps a mount busy
fuser(1) - identify processes using files or sockets :: fuser [-v] [-k] [-m] file|port/tcp :: -k  kill those processes ;; -m  all processes on the mount ;; fuser 22/tcp
nmap(1) - network exploration tool and security / port scanner :: nmap [scan type] target :: -sT TCP connect ;; -sS SYN (root) ;; -sU UDP ;; -p 1-1024 ports ;; only scan hosts you are allowed to!
ssh(1) - OpenSSH remote login client :: ssh [-p port] [-i identity] [-X] [-L|-R|-D ...] [user@]host [command] :: -p PORT ;; -i KEYFILE ;; -X / -Y  X11 forwarding ;; -L lport:host:rport  local forwarding ;; -R  remote forwarding ;; -D port  SOCKS proxy ;; client config: ~/.ssh/config, /etc/ssh/ssh_config ;; known host keys: ~/.ssh/known_hosts
sshd(8) - OpenSSH daemon :: sshd :: config: /etc/ssh/sshd_config (Port, PermitRootLogin, PasswordAuthentication, X11Forwarding ...) ;; host keys: /etc/ssh/ssh_host_*_key ;; user keys: ~/.ssh/authorized_keys
ssh-keygen(1) - OpenSSH authentication key utility :: ssh-keygen [-t rsa|ecdsa|ed25519] [-b bits] [-f file] [-N passphrase] [-C comment] :: creates ~/.ssh/id_TYPE (private, 0600) and id_TYPE.pub ;; -l -f FILE  fingerprint ;; -R HOST  remove host from known_hosts ;; -A  generate missing host keys
ssh-agent(1) - OpenSSH authentication agent :: eval $(ssh-agent) :: holds decrypted private keys in memory; ssh-add adds them
ssh-add(1) - adds private key identities to the OpenSSH authentication agent :: ssh-add [-l] [-D] [file] :: -l  list ;; -D  delete all
ssh-copy-id(1) - use locally available keys to authorise logins on a remote machine :: ssh-copy-id [-i file] user@host :: appends the public key to ~/.ssh/authorized_keys on the remote host
scp(1) - OpenSSH secure file copy :: scp [-r] [-P port] source... target :: remote paths: user@host:/path
gpg(1) - OpenPGP encryption and signing tool :: gpg [options] [file] :: --gen-key / --full-generate-key ;; --list-keys / -k, --list-secret-keys / -K ;; --export -a NAME > pub.asc ;; --import FILE ;; -e -r RECIPIENT FILE  encrypt (asymmetric) ;; -c FILE  symmetric encryption ;; -d FILE.gpg  decrypt ;; --sign / --clearsign / --detach-sign ;; --verify ;; --gen-revoke ;; keyring: ~/.gnupg/
date(1) - print or set the system date and time :: date [-u] [-d STRING] [+FORMAT] :: +%F  YYYY-MM-DD ;; +%T  HH:MM:SS ;; +%s  seconds since epoch ;; -d "yesterday" / -d "+3 days" ;; -u  UTC ;; -s  set (root) ;; TZ=Asia/Tokyo date  other time zone
timedatectl(1) - control the system time and date :: timedatectl [status | set-timezone ZONE | list-timezones | set-ntp true|false | set-time TIME]
hwclock(8) - time clocks utility (RTC / hardware clock) :: hwclock [-r|-w|-s] [--utc|--localtime] :: -r / --show  read hardware clock ;; -w / --systohc  system time -> hardware clock ;; -s / --hctosys  hardware clock -> system time
ntpdate(8) - set the date and time via NTP (one-shot, deprecated) :: ntpdate server
ntpq(1) - standard NTP query program :: ntpq -p :: * = selected peer, + = candidate, - = outlier ;; st = stratum
chronyc(1) - command-line interface for chrony daemon :: chronyc {sources|tracking|makestep} :: config: /etc/chrony/chrony.conf or /etc/chrony.conf
locale(1) - get locale-specific information :: locale [-a] [-m] :: -a  list available locales ;; LANG, LC_* (LC_TIME, LC_NUMERIC, LC_MESSAGES ...), LC_ALL overrides all
localectl(1) - control the system locale and keyboard layout settings :: localectl [status | set-locale LANG=.. | set-keymap MAP | set-x11-keymap LAYOUT | list-locales]
iconv(1) - convert text from one character encoding to another :: iconv -f FROM -t TO [file] :: -l  list encodings ;; e.g. iconv -f ISO-8859-1 -t UTF-8 old.txt > new.txt ;; -t ASCII//TRANSLIT
tzselect(8) - select a timezone interactively :: tzselect :: prints a TZ value, e.g. Europe/Berlin
mail(1) - send and receive mail :: mail [-s subject] [-c cc] user... :: message body from stdin: echo "text" | mail -s "Hi" user ;; reading: mail (opens mailbox /var/mail/USER)
mailq(1) - print the mail queue :: mailq :: same as sendmail -bp / postqueue -p
newaliases(1) - rebuild the mail aliases database :: newaliases :: run after editing /etc/aliases ;; ~/.forward forwards a user's own mail
sendmail(8) - Postfix/Sendmail compatible mail posting interface :: sendmail [-t] [-bp] recipient... < message
lpr(1) - print files (BSD interface) :: lpr [-P printer] [-# copies] file... :: CUPS default printer: lpstat -d ;; PRINTER variable
lp(1) - print files (System V interface) :: lp [-d printer] [-n copies] file...
lpq(1) - show printer queue status :: lpq [-P printer] [-a]
lprm(1) - cancel print jobs :: lprm [-P printer] [jobid...] [-] :: -  remove all own jobs
lpstat(1) - print CUPS status information :: lpstat [-d] [-p] [-t] [-a] [-v] :: -d  default destination ;; -p  printers ;; -t  everything ;; -a  accepting ;; -v  device URIs
cancel(1) - cancel jobs (System V) :: cancel [-a] [printer-ID]
lpadmin(8) - configure CUPS printers and classes :: lpadmin -p PRINTER -E -v URI [-m model] | -x PRINTER | -d PRINTER
cupsenable(8) - start printers (allow printing) :: cupsenable printer :: cupsdisable stops; cupsaccept / cupsreject control the queue
xrandr(1) - primitive command line interface to RandR X extension :: xrandr [--output NAME --mode WxH | --auto | --off] :: lists screens, outputs and modes
xdpyinfo(1) - display information utility for X :: xdpyinfo
xhost(1) - server access control program for X :: xhost [+|-][name] :: xhost +  disable access control (insecure) ;; xhost +host  allow host
xwininfo(1) - window information utility for X :: xwininfo [-root] [-id ID]
systemd-analyze(1) - analyze and debug system manager :: systemd-analyze [time | blame | critical-chain]
ulimit(1) - modify shell resource limits (builtin) :: ulimit [-a] [-n N] [-u N] [-c N] :: -a  show all ;; -n  open files ;; -u  user processes ;; -c  core file size ;; persistent: /etc/security/limits.conf
man(1) - an interface to the system reference manuals :: man [SECTION] PAGE :: sections: 1 user commands, 5 file formats, 8 admin commands ;; man -k KEYWORD = apropos ;; man -f NAME = whatis
apropos(1) - search the manual page names and descriptions :: apropos KEYWORD
whatis(1) - display one-line manual page descriptions :: whatis NAME
passwd(5) - the password file /etc/passwd :: name:password:UID:GID:GECOS:home:shell :: password field 'x' means: hash is in /etc/shadow ;; world-readable (0644)
shadow(5) - shadowed password file /etc/shadow :: name:hash:lastchg:min:max:warn:inactive:expire:reserved :: hash prefix $6$ = SHA-512, $y$ = yescrypt, ! or * = locked/no login ;; lastchg in days since 1970-01-01 ;; readable only by root/shadow group
group(5) - user group file /etc/group :: group_name:password:GID:user_list
fstab(5) - static information about the filesystems :: <device> <mount point> <type> <options> <dump> <pass> :: device by /dev/sdXN, UUID=..., LABEL=... ;; options: defaults (rw,suid,dev,exec,auto,nouser,async), noauto, user, ro, noexec ... ;; dump: 0/1 ;; pass: 0 no check, 1 root fs, 2 others
hosts(5) - static table lookup for hostnames /etc/hosts :: IP_address canonical_hostname [aliases...]
resolv.conf(5) - resolver configuration file :: nameserver IP (max 3) ;; search domain... ;; domain NAME ;; options timeout:N attempts:N
nsswitch.conf(5) - Name Service Switch configuration file :: database: sources :: e.g. hosts: files dns
sudoers(5) - default sudo security policy plugin :: user host=(runas) commands :: %group ALL=(ALL:ALL) ALL ;; NOPASSWD: tag
bash(1) - GNU Bourne-Again SHell :: bash [options] [file] :: -c STRING  run commands from string ;; -x  trace ;; -n  syntax check only ;; -l  login shell ;; login shells read /etc/profile then the first of ~/.bash_profile, ~/.bash_login, ~/.profile; interactive non-login shells read ~/.bashrc; ~/.bash_logout on logout
`;
  const man = {};
  for (const line of RAW.split('\n')) {
    if (!line.trim()) continue;
    const m = /^(\S+)\((\d)\) - (.*?)(?: :: (.*?))?(?: :: (.*))?$/.exec(line);
    if (!m) continue;
    const key = m[1] + (man[m[1]] && man[m[1]].sec !== m[2] ? '.' + m[2] : '');
    man[key] = { sec: m[2], d: m[3], s: m[4] || m[1], o: m[5] ? m[5].split(' ;; ') : [] };
  }
  SIM.man = man;
  SIM.manPage = function (name, section) {
    let e = man[name];
    if (section && /^\d$/.test(section) && man[name + '.' + section]) e = man[name + '.' + section];
    if (!e) {
      if (!SIM.cmds[name] && !SIM.builtins[name]) return null;
      e = { sec: SIM.sbin.has(name) ? '8' : '1', d: 'simulated command (no detailed manual page in this trainer)', s: name + ' [OPTIONS]', o: [] };
    }
    const title = `${name.toUpperCase()}(${e.sec})`;
    const W = 78;
    let out = title + ' '.repeat(Math.max(1, W - title.length * 2)) + title + '\n\n';
    out += '\x1b[1mNAME\x1b[0m\n       ' + name + ' - ' + e.d + '\n\n';
    out += '\x1b[1mSYNOPSIS\x1b[0m\n       ' + e.s + '\n\n';
    if (e.o.length) {
      out += '\x1b[1mOPTIONS / KEY POINTS\x1b[0m\n';
      for (const o of e.o) {
        const mm = /^(-{1,2}\S+(?:,\s*-{1,2}\S+)?(?: [A-Z][A-Z0-9_|,]*)?)\s{2,}(.*)$/.exec(o);
        if (mm) out += `       \x1b[1m${mm[1]}\x1b[0m\n              ${mm[2]}\n`;
        else out += `       ${o}\n`;
      }
      out += '\n';
    }
    out += '\x1b[1mSEE ALSO\x1b[0m\n       The full manual on a real system: man ' + name + ', info ' + name + ', ' + name + ' --help\n\n';
    out += `LPIC-1 Trainer${' '.repeat(W - 32)}simulated ${title}\n`;
    return out;
  };
  // "did you mean" for unknown commands
  SIM.suggest = function (name) {
    const all = Object.keys(SIM.cmds).concat(Object.keys(SIM.builtins));
    let best = null;
    let bd = 3;
    const lev = (a, b) => {
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) d[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return d[a.length][b.length];
    };
    for (const c of all) {
      if (Math.abs(c.length - name.length) > 2) continue;
      const d = lev(name, c);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (SIM.optional.has(name)) return `Command '${name}' not found, but can be installed with:\nsudo apt install ${name}`;
    return best && best !== name ? `Did you mean: ${best}` : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
