var spawn = require('child_process').spawn

var open = require('pty.js').open


var pty = open()

pty.on('data', function(data)
{
  console.log('data:',data)
})

spawn('ls', [], {stdio: [process.stdin, pty.slave]})
