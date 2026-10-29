/* Topic 103: GNU and Unix Commands */
LPIC.add({
  id: '103.1',
  title: 'Work on the command line',
  weight: 4,
  desc: 'Candidates should be able to interact with shells and commands using the command line. The objective assumes the Bash shell.',
  knowledge: [
    'Use single shell commands and one line command sequences to perform basic tasks on the command line.',
    'Use and modify the shell environment including defining, referencing and exporting environment variables.',
    'Use and edit command history.',
    'Invoke commands inside and outside the defined path.',
  ],
  terms: ['bash', 'echo', 'env', 'export', 'pwd', 'set', 'unset', 'type', 'which', 'man', 'uname', 'history', '.bash_history', 'Quoting'],
  sims: ['startup'],
  wiki: String.raw`
## The shell and the command line
The **shell** reads a command line, splits it into words, expands variables and wildcards, and runs the command. The standard shell on Linux is **bash** (Bourne Again SHell, {{/bin/bash}}); others: {{sh}}/{{dash}}, {{zsh}}, {{ksh}}, {{csh}}/{{tcsh}}, {{fish}}. Your login shell is the last field of your line in {{/etc/passwd}}; the current one is in {{$0}} and {{$SHELL}}.

A command line: **command**, **options** (short {{-l}}, combinable {{-la}}; long {{--all}}), **arguments**:

~~~console
$ ls -l --human-readable /etc/hosts
$ echo $SHELL $0
$ uname -a
$ pwd
~~~

## Combining commands on one line
| Syntax | Meaning |
|---|---|
| {{cmd1 ; cmd2}} | run one after the other, regardless of success |
| {{cmd1 && cmd2}} | run cmd2 only if cmd1 succeeded (exit status 0) |
| {{cmd1 \|\| cmd2}} | run cmd2 only if cmd1 failed |
| {{cmd1 \| cmd2}} | pipe: stdout of cmd1 → stdin of cmd2 (103.4) |
| {{cmd &}} | run in the background (103.5) |
| {{( cmd1; cmd2 )}} | run in a subshell |
| {{{ cmd1; cmd2; }}} | group in the current shell |

~~~console
$ mkdir -p /tmp/test && cd /tmp/test && pwd
$ ls /nonexistent || echo "listing failed"
$ false; echo "exit status: $?"
~~~

**Exit status**: every command returns a number 0–255 — {{0}} means success, anything else an error. It is stored in {{$?}}.

## Quoting
| Quote | Effect |
|---|---|
| {{"double"}} | prevents word splitting and globbing, but **expands** {{$VAR}}, {{$(cmd)}}, backticks and {{\}} escapes |
| {{'single'}} | everything literal — no expansion at all |
| {{\}} | escapes the next single character |

~~~console
$ NAME="LPIC Student"
$ echo "Hello $NAME"
Hello LPIC Student
$ echo 'Hello $NAME'
Hello $NAME
$ echo Hello \$NAME
Hello $NAME
$ echo "Today is $(date +%A)"
$ touch "my file.txt"; ls -l my\ file.txt
~~~

> EXAM: Single quotes = literal; double quotes = variables and command substitution are expanded. Questions often show {{echo '$HOME'}} vs. {{echo "$HOME"}}.

## Variables and the environment
A **shell variable** exists only in the current shell; an **environment variable** is *exported* and inherited by child processes.

~~~console
$ COLOR=blue
$ echo $COLOR
$ bash -c 'echo "child sees: $COLOR"'
$ export COLOR
$ bash -c 'echo "child sees: $COLOR"'
$ export EDITOR=vim
$ unset COLOR
$ echo "[$COLOR]"
~~~

| Command | Shows / does |
|---|---|
| {{env}} / {{printenv}} | exported (environment) variables |
| {{set}} | **all** shell variables (and functions); also sets shell options ({{set -x}}, {{set -o noclobber}}) |
| {{export VAR=value}} | define and export; {{export -n VAR}} removes the export flag; {{export -p}} lists |
| {{unset VAR}} | delete a variable ({{unset -f}} a function) |
| {{env VAR=x cmd}} / {{VAR=x cmd}} | run one command with a modified environment |
| {{env -i cmd}} | run with an empty environment |

Important variables: {{PATH}}, {{HOME}}, {{USER}}/{{LOGNAME}}, {{SHELL}}, {{PWD}}, {{OLDPWD}}, {{PS1}} (prompt), {{LANG}}, {{TERM}}, {{EDITOR}}, {{HISTFILE}}, {{HISTSIZE}}, {{?}}, {{$}} (PID of the shell), {{!}} (PID of last background job).

Make settings permanent in the startup files (see 105.1): {{~/.bashrc}}, {{~/.profile}}, {{/etc/profile}}.

## PATH — commands inside and outside the path
When you type a command name without a slash, bash looks for (in order) an **alias**, a **keyword**, a **function**, a **builtin** and finally an executable file in the directories of **{{$PATH}}** (colon separated, searched left to right). The current directory is **not** in the PATH for security reasons — run programs there with {{./program}} or an absolute path.

~~~console
$ echo $PATH
$ which ls
$ type ls cd ll if
$ type -a ls
$ ./scripts/hello.sh
$ /home/student/scripts/hello.sh
$ PATH=$PATH:$HOME/scripts
$ hello.sh
~~~

- {{which CMD}} — searches only the PATH for executables.
- {{type CMD}} — tells what the shell will really run: alias, keyword, function, builtin or file. {{type -a}} lists all.
- Run a command bypassing an alias: {{\ls}} or {{command ls}}.
- bash caches found paths: {{hash}}, {{hash -r}} clears the cache.

## Command history
bash records commands in memory and writes them to **{{~/.bash_history}}** ({{$HISTFILE}}) when the shell exits.

| Key / command | Effect |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> | previous / next command |
| <kbd>Ctrl</kbd>+<kbd>R</kbd> | reverse incremental search |
| {{history}}, {{history 10}} | list (numbered) |
| {{!!}} | repeat last command — e.g. {{sudo !!}} |
| {{!42}} | run command number 42 |
| {{!-2}} | the command before the last |
| {{!ls}} | last command starting with "ls" |
| {{!$}} | last argument of the previous command |
| {{^old^new}} | repeat last command with a substitution |
| {{history -c}} / {{history -d 42}} | clear / delete one entry |
| {{fc}} | edit and re-run commands in {{$EDITOR}} |

Variables: {{HISTSIZE}} (entries in memory), {{HISTFILESIZE}} (lines in the file), {{HISTCONTROL=ignoredups:ignorespace}} (= {{ignoreboth}}: skip duplicates and lines starting with a space), {{HISTIGNORE}}.

~~~console
$ history | tail -5
$ echo first
$ !!
$ ls /etc/hostname
$ cat !$
~~~

Line editing: <kbd>Ctrl</kbd>+<kbd>A</kbd>/<kbd>E</kbd> start/end of line, <kbd>Ctrl</kbd>+<kbd>U</kbd>/<kbd>K</kbd> delete before/after the cursor, <kbd>Ctrl</kbd>+<kbd>W</kbd> delete word, <kbd>Ctrl</kbd>+<kbd>L</kbd> clear screen, <kbd>Tab</kbd> completion. {{set -o vi}} switches to vi-style editing.

## Getting help: man and friends
~~~console
$ man ls
$ man 5 passwd
$ man -k partition
$ apropos partition
$ whatis passwd
$ help cd
$ ls --help
~~~

Manual sections: **1** user commands, **2** system calls, **3** library functions, **4** devices, **5** file formats, **6** games, **7** misc ({{regex(7)}}), **8** administration commands. In {{man}} (pager {{less}}): <kbd>/</kbd> search, <kbd>n</kbd> next, <kbd>q</kbd> quit. {{info}} shows GNU info pages; {{/usr/share/doc/}} holds package docs.

## uname
{{uname}} prints system information: {{-s}} kernel name, {{-n}} host name, {{-r}} kernel release, {{-v}} version, {{-m}} machine (x86_64), {{-o}} OS, {{-a}} all.
`,
  quiz: [
    { q: 'What is the output of {{echo \'$HOME\'}}?', o: ['the path of the home directory', '{{$HOME}}', 'an empty line', 'an error'], a: 1, e: 'Single quotes prevent any expansion.' },
    { q: 'Which command makes the variable {{EDITOR}} available to programs started from the current shell?', fill: ['export EDITOR'], e: '{{export EDITOR}} (or {{export EDITOR=vim}}) marks it for the environment of child processes.' },
    { q: 'Which command displays all shell variables and functions, not only exported ones?', o: ['{{env}}', '{{printenv}}', '{{set}}', '{{export}}'], a: 2, e: '{{env}}/{{printenv}} show only the environment.' },
    { q: 'Which command tells you whether {{ls}} is an alias, a builtin, a function or a file?', fill: ['type ls', 'type'], e: '{{which}} only searches the PATH and does not know aliases or builtins.' },
    { q: 'How do you execute the program {{run.sh}} located in the current directory, which is not in the PATH?', fill: ['./run.sh'], e: 'The current directory is intentionally not part of $PATH.' },
    { q: 'Which history expansion repeats the last command?', fill: ['!!'], e: 'Popular: {{sudo !!}}.' },
    { q: 'In which file does bash store the command history of a user by default?', fill: ['~/.bash_history', '.bash_history', '$HOME/.bash_history'], e: 'Controlled by {{HISTFILE}}; written when the shell exits.' },
    { q: 'What does {{cmd1 && cmd2}} do?', o: ['runs both in parallel', 'runs cmd2 only if cmd1 succeeded', 'runs cmd2 only if cmd1 failed', 'pipes cmd1 into cmd2'], a: 1, e: '{{&&}} checks for exit status 0; {{||}} for non-zero.' },
    { q: 'Which variable contains the exit status of the last command?', fill: ['$?', '?'], e: '0 = success.' },
    { q: 'Which command removes the variable {{TMPDIR}} from the shell?', fill: ['unset TMPDIR'], e: '{{unset}} deletes variables; {{export -n}} only removes the export attribute.' },
    { q: 'Which {{uname}} option prints the kernel release?', o: ['{{-k}}', '{{-r}}', '{{-v}}', '{{-n}}'], a: 1, e: '{{uname -r}} → e.g. 6.1.0-18-amd64. {{-v}} is the build version string, {{-n}} the host name.' },
    { q: 'Which manual section contains file formats such as {{passwd(5)}}?', fill: ['5'], e: '1 commands, 5 file formats, 8 admin commands. {{man 5 passwd}}.' },
    { q: 'Which command searches the descriptions of manual pages for a keyword? (Choose two.)', o: ['{{man -k}}', '{{apropos}}', '{{whatis}}', '{{man -f}}'], a: [0, 1], e: '{{whatis}} / {{man -f}} search only exact page names.' },
    { q: 'What is printed by: {{X=1; bash -c \'echo $X\'}} (without export)?', o: ['1', 'an empty line', '$X', 'an error'], a: 1, e: 'The child shell does not inherit non-exported variables. Note the single quotes: the child expands $X itself.' },
    { q: 'Which bash variable controls whether duplicate commands and commands starting with a space are saved in the history?', fill: ['HISTCONTROL'], e: '{{HISTCONTROL=ignoreboth}} = ignoredups + ignorespace.' },
  ],
});

LPIC.add({
  id: '103.2',
  title: 'Process text streams using filters',
  weight: 2,
  desc: 'Candidates should be able to apply filters to text streams.',
  knowledge: ['Send text files and output streams through text utility filters to modify the output using standard UNIX commands found in the GNU textutils package.'],
  terms: ['bzcat', 'cat', 'cut', 'head', 'less', 'md5sum', 'nl', 'od', 'paste', 'sed', 'sha256sum', 'sha512sum', 'sort', 'split', 'tail', 'tr', 'uniq', 'wc', 'xzcat', 'zcat'],
  sims: ['regex'],
  wiki: String.raw`
## Filters
A **filter** reads text from files or **stdin**, transforms it and writes to **stdout** — so filters can be chained with pipes. The sandbox home directory contains sample files: {{fruits.txt}}, {{numbers.txt}}, {{employees.csv}}, {{access.log}}, {{poem.txt}}.

## Viewing: cat, less, head, tail, nl, od
~~~console
$ cat fruits.txt
$ cat -n poem.txt
$ cat -A poem.txt | head -2
$ head -3 employees.csv
$ head -n -2 fruits.txt
$ tail -2 access.log
$ tail -n +2 employees.csv
$ nl poem.txt
$ nl -b a fruits.txt
$ od -c poem.txt | head -3
$ od -x numbers.txt | head -2
~~~

| Command | Key options |
|---|---|
| {{cat}} | concatenate; {{-n}} number lines, {{-b}} number non-empty, {{-A}}/{{-E}}/{{-T}} show $ line ends and ^I tabs, {{-s}} squeeze blanks |
| {{less}} | pager: <kbd>Space</kbd> page, <kbd>/</kbd> search, <kbd>n</kbd> next, <kbd>G</kbd> end, <kbd>q</kbd> quit; {{more}} is the simpler pager |
| {{head}} | first 10 lines; {{-n 5}} or {{-5}}; {{-n -5}} all but the last 5; {{-c}} bytes |
| {{tail}} | last 10 lines; {{-n +5}} from line 5 on; {{-f}} follow a growing file (logs), {{-F}} follow by name (survives rotation) |
| {{nl}} | number lines (default only non-empty: {{-b t}}; {{-b a}} all) |
| {{od}} | octal dump: {{-c}} characters, {{-x}} hex, {{-b}} octal bytes, {{-A x}} hex addresses — shows invisible characters |

## Compressed files: zcat, bzcat, xzcat
Print the decompressed content without unpacking the file: {{zcat file.gz}}, {{bzcat file.bz2}}, {{xzcat file.xz}}. Also {{zless}}, {{zgrep}}.

~~~console
$ gzip -k notes.txt
$ zcat notes.txt.gz | head -2
~~~

## Cutting and combining: cut, paste, tr
~~~console
$ cut -d, -f2,4 employees.csv
$ cut -d: -f1,7 /etc/passwd | head -3
$ cut -c1-10 poem.txt
$ paste fruits.txt numbers.txt | head -3
$ paste -d, -s numbers.txt
$ echo "Hello World" | tr 'a-z' 'A-Z'
$ echo "Hello World" | tr -d 'lo'
$ echo "too    many   spaces" | tr -s ' '
$ tr ':' '\n' <<< "$PATH"
~~~

- {{cut}}: {{-d}} delimiter (default TAB), {{-f}} fields ({{1,3}}, {{2-4}}, {{3-}}), {{-c}} characters, {{-b}} bytes.
- {{paste}}: joins lines side by side (TAB, or {{-d}}); {{-s}} serial = all lines of a file into one.
- {{tr}}: translates or deletes **characters**, reads only **stdin** (no file argument!): {{-d}} delete, {{-s}} squeeze repeats, {{-c}} complement; classes {{[:upper:]}}, {{[:lower:]}}, {{[:digit:]}}, {{[:space:]}}.

## Sorting and counting: sort, uniq, wc
~~~console
$ sort fruits.txt
$ sort -r fruits.txt
$ sort -n numbers.txt
$ sort -t, -k4 -n -r employees.csv | head -3
$ sort -u fruits.txt
$ sort fruits.txt | uniq
$ sort fruits.txt | uniq -c | sort -rn
$ sort fruits.txt | uniq -d
$ wc poem.txt
$ wc -l /etc/passwd
$ ls /etc | wc -l
~~~

- {{sort}}: {{-n}} numeric, {{-r}} reverse, {{-k N}} key field, {{-t}} separator, {{-u}} unique, {{-f}} ignore case, {{-h}} human sizes (2K, 1G), {{-M}} months, {{-o FILE}} output (may be the input file).
- {{uniq}} removes **adjacent** duplicates only → sort first! {{-c}} count, {{-d}} only duplicates, {{-u}} only unique, {{-i}} ignore case.
- {{wc}}: {{-l}} lines, {{-w}} words, {{-c}} bytes, {{-m}} characters.

> EXAM: The classic pipeline "how often does each value occur": {{sort | uniq -c | sort -rn}}.

## Splitting files: split
~~~console
$ split -l 3 fruits.txt part_
$ ls part_*
$ cat part_* > joined.txt
$ split -b 100 access.log chunk-
~~~

Default prefix {{x}}, suffixes {{aa}}, {{ab}} …; {{-l}} lines per file, {{-b}} bytes ({{1M}}), {{-n}} number of chunks, {{-d}} numeric suffixes.

## sed — stream editor basics
{{sed}} edits text in a stream with commands (more in 103.7):

~~~console
$ sed 's/lazy/sleepy/' poem.txt
$ sed 's/a/A/g' fruits.txt | head -3
$ sed -n '2,4p' poem.txt
$ sed '1d' employees.csv
$ sed '/^#/d' /etc/fstab
$ sed -i.bak 's/debug = false/debug = true/' data/config.ini
~~~

{{s/OLD/NEW/}} substitutes the first match per line, {{g}} all; {{-n}} + {{p}} prints only selected lines; {{d}} deletes; {{-i}} edits the file in place ({{-i.bak}} keeps a backup); {{-e}} several commands.

## Checksums: md5sum, sha256sum, sha512sum
Message digests verify that files are unchanged (downloads, backups):

~~~console
$ sha256sum notes.txt
$ sha256sum notes.txt > notes.sha256
$ sha256sum -c notes.sha256
$ md5sum *.txt
$ sha512sum poem.txt
~~~

{{-c}} reads a list of sums and checks them ({{OK}} / {{FAILED}}). MD5 and SHA-1 are cryptographically broken — use SHA-256/512 for security purposes.
`,
  quiz: [
    { q: 'Which command shows the last 20 lines of {{/var/log/syslog}} and keeps displaying new lines as they are appended?', fill: ['tail -n 20 -f /var/log/syslog', 'tail -20f /var/log/syslog', 'tail -f -n 20 /var/log/syslog', 'tail -fn 20 /var/log/syslog', 'tail -20 -f /var/log/syslog', 'tail -f -20 /var/log/syslog'], e: '{{-n 20}} (or {{-20}}) plus {{-f}} (follow).' },
    { q: 'Which command prints the first and the third field of the colon separated file {{/etc/passwd}}?', fill: ['cut -d: -f1,3 /etc/passwd', 'cut -d : -f 1,3 /etc/passwd', 'cut -f1,3 -d: /etc/passwd', "cut -d':' -f1,3 /etc/passwd"], e: '{{-d}} sets the delimiter, {{-f}} the field list.' },
    { q: 'Why is the output of {{uniq}} often wrong when used on unsorted input?', o: ['uniq only removes adjacent duplicate lines.', 'uniq sorts in reverse.', 'uniq ignores the first line.', 'uniq only works with numbers.'], a: 0, e: 'Use {{sort file | uniq}} or {{sort -u}}.' },
    { q: 'Which command converts all lower-case letters in {{file.txt}} to upper case?', o: ['{{tr a-z A-Z file.txt}}', '{{tr a-z A-Z < file.txt}}', '{{sed y/a-z/A-Z/ file.txt}}', '{{cut -u file.txt}}'], a: 1, e: '{{tr}} only reads stdin. ({{sed y}} needs both sets listed explicitly, ranges are not supported.)' },
    { q: 'Which command counts the lines of {{/etc/passwd}}?', fill: ['wc -l /etc/passwd', 'wc -l < /etc/passwd', 'cat /etc/passwd | wc -l'], e: '{{wc -l}}; {{-w}} words, {{-c}} bytes.' },
    { q: 'Which command sorts the numbers in {{numbers.txt}} in numerical order, largest first?', fill: ['sort -nr numbers.txt', 'sort -rn numbers.txt', 'sort -n -r numbers.txt', 'sort -r -n numbers.txt'], e: 'Without {{-n}}, "1000" sorts before "7" (lexically).' },
    { q: 'Which tool displays a file in octal, hexadecimal or as escaped characters to reveal invisible characters?', fill: ['od'], e: '{{od -c file}} shows {{\\t}}, {{\\n}}, {{\\r}}.' },
    { q: 'Which command prints the uncompressed content of {{backup.sql.xz}} to stdout?', o: ['{{zcat backup.sql.xz}}', '{{xzcat backup.sql.xz}}', '{{bzcat backup.sql.xz}}', '{{unxz -k backup.sql.xz}}'], a: 1, e: 'gzip → zcat, bzip2 → bzcat, xz → xzcat (= {{xz -dc}}).' },
    { q: 'Which command numbers all lines of a file, including empty ones?', o: ['{{nl file}}', '{{nl -b a file}}', '{{cat -b file}}', '{{wc -n file}}'], a: 1, e: '{{nl}} numbers only non-empty lines by default; {{cat -n}} numbers all lines too.' },
    { q: 'Which command verifies files against a list of SHA-256 checksums stored in {{SHA256SUMS}}?', fill: ['sha256sum -c SHA256SUMS', 'sha256sum --check SHA256SUMS'], e: 'Prints {{file: OK}} or {{FAILED}}.' },
    { q: 'Which command splits {{big.log}} into files of 1000 lines each?', fill: ['split -l 1000 big.log', 'split -1000 big.log', 'split --lines=1000 big.log'], e: 'Output files are named {{xaa}}, {{xab}} … unless a prefix is given.' },
    { q: 'What does {{sed -n \'5p\' file}} print?', o: ['all lines except line 5', 'only line 5', 'line 5 twice', 'the first 5 lines'], a: 1, e: '{{-n}} suppresses automatic printing; {{5p}} prints line 5.' },
    { q: 'Which command merges the lines of {{a.txt}} and {{b.txt}} side by side, separated by a TAB?', fill: ['paste a.txt b.txt'], e: '{{paste -d,}} uses a comma; {{join}} would merge on a common field.' },
    { q: 'What is printed by {{echo "aaa bbb" | tr -s a}}?', o: ['{{aaa bbb}}', '{{a bbb}}', '{{bbb}}', '{{a b}}'], a: 1, e: '{{-s}} squeezes repeated a characters into one.' },
    { q: 'Which command shows all lines of {{file}} except the first one?', o: ['{{tail -n +2 file}}', '{{tail -n 2 file}}', '{{head -n -1 file}}', '{{tail -1 file}}'], a: 0, e: '{{tail -n +K}} starts output at line K. {{head -n -1}} drops the last line.' },
  ],
});

LPIC.add({
  id: '103.3',
  title: 'Perform basic file management',
  weight: 4,
  desc: 'Candidates should be able to use the basic Linux commands to manage files and directories.',
  knowledge: [
    'Copy, move and remove files and directories individually.',
    'Copy multiple files and directories recursively.',
    'Remove files and directories recursively.',
    'Use simple and advanced wildcard specifications in commands.',
    'Using find to locate and act on files based on type, size, or time.',
    'Usage of tar, cpio and dd.',
  ],
  terms: ['cp', 'find', 'mkdir', 'mv', 'ls', 'rm', 'rmdir', 'touch', 'tar', 'cpio', 'dd', 'file', 'gzip', 'gunzip', 'bzip2', 'bunzip2', 'xz', 'unxz', 'file globbing'],
  wiki: String.raw`
## Listing: ls
~~~console
$ ls
$ ls -l
$ ls -la
$ ls -lh /var/log
$ ls -ltr
$ ls -lS
$ ls -ld /etc
$ ls -R docs
$ ls -i notes.txt
$ ls -F
~~~

{{-l}} long, {{-a}} all incl. hidden (dot files), {{-A}} without {{.}} and {{..}}, {{-h}} human sizes, {{-t}} by time, {{-S}} by size, {{-r}} reverse, {{-d}} the directory itself, {{-R}} recursive, {{-i}} inode numbers, {{-F}} type indicators, {{-1}} one per line.

## Creating: touch, mkdir
~~~console
$ touch new.txt
$ touch -t 202401011200 old.txt
$ touch -d "2 days ago" two-days.txt
$ mkdir projects
$ mkdir -p projects/2026/q4/reports
$ mkdir -m 700 private
~~~

{{touch}} creates an empty file or updates the timestamps ({{-a}} access only, {{-m}} modification only, {{-c}} don't create, {{-r REF}} copy times). {{mkdir -p}} creates parents and does not complain if the directory exists; {{-m}} sets the mode.

## Copying: cp
~~~console
$ cp notes.txt notes.bak
$ cp notes.txt fruits.txt docs/
$ cp -r docs docs-copy
$ cp -a scripts /tmp/scripts-backup
$ cp -i notes.txt notes.bak
$ cp -u *.txt /tmp/
$ cp -v poem.txt /tmp/
~~~

| Option | Meaning |
|---|---|
| {{-r}}, {{-R}} | recursive — required for directories |
| {{-a}} | archive = {{-dR --preserve=all}}: recursive, keep links, mode, owner, timestamps |
| {{-p}} | preserve mode, ownership, timestamps |
| {{-i}} / {{-f}} / {{-n}} | ask before overwriting / force / never overwrite |
| {{-u}} | only copy when the source is newer |
| {{-l}} / {{-s}} | make hard links / symlinks instead of copies |

With more than two arguments the **last one must be a directory**.

## Moving and renaming: mv
~~~console
$ mv notes.bak notes.old
$ mv notes.old docs/
$ mv -i fruits.txt docs/
$ mv docs documents
~~~

{{mv}} renames within a filesystem (fast — only the directory entry changes) and copies + deletes across filesystems. Options {{-i}}, {{-f}}, {{-n}}, {{-u}}, {{-v}}, {{-b}} (backup).

## Removing: rm, rmdir
~~~console
$ rm new.txt
$ rm -i old.txt
$ rmdir private
$ rmdir -p projects/2026/q4/reports
$ rm -r docs-copy
$ rm -rf /tmp/scripts-backup
$ rm -- -strange-name
~~~

{{rmdir}} removes **empty** directories only ({{-p}} removes parents too). {{rm -r}} removes a directory tree, {{-f}} never asks and ignores missing files, {{-i}} always asks. There is no trash can — {{rm}} is final. {{--}} ends option parsing (for names starting with {{-}}).

> WARN: {{rm -rf}} with a typo or an empty variable ({{rm -rf $DIR/}}) can destroy a system. GNU rm refuses {{rm -rf /}} unless {{--no-preserve-root}} is given.

## File globbing (wildcards)
The **shell** expands patterns to matching file names *before* the command runs:

| Pattern | Matches |
|---|---|
| {{*}} | any string, including empty (not a leading dot!) |
| {{?}} | exactly one character |
| {{[abc]}} | one of a, b, c |
| {{[a-z]}}, {{[0-9]}} | one character from a range |
| {{[!abc]}} or {{[^abc]}} | one character NOT in the set |
| {{[[:digit:]]}}, {{[[:upper:]]}} | POSIX classes |
| {{{a,b,c}}} | brace expansion: generates a, b, c (also when files don't exist) |
| {{{1..5}}} | sequence 1 2 3 4 5 |

~~~console
$ ls *.txt
$ ls ?????.txt
$ ls [ef]*
$ ls *[0-9]*
$ ls -d /etc/[!a-m]*
$ echo file{1..3}.log
$ mkdir -p test/{src,bin,doc}
$ cp notes.txt{,.orig}
$ echo .*
~~~

If nothing matches, bash passes the pattern unchanged. Quote a pattern ({{'*.txt'}}) to hand it to a program such as {{find}} instead of the shell.

## file — what is in a file?
{{file}} inspects the **content** (magic numbers), not the name:

~~~console
$ file notes.txt scripts/hello.sh /usr/bin/ls /dev/sda /etc /etc/localtime
~~~

## find
{{find [PATH...] [EXPRESSION]}} walks directory trees and tests each file:

~~~console
$ find . -name "*.txt"
$ find /etc -iname "*.CONF" 2>/dev/null | head
$ find . -type d
$ find /var/log -type f -size +1k
$ find /home -mtime -7
$ find . -mmin -60
$ find /tmp -user student
$ find / -perm -4000 -type f 2>/dev/null
$ find . -empty
$ find . -maxdepth 1 -type f -newer notes.txt
$ find . -name "*.bak" -delete
$ find . -name "*.sh" -exec ls -l {} \;
$ find . -name "*.txt" -exec wc -l {} +
$ find /etc -name "*.conf" -type f -print0 | xargs -0 grep -l ssh
~~~

| Test | Meaning |
|---|---|
| {{-name PAT}} / {{-iname PAT}} | name matches glob (quote it!) / case-insensitive |
| {{-type f d l b c p s}} | file type |
| {{-size +10M}}, {{-size -1k}}, {{-size 0}} | size (units {{c}} bytes, {{k}}, {{M}}, {{G}}; default 512-byte blocks) |
| {{-mtime N}} / {{-atime}} / {{-ctime}} | modified / accessed / status changed N×24h ago ({{+N}} more, {{-N}} less) |
| {{-mmin N}} | same in minutes |
| {{-newer FILE}} | modified more recently than FILE |
| {{-user U}}, {{-group G}}, {{-uid}}, {{-nouser}} | ownership |
| {{-perm 644}}, {{-perm -4000}}, {{-perm /222}} | exact mode / all these bits / any of these bits |
| {{-empty}}, {{-links N}}, {{-inum N}}, {{-samefile F}} | misc |
| {{-maxdepth N}}, {{-mindepth N}}, {{-xdev}} | limit depth / stay on one filesystem |
| {{!}}, {{-not}}, {{-a}}, {{-o}}, {{( )}} | logic |
| {{-print}}, {{-ls}}, {{-delete}}, {{-exec CMD {} \;}}, {{-exec CMD {} +}}, {{-ok}} | actions |

{{-exec … \;}} runs the command once per file; {{-exec … +}} passes many files at once (faster). {{-ok}} asks first.

## Archiving: tar
~~~console
$ tar -cvf docs.tar docs/
$ tar -tvf docs.tar
$ tar -czf docs.tar.gz docs/
$ tar -cjf docs.tar.bz2 docs/
$ tar -cJf docs.tar.xz docs/
$ mkdir /tmp/restore && tar -xzf docs.tar.gz -C /tmp/restore
$ tar -xzf docs.tar.gz docs/todo.txt
$ tar czf - scripts | tar tzf -
~~~

{{-c}} create, {{-x}} extract, {{-t}} list, {{-r}} append; {{-f FILE}} archive file ({{-}} = stdin/stdout); {{-v}} verbose; compression {{-z}} gzip, {{-j}} bzip2, {{-J}} xz; {{-C DIR}} change directory; {{-p}} keep permissions; {{--exclude=PATTERN}}. The dash is optional ({{tar czf}}). tar strips the leading {{/}} from absolute paths.

## Compression: gzip, bzip2, xz
| Compress | Decompress | Print | Extension | Notes |
|---|---|---|---|---|
| {{gzip}} | {{gunzip}} / {{gzip -d}} | {{zcat}} | {{.gz}} | fast, most common |
| {{bzip2}} | {{bunzip2}} / {{bzip2 -d}} | {{bzcat}} | {{.bz2}} | better ratio, slower |
| {{xz}} | {{unxz}} / {{xz -d}} | {{xzcat}} | {{.xz}} | best ratio, used for kernels/packages |

~~~console
$ gzip notes.txt
$ ls notes*
$ gunzip notes.txt.gz
$ gzip -k -9 poem.txt
$ bzip2 -k access.log
$ xz -k employees.csv
$ ls -l poem.txt* access.log* employees.csv*
~~~

All three **replace** the original file by default ({{-k}} keeps it), compress single files (archive directories with tar first), {{-1}} fastest … {{-9}} best, {{-c}} to stdout, {{-l}} (gzip/xz) list ratio.

## cpio
cpio reads the **list of file names from stdin** — usually from {{find}}:

~~~console
$ find docs | cpio -ov > docs.cpio
$ cpio -itv < docs.cpio
$ mkdir /tmp/cp && cd /tmp/cp && cpio -idv < ~/docs.cpio
~~~

{{-o}} copy-out (create), {{-i}} copy-in (extract), {{-t}} list, {{-d}} create directories, {{-v}} verbose, {{-H newc}} format. Used by initramfs images and {{rpm2cpio}}.

## dd — copy blocks
~~~console
$ dd if=/dev/zero of=zeros.img bs=1M count=10
$ ls -lh zeros.img
# dd if=/dev/sda of=/root/mbr.bin bs=512 count=1
# dd if=debian.iso of=/dev/sdc bs=4M status=progress
~~~

{{if=}} input, {{of=}} output, {{bs=}} block size, {{count=}} number of blocks, {{skip=}}/{{seek=}} offsets, {{conv=}} conversions. Used for disk images, MBR backups, writing ISO files to USB sticks — **double-check {{of=}}**, a wrong device is overwritten without question.
`,
  quiz: [
    { q: 'Which command copies the directory {{/etc}} recursively to {{/backup}} while preserving permissions, ownership, timestamps and symlinks?', o: ['{{cp -r /etc /backup}}', '{{cp -a /etc /backup}}', '{{cp -p /etc /backup}}', '{{mv -a /etc /backup}}'], a: 1, e: '{{-a}} = archive (recursive + preserve all + no dereferencing).' },
    { q: 'Which command creates the directory {{/srv/web/static/css}} including all missing parent directories?', fill: ['mkdir -p /srv/web/static/css', 'mkdir --parents /srv/web/static/css'], e: '{{-p}} also suppresses the error if the directory exists.' },
    { q: 'Which command removes an **empty** directory?', fill: ['rmdir'], e: '{{rmdir}} fails on non-empty directories; {{rm -r}} removes trees.' },
    { q: 'Which glob matches files whose name is exactly three characters long?', o: ['{{*3}}', '{{???}}', '{{[3]}}', '{{{3}}}'], a: 1, e: '{{?}} matches exactly one character.' },
    { q: 'Which glob matches all files starting with a lowercase vowel?', o: ['{{[aeiou]*}}', '{{{aeiou}*}}', '{{[!aeiou]*}}', '{{*[aeiou]}}'], a: 0, e: '{{[!aeiou]*}} would be the opposite. Brace expansion needs commas: {{{a,e,i,o,u}*}}.' },
    { q: 'Which command finds all regular files below {{/var}} larger than 100 MiB?', fill: ['find /var -type f -size +100M', 'find /var -size +100M -type f'], e: '{{+}} = more than, {{M}} = mebibytes.' },
    { q: 'Which find test matches files modified less than 2 days ago?', o: ['{{-mtime 2}}', '{{-mtime +2}}', '{{-mtime -2}}', '{{-atime -2}}'], a: 2, e: '{{-N}} less than, {{+N}} more than, {{N}} exactly N×24h.' },
    { q: 'Which find option runs a command once for each found file?', o: ['{{-exec cmd {} \\;}}', '{{-exec cmd {} +}}', '{{-run cmd}}', '{{| xargs cmd}}'], a: 0, e: 'The {{+}} form passes many file names to one command invocation.' },
    { q: 'Which command creates a bzip2-compressed archive {{home.tar.bz2}} of {{/home}}?', fill: ['tar -cjf home.tar.bz2 /home', 'tar cjf home.tar.bz2 /home', 'tar -cjvf home.tar.bz2 /home', 'tar cvjf home.tar.bz2 /home', 'tar -jcf home.tar.bz2 /home'], e: '{{-z}} gzip, {{-j}} bzip2, {{-J}} xz.' },
    { q: 'Which command lists the contents of {{archive.tar.gz}} without extracting it?', fill: ['tar -tzf archive.tar.gz', 'tar tzf archive.tar.gz', 'tar -tvzf archive.tar.gz', 'tar -ztf archive.tar.gz', 'tar tvzf archive.tar.gz', 'tar -tf archive.tar.gz'], e: '{{-t}} lists; modern GNU tar also detects the compression automatically.' },
    { q: 'Which option of {{tar}} extracts the archive into another directory?', o: ['{{-d DIR}}', '{{-C DIR}}', '{{-o DIR}}', '{{--to DIR}}'], a: 1, e: '{{tar -xf a.tar -C /tmp/restore}}' },
    { q: 'Which command compresses {{data.csv}} with gzip and keeps the original file?', fill: ['gzip -k data.csv', 'gzip --keep data.csv', 'gzip -c data.csv > data.csv.gz'], e: 'Without {{-k}} the original is replaced by {{data.csv.gz}}.' },
    { q: 'How does cpio receive the list of files to archive?', o: ['as command line arguments', 'from standard input', 'from {{/etc/cpio.conf}}', 'it always archives the current directory'], a: 1, e: 'Typically {{find . | cpio -o > archive.cpio}}.' },
    { q: 'Which command writes a 10 MiB file of zeros named {{disk.img}}?', o: ['{{dd if=/dev/zero of=disk.img bs=1M count=10}}', '{{dd of=/dev/zero if=disk.img bs=1M count=10}}', '{{cp /dev/zero disk.img 10M}}', '{{dd if=/dev/null of=disk.img bs=10M}}'], a: 0, e: '{{if}} = input, {{of}} = output. {{/dev/null}} delivers no data.' },
    { q: 'What does the {{file}} command use to determine the type of a file?', o: ['the file name extension', 'the file content (magic numbers)', 'the permissions', 'the inode number'], a: 1, e: 'Linux does not rely on extensions; {{file}} uses the magic database.' },
    { q: 'Which command finds all files owned by user {{bob}} under {{/home}} and deletes them? (Choose two.)', o: ['{{find /home -user bob -delete}}', '{{find /home -user bob -exec rm {} \\;}}', '{{find /home -owner bob -rm}}', '{{rm $(find /home -group bob)}}'], a: [0, 1], e: '{{-user}} tests the owner; {{-delete}} or {{-exec rm}} remove.' },
    { q: 'What does {{echo {a,b}{1,2}}} print?', o: ['{{a1 a2 b1 b2}}', '{{a b 1 2}}', '{{{a,b}{1,2}}}', '{{a1 b2}}'], a: 0, e: 'Brace expansion produces all combinations.' },
  ],
});

LPIC.add({
  id: '103.4',
  title: 'Use streams, pipes and redirects',
  weight: 4,
  desc: 'Candidates should be able to redirect streams and connect them in order to efficiently process textual data. Tasks include redirecting standard input, standard output and standard error, piping the output of one command to the input of another command, using the output of one command as arguments to another command and sending output to both stdout and a file.',
  knowledge: [
    'Redirecting standard input, standard output and standard error.',
    'Pipe the output of one command to the input of another command.',
    'Use the output of one command as arguments to another command.',
    'Send output to both stdout and a file.',
  ],
  terms: ['tee', 'xargs'],
  sims: ['redirect'],
  wiki: String.raw`
## The three standard streams
Every process starts with three open **file descriptors**:

| FD | Name | Default |
|---|---|---|
| 0 | **stdin** — standard input | keyboard |
| 1 | **stdout** — standard output | terminal |
| 2 | **stderr** — standard error | terminal |

Programs write normal output to stdout and error messages to stderr, so both appear on the screen but can be redirected separately.

## Output redirection
~~~console
$ ls /etc/hostname /nonexistent > out.txt
$ cat out.txt
$ ls /etc/hostname /nonexistent 2> err.txt
$ cat err.txt
$ ls /etc/hostname /nonexistent > all.txt 2>&1
$ ls /etc/hostname /nonexistent &> all2.txt
$ echo "line 1" > log.txt
$ echo "line 2" >> log.txt
$ ls /nonexistent 2>/dev/null
$ ls /nonexistent 2>> errors.log
~~~

| Syntax | Effect |
|---|---|
| {{> file}} / {{1> file}} | stdout to file — **truncates** (creates) the file |
| {{>> file}} | stdout appended |
| {{2> file}} / {{2>> file}} | stderr to file |
| {{> file 2>&1}} | stdout to file, then stderr to where stdout points (the file) |
| {{&> file}} / {{>& file}} | both to file (bash) |
| {{&>> file}} | both appended |
| {{2>&1 \| cmd}} or {{\|& cmd}} | both into a pipe |
| {{> /dev/null}} | discard |

> EXAM: Order matters! {{cmd > file 2>&1}} sends **both** streams into the file. {{cmd 2>&1 > file}} sends stderr to the *terminal* (where stdout pointed at that moment) and only stdout to the file. Try it in the *Redirection visualizer* simulation.

The redirection is set up by the shell **before** the command runs — {{sort file > file}} empties the file first! Protect files with {{set -o noclobber}} (then {{>|}} forces overwriting).

## Input redirection
~~~console
$ wc -l < /etc/passwd
$ sort < fruits.txt > sorted.txt
$ tr 'a-z' 'A-Z' < poem.txt
$ cat << EOF > greeting.txt
Hello $USER,
today is $(date +%A).
EOF
$ cat greeting.txt
$ grep -c a <<< "banana"
~~~

| Syntax | Effect |
|---|---|
| {{< file}} | stdin from file |
| {{<< WORD}} | **here document**: stdin from the following lines up to a line containing only WORD (variables are expanded unless the word is quoted: {{<< 'EOF'}}); {{<<-}} strips leading tabs |
| {{<<< "string"}} | **here string**: the string (plus newline) as stdin |

## Pipes
A pipe {{|}} connects stdout of the left command to stdin of the right one. Both run at the same time; only stdout goes through the pipe (stderr still goes to the terminal unless redirected).

~~~console
$ cat /etc/passwd | cut -d: -f7 | sort | uniq -c | sort -rn
$ ps aux | grep sshd
$ ls -l /etc | grep "^d" | wc -l
$ dmesg 2>&1 | less
~~~

## tee — output to the screen *and* a file
~~~console
$ ls /etc | tee etc-list.txt | wc -l
$ date | tee -a log.txt
$ echo "192.168.56.30 web03" | sudo tee -a /etc/hosts
~~~

{{tee}} copies stdin to stdout and to each given file; {{-a}} appends. Classic trick: {{sudo tee}} to write a file as root — {{sudo echo x > /etc/file}} fails because the redirection is done by the *unprivileged* shell.

## Command substitution — output as arguments
~~~console
$ echo "Kernel: $(uname -r)"
$ echo "Users: \`wc -l < /etc/passwd\`"
$ ls -l $(which passwd)
$ kill $(pgrep -u student sleep)
~~~

{{$(command)}} (preferred, nestable) or backticks {{\`command\`}} are replaced by the output of the command (trailing newlines removed).

## xargs — stdin as arguments
Many commands do not read file names from stdin. {{xargs}} reads items from stdin and appends them as **arguments** to a command:

~~~console
$ find . -name "*.txt" | xargs wc -l
$ find . -name "*.bak" -print0 | xargs -0 rm -f
$ echo notes.txt poem.txt | xargs -n 1 wc -l
$ cat data/servers.txt | grep -v ^# | cut -d' ' -f1 | xargs -I{} echo "checking {}"
$ ls *.txt | xargs -t -n 2 echo
~~~

| Option | Meaning |
|---|---|
| {{-n N}} | at most N arguments per command call |
| {{-I {}}} | replace {} by each input line (one call per line) |
| {{-0}} | items separated by NUL (pair with {{find -print0}}) — safe for names with spaces |
| {{-t}} / {{-p}} | print / prompt before running |
| {{-r}} | don't run if input is empty (GNU) |
| {{-L N}} | N input lines per call |
`,
  quiz: [
    { q: 'Which redirection writes both stdout and stderr of {{cmd}} into {{out.log}}? (Choose two.)', o: ['{{cmd > out.log 2>&1}}', '{{cmd 2>&1 > out.log}}', '{{cmd &> out.log}}', '{{cmd 2> out.log}}'], a: [0, 2], e: '{{2>&1 > file}} duplicates stderr to the terminal *before* stdout is moved to the file.' },
    { q: 'Which file descriptor number is standard error?', fill: ['2'], e: '0 stdin, 1 stdout, 2 stderr.' },
    { q: 'Which command appends the output of {{date}} to {{log.txt}}?', fill: ['date >> log.txt'], e: '{{>}} would overwrite the file.' },
    { q: 'Which command displays the output of {{ls -l}} on screen and saves it in {{list.txt}} at the same time?', fill: ['ls -l | tee list.txt'], e: '{{tee -a}} would append.' },
    { q: 'Which command discards all error messages of {{find / -name core}}?', fill: ['find / -name core 2>/dev/null', 'find / -name core 2> /dev/null'], e: '{{/dev/null}} swallows everything written to it.' },
    { q: 'Which command executes {{rm}} on every file name produced by {{find}}, handling names with spaces safely?', o: ['{{find . -name "*.tmp" | xargs rm}}', '{{find . -name "*.tmp" -print0 | xargs -0 rm}}', '{{rm < $(find . -name "*.tmp")}}', '{{find . -name "*.tmp" > rm}}'], a: 1, e: 'NUL-separated names cannot be confused with whitespace.' },
    { q: 'What is a here document?', o: ['a file in {{/etc/here}}', 'a block of lines given to a command\'s stdin, ending at a delimiter word', 'a pipe between two shells', 'the output of tee'], a: 1, e: '{{cat << EOF … EOF}}' },
    { q: 'Which syntax passes the string "hello" as standard input to {{wc -c}}?', o: ['{{wc -c << hello}}', '{{wc -c <<< hello}}', '{{wc -c < hello}}', '{{wc -c hello}}'], a: 1, e: 'Here string. {{< hello}} would read a file named hello.' },
    { q: 'Why does {{sudo echo "nameserver 1.1.1.1" > /etc/resolv.conf}} fail for a normal user?', o: ['echo is not allowed with sudo', 'the redirection is performed by the user\'s own shell, which has no write permission', '/etc/resolv.conf is a symlink', 'sudo does not support output'], a: 1, e: 'Use {{echo … | sudo tee /etc/resolv.conf}}.' },
    { q: 'Which xargs option limits each command invocation to one argument?', o: ['{{-1}}', '{{-n 1}}', '{{-I 1}}', '{{-L 0}}'], a: 1, e: '{{xargs -n 1 cmd}}' },
    { q: 'Which bash construct inserts the output of {{hostname}} into a command line? (Choose two.)', o: ['{{$(hostname)}}', '{{`hostname`}}', '{{${hostname}}}', '{{$[hostname]}}'], a: [0, 1], e: '{{${hostname}}} would expand a variable named hostname.' },
    { q: 'What does {{set -o noclobber}} do?', o: ['prevents {{>}} from overwriting existing files', 'disables pipes', 'prevents deleting files', 'turns off history'], a: 0, e: '{{>|}} still forces overwriting.' },
    { q: 'Which statement about pipes is true?', o: ['Only stderr is passed through a pipe.', 'Only stdout is passed by default; stderr needs {{2>&1}} or {{|&}}.', 'Both streams are always passed.', 'Pipes write temporary files to /tmp.'], a: 1, e: 'The commands in a pipeline run concurrently.' },
  ],
});

LPIC.add({
  id: '103.5',
  title: 'Create, monitor and kill processes',
  weight: 4,
  desc: 'Candidates should be able to perform basic process management.',
  knowledge: [
    'Run jobs in the foreground and background.',
    'Signal a program to continue running after logout.',
    'Monitor active processes.',
    'Select and sort processes for display.',
    'Send signals to processes.',
  ],
  terms: ['&', 'bg', 'fg', 'jobs', 'kill', 'nohup', 'ps', 'top', 'free', 'uptime', 'pgrep', 'pkill', 'killall', 'watch', 'screen', 'tmux'],
  wiki: String.raw`
## Processes
Each running program is a **process** with a **PID**, a parent (**PPID**), an owner, a state, a priority and resources. PID 1 is init/systemd. Processes are listed in {{/proc/<PID>/}}.

## Foreground, background and job control
~~~console
$ sleep 300 &
$ sleep 600 &
$ jobs
$ jobs -l
$ fg %1
$ bg %2
$ kill %2
$ jobs
~~~

- {{command &}} starts a command in the **background**; the shell prints {{[job] PID}}.
- <kbd>Ctrl</kbd>+<kbd>Z</kbd> **suspends** (stops) the foreground job (SIGTSTP); {{bg}} continues it in the background, {{fg}} brings it to the foreground.
- <kbd>Ctrl</kbd>+<kbd>C</kbd> sends **SIGINT** to the foreground job.
- {{jobs}} lists the jobs of *this* shell; {{%N}} = job N, {{%+}}/{{%%}} current, {{%-}} previous, {{%str}} job whose command starts with str.

## Surviving the logout: nohup, disown, screen, tmux
When the terminal closes, the shell sends **SIGHUP** to its jobs and they normally die.

~~~console
$ nohup ./scripts/backup.sh &
$ cat nohup.out
$ sleep 900 &
$ disown %1
~~~

- {{nohup CMD &}} ignores SIGHUP; output goes to {{nohup.out}} (or {{~/nohup.out}}) if stdout is a terminal.
- {{disown}} removes a job from the shell's job table so it receives no SIGHUP.
- **Terminal multiplexers** keep whole sessions alive on the server:
  - **screen**: {{screen}} / {{screen -S name}}, detach <kbd>Ctrl</kbd>+<kbd>a</kbd> <kbd>d</kbd>, {{screen -ls}}, reattach {{screen -r [name]}}
  - **tmux**: {{tmux}} / {{tmux new -s name}}, detach <kbd>Ctrl</kbd>+<kbd>b</kbd> <kbd>d</kbd>, {{tmux ls}}, {{tmux attach -t name}}

## ps — process snapshot
~~~console
$ ps
$ ps aux | head
$ ps -ef | head
$ ps -u student
$ ps -p 1
$ ps -C sshd
$ ps -eo pid,ppid,user,ni,%cpu,%mem,cmd --sort=-%cpu | head -5
$ ps -ef --forest | head -15
$ pstree -p | head
~~~

| Style | Example | Notes |
|---|---|---|
| BSD (no dash) | {{ps aux}} | {{a}} all with tty, {{u}} user-oriented format, {{x}} also without tty |
| UNIX (dash) | {{ps -ef}} | {{-e}} every process, {{-f}} full format (UID PID PPID C STIME TTY TIME CMD) |
| select | {{-u USER}}, {{-p PID}}, {{-C NAME}}, {{--ppid}} | |
| format/sort | {{-o pid,ni,cmd}}, {{--sort=-%mem}}, {{--forest}} | |

**STAT** column: {{R}} running, {{S}} sleeping (interruptible), {{D}} uninterruptible (I/O), {{T}} stopped, {{Z}} zombie; additional {{<}} high priority, {{N}} low priority (nice), {{s}} session leader, {{l}} multithreaded, {{+}} foreground group.

## top — live monitor
{{top}} refreshes every 3 s. Header: uptime and **load averages** (1/5/15 min), tasks, CPU ({{us}} user, {{sy}} system, {{ni}} nice, {{id}} idle, {{wa}} I/O wait), memory and swap. Interactive keys: <kbd>P</kbd> sort by CPU, <kbd>M</kbd> by memory, <kbd>k</kbd> kill, <kbd>r</kbd> renice, <kbd>u</kbd> filter user, <kbd>1</kbd> per-CPU, <kbd>h</kbd> help, <kbd>q</kbd> quit. Batch mode: {{top -b -n 1}}. Alternatives: {{htop}}, {{atop}}.

~~~console
$ top -b -n 1 | head -12
$ uptime
$ free -h
$ watch -n 5 free -h
~~~

- {{uptime}}: time, running time, users, **load average** (average number of runnable / uninterruptible processes; compare with the number of CPUs).
- {{free}}: RAM and swap: {{-h}} human, {{-m}} MiB, {{-s 2}} repeat. "available" = memory usable by new programs (incl. reclaimable cache).
- {{watch -n SEC CMD}} reruns a command periodically fullscreen; {{-d}} highlights changes.

## Signals
| No. | Name | Default action / use |
|---|---|---|
| 1 | **SIGHUP** | hang up — terminal closed; daemons usually **reload their configuration** |
| 2 | **SIGINT** | interrupt — <kbd>Ctrl</kbd>+<kbd>C</kbd> |
| 3 | SIGQUIT | quit with core dump — <kbd>Ctrl</kbd>+<kbd>\</kbd> |
| 9 | **SIGKILL** | kill immediately — **cannot be caught or ignored** |
| 15 | **SIGTERM** | terminate politely — **default of kill**, can be handled (cleanup) |
| 18 | SIGCONT | continue a stopped process |
| 19 | SIGSTOP | stop — cannot be caught |
| 20 | SIGTSTP | stop from terminal — <kbd>Ctrl</kbd>+<kbd>Z</kbd> |

~~~console
$ kill -l
$ sleep 500 &
$ kill %1
$ sleep 500 &
$ kill -9 $!
$ kill -SIGHUP 901
$ sudo kill -HUP 901
$ kill -s TERM 1420
~~~

Always try **SIGTERM first**, SIGKILL only if the process does not react (it gets no chance to clean up). Normal users can only signal their own processes.

## Selecting processes by name: pgrep, pkill, killall
~~~console
$ pgrep sshd
$ pgrep -l -u student
$ pgrep -a python
$ sleep 1000 &
$ pkill sleep
$ killall -v sleep
$ pkill -HUP -f rsyslogd
~~~

- {{pgrep PATTERN}} prints matching PIDs ({{-l}} names, {{-a}} full command, {{-u}} user, {{-f}} match full command line, {{-x}} exact).
- {{pkill PATTERN}} signals them (same selection options).
- {{killall NAME}} signals all processes with exactly that name ({{-u}}, {{-i}} interactive, {{-s}} signal). On some Unixes (Solaris) {{killall}} really kills *all* processes!
`,
  quiz: [
    { q: 'Which signal is sent by {{kill}} when no signal is specified?', o: ['SIGHUP (1)', 'SIGKILL (9)', 'SIGTERM (15)', 'SIGINT (2)'], a: 2, e: 'SIGTERM asks the process to terminate and can be handled.' },
    { q: 'Which signal cannot be caught or ignored by a process? (Choose two.)', o: ['SIGKILL', 'SIGTERM', 'SIGSTOP', 'SIGHUP'], a: [0, 2], e: 'SIGKILL (9) and SIGSTOP (19) are handled by the kernel.' },
    { q: 'Which command continues a stopped job in the background?', fill: ['bg'], e: '{{fg}} brings it to the foreground.' },
    { q: 'A long-running command must continue after you log out. Which command prefix ensures it ignores the hangup signal?', fill: ['nohup'], e: '{{nohup cmd &}}; output goes to nohup.out.' },
    { q: 'Which command lists the background jobs of the current shell?', fill: ['jobs'], e: '{{jobs -l}} includes PIDs.' },
    { q: 'Which signal makes many daemons reload their configuration files?', o: ['SIGHUP', 'SIGUSR2', 'SIGCONT', 'SIGQUIT'], a: 0, e: 'e.g. {{kill -HUP $(pidof rsyslogd)}} or {{systemctl reload}}.' },
    { q: 'Which command shows all processes of all users in BSD style with %CPU and %MEM columns?', fill: ['ps aux', 'ps -aux', 'ps axu'], e: '{{ps -ef}} is the UNIX-style full listing.' },
    { q: 'Which command sends SIGTERM to all processes named {{firefox}}?', o: ['{{kill firefox}}', '{{killall firefox}}', '{{pgrep firefox}}', '{{kill -9 firefox}}'], a: 1, e: '{{pkill firefox}} also works; {{kill}} needs PIDs or job IDs.' },
    { q: 'Which command prints the PIDs of all processes whose name matches {{ssh}}?', fill: ['pgrep ssh'], e: 'Add {{-l}} to show names.' },
    { q: 'What do the three numbers of the load average in {{uptime}} represent?', o: ['CPU usage in percent for user, system and idle', 'average number of runnable/waiting processes over 1, 5 and 15 minutes', 'free memory, used memory and swap', 'number of users, terminals and processes'], a: 1, e: 'Compare the values with the number of CPU cores.' },
    { q: 'Which key in {{top}} sorts the processes by memory usage?', o: ['{{M}}', '{{P}}', '{{m}}', '{{k}}'], a: 0, e: '{{P}} sorts by CPU, {{k}} kills, {{r}} renices.' },
    { q: 'Which command repeats {{df -h}} every 10 seconds in full screen?', fill: ['watch -n 10 df -h', 'watch -n10 df -h', "watch -n 10 'df -h'"], e: 'Default interval is 2 seconds.' },
    { q: 'How do you reattach to a detached screen session?', o: ['{{screen -d}}', '{{screen -r}}', '{{screen -ls}}', '{{screen --attach}}'], a: 1, e: '{{screen -ls}} lists sessions; tmux uses {{tmux attach}}.' },
    { q: 'Which key combination suspends the foreground process?', o: ['Ctrl+C', 'Ctrl+Z', 'Ctrl+D', 'Ctrl+S'], a: 1, e: 'Ctrl+Z sends SIGTSTP; then use bg/fg.' },
    { q: 'What does the STAT value {{Z}} in ps output mean?', o: ['sleeping', 'zombie — finished, but not yet reaped by its parent', 'stopped', 'high priority'], a: 1, e: 'A zombie only occupies a process table entry until the parent calls wait().' },
    { q: 'Which command shows the amount of used and free memory and swap in human-readable units?', fill: ['free -h'], e: '{{free -m}} in MiB.' },
  ],
});

LPIC.add({
  id: '103.6',
  title: 'Modify process execution priorities',
  weight: 2,
  desc: 'Candidates should be able to manage process execution priorities.',
  knowledge: [
    'Know the default priority of a job that is created.',
    'Run a program with higher or lower priority than the default.',
    'Change the priority of a running process.',
  ],
  terms: ['nice', 'ps', 'renice', 'top'],
  wiki: String.raw`
## Niceness
The Linux scheduler shares CPU time between runnable processes. The **nice value** influences how much a process gets:

- range **−20** (highest priority, least nice to others) … **+19** (lowest priority)
- default for new processes: **0** (inherited from the parent)
- the kernel priority shown by {{top}} ({{PR}}) is 20 + NI; {{ps -l}} shows PRI = 80 + NI
- **only root** may set negative values or *lower* the niceness of a process; normal users can only make their own processes nicer (raise the value)

## nice — start with a different priority
~~~console
$ nice
0
$ nice -n 10 ./scripts/backup.sh
$ nice ./scripts/backup.sh
$ nice -n 15 sleep 300 &
$ nice -n -5 sleep 60
# nice -n -10 sleep 300 &
$ nice -15 tar czf /tmp/home.tgz /home/student
~~~

- {{nice CMD}} without a value → **+10**
- {{nice -n N CMD}} adjusts by N; the old syntax {{nice -N CMD}} means +N, {{nice --N CMD}} means −N (confusing — prefer {{-n}})
- values are clamped to −20 … 19

## renice — change a running process
~~~console
$ ps -o pid,ni,cmd -u alice
# renice -n 5 -p 1420
# renice 5 1420
# renice -n -5 -u alice
$ renice -n 19 -p $(pgrep -u student sleep)
~~~

{{renice [-n] PRIORITY [-p PID…] [-u USER…] [-g PGRP…]}} — the value is the **new absolute niceness** (not an adjustment, in contrast to {{nice}}). Output: {{1420 (process ID) old priority 10, new priority 5}}.

## Watching priorities
~~~console
$ ps -el | head -5
$ ps -eo pid,ni,pri,cmd --sort=-ni | head
$ ps -o pid,ni,comm -p 1420
$ top -b -n 1 | head -15
~~~

In {{top}} the columns {{PR}} and {{NI}} show priority and niceness; press <kbd>r</kbd> to renice a process interactively. In {{ps aux}} the STAT flag {{N}} marks low priority (positive nice), {{<}} high priority.

> EXAM: Default nice value = 0; {{nice}} without {{-n}} = +10; range −20..19; only root can use negative values; {{renice}} sets an absolute value.

## Static priorities and the scheduler
The kernel scheduler uses **static priorities 0–139**: **0–99 are reserved for real-time processes**, **100–139 for normal processes** (40 levels, one per nice value). Lower value = higher priority. A normal process starts at **120** (nice 0); nice −20 → 100, nice 19 → 139.

~~~console
$ grep ^prio /proc/1/sched
$ ps -el | head -5
$ ps -o pid,pri,ni,comm
$ top -n 1 | head -12
~~~
Each tool shows the value differently:

| Tool | Column | Normal process (nice 0) | Range for normal processes |
|---|---|---|---|
| kernel ({{/proc/PID/sched}}) | {{prio}} | 120 | 100–139 |
| {{ps -el}} | {{PRI}} | 80 (add 40 → 120) | 60–99 |
| {{top}} | {{PR}} | 20 (= 20 + NI) | 0–39; real-time shows negative or {{rt}} |

> EXAM: Only **root** may lower the nice value (raise priority) — normal users can only increase niceness of their own processes. In {{top}}, press {{r}} to renice a process.
`,
  quiz: [
    { q: 'What is the default nice value of a newly started process?', fill: ['0'], e: 'It inherits the niceness of the parent, normally 0.' },
    { q: 'What nice value does {{nice ./script.sh}} use when no value is given?', o: ['0', '10', '19', '-10'], a: 1, e: 'The default adjustment of nice is 10.' },
    { q: 'Which is the highest scheduling priority a process can get via niceness?', o: ['19', '0', '-20', '-19'], a: 2, e: '−20 is the least nice = highest priority; 19 the lowest.' },
    { q: 'Which command changes the nice value of the running process 4711 to 10?', o: ['{{nice -n 10 4711}}', '{{renice -n 10 -p 4711}}', '{{renice +10 4711 -u}}', '{{kill -n 10 4711}}'], a: 1, e: '{{renice 10 4711}} also works.' },
    { q: 'A normal user tries {{renice -n -5 -p 1234}} on their own process. What happens?', o: ['It works.', 'Permission denied — only root may lower niceness / use negative values.', 'The value is ignored silently.', 'The process is killed.'], a: 1, e: 'Users may only increase the nice value of their own processes.' },
    { q: 'Which command starts {{make}} with the lowest possible CPU priority?', fill: ['nice -n 19 make', 'nice -19 make'], e: '19 is the maximum niceness.' },
    { q: 'Which ps STAT flag indicates a process with a positive nice value (low priority)?', o: ['{{<}}', '{{N}}', '{{L}}', '{{s}}'], a: 1, e: '{{<}} marks high priority (negative nice).' },
    { q: 'Which command shows the nice value of all processes in a column named NI? (Choose two.)', o: ['{{ps -el}}', '{{ps -eo pid,ni,cmd}}', '{{ps -ef}}', '{{free -n}}'], a: [0, 1], e: '{{ps -ef}} has no NI column.' },
    { q: 'Which key in {{top}} changes the nice value of a process?', fill: ['r'], e: '{{r}} = renice, {{k}} = kill.' },
  ],
});

LPIC.add({
  id: '103.7',
  title: 'Search text files using regular expressions',
  weight: 3,
  desc: 'Candidates should be able to manipulate files and text data using regular expressions. This objective includes creating simple regular expressions containing several notational elements as well as understanding the differences between basic and extended regular expressions. It also includes using regular expression tools to perform searches through a filesystem or file content.',
  knowledge: [
    'Create simple regular expressions containing several notational elements.',
    'Understand the differences between basic and extended regular expressions.',
    'Understand the concepts of special characters, character classes, quantifiers and anchors.',
    'Use regular expression tools to perform searches through a filesystem or file content.',
    'Use regular expressions to delete, change and substitute text.',
  ],
  terms: ['grep', 'egrep', 'fgrep', 'sed', 'regex(7)'],
  sims: ['regex'],
  wiki: String.raw`
## Regular expressions
A **regular expression** (regex) describes a set of strings. Unlike shell globs (which match *file names*), regexes match *text*. The POSIX standard defines two dialects ({{man 7 regex}}): **BRE** (basic) and **ERE** (extended).

## Building blocks
| Element | Meaning | Example |
|---|---|---|
| literal chars | themselves | {{root}} |
| {{.}} | any single character | {{h.t}} → hat, hot, h t |
| {{[abc]}} | one of the listed characters | {{[Cc]herry}} |
| {{[a-z]}} | range | {{[0-9]}} |
| {{[^abc]}} | any character **except** | {{[^#]}} |
| {{[[:digit:]]}} | POSIX class: alpha, digit, alnum, upper, lower, space, blank, punct, xdigit | {{[[:space:]]}} |
| **anchors** {{^}} / {{$}} | start / end of line | {{^root}}, {{bash$}}, {{^$}} (empty line) |
| {{\<}} {{\>}} {{\b}} | word boundaries (GNU) | {{\<cat\>}} |
| {{\}} | escape a special character | {{\.}} = a literal dot |

**Quantifiers** (apply to the preceding item):

| ERE | BRE | Meaning |
|---|---|---|
| {{*}} | {{*}} | 0 or more |
| {{+}} | {{\+}} | 1 or more |
| {{?}} | {{\?}} | 0 or 1 |
| {{{n}}} {{{n,}}} {{{n,m}}} | {{\{n\}}} {{\{n,m\}}} | exactly n, at least n, n to m |
| {{(…)}} | {{\(…\)}} | group (and back-reference {{\1}}) |
| {{a\|b}} | {{a\\|b}} | alternation |

> EXAM: In **BRE** (grep, sed) the characters {{? + { } | ( )}} are literal and need a backslash to become special. In **ERE** ({{grep -E}}, {{egrep}}, {{sed -E}}/{{sed -r}}) they are special without backslash. {{*}}, {{.}}, {{[]}}, {{^}}, {{$}} work the same in both.

{{.*}} = "anything". Matches are **greedy** (as long as possible).

## grep
~~~console
$ grep root /etc/passwd
$ grep -i cherry fruits.txt
$ grep -v '^#' /etc/fstab
$ grep -c bash /etc/passwd
$ grep -n lazy poem.txt
$ grep -w 'mode' poem.txt
$ grep -x apple fruits.txt
$ grep -o '[0-9]\+' numbers.txt | head -3
$ grep -E '^(10|192)\.' access.log
$ grep ' 40[13] ' access.log
$ grep -E '[0-9]{1,3}(\.[0-9]{1,3}){3}' access.log | head -2
$ grep -r 'PermitRootLogin' /etc/ssh/
$ grep -rl 'ssh' /etc 2>/dev/null | head
$ grep -A1 -B1 'DELETE' poem.txt
$ grep -e apple -e fig fruits.txt
$ grep -q root /etc/passwd && echo found
~~~

| Option | Meaning |
|---|---|
| {{-i}} | ignore case |
| {{-v}} | invert: lines that do **not** match |
| {{-c}} | count matching lines |
| {{-n}} | show line numbers |
| {{-l}} / {{-L}} | only names of files with / without matches |
| {{-r}} / {{-R}} | recursive (R follows symlinks) |
| {{-w}} / {{-x}} | match whole words / whole lines |
| {{-o}} | print only the matched part |
| {{-E}} / {{-F}} / {{-G}} | ERE / fixed strings / BRE (default) |
| {{-e PAT}} / {{-f FILE}} | several patterns / patterns from a file |
| {{-A N}} {{-B N}} {{-C N}} | context lines after / before / around |
| {{-h}} / {{-H}} | suppress / force file names |
| {{-q}} | quiet — only the exit status (0 found, 1 not found, 2 error) |

- {{egrep}} = {{grep -E}}, {{fgrep}} = {{grep -F}} (no regex: fastest, safe for strings with special characters). Both are deprecated aliases but still on the exam.
- Quote patterns in **single quotes** so the shell does not expand {{*}}, {{$}} or {{\}}.

## sed with regular expressions
~~~console
$ sed 's/colou\?r/COLOR/g' poem.txt
$ sed -E 's/(quick|lazy)/[\1]/g' poem.txt
$ sed 's/^/> /' poem.txt
$ sed 's/[[:space:]]*$//' poem.txt
$ sed -n '/lazy/p' poem.txt
$ sed '/^$/d; /^#/d' /etc/fstab
$ sed '/^\[database\]/,/^\[/ s/3306/3307/' data/config.ini
$ sed -E 's/([a-z]+),([A-Za-z]+)/\2 (\1)/' employees.csv | head -3
$ sed 's#/home/#/srv/home/#' /etc/passwd | grep srv
$ sed -i.orig 's/false/true/' data/config.ini
$ sed '2i\--- inserted line ---' poem.txt | head -3
$ sed '/lazy/a\(appended after every lazy line)' poem.txt
$ sed 'y/abc/ABC/' fruits.txt | head -3
~~~

Command structure: **[address]command**. Addresses: line number {{3}}, last line {{$}}, {{/regex/}}, range {{3,7}} or {{/start/,/end/}}, {{addr!}} negation.
- {{s/RE/REPLACEMENT/FLAGS}}: flags {{g}} all, {{i}} ignore case, {{N}} Nth occurrence, {{p}} print. In the replacement {{&}} = whole match, {{\1}}…{{\9}} = groups. Any delimiter works: {{s#a#b#}}.
- {{d}} delete, {{p}} print (with {{-n}}), {{a TEXT}} append, {{i TEXT}} insert, {{c TEXT}} change, {{y/abc/xyz/}} transliterate, {{q}} quit, {{=}} line number.
- Options: {{-n}} quiet, {{-e}} add script, {{-f FILE}} script file, {{-E}}/{{-r}} ERE, {{-i[SUFFIX]}} in place.

## Searching the filesystem
Combine {{find}} (names, types, times) with {{grep}} (content):

~~~console
$ grep -rn --include='*.conf' 'nameserver' /etc 2>/dev/null
$ find /etc -name '*.conf' -exec grep -l 'Listen' {} + 2>/dev/null
$ find . -type f | xargs grep -l TODO
$ locate -r '/ssh.*config$'
~~~
`,
  quiz: [
    { q: 'Which regular expression matches lines that consist only of the word {{apple}}?', o: ['{{apple}}', '{{^apple$}}', '{{*apple*}}', '{{<apple>}}'], a: 1, e: '{{^}} anchors at the start, {{$}} at the end. ({{grep -x apple}} does the same.)' },
    { q: 'Which command prints all lines of {{/etc/ssh/sshd_config}} that are neither comments nor empty?', o: ['{{grep -v "^#|^$" sshd_config}}', '{{grep -Ev "^#|^$" sshd_config}}', '{{grep "^[^#]" sshd_config}}', '{{grep -c "#" sshd_config}}'], a: 1, e: 'Alternation {{|}} needs ERE ({{-E}}); {{-v}} inverts.' },
    { q: 'Which grep option counts the number of matching lines?', fill: ['-c'], e: '{{grep -c pattern file}}' },
    { q: 'In a basic regular expression (BRE), how do you express "one or more digits" with GNU grep?', o: ['{{[0-9]+}}', '{{[0-9]\\+}}', '{{[0-9]*}}', '{{[0-9]{1}}}'], a: 1, e: 'In BRE {{+}} is literal; GNU allows {{\\+}}. Portable BRE: {{[0-9][0-9]*}}. In ERE: {{[0-9]+}}.' },
    { q: 'Which command is equivalent to {{grep -F}}?', fill: ['fgrep'], e: '{{egrep}} = {{grep -E}}.' },
    { q: 'What does the regex {{^[^#]}} match?', o: ['lines starting with #', 'lines that start with any character other than #', 'lines containing no #', 'empty lines'], a: 1, e: 'Inside brackets {{^}} negates; outside it anchors. Empty lines do not match (they have no first character).' },
    { q: 'Which sed command replaces every occurrence of {{foo}} with {{bar}} in {{file.txt}}, editing the file directly?', fill: ["sed -i 's/foo/bar/g' file.txt", 'sed -i s/foo/bar/g file.txt', 'sed -i "s/foo/bar/g" file.txt', "sed -i -e 's/foo/bar/g' file.txt"], e: '{{-i}} in place, {{g}} global.' },
    { q: 'Which sed command deletes all empty lines?', o: ["{{sed '/^$/d'}}", "{{sed 's/^$//'}}", "{{sed '/$^/d'}}", "{{sed -n '/^$/p'}}"], a: 0, e: '{{d}} deletes the selected lines.' },
    { q: 'Which grep option recursively searches all files in a directory tree?', o: ['{{-R}} or {{-r}}', '{{-a}}', '{{-d}}', '{{-t}}'], a: 0, e: '{{grep -r pattern /etc}}' },
    { q: 'What does {{grep -w is file}} match?', o: ['lines containing "is" as a whole word', 'lines starting with "is"', 'lines containing "is" anywhere, e.g. "this"', 'only the word "is" on its own line'], a: 0, e: '{{-w}} requires word boundaries around the match; {{-x}} would require the whole line.' },
    { q: 'In the sed replacement part, what does {{&}} stand for?', o: ['a literal ampersand', 'the whole matched text', 'the first group', 'a newline'], a: 1, e: '{{sed \'s/[0-9]*/(&)/\'}} puts the match in parentheses. {{\\&}} is a literal &.' },
    { q: 'Which ERE matches "color" and "colour"?', fill: ['colou?r'], e: '{{?}} = zero or one of the previous item (BRE: {{colou\\?r}}).' },
    { q: 'Which statements about BRE vs. ERE are correct? (Choose two.)', o: ['In ERE, {{+ ? | ( ) {}}} are special without a backslash.', 'In BRE, {{.}} and {{*}} need a backslash.', '{{grep -E}} uses ERE.', '{{sed}} uses ERE by default.'], a: [0, 2], e: 'sed uses BRE unless {{-E}}/{{-r}} is given.' },
    { q: 'Which command prints only the lines 10 to 20 of {{log}}?', fill: ["sed -n '10,20p' log", 'sed -n 10,20p log', 'sed -n "10,20p" log'], e: 'Without {{-n}} every line would be printed and lines 10–20 twice.' },
    { q: 'Which command lists only the names of files below {{/etc}} that contain the string {{ssh}}?', fill: ['grep -rl ssh /etc', 'grep -lr ssh /etc', 'grep -r -l ssh /etc', 'grep -Rl ssh /etc', 'grep -lR ssh /etc'], e: '{{-l}} = files with matches.' },
  ],
});

LPIC.add({
  id: '103.8',
  title: 'Basic file editing',
  weight: 3,
  desc: 'Candidates should be able to edit text files using vi. This objective includes vi navigation, vi modes, inserting, editing, deleting, copying and finding text. It also includes awareness of other common editors and setting the default editor.',
  knowledge: [
    'Navigate a document using vi.',
    'Understand and use vi modes.',
    'Insert, edit, delete, copy and find text in vi.',
    'Awareness of Emacs, nano and vim.',
    'Configure the standard editor.',
  ],
  terms: ['vi', '/, ?', 'h,j,k,l', 'i, o, a', 'd, p, y, dd, yy', 'ZZ, :w!, :q!', 'EDITOR'],
  sims: ['vi'],
  wiki: String.raw`
## Why vi?
**vi** (or its improved clone **vim**) is installed on practically every Unix system, works over slow connections and in rescue systems. On many distributions {{vi}} starts vim. Practise in the *vi trainer* simulation or directly in the sandbox: {{vi poem.txt}}.

~~~console
$ vi poem.txt
$ vim +5 notes.txt
$ vi -R /etc/passwd
$ view /etc/passwd
~~~

## The modes
| Mode | Purpose | How to get there |
|---|---|---|
| **Normal / command mode** | move, delete, copy, paste — keys are commands | start mode; <kbd>Esc</kbd> from any other mode |
| **Insert mode** | type text | {{i}}, {{a}}, {{o}}, {{O}}, {{I}}, {{A}}, {{c…}}, {{s}} |
| **Command-line (ex) mode** | {{:}} commands (save, quit, substitute) and {{/}} {{?}} searches | {{:}}, {{/}}, {{?}} |
| (Replace mode) | overwrite | {{R}} |

## Entering insert mode
| Key | Inserts … |
|---|---|
| {{i}} / {{I}} | before the cursor / at the beginning of the line |
| {{a}} / {{A}} | after the cursor / at the end of the line |
| {{o}} / {{O}} | in a new line below / above |
| {{s}} / {{S}} | after deleting the char / the line |
| {{cw}} {{cc}} {{C}} | change word / line / to end of line |

## Navigation (normal mode)
| Keys | Movement |
|---|---|
| {{h}} {{j}} {{k}} {{l}} | left, down, up, right (arrow keys work too) |
| {{w}} {{b}} {{e}} | next word start, previous word start, word end ({{W B E}} ignore punctuation) |
| {{0}} {{^}} {{$}} | line start, first non-blank, line end |
| {{gg}} {{G}} {{5G}} or {{:5}} | first line, last line, line 5 |
| <kbd>Ctrl</kbd>+<kbd>f</kbd> / <kbd>Ctrl</kbd>+<kbd>b</kbd> | page forward / back |
| {{H}} {{M}} {{L}} | top / middle / bottom of the screen |

A **count** repeats: {{5j}} 5 lines down, {{3w}} 3 words, {{2dd}} delete 2 lines.

## Editing
| Keys | Action |
|---|---|
| {{x}} / {{X}} | delete char under / before the cursor |
| {{dd}} | delete (cut) the line; {{3dd}} three lines |
| {{dw}}, {{d$}} / {{D}}, {{d0}}, {{dG}}, {{dgg}} | delete word, to end of line, to line start, to end of file, to start |
| {{yy}} / {{Y}} | yank (copy) the line; {{yw}} a word, {{y$}} to the end |
| {{p}} / {{P}} | put (paste) after / before the cursor (line-wise: below / above) |
| {{r}}x | replace one character with x |
| {{J}} | join the next line |
| {{~}} | toggle case |
| {{u}} / <kbd>Ctrl</kbd>+<kbd>r</kbd> | undo / redo |
| {{.}} | repeat the last change |

Pattern: **operator + motion** — {{d}} (delete), {{y}} (yank), {{c}} (change) combined with any motion ({{w}}, {{$}}, {{G}}, {{j}} …); doubling ({{dd}}, {{yy}}, {{cc}}) acts on whole lines.

## Searching and replacing
| Command | Action |
|---|---|
| {{/pattern}} | search forward |
| {{?pattern}} | search backward |
| {{n}} / {{N}} | next match in the same / opposite direction |
| {{:s/old/new/}} | replace first match in the current line |
| {{:s/old/new/g}} | all matches in the line |
| {{:%s/old/new/g}} | in the whole file ({{gc}} asks for confirmation) |
| {{:10,20s/a/b/g}} | in lines 10–20 |

## Saving and quitting
| Command | Action |
|---|---|
| {{:w}} | write (save) |
| {{:w newname}} | write to another file |
| {{:w!}} | force write (e.g. read-only file you own) |
| {{:q}} | quit (refused if there are unsaved changes: E37) |
| {{:q!}} | quit and **discard** changes |
| {{:wq}} / {{:x}} / {{ZZ}} | save and quit ({{:x}} and {{ZZ}} only write if changed) |
| {{ZQ}} | quit without saving |
| {{:e!}} | reload the file, discard changes |
| {{:r file}} | insert another file |
| {{:!cmd}} | run a shell command; {{:r !cmd}} inserts its output |
| {{:set number}} / {{:set nu}} | show line numbers ({{:set nonu}} hides) |
| {{:set ic}} | ignore case in searches |
| {{:help}} | help |

Settings can be made permanent in {{~/.vimrc}} (vim) or {{~/.exrc}} (vi).

> EXAM: Know the mode switches, {{i a o O}}, {{dd yy p}}, {{/ ? n N}}, {{:w :q :wq :q! :w! ZZ}}. "Quit without saving" = {{:q!}}; "save and quit" = {{:wq}}, {{:x}} or {{ZZ}}.

## Other editors (awareness)
- **nano** — simple, shortcuts shown at the bottom: <kbd>Ctrl</kbd>+<kbd>O</kbd> save ("write out"), <kbd>Ctrl</kbd>+<kbd>X</kbd> exit, <kbd>Ctrl</kbd>+<kbd>K</kbd>/<kbd>U</kbd> cut/paste line, <kbd>Ctrl</kbd>+<kbd>W</kbd> search. Try {{nano notes.txt}}.
- **Emacs** — powerful, extensible (Lisp); <kbd>Ctrl</kbd>+<kbd>X</kbd> <kbd>Ctrl</kbd>+<kbd>S</kbd> save, <kbd>Ctrl</kbd>+<kbd>X</kbd> <kbd>Ctrl</kbd>+<kbd>C</kbd> quit.
- **vim** — vi improved: syntax highlighting, multi-level undo, visual mode ({{v}}, {{V}}), split windows, plugins.

## The default editor
Programs such as {{crontab -e}}, {{visudo}}, {{git commit}}, {{less}} (press {{v}}) and {{fc}} start the editor named in **{{$VISUAL}}** or **{{$EDITOR}}**:

~~~console
$ echo $EDITOR
$ export EDITOR=nano
$ echo 'export EDITOR=vim' >> ~/.bashrc
# update-alternatives --config editor
~~~

On Debian the system-wide default is the alternative {{/usr/bin/editor}} ({{update-alternatives --config editor}}); {{select-editor}} sets it per user.
`,
  quiz: [
    { q: 'Which vi command saves the file and exits? (Choose two.)', o: ['{{:wq}}', '{{ZZ}}', '{{:q!}}', '{{ZQ}}'], a: [0, 1], e: '{{:q!}} and {{ZQ}} quit **without** saving. {{:x}} also saves and quits.' },
    { q: 'Which vi command quits without saving the changes?', fill: [':q!'], e: '{{:q}} alone refuses when there are unsaved changes.' },
    { q: 'In vi command mode, which key opens a new line below the current one and switches to insert mode?', fill: ['o'], e: '{{O}} opens a line above.' },
    { q: 'Which vi command deletes the current line?', fill: ['dd'], e: '{{3dd}} deletes three lines; the text goes into the register for {{p}}.' },
    { q: 'Which vi command copies (yanks) the current line?', fill: ['yy', 'Y'], e: 'Paste with {{p}} (below) or {{P}} (above).' },
    { q: 'How do you search backwards for the word {{error}} in vi?', fill: ['?error'], e: '{{/error}} searches forward; {{n}}/{{N}} repeat.' },
    { q: 'Which command replaces all occurrences of {{foo}} with {{bar}} in the whole file in vi?', fill: [':%s/foo/bar/g'], e: '{{%}} = all lines, {{g}} = all matches per line.' },
    { q: 'Which keys move the cursor left, down, up and right in vi?', o: ['{{h j k l}}', '{{a s d f}}', '{{j k l ;}}', '{{w a s d}}'], a: 0, e: 'h ← · j ↓ · k ↑ · l →' },
    { q: 'Which key returns from insert mode to command mode?', o: ['{{Esc}}', '{{Enter}}', '{{:}}', '{{q}}'], a: 0, e: 'Esc always brings you back to normal (command) mode.' },
    { q: 'Which environment variable defines the default editor used by programs such as {{crontab -e}}? (Choose two.)', o: ['{{EDITOR}}', '{{VISUAL}}', '{{SHELL}}', '{{PAGER}}'], a: [0, 1], e: '{{VISUAL}} is tried first by many programs, then {{EDITOR}}.' },
    { q: 'Which vi command jumps to the last line of the file?', fill: ['G'], e: '{{gg}} = first line, {{5G}} = line 5.' },
    { q: 'You opened a read-only file that you own in vi and made changes. Which command writes it anyway?', fill: [':w!'], e: '{{:w!}} forces the write (if the permissions allow you to override).' },
    { q: 'Which vi command undoes the last change?', fill: ['u'], e: 'Ctrl+R redoes (vim).' },
    { q: 'In nano, which key combination saves the file?', o: ['Ctrl+S', 'Ctrl+O', 'Ctrl+W', 'Ctrl+X'], a: 1, e: 'Ctrl+O "Write Out"; Ctrl+X exits; Ctrl+W searches.' },
    { q: 'Which vi command appends text at the end of the current line?', fill: ['A'], e: '{{a}} appends after the cursor; {{I}} inserts at the beginning of the line.' },
  ],
});
