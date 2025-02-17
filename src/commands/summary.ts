import chalk from 'chalk';
import {
  isGitRepo,
  getRepoName,
  getCommitCount,
  getBranches,
  getTags,
  getCurrentBranch,
  getFirstCommitDate,
  getLastCommitDate,
  getRepoAge,
  getTrackedFiles,
  getAuthorStats,
} from '../utils/git';
import { renderStats, sectionHeader, printBanner, formatNumber } from '../utils/format';

interface SummaryOptions {
  json?: boolean;
}

export async function summaryCommand(options: SummaryOptions): Promise<void> {
  if (!isGitRepo()) {
    throw new Error('Not a git repository. Use -d <path> to specify a repo.');
  }

  const repoName = getRepoName();
  const totalCommits = getCommitCount();
  const branches = getBranches();
  const tags = getTags();
  const currentBranch = getCurrentBranch();
  const firstCommit = getFirstCommitDate();
  const lastCommit = getLastCommitDate();
  const age = getRepoAge();
  const trackedFiles = getTrackedFiles();
  const authors = getAuthorStats();

  // File type breakdown
  const extCount = new Map<string, number>();
  for (const file of trackedFiles) {
    const ext = file.includes('.') ? '.' + file.split('.').pop()!.toLowerCase() : '(no ext)';
    extCount.set(ext, (extCount.get(ext) || 0) + 1);
  }
  const topExtensions = Array.from(extCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext} (${count})`)
    .join(', ');

  // Total lines added/deleted
  const totalAdditions = authors.reduce((sum, a) => sum + a.additions, 0);
  const totalDeletions = authors.reduce((sum, a) => sum + a.deletions, 0);

  if (options.json) {
    const data = {
      repository: repoName,
      currentBranch,
      totalCommits,
      totalBranches: branches.length,
      totalTags: tags.length,
      totalAuthors: authors.length,
      totalTrackedFiles: trackedFiles.length,
      totalAdditions,
      totalDeletions,
      firstCommit,
      lastCommit,
      age,
      topFileTypes: Object.fromEntries(extCount),
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  printBanner(repoName);

  sectionHeader('Repository Overview');
  renderStats([
    { label: 'Repository', value: repoName },
    { label: 'Current Branch', value: currentBranch },
    { label: 'Age', value: age },
    { label: 'First Commit', value: firstCommit },
    { label: 'Last Commit', value: lastCommit },
  ]);

  sectionHeader('Statistics');
  renderStats([
    { label: 'Total Commits', value: formatNumber(totalCommits) },
    { label: 'Branches', value: formatNumber(branches.length) },
    { label: 'Tags', value: formatNumber(tags.length) },
    { label: 'Contributors', value: formatNumber(authors.length) },
    { label: 'Tracked Files', value: formatNumber(trackedFiles.length) },
    { label: 'Lines Added', value: chalk.green(`+${formatNumber(totalAdditions)}`) },
    { label: 'Lines Deleted', value: chalk.red(`-${formatNumber(totalDeletions)}`) },
  ]);

  sectionHeader('Top File Types');
  renderStats([{ label: 'Types', value: topExtensions || 'None' }]);

  // Show top 3 contributors
  const topAuthors = authors
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 3);

  if (topAuthors.length > 0) {
    sectionHeader('Top Contributors');
    topAuthors.forEach((author, index) => {
      const medal = index === 0 ? chalk.yellow('1st') : index === 1 ? chalk.gray('2nd') : chalk.hex('#cd7f32')('3rd');
      console.log(`  ${medal}  ${chalk.white(author.name)} ${chalk.dim(`(${author.commits} commits)`)}`);
    });
  }

  console.log();
}
