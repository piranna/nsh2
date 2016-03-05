var flatten = require('array-flatten')
var map     = require('async').map

var ast2js      = require('./index')
var redirects   = require('./_redirects')
var spawnStream = require('./_spawnStream')
var wrapStdio   = require('./_command')

var builtins = require('../builtins')


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
