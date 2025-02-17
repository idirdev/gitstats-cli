import chalk from 'chalk';
import { isGitRepo, getRepoName, getCommitLog } from '../utils/git';
import { renderBarChart, sectionHeader, printBanner, formatNumber } from '../utils/format';

interface ActivityOptions {
  period?: 'day' | 'week' | 'month' | 'year';
  last?: string;
  since?: string;
  until?: string;
  json?: boolean;
}

/**
 * Group a date string into a bucket key based on the chosen period.
 */
function dateToKey(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'unknown';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week': {
      // ISO week: find the Monday of this week
      const d = new Date(date);
      const dayOfWeek = d.getDay() || 7; // Sunday = 7
      d.setDate(d.getDate() - dayOfWeek + 1);
      const wYear = d.getFullYear();
      const wMonth = String(d.getMonth() + 1).padStart(2, '0');
      const wDay = String(d.getDate()).padStart(2, '0');
      return `${wYear}-${wMonth}-${wDay}`;
    }
    case 'year':
      return String(year);
    case 'month':
    default:
      return `${year}-${month}`;
  }
}

/**
 * Format a key back into a human-readable label.
 */
function formatLabel(key: string, period: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (period) {
    case 'day':
      return key; // Already YYYY-MM-DD
    case 'week':
      return `Week of ${key}`;
    case 'year':
      return key;
    case 'month':
    default: {
      const [y, m] = key.split('-');
      const monthIndex = parseInt(m, 10) - 1;
      return `${months[monthIndex] || m} ${y}`;
    }
  }
}

/**
 * Pick a color for bar chart entries based on relative intensity.
 */
function intensityColor(value: number, max: number): (str: string) => string {
  const ratio = value / (max || 1);
  if (ratio >= 0.75) return chalk.green;
  if (ratio >= 0.5) return chalk.cyan;
  if (ratio >= 0.25) return chalk.blue;
  return chalk.dim;
}

export async function activityCommand(options: ActivityOptions): Promise<void> {
  if (!isGitRepo()) {
    throw new Error('Not a git repository. Use -d <path> to specify a repo.');
  }

  const period = options.period || 'month';
  const lastN = parseInt(options.last || '12', 10);
  const repoName = getRepoName();

  const commits = getCommitLog(options.since, options.until);

  if (commits.length === 0) {
    console.log(chalk.yellow('\n  No commits found for the specified range.\n'));
    return;
  }

  // Group commits by period
  const buckets = new Map<string, number>();
  for (const commit of commits) {
    const key = dateToKey(commit.date, period);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  // Sort chronologically and take last N
  const sortedEntries = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-lastN);

  if (options.json) {
    const data = sortedEntries.map(([key, count]) => ({
      period: key,
      label: formatLabel(key, period),
      commits: count,
    }));
    console.log(JSON.stringify({
      groupBy: period,
      totalCommits: commits.length,
      periods: data,
    }, null, 2));
    return;
  }

  printBanner(repoName);
  sectionHeader(`Commit Activity (by ${period}, last ${lastN} periods)`);

  const maxVal = Math.max(...sortedEntries.map(([, v]) => v));
  const totalInRange = sortedEntries.reduce((sum, [, v]) => sum + v, 0);
  const avgPerPeriod = Math.round(totalInRange / sortedEntries.length);

  console.log(chalk.dim(`  Total: ${formatNumber(totalInRange)} commits | Average: ${formatNumber(avgPerPeriod)} per ${period}\n`));

  const chartData = sortedEntries.map(([key, count]) => ({
    label: formatLabel(key, period),
    value: count,
    color: intensityColor(count, maxVal),
  }));

  renderBarChart(chartData, {
    maxBarWidth: 35,
    showValues: true,
  });

  // Show day-of-week distribution as a bonus
  if (period !== 'day') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayBuckets = new Array(7).fill(0);
    for (const commit of commits) {
      const d = new Date(commit.date);
      if (!isNaN(d.getTime())) {
        dayBuckets[d.getDay()]++;
      }
    }

    sectionHeader('Day of Week Distribution');
    const dayData = dayNames.map((name, i) => ({
      label: name,
      value: dayBuckets[i],
      color: i === 0 || i === 6 ? chalk.yellow : chalk.cyan,
    }));
    renderBarChart(dayData, { maxBarWidth: 30, showValues: true });
  }

  // Hour distribution
  const hourBuckets = new Array(24).fill(0);
  for (const commit of commits) {
    const d = new Date(commit.date);
    if (!isNaN(d.getTime())) {
      hourBuckets[d.getHours()]++;
    }
  }

  sectionHeader('Hour Distribution');
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const quietHour = hourBuckets.indexOf(Math.min(...hourBuckets));
  console.log(chalk.dim(`  Peak hour: ${peakHour}:00 | Quietest: ${quietHour}:00\n`));

  // Show compressed hour chart (group into 4-hour blocks)
  const hourBlocks = [
    { label: '00-03', value: hourBuckets.slice(0, 4).reduce((a: number, b: number) => a + b, 0) },
    { label: '04-07', value: hourBuckets.slice(4, 8).reduce((a: number, b: number) => a + b, 0) },
    { label: '08-11', value: hourBuckets.slice(8, 12).reduce((a: number, b: number) => a + b, 0) },
    { label: '12-15', value: hourBuckets.slice(12, 16).reduce((a: number, b: number) => a + b, 0) },
    { label: '16-19', value: hourBuckets.slice(16, 20).reduce((a: number, b: number) => a + b, 0) },
    { label: '20-23', value: hourBuckets.slice(20, 24).reduce((a: number, b: number) => a + b, 0) },
  ].map((block) => ({ ...block, color: chalk.magenta }));

  renderBarChart(hourBlocks, { maxBarWidth: 30, showValues: true });

  console.log();
}
