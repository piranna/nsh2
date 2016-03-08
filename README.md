# nsh - Node SHell

[![Build for NodeOS](http://i.imgur.com/pIJu2TS.png)](http://nodeos.github.io)

`nsh` provide a basic POSIX compatible shell that will run without having `bash`
or another process tidy things up first.

The shell needs to be able to nest without mixing up who gets what keyboard input.
The shell should also be able to run interactive programs like *vim*.

Right now node doesn't support doing proper job control, although I have a pull-request into libuv about that.

- https://github.com/joyent/libuv/pull/934

Features are welcome, but may not be added until I'm sure the basics are stable.

## Features

* `bash` and POSIX `sh` compatible (or try to be so, pull-request welcome)
* Pure asynchronous
* No child processes (only for external commands), everything runs in the shell
  including conditionals, loops or command substitutions

## Anti-features

* Process substitution ([It's not POSIX](http://wiki.bash-hackers.org/syntax/expansion/proc_subst#bugs_and_portability_considerations),
  but maybe it could be added in the future by using the
  [mkfifo](https://github.com/avz/node-mkfifo) module)

## Bugs

* Exit status for builtins
* Meta-characters on prompt are not correctly handled (they need to be escaped)
* Interactive terminal not detected (It's needed a rewrite to set `stdout`
  before the commands)
* `>|` redirection crash (bug on shell-parse)
