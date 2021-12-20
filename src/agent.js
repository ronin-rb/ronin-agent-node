#!/usr/bin/env node

var Util    = require('util');
var FS      = require('fs');
var Process = require('child_process');
var Main    = this;

var Agent = {
  /* fs functions */
  fs: {
    _block_size: (1024 * 512),

    open: FS.openSync,
    read: function(fd,position) {
      var buffer = new Buffer();

      FS.readSync(fd,buffer,0,Agent.fs._block_size,position);
      return buffer;
    },
    write: function(fd,position,data) {
      var buffer = new Buffer(data);

      return FS.writeSync(fd,buffer,0,buffer.length,position);
    },
    close:  FS.closeSync,

    readlink: FS.readlinkSync,
    readdir: function(path) {
      var entries = FS.readdirSync();

      entries.unshift('.','..');
      return entries;
    },

    move:    FS.renameSync,
    unlink:  FS.unlinkSync,
    rmdir:   FS.rmdirSync,
    mkdir:   FS.mkdirSync,
    chmod:   FS.chmodSync,
    stat:    FS.statSync,
    link:    FS.symlinkSync
  },

  /* process functions */
  process: {
    getpid: function() { return process.pid; },
    getcwd: process.cwd,
    chdir:  process.chdir,
    getuid: process.getuid,
    setuid: process.setuid,
    getgid: process.getgid,
    setgid: process.setgid,
    getenv: function(name)       { return process.env[name];         },
    setenv: function(name,value) { return process.env[name] = value; },
    unsetenv: function(name) {
      var value = process.env[name];

      delete process.env[name];
      return value
    },
    time: function() { return new Date().getTime(); },
    kill: process.kill,
    exit: process.exit
  },

  /* shell functions */
  shell: {
    _commands: {},
    _command: function(pid) {
      var process = Agent.shell._commands[pid];

      if (process == undefined) {
        throw("unknown command PID: " + pid);
      }

      return process;
    },

    exec: function() {
      process = Process.exec(arguments.join(' '));

      Agent.shell._commands[process.pid] = process;
      return process.pid;
    },
    read: function(pid) {
      var process = Agent.shell._command(pid);

      process.stdin.resume();
    },
    write: function(pid,data) {
      var process = Agent.shell._command(pid);

      process.stdout.write(data);
      return data.length;
    },
    close: function(pid) {
      var process = Agent.shell._command(pid);

      process.destroy();
      delete Agent.shell._commands[pid];
      return true;
    }
  },

  js: {
    eval:   function(code) { return eval(code); },
    define: function(name,args,code) {
      Agent.js[name] = eval("(function(" + args.join(',') + ") { " + code + "})");
      return true;
    }
  }
};

Agent.lookup = function(name) {
  var names = name.split('.');
  var scope = RPC;
  var index;

  for (index=0; index<names.length; index++) {
    scope = scope[names[index]];

    if (scope == undefined) { return; }
  }

  return scope;
}

Agent.call = function(name,args) {
  var func = Agent.lookup(name);

  if (func == undefined) {
    return {'exception': "unknown function: " + name};
  }

  try {
    return {'return': func.apply(this,args)};
  } catch(error) {
    return {'exception': error.toString()};
  }
}

Agent.Transport = function() {}
Agent.Transport.prototype.start    = function() {}
Agent.Transport.prototype.stop     = function() {}

Agent.Transport.prototype.return_message = function(data) {
  return {'return': data};
}

Agent.Transport.prototype.error_message = function(message) {
  return {'exception': message};
}

Agent.Transport.prototype.serialize = function(data) {
  return new Buffer(JSON.stringify(data)).toString('base64');
}

Agent.Transport.prototype.deserialize = function(data) {
  return JSON.parse(new Buffer(data,'base64'));
}

var HTTP = require('http');
var URL  = require('url');

Agent.HTTP = function(port,host) {
  this.port = parseInt(port);
  this.host = (host ? host : '0.0.0.0');
}

Agent.HTTP.start       = function(port,host) {
  var server = new Agent.HTTP(port,host);

  server.start(function() {
    console.log("[HTTP] Listening on " + server.host + ":" + server.port);
  });
}

Agent.HTTP.prototype = new Agent.Transport();

Agent.HTTP.prototype.start = function(callback) {
  var self = this;

  this.server = HTTP.createServer(function(request,response) {
    self.serve(request,response);
  });

  this.server.listen(this.port,this.host,callback);
}

Agent.HTTP.prototype.decode_request = function(request,callback) {
  var url     = URL.parse(request.url,true);
  var message = this.deserialize(url.query['_request']);

  callback(message['name'],message['arguments'] || []);
}

Agent.HTTP.prototype.encode_response = function(response,message) {
  response.write(this.serialize(message));
  response.end();
}

Agent.HTTP.prototype.serve = function(request,response) {
  var self = this;

  self.decode_request(request,function(name,args) {
    self.encode_response(response,Agent.call(name,args));
  });
}

Agent.HTTP.prototype.stop = function() { this.server.close(); }

var Net = require('net');

Agent.TCP = {
  decode_request: function(request,callback) {
    var message = this.deserialize(request.replace(/\0$/,''));

    callback(message['name'],message['arguments']);
  },

  encode_response: function(socket,message) {
    socket.write(this.serialize(message) + "\0");
  },

  serve: function(socket) {
    var self = this;
    var buffer = '';

    socket.on('data',function(stream) {
      var data        = stream.toString();
      var deliminator = data.lastIndexOf("\0");

      if (deliminator) {
        buffer += data.substr(0,deliminator);

        self.decode_request(buffer,function(name,args) {
          self.encode_response(socket,Agent.call(name,args));
        });

        buffer = data.substr(deliminator,data.length);
      }
      else { buffer.write(data); }
    });
  }
};

Agent.TCP.Server = function(port,host) {
  this.port = parseInt(port);
  this.host = (host ? host : '0.0.0.0');
}

Agent.TCP.Server.start = function(port,host) {
  var server = new Agent.TCP.Server(port,host);

  server.start(function() {
    console.log("[TCP] Listening on " + server.host + ":" + server.port);
  });
}

Agent.TCP.Server.prototype   = new Agent.Transport();
Agent.TCP.Server.prototype.decode_request  = Agent.TCP.decode_request;
Agent.TCP.Server.prototype.encode_response = Agent.TCP.encode_response;
Agent.TCP.Server.prototype.serve           = Agent.TCP.serve;

Agent.TCP.Server.prototype.start = function(callback) {
  var self = this;

  this.server = Net.createServer(function(client) {
    self.serve(client);
  });

  this.server.listen(this.port,this.host,callback);
}

Agent.TCP.Server.prototype.stop = function() { this.server.stop(); }

Agent.TCP.ConnectBack = function(host,port) {
  this.host = host;
  this.port = parseInt(port);
}

Agent.TCP.ConnectBack.start = function(host,port) {
  var client = new Agent.TCP.ConnectBack(host,port);

  client.start(function() {
    console.log("[TCP] Connected to " + client.host + ":" + client.port);
  });
}

Agent.TCP.ConnectBack.prototype = new Agent.Transport();
Agent.TCP.ConnectBack.prototype.decode_request  = Agent.TCP.decode_request;
Agent.TCP.ConnectBack.prototype.encode_response = Agent.TCP.encode_response;
Agent.TCP.ConnectBack.prototype.serve           = Agent.TCP.serve;

Agent.TCP.ConnectBack.prototype.start = function(callback) {
  this.connection = Net.createConnection(this.port,this.host,callback);

  this.serve(this.connection);
}

Agent.TCP.ConnectBack.prototype.stop = function() { this.connection.end(); }

function usage() {
  var path = require('path');
  console.log("usage: node " + path.basename(__filename) + " {--http PORT [HOST] | --listen PORT [HOST] | --connect HOST PORT}");
  process.exit(-1);
}

if (process.argv.length < 4) { usage(); }

var option = process.argv[2];
var args   = process.argv.slice(3,process.argv.length);

if      (option == '--http')    { Agent.HTTP.start(args[0],args[1]); }
else if (option == '--listen')  { Agent.TCP.Server.start(args[0],args[1]); }
else if (option == '--connect') { Agent.TCP.ConnectBack.start(args[0],args[1]); }
else { usage(); }
