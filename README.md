# GitStats CLI

[![npm version](https://img.shields.io/npm/v/@idirdev/gitstats-cli.svg)](https://www.npmjs.com/package/@idirdev/gitstats-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

A powerful CLI tool to analyze Git repository statistics. Get instant insights into commits, contributors, activity patterns, and file change hotspots -- all from your terminal.

## Features

- **Repository Summary** -- Total commits, branches, tags, age, and top contributors at a glance
- **Author Analysis** -- Commits per author with additions/deletions, sorted and ranked
- **Activity Charts** -- Commit frequency over time with bar charts (day/week/month/year)
- **File Insights** -- Most changed files, file type distribution, and directory hotspots
- **JSON Output** -- Machine-readable output for scripting and integrations
- **Cross-repo** -- Analyze any repo by passing a path

## Installation

```bash
npm install -g @idirdev/gitstats-cli
```

Or run directly with npx:

```bash
npx @idirdev/gitstats-cli summary
```

## Usage

```bash
# High-level repository overview
gitstats summary

# Top 5 contributors sorted by commits
gitstats authors --top 5

# Weekly commit activity chart
gitstats activity --period week

# Most changed files and type distribution
gitstats files --types

# Analyze a different repository
gitstats -d /path/to/repo summary

# JSON output for scripting
gitstats summary --json
```

## Commands

### `gitstats summary`

Displays a high-level overview of the repository including total commits, branches, tags, contributors, tracked files, and top file types.

### `gitstats authors [options]`

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --top <number>` | Show top N authors | 10 |
| `--sort <field>` | Sort by: commits, additions, deletions | commits |
| `--since <date>` | Only count commits after this date | -- |
| `--json` | Output as JSON | false |

### `gitstats activity [options]`

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --period <period>` | Group by: day, week, month, year | month |
| `-n, --last <number>` | Show last N periods | 12 |
| `--since <date>` | Start date | -- |
| `--until <date>` | End date | -- |
| `--json` | Output as JSON | false |

### `gitstats files [options]`

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --top <number>` | Show top N most changed files | 15 |
| `--types` | Show file type distribution | false |
| `--since <date>` | Only count changes after this date | -- |
| `--json` | Output as JSON | false |

## Development

```bash
git clone https://github.com/idirdev/gitstats-cli.git
cd gitstats-cli
npm install
npm run dev -- summary
```

## License

MIT

---

## 🇫🇷 Documentation en français

### Description
GitStats CLI est un outil en ligne de commande puissant pour analyser les statistiques d'un dépôt Git. Obtenez instantanément des informations sur les commits, les contributeurs, les patterns d'activité et les fichiers les plus modifiés, directement depuis votre terminal.

### Installation
```bash
npm install -g @idirdev/gitstats-cli
```

Ou via npx :

```bash
npx @idirdev/gitstats-cli summary
```

### Utilisation
```bash
# Vue d'ensemble du dépôt
gitstats summary

# Top 5 des contributeurs
gitstats authors --top 5

# Activité hebdomadaire
gitstats activity --period week

# Fichiers les plus modifiés
gitstats files --types
```

Consultez la section **Commands** ci-dessus pour la référence complète des options de tri, filtrage et sortie JSON.
