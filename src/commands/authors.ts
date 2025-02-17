import chalk from 'chalk';
import { isGitRepo, getRepoName, getAuthorStats, AuthorStats } from '../utils/git';
import { renderTable, TableColumn, sectionHeader, printBanner, formatNumber } from '../utils/format';

interface AuthorsOptions {
  top?: string;
  sort?: 'commits' | 'additions' | 'deletions';
  since?: string;
  json?: boolean;
}

export async function authorsCommand(options: AuthorsOptions): Promise<void> {
  if (!isGitRepo()) {
    throw new Error('Not a git repository. Use -d <path> to specify a repo.');
  }

  const topN = parseInt(options.top || '10', 10);
  const sortField = options.sort || 'commits';
  const repoName = getRepoName();
  const allAuthors = getAuthorStats(options.since);

  if (allAuthors.length === 0) {
    console.log(chalk.yellow('\n  No commits found in this repository.\n'));
    return;
  }

  // Sort authors
  const sorted = allAuthors.sort((a, b) => {
    switch (sortField) {
      case 'additions':
        return b.additions - a.additions;
      case 'deletions':
        return b.deletions - a.deletions;
      default:
        return b.commits - a.commits;
    }
  });

  const topAuthors = sorted.slice(0, topN);
  const totalCommits = allAuthors.reduce((sum, a) => sum + a.commits, 0);

  if (options.json) {
    console.log(JSON.stringify({
      totalAuthors: allAuthors.length,
      totalCommits,
      authors: topAuthors.map((a) => ({
        name: a.name,
        email: a.email,
        commits: a.commits,
        additions: a.additions,
        deletions: a.deletions,
        percentage: ((a.commits / totalCommits) * 100).toFixed(1),
        firstCommit: a.firstCommit,
        lastCommit: a.lastCommit,
      })),
    }, null, 2));
    return;
  }

  printBanner(repoName);
  sectionHeader(`Top ${topN} Authors (sorted by ${sortField})`);

  console.log(chalk.dim(`  Total: ${allAuthors.length} contributors, ${formatNumber(totalCommits)} commits\n`));

  const columns: TableColumn[] = [
    { header: '#', key: 'rank', width: 4, align: 'right' },
    { header: 'Author', key: 'name', width: 25 },
    {
      header: 'Commits',
      key: 'commits',
      width: 10,
      align: 'right',
      color: (v: string) => chalk.cyan(v),
    },
    {
      header: '%',
      key: 'percentage',
      width: 8,
      align: 'right',
      color: (v: string) => chalk.dim(v),
    },
    {
      header: 'Additions',
      key: 'additions',
      width: 12,
      align: 'right',
      color: (v: string) => chalk.green(v),
    },
    {
      header: 'Deletions',
      key: 'deletions',
      width: 12,
      align: 'right',
      color: (v: string) => chalk.red(v),
    },
    { header: 'Bar', key: 'bar', width: 22 },
  ];

  const maxCommits = topAuthors[0]?.commits || 1;
  const rows = topAuthors.map((author, index) => {
    const barLen = Math.round((author.commits / maxCommits) * 20);
    const bar = chalk.cyan('\u2588'.repeat(barLen)) + chalk.dim('\u2591'.repeat(20 - barLen));
    const pct = ((author.commits / totalCommits) * 100).toFixed(1) + '%';

    return {
      rank: String(index + 1),
      name: author.name,
      commits: formatNumber(author.commits),
      percentage: pct,
      additions: '+' + formatNumber(author.additions),
      deletions: '-' + formatNumber(author.deletions),
      bar,
    };
  });

  renderTable(columns, rows);

  // Show summary of remaining authors if truncated
  if (allAuthors.length > topN) {
    const remaining = allAuthors.length - topN;
    const remainingCommits = sorted.slice(topN).reduce((sum, a) => sum + a.commits, 0);
    console.log();
    console.log(
      chalk.dim(`  ... and ${remaining} more contributor${remaining > 1 ? 's' : ''} with ${formatNumber(remainingCommits)} commits`)
    );
  }

  console.log();
}
