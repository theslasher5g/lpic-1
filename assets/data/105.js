/* Topic 105: Shells and Shell Scripting */
LPIC.add({
  id: '105.1',
  title: 'Customize and use the shell environment',
  weight: 4,
  desc: 'Candidates should be able to customize shell environments to meet users\' needs. Candidates should be able to modify global and user profiles.',
  knowledge: [
    'Set environment variables (e.g. PATH) at login or when spawning a new shell.',
    'Write Bash functions for frequently used sequences of commands.',
    'Maintain skeleton directories for new user accounts.',
    'Set command search path with the proper directory.',
  ],
  terms: ['.', 'source', '/etc/bash.bashrc', '/etc/profile', 'env', 'export', 'set', 'unset', '~/.bash_profile', '~/.bash_login', '~/.profile', '~/.bashrc', '~/.bash_logout', 'function', 'alias'],
  sims: ['startup'],
  wiki: String.raw`
## Login vs. non-login, interactive vs. non-interactive
| Shell type | Started by | Reads |
|---|---|---|
| **interactive login** | console/SSH login, {{su -}}, {{bash -l}}, {{sudo -i}} | {{/etc/profile}} (→ {{/etc/profile.d/*.sh}}), then the **first existing** of {{~/.bash_profile}}, {{~/.bash_login}}, {{~/.profile}}; on exit {{~/.bash_logout}} |
| **interactive non-login** | new terminal window, {{bash}}, {{su}} (without -) | {{/etc/bash.bashrc}} (Debian; RHEL: {{/etc/bashrc}} via {{~/.bashrc}}), {{~/.bashrc}} |
| **non-interactive** | scripts, {{bash -c}}, cron | only the file named in {{$BASH_ENV}} |

Because login shells don't read {{~/.bashrc}} by themselves, the usual {{~/.profile}} / {{~/.bash_profile}} contains:

~~~file
# ~/.profile (Debian) — include .bashrc if it exists
if [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi
# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ]; then
    PATH="$HOME/bin:$PATH"
fi
~~~

~~~console
$ cat /etc/profile
$ ls /etc/profile.d/
$ cat ~/.bashrc
$ echo $0
$ shopt -q login_shell && echo login || echo non-login
~~~

**What goes where?**
- environment variables (PATH, EDITOR, LANG) → profile files ({{~/.profile}}, {{/etc/profile}}, {{/etc/profile.d/custom.sh}}) — they are inherited by child processes anyway
- aliases, functions, prompt, shell options → {{~/.bashrc}} / {{/etc/bash.bashrc}} — they are *not* inherited, every interactive shell needs to define them
- system-wide for all users: {{/etc/profile}}, {{/etc/profile.d/*.sh}}, {{/etc/bash.bashrc}}; PAM also reads {{/etc/environment}} (simple {{KEY=value}} lines, no shell syntax)

## source / . — run a file in the current shell
~~~console
$ echo "alias hi='echo Hello'" >> ~/.bashrc
$ hi
$ source ~/.bashrc
$ hi
$ . ~/.bashrc
$ ./scripts/hello.sh
~~~

{{source FILE}} (= {{. FILE}}) executes the commands **in the current shell**, so variables, aliases, functions and {{cd}} take effect immediately. Executing a script ({{./script}} or {{bash script}}) runs a **child** shell — its changes vanish when it ends.

## Environment variables and PATH
~~~console
$ echo $PATH
$ export PATH="$PATH:$HOME/bin"
$ mkdir -p ~/bin && cp scripts/hello.sh ~/bin/hi && chmod +x ~/bin/hi
$ hi
$ env | grep -E '^(HOME|USER|SHELL|LANG)='
$ set | wc -l
$ unset LPIC_LAB
$ env -u PATH /usr/bin/env | head -3
~~~

- Append ({{PATH=$PATH:/new}}) to keep existing directories; prepend ({{PATH=/new:$PATH}}) to prefer your versions.
- Never add {{.}} (the current directory) to root's PATH — someone could plant a malicious {{ls}} in {{/tmp}}.
- Root's PATH contains the {{sbin}} directories; normal users' PATH often not ({{/sbin}}, {{/usr/sbin}}).
- {{env}}, {{set}}, {{export}}, {{unset}}: see 103.1.

## Aliases
~~~console
$ alias
$ alias ll='ls -alF'
$ alias rm='rm -i'
$ alias cls=clear
$ type ll
$ unalias cls
$ \ls
~~~

Aliases replace the **first word** of a command. Not usable in scripts by default and cannot take arguments in the middle — use functions for that. Bypass with {{\ls}}, {{command ls}} or the full path.

## Functions
~~~console
$ mkcd() { mkdir -p "$1" && cd "$1"; }
$ mkcd /tmp/demo/project
$ pwd
$ function greet { echo "Hello, $\{1:-stranger}! You passed $# argument(s)."; }
$ greet Bob
$ declare -f mkcd
$ type greet
$ unset -f greet
~~~

- Two syntaxes: {{name() { commands; }}} (POSIX) and {{function name { commands; }}} (bash).
- Arguments: {{$1}} … {{$9}}, {{$\{10}}}, {{$#}} count, {{$@}} all (as separate words in quotes), {{$*}} all (as one word in quotes), {{$0}} stays the shell/script name.
- {{return N}} sets the exit status; {{local VAR}} creates function-local variables.
- Define them in {{~/.bashrc}} to have them in every interactive shell; {{export -f name}} makes them visible to child bash processes.

## The prompt
{{PS1}} is the primary prompt, {{PS2}} the continuation prompt ({{> }}). Escapes: {{\u}} user, {{\h}} host, {{\w}} working directory, {{\W}} its basename, {{\$}} {{$}} or {{#}} for root, {{\t}} time, {{\n}} newline.

~~~console
$ PS1='[\t \u@\h \W]\$ '
$ PS1='\u@\h:\w\$ '
~~~

## Skeleton directory: /etc/skel
When a user is created with a home directory ({{useradd -m}}), the contents of **{{/etc/skel}}** — including hidden files — are copied into it. Put default {{.bashrc}}, {{.profile}}, {{.bash_logout}}, a {{bin/}} directory, desktop settings … there. Changes affect only **new** users.

~~~console
$ ls -la /etc/skel
# mkdir /etc/skel/bin
# echo 'echo "Welcome, $USER"' >> /etc/skel/.bashrc
# useradd -m -s /bin/bash carol
# ls -la /home/carol
~~~

{{useradd -k /etc/skel-dev}} uses another skeleton; the default is {{SKEL=}} in {{/etc/default/useradd}}.

## Other files
- {{~/.bash_logout}} — run when a login shell exits (e.g. {{clear}}).
- {{~/.bash_history}} — history file (see 103.1).
- {{~/.inputrc}} / {{/etc/inputrc}} — readline key bindings.
- {{/etc/shells}} — list of valid login shells ({{chsh -l}}).
`,
  quiz: [
    { q: 'Which file is read by bash for **interactive non-login** shells of a user?', fill: ['~/.bashrc', '.bashrc', '$HOME/.bashrc'], e: 'Login shells read ~/.bash_profile, ~/.bash_login or ~/.profile instead.' },
    { q: 'A login shell finds both {{~/.bash_profile}} and {{~/.profile}}. Which one is read?', o: ['both', 'only {{~/.bash_profile}}', 'only {{~/.profile}}', 'none of them'], a: 1, e: 'bash reads only the first existing of ~/.bash_profile, ~/.bash_login, ~/.profile.' },
    { q: 'Which system-wide file is read by every login shell?', fill: ['/etc/profile'], e: 'It usually also runs {{/etc/profile.d/*.sh}}.' },
    { q: 'You changed {{~/.bashrc}}. How can you apply the changes to the current shell without logging out? (Choose two.)', o: ['{{source ~/.bashrc}}', '{{. ~/.bashrc}}', '{{bash ~/.bashrc}}', '{{./.bashrc}}'], a: [0, 1], e: 'Running it in a child shell would lose the changes.' },
    { q: 'Which directory\'s contents are copied into a new user\'s home directory by {{useradd -m}}?', fill: ['/etc/skel', '/etc/skel/'], e: 'Configured as SKEL in /etc/default/useradd.' },
    { q: 'Which file is executed when a login shell exits?', fill: ['~/.bash_logout', '.bash_logout'], e: 'Typically clears the screen.' },
    { q: 'Which statement defines a bash function named {{up}} that changes to the parent directory? (Choose two.)', o: ['{{up() { cd ..; }}}', '{{function up { cd ..; }}}', '{{alias up() = cd ..}}', '{{def up: cd ..}}'], a: [0, 1], e: 'Both syntaxes are accepted by bash.' },
    { q: 'Which command appends {{/opt/tools/bin}} to the command search path of the current shell and its children?', fill: ['export PATH=$PATH:/opt/tools/bin', 'PATH=$PATH:/opt/tools/bin', 'export PATH="$PATH:/opt/tools/bin"', 'PATH="$PATH:/opt/tools/bin"'], e: 'PATH is normally already exported, so the assignment alone also works.' },
    { q: 'Where should aliases be defined so that they are available in every interactive shell of a user?', o: ['{{~/.bashrc}}', '{{~/.bash_logout}}', '{{/etc/passwd}}', '{{~/.bash_history}}'], a: 0, e: 'Aliases are not inherited by child shells; each interactive shell reads ~/.bashrc.' },
    { q: 'Inside a function, which variable holds the number of arguments passed to it?', fill: ['$#', '#'], e: '{{$1}}… are the arguments, {{$@}} all of them.' },
    { q: 'Which command removes the alias {{ll}}?', fill: ['unalias ll'], e: '{{unalias -a}} removes all.' },
    { q: 'Why should {{.}} (the current directory) not be part of root\'s PATH?', o: ['It slows down command lookup.', 'An attacker could place a malicious program named like a common command in a directory root visits.', 'bash does not support it.', 'It disables tab completion.'], a: 1, e: 'Use {{./program}} explicitly instead.' },
    { q: 'On Debian, which file holds system-wide settings for interactive bash shells (aliases, prompt)?', fill: ['/etc/bash.bashrc'], e: 'RHEL uses /etc/bashrc.' },
    { q: 'Which escape sequence in PS1 displays the current working directory?', o: ['{{\\u}}', '{{\\h}}', '{{\\w}}', '{{\\d}}'], a: 2, e: '\\u user, \\h host, \\w working directory, \\W its last component.' },
  ],
});

LPIC.add({
  id: '105.2',
  title: 'Customize or write simple scripts',
  weight: 4,
  desc: 'Candidates should be able to customize existing scripts, or write simple new Bash scripts.',
  knowledge: [
    'Use standard sh syntax (loops, tests).',
    'Use command substitution.',
    'Test return values for success or failure or other information provided by a command.',
    'Execute chained commands.',
    'Perform conditional mailing to the superuser.',
    'Correctly select the script interpreter through the shebang (#!) line.',
    'Manage the location, ownership, execution and suid-rights of scripts.',
  ],
  terms: ['for', 'while', 'test', 'if', 'read', 'seq', 'exec', '||', '&&'],
  wiki: String.raw`
## A first script
~~~file
#!/bin/bash
# hello.sh — greet the user
NAME=$\{1:-World}
echo "Hello, $NAME!"
echo "You are $(whoami) on $(hostname), today is $(date +%A)."
~~~

~~~console
$ cat scripts/hello.sh
$ chmod +x scripts/hello.sh
$ ./scripts/hello.sh Alice
$ bash scripts/hello.sh Bob
$ bash -x scripts/hello.sh
$ bash -n scripts/hello.sh
~~~

- **Shebang** {{#!}} in the first line selects the **interpreter**: {{#!/bin/bash}}, {{#!/bin/sh}} (POSIX shell — dash on Debian, no bash features!), {{#!/usr/bin/env python3}} (search PATH), {{#!/usr/bin/perl}}. Without it the script runs in the current shell type.
- Run it with **execute permission** ({{chmod +x}}, {{./script}} or via PATH) or by naming the interpreter ({{bash script}} — then only read permission is needed).
- {{bash -x}} traces every command (same as {{set -x}} in the script), {{bash -n}} only checks the syntax, {{set -e}} exits on the first error, {{set -u}} fails on unset variables.

## Variables, arguments, command substitution
~~~file
#!/bin/bash
echo "Script: $0, first argument: $1, all: $@, count: $#"
TODAY=$(date +%F)
FILES=$(ls /etc | wc -l)
echo "On $TODAY /etc contains $FILES entries"
LOG=/tmp/script-$$.log      # $$ = PID of the script
shift                       # drop $1, $2 becomes $1
echo "remaining: $@"
~~~

| Variable | Meaning |
|---|---|
| {{$0}} | script name |
| {{$1}} … {{$9}}, {{$\{10}}} | positional parameters |
| {{$#}} | number of arguments |
| {{$@}} / {{$*}} | all arguments ({{"$@"}} keeps them separate — use this) |
| {{$?}} | exit status of the last command |
| {{$$}} / {{$!}} | PID of the shell / of the last background job |

Command substitution: {{$(command)}} or {{\`command\`}}. Arithmetic: {{$((a + b * 2))}}, {{let i++}}, {{expr 3 + 4}} (old).

## Exit status, test and [ ]
Every command returns 0 (true/success) or 1–255 (false/error). {{exit N}} ends a script with status N.

{{test EXPR}} or {{[ EXPR ]}} (spaces are mandatory!) evaluates conditions:

| Files | Strings | Integers |
|---|---|---|
| {{-e}} exists | {{-z s}} empty | {{-eq}} equal |
| {{-f}} regular file | {{-n s}} not empty | {{-ne}} not equal |
| {{-d}} directory | {{s1 = s2}} equal | {{-lt}} {{-le}} less (or equal) |
| {{-L}} / {{-h}} symlink | {{s1 != s2}} differ | {{-gt}} {{-ge}} greater (or equal) |
| {{-r -w -x}} permissions | | |
| {{-s}} size > 0 | | |
| {{f1 -nt f2}} newer than | | |

Combine with {{!}} (not), {{-a}} (and), {{-o}} (or) — or with the shell operators {{&&}} and {{||}} between several {{[ ]}}. bash's {{[[ … ]]}} adds {{&&}}, {{||}}, pattern matching ({{==}} with globs) and regexes ({{=~}}).

~~~console
$ test -f /etc/passwd && echo "is a file"
$ [ -d /etc ] && echo "is a directory"
$ [ "$USER" = "student" ] && echo "hi student"
$ [ 5 -gt 3 ]; echo $?
$ [ -z "" ] && echo empty
$ [[ $HOME == /home/* ]] && echo "normal user"
~~~

## Chained commands
{{cmd1 && cmd2}} runs cmd2 only on success, {{cmd1 || cmd2}} only on failure; combine: {{cmd && echo ok || echo failed}}.

~~~console
$ mkdir -p /tmp/work && cd /tmp/work && echo ready
$ grep -q root /etc/passwd || echo "no root?!"
$ ping -c1 -W1 fileserver > /dev/null && echo up || echo down
~~~

## if / elif / else
~~~file
#!/bin/bash
if [ $# -ne 1 ]; then
    echo "usage: $0 FILE" >&2
    exit 1
fi

if [ -d "$1" ]; then
    echo "$1 is a directory"
elif [ -f "$1" ]; then
    echo "$1 is a file with $(wc -l < "$1") lines"
else
    echo "$1 does not exist"
fi

if grep -q "^$USER:" /etc/passwd; then     # any command can be the condition
    echo "you are in /etc/passwd"
fi
~~~

## case
~~~file
case "$1" in
    start|begin)  echo "starting";;
    stop)         echo "stopping";;
    [0-9]*)       echo "a number";;
    *)            echo "usage: $0 {start|stop}"; exit 1;;
esac
~~~

## Loops: for, while, until
~~~file
#!/bin/bash
for f in /etc/*.conf; do
    echo "config file: $f"
done

for n in 1 2 3; do echo "n=$n"; done

for i in $(seq 1 5); do echo "i=$i"; done       # seq FIRST [STEP] LAST
for i in {1..10..2}; do echo "$i"; done          # brace expansion (bash)
for ((i=0; i<3; i++)); do echo "C style $i"; done

count=1
while [ $count -le 3 ]; do
    echo "while: $count"
    count=$((count + 1))
done

until [ $count -eq 0 ]; do count=$((count - 1)); done

while read -r name ip role; do                   # read a file line by line
    [ "$\{name:0:1}" = "#" ] && continue
    echo "$name has IP $ip"
done < /home/student/data/servers.txt
~~~

{{break}} leaves a loop, {{continue}} jumps to the next iteration.

~~~console
$ for u in root student nobody; do id -u $u; done
$ seq 3
$ seq 0 5 20
$ seq -w 8 10
$ while read line; do echo "> $line"; done < fruits.txt | head -3
~~~

## read — user input
~~~console
$ read -p "Your name: " NAME; echo "Hi $NAME"
$ echo "a b c" | { read x y z; echo "$y"; }
$ read -r LINE < /etc/hostname; echo "$LINE"
~~~

{{read [-p prompt] [-s silent] [-t timeout] [-r raw] VAR…}} splits the line into words ({{$IFS}}); the last variable gets the rest; default variable {{REPLY}}.

## exec
{{exec COMMAND}} **replaces** the shell process with the command (no return, the PID stays) — used in wrapper scripts ({{exec /usr/bin/real-program "$@"}}). {{exec > logfile 2>&1}} without a command redirects all further output of the script.

## Mailing the superuser conditionally
~~~file
#!/bin/bash
# disk-check.sh — run from cron, mail root if a filesystem is too full
LIMIT=90
USAGE=$(df / --output=pcent | tail -1 | tr -dc '0-9')
if [ "$USAGE" -gt "$LIMIT" ]; then
    echo "Root filesystem is $\{USAGE}% full on $(hostname)" | mail -s "Disk warning" root
fi
~~~

~~~console
$ df / | tail -1 | grep -q '9[0-9]%' && echo "full" | mail -s "disk" root
$ /usr/local/bin/backup.sh || mail -s "Backup FAILED on $(hostname)" root < /var/log/backup.log
$ mail
~~~

cron also mails the output of jobs to the owner automatically ({{MAILTO=}} in the crontab).

## Location, ownership, permissions of scripts
- personal scripts: {{~/bin}}; system-wide: **{{/usr/local/bin}}** (or {{/usr/local/sbin}} for admin tools); never in {{/tmp}}
- owner root, mode **755** (or 750 + group) — writable only by the owner; a world-writable script run by root is a security hole
- **SUID on scripts is ignored by Linux** (race conditions with the interpreter); use {{sudo}} rules instead
- a script needs **read** (the interpreter reads it) **and execute** permission to be run directly
`,
  quiz: [
    { q: 'Which first line makes a script run with bash?', fill: ['#!/bin/bash', '#!/usr/bin/bash', '#!/usr/bin/env bash'], e: 'The shebang selects the interpreter.' },
    { q: 'Which variable contains the number of arguments passed to a script?', fill: ['$#', '#'], e: '{{$@}} contains the arguments themselves.' },
    { q: 'Which test checks whether {{/etc/hosts}} is a regular file?', o: ['{{[ -e /etc/hosts ]}}', '{{[ -f /etc/hosts ]}}', '{{[ -r /etc/hosts ]}}', '{{[ -d /etc/hosts ]}}'], a: 1, e: '{{-e}} only checks existence (any type).' },
    { q: 'Which operator compares two **integers** for equality in {{test}}?', o: ['{{=}}', '{{==}}', '{{-eq}}', '{{-is}}'], a: 2, e: '{{=}} compares strings.' },
    { q: 'What is wrong with {{if [$x -gt 5]; then echo big; fi}}?', o: ['nothing', 'spaces are missing after {{[}} and before {{]}}', '-gt is not valid', 'fi must be done'], a: 1, e: '{{[}} is a command; it needs spaces: {{[ $x -gt 5 ]}}.' },
    { q: 'Which command prints the numbers 1 to 10, one per line?', fill: ['seq 10', 'seq 1 10'], e: '{{seq FIRST INCREMENT LAST}}' },
    { q: 'Which keyword ends a {{case}} statement?', fill: ['esac'], e: 'if…fi, case…esac, for/while…do…done.' },
    { q: 'Which command reads a line from standard input into the variable {{ANSWER}}?', fill: ['read ANSWER'], e: '{{read -p "prompt: " ANSWER}} shows a prompt.' },
    { q: 'What does {{exec ./other.sh}} do inside a script?', o: ['runs other.sh in a subshell and returns', 'replaces the current shell process with other.sh', 'runs other.sh in the background', 'executes other.sh as root'], a: 1, e: 'Commands after exec are never reached.' },
    { q: 'Which line sends an e-mail to root only if {{backup.sh}} fails?', o: ['{{backup.sh && mail -s fail root}}', '{{backup.sh || echo failed | mail -s fail root}}', '{{backup.sh ; mail -s fail root}}', '{{backup.sh | mail root}}'], a: 1, e: '{{||}} runs the right side only on a non-zero exit status.' },
    { q: 'A script is owned by root and has the SUID bit set. With which privileges does it run when a normal user executes it on Linux?', o: ['root', 'the user\'s own privileges, because Linux ignores SUID on scripts', 'the group root', 'it cannot be executed'], a: 1, e: 'Use sudo rules for privileged scripts.' },
    { q: 'What is the exit status of a successful command?', fill: ['0'], e: 'Non-zero values (1–255) indicate errors.' },
    { q: 'Which construct runs a loop as long as a condition is **false**?', o: ['{{while}}', '{{until}}', '{{for}}', '{{unless}}'], a: 1, e: '{{until cond; do …; done}}' },
    { q: 'Which option makes bash print each command before executing it (debugging)?', fill: ['-x', 'bash -x', 'set -x'], e: '{{bash -n}} checks syntax only.' },
    { q: 'Where should a self-written administration script be placed so that all users can run it and the package manager does not overwrite it?', o: ['{{/usr/bin}}', '{{/usr/local/bin}}', '{{/tmp}}', '{{/etc/init.d}}'], a: 1, e: '{{/usr/bin}} belongs to the distribution packages.' },
    { q: 'Which of the following loops print the numbers 1 2 3? (Choose two.)', o: ['{{for i in 1 2 3; do echo $i; done}}', '{{for i in $(seq 3); do echo $i; done}}', '{{for i in seq 3; do echo $i; done}}', '{{while i < 3; do echo $i; done}}'], a: [0, 1], e: 'Without command substitution, "seq" and "3" are just words.' },
  ],
});
