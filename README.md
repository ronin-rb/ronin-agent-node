# ronin-agent-node

* [Source](https://github.com/ronin-rb/ronin-agent-node)
* [Issues](https://github.com/ronin-rb/ronin-agent-node/issues)
* [Discord](https://discord.gg/6WAb3PsVX9) |
  [Mastodon](https://infosec.exchange/@ronin_rb)

ronin-agent-node is a ronin agent written in [node.js].

ronin agents are programs that can be deployed to systems for defensive purposes
(ex: telemetry) or offensive purposes (ex: post-exploitation).

## Features

* Uses a JSON RPC protocol
* Supports TCP server, TCP connect back, and a HTTP server.
* Allows opening/reading/writing files, controlling processes, executing
  commands, opening TCP/UDP sockets, querying DNS, etc.
* Only uses modules in Node stdlib.

## Synopsis

```shell
$ node agent.js --help
usage: usage: node agent.js {--http PORT [HOST] | --listen PORT [HOST] | --connect HOST PORT}
```

## Development

1. [Fork It!](https://github.com/ronin-rb/ronin-agent-node/fork)
2. Clone It!
3. `cd ronin-agent-node`
4. `bundle install`
5. `git checkout -b my_feature`
6. Code It!
7. Test It!
8. `git push origin my_feature`

## License

ronin-agent-node - A ronin agent written in node.js.

Copyright (c) 2007-2021 Hal Brodigan (postmodern.mod3 at gmail.com)

ronin-agent-node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

ronin-agent-node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with ronin-agent-node.  If not, see <https://www.gnu.org/licenses/>.

[node.js]: https://nodejs.org/en/
