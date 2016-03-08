var ReadStream = require('tty').ReadStream

var dup        = require('src-unistd').dup
var eachSeries = require('async').eachSeries


module.exports = execCommands

var ast2js      = require('./index')
var environment = require('./_environment')


// Always calculate dynamic `$PATH` based on the original one
var npmPath = require('npm-path').bind(null, {env:{PATH:process.env.PATH}})

var input


function noop(){}

function setStatus(code, signal)
{
  environment.set('?' , code)
  environment.set('??', signal)
}

function restoreStdio(command, stdin, input)
{
  stdin.end()  // Flush buffered data so we don'l loose any character
//  stdin.push(null)
  stdin.unpipe(command)

//  input.setRawMode(false)
  input.resume()
}

function connectStdio(stdin, input, command, callback)
{
  command.on('error', function(error)
  {
    if(error.code !== 'ENOENT') throw error

    restoreStdio(this, stdin, input)

    callback(error.path+': not found')
  })
  .once('end', function()
  {
    restoreStdio(this, stdin, input)

    callback()
  })
  .once('exit', setStatus)
}


function execCommands(rl, commands, callback)
{
  input = rl.input || input

  eachSeries(commands, function(command, callback)
  {
    // `$PATH` is dynamic based on current directory and any command could
    // change it, so we update it previously to exec any of them
    npmPath()

    var stdin = ReadStream(input.fd)
    console.log(input, stdin)
//    input.setRawMode(true)
    input.pause()

    command.stdio = [stdin, rl.output, process.stderr]

    ast2js(command, function(error, command)
    {
      if(error) return callback(error)

      if(command == null) return callback()

      connectStdio(stdin, input, command, callback)
    })
  },
  callback)
}
