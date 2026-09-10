# MadBoard

Interactive modern web interface for the [MadGraph7](https://github.com/MadGraphTeam/MadGraph7)
event generator.

## Installation

```bash
pip install madboard
```

## Usage

Start the server from your working directory:

```bash
madboard
```

MadBoard listens on `127.0.0.1:5000` (the next free port is used if 5000 is taken) and
opens the interface in your browser. By default it looks for the MadGraph executable at
`bin/madgraph`; use `--madgraph` to point it elsewhere, and `--port` to choose a
different port:

```bash
madboard --madgraph /path/to/madgraph --port 8080
```

Without a MadGraph executable, MadBoard still runs, but process generation is
unavailable.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for building the React frontend and running from a
source checkout.
