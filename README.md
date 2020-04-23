# gitstats-cli

> **[EN]** A CLI tool to extract and display statistics from any Git repository: commit count, contributors, activity, file breakdown, and repository age.
> **[FR]** Un outil CLI pour extraire et afficher des statistiques depuis n'importe quel dépôt Git : nombre de commits, contributeurs, activité, répartition des fichiers et âge du dépôt.

---

## Features / Fonctionnalités

**[EN]**
- Summary view: commits, contributors, files, age, first and last commit dates
- List all contributors sorted by commit count with emails
- Show commit activity grouped by day over a configurable number of past days
- Breakdown of tracked files by extension
- Compute repository age in days from first commit
- Works with any local Git repository

**[FR]**
- Vue synthétique : commits, contributeurs, fichiers, âge, dates du premier et dernier commit
- Lister tous les contributeurs triés par nombre de commits avec emails
- Afficher l'activité des commits par jour sur un nombre de jours configurable
- Répartition des fichiers suivis par extension
- Calculer l'âge du dépôt en jours depuis le premier commit
- Fonctionne avec n'importe quel dépôt Git local

---

## Installation

```bash
npm install -g @idirdev/gitstats-cli
```

---

## CLI Usage / Utilisation CLI

```bash
# Summary for current directory
# Résumé pour le répertoire courant
gitstats-cli

# Summary for a specific repo
# Résumé pour un dépôt spécifique
gitstats-cli /path/to/repo

# List contributors
# Lister les contributeurs
gitstats-cli /path/to/repo --contributors

# File breakdown by extension
# Répartition des fichiers par extension
gitstats-cli /path/to/repo --files

# Commit activity for the last 14 days
# Activité des commits sur les 14 derniers jours
gitstats-cli /path/to/repo --activity 14

# Show help / Afficher l'aide
gitstats-cli --help
```

### Example Output / Exemple de sortie

```
$ gitstats-cli /path/to/repo
Commits: 847
Contributors: 4
Files: 312
Age: 523 days
First: 2024-10-01 09:14:22 +0200
Last:  2026-03-15 18:42:11 +0100

$ gitstats-cli /path/to/repo --contributors
612  Alice Martin <alice@example.com>
180  Bob Dupont <bob@demo.net>
 42  Charlie Lee <charlie@sample.io>
 13  Diana Hall <diana@test.org>

$ gitstats-cli /path/to/repo --files
Files: 312
  .js: 124
  .ts: 87
  .json: 34
  .md: 28
  .css: 18
  (none): 21

$ gitstats-cli /path/to/repo --activity 7
2026-03-09: 3
2026-03-11: 7
2026-03-12: 2
2026-03-14: 5
2026-03-15: 4
```

---

## API (Programmatic) / API (Programmation)

**[EN]** Use gitstats-cli as a library to integrate Git analytics into your tooling.
**[FR]** Utilisez gitstats-cli comme bibliothèque pour intégrer l'analyse Git dans vos outils.

```javascript
const {
  getCommitCount,
  getContributors,
  getCommitsByDay,
  getFileStats,
  getFirstCommitDate,
  getLastCommitDate,
  getRepoAge,
  getSummary,
} = require('@idirdev/gitstats-cli');

const dir = '/path/to/repo';

// Full summary object
// Objet de résumé complet
const summary = getSummary(dir);
console.log(summary);
// { commits: 847, contributors: 4, files: 312, ageDays: 523,
//   firstCommit: '2024-10-01 09:14:22 +0200',
//   lastCommit:  '2026-03-15 18:42:11 +0100' }

// Individual stats
// Stats individuelles
console.log(getCommitCount(dir));     // 847
console.log(getRepoAge(dir));         // 523

const contributors = getContributors(dir);
// [{ commits: 612, name: 'Alice Martin', email: 'alice@example.com' }, ...]

const activity = getCommitsByDay(dir, 30);
// { '2026-03-15': 4, '2026-03-14': 5, ... }

const files = getFileStats(dir);
// { total: 312, byExtension: { '.js': 124, '.ts': 87, ... } }
```

### API Reference

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getSummary(dir?)` | repo path | `{commits, contributors, files, ageDays, firstCommit, lastCommit}` |
| `getCommitCount(dir?)` | repo path | `number` |
| `getContributors(dir?)` | repo path | `Array<{commits, name, email}>` |
| `getCommitsByDay(dir?, days?)` | repo path, days (def: 30) | `{[date]: count}` |
| `getFileStats(dir?)` | repo path | `{total, byExtension}` |
| `getRepoAge(dir?)` | repo path | `number` (days) |

---

## License

MIT - idirdev
