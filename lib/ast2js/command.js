var Domain   = require('domain').Domain
var Readable = require('stream').Readable

var flatten = require('array-flatten')
var map     = require('async').map

var ast2js      = require('./index')
var redirects   = require('./_redirects')
var spawnStream = require('./_spawnStream')

var builtins = require('../builtins')


function noop(){}

function wrapStdio(command, argv, options)
{
  var stdio = options.stdio

  var stdin  = stdio[0]
  var stdout = stdio[1]
  var stderr = stdio[2]

  if(stdin  == null) stdin  = 'pipe'
  if(stdout == null) stdout = 'pipe'
  if(stderr == null) stderr = 'pipe'


  // Create a `stderr` stream for `error` events if none is defined
  if(stderr === 'pipe')
  {
    stderr = new Readable({objectMode: true})
    stderr._read = noop
  }

  // Put `error` events on the `stderr` stream
  var d = new Domain()
  .on('error', stderr.push.bind(stderr))
  // [ToDo] Close `stderr` when command finish

  // Run the builtin command
  d.run(function()
  {
    command = command.call(options.env, argv)
  })

  if(typeof stdin  !== 'string') stdin.pipe(command)
  if(typeof stdout !== 'string') command.pipe(stdout)


  stdin  = stdin  === 'pipe'
  stdout = stdout === 'pipe'

  if(stdin && !stdout) command.on('finish', command.emit.bind(command, 'end'))

  if(stderr)
  {
    // Expose `stderr` so it can be used later.
    command.stderr = stderr

    // Redirect `stderr` from piped command to our own `stderr`, since there's
    // no way to redirect it to `process.stderr` by default as it should be.
    // This way we can at least fetch the error messages someway instead of
    // lost them...
    var out_stderr = stdout && stdout.stderr
    if(out_stderr) out_stderr.pipe(stderr)
  }

  command.once('end', command.emit.bind(command, 'exit', 0, null))

  return command
}


function command(item, callback)
{
  // Command
  ast2js(item.command, function(error, command)
  {
    if(error) return callback(error)

    // Arguments
    map(item.args, ast2js, function(error, argv)
    {
      if(error) return callback(error)

      // Globs return an array, flat it
      argv = flatten(argv)

      // Redirects
      redirects(item.stdio, item.redirects, function(error, stdio)
      {
        if(error) return callback(error)

        // Create command
        var env = item.env
        env.__proto__ = process.env

        var options =
        {
          env:   env,
          stdio: stdio
        }

        // Builtins
        var builtin = builtins[command]
        if(builtin) return callback(null, wrapStdio(builtin, argv, options))

        // External commands
        try
        {
          command = spawnStream(command, argv, options)
        }
        catch(error)
        {
          if(error.code === 'EACCES') error = command+': is a directory'

          return callback(error)
        }

        callback(null, command)
      })
    })
  })
}


module.exports = command
