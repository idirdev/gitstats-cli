import chalk from 'chalk';
import path from 'path';
import {
  isGitRepo,
  getRepoName,
  getFileChangeFrequency,
  getTrackedFiles,
} from '../utils/git';
import {
  renderTable,
  renderBarChart,
  TableColumn,
  sectionHeader,
  printBanner,
  formatNumber,
} from '../utils/format';

interface FilesOptions {
  top?: string;
  types?: boolean;
  since?: string;
  json?: boolean;
}

/** Extract the file extension, normalized to lowercase */
function getExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext || '(no ext)';
}

/** Map common extensions to language/type names */
function extensionToLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (JSX)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (JSX)',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++ Header',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'Less',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    '.md': 'Markdown',
    '.txt': 'Text',
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.sql': 'SQL',
    '.graphql': 'GraphQL',
    '.proto': 'Protobuf',
    '.dockerfile': 'Dockerfile',
    '.lock': 'Lock file',
    '(no ext)': 'Other',
  };
  return map[ext] || ext.replace('.', '').toUpperCase();
}

/** Assign a color to a file type for the bar chart */
function typeColor(ext: string): (str: string) => string {
  const colors: Record<string, (str: string) => string> = {
    '.ts': chalk.blue,
    '.tsx': chalk.blue,
    '.js': chalk.yellow,
    '.jsx': chalk.yellow,
    '.py': chalk.green,
    '.rs': chalk.red,
    '.go': chalk.cyan,
    '.css': chalk.magenta,
    '.scss': chalk.magenta,
    '.html': chalk.red,
    '.json': chalk.gray,
    '.md': chalk.white,
  };
  return colors[ext] || chalk.cyan;
}

export async function filesCommand(options: FilesOptions): Promise<void> {
  if (!isGitRepo()) {
    throw new Error('Not a git repository. Use -d <path> to specify a repo.');
  }

  const topN = parseInt(options.top || '15', 10);
  const repoName = getRepoName();

  // Get change frequency
  const changeFreq = getFileChangeFrequency(options.since);
  const trackedFiles = getTrackedFiles();

  if (options.json) {
    const sortedFiles = Array.from(changeFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    const typeDistribution: Record<string, number> = {};
    for (const file of trackedFiles) {
      const ext = getExtension(file);
      typeDistribution[ext] = (typeDistribution[ext] || 0) + 1;
    }

    console.log(JSON.stringify({
      totalTrackedFiles: trackedFiles.length,
      mostChangedFiles: sortedFiles.map(([file, changes]) => ({ file, changes })),
      typeDistribution,
    }, null, 2));
    return;
  }

  printBanner(repoName);

  // ---- Most Changed Files ----
  sectionHeader(`Top ${topN} Most Changed Files`);

  const sortedFiles = Array.from(changeFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  if (sortedFiles.length === 0) {
    console.log(chalk.yellow('  No file change data available.\n'));
  } else {
    const columns: TableColumn[] = [
      { header: '#', key: 'rank', width: 4, align: 'right' },
      { header: 'File', key: 'file', width: 50 },
      {
        header: 'Changes',
        key: 'changes',
        width: 10,
        align: 'right',
        color: (v: string) => chalk.cyan(v),
      },
      { header: 'Bar', key: 'bar', width: 22 },
    ];

    const maxChanges = sortedFiles[0]?.[1] || 1;
    const rows = sortedFiles.map(([file, changes], index) => {
      const barLen = Math.round((changes / maxChanges) * 20);
      const bar = chalk.cyan('\u2588'.repeat(barLen)) + chalk.dim('\u2591'.repeat(20 - barLen));
      // Truncate long file paths
      const displayFile = file.length > 48 ? '...' + file.slice(-45) : file;
      return {
        rank: String(index + 1),
        file: displayFile,
        changes: formatNumber(changes),
        bar,
      };
    });

    renderTable(columns, rows);
  }

  // ---- File Type Distribution ----
  if (options.types || true) {
    sectionHeader('File Type Distribution');

    const typeMap = new Map<string, number>();
    for (const file of trackedFiles) {
      const ext = getExtension(file);
      typeMap.set(ext, (typeMap.get(ext) || 0) + 1);
    }

    const sortedTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const totalFiles = trackedFiles.length;
    console.log(chalk.dim(`  Total tracked files: ${formatNumber(totalFiles)}\n`));

    // Show top types as bar chart
    const chartData = sortedTypes.slice(0, 12).map(([ext, count]) => ({
      label: `${extensionToLanguage(ext).padEnd(18)} (${count})`,
      value: count,
      color: typeColor(ext),
    }));

    renderBarChart(chartData, { maxBarWidth: 30, showValues: false });

    // Show percentage table for top types
    console.log();
    const typeTableColumns: TableColumn[] = [
      { header: 'Type', key: 'type', width: 20 },
      {
        header: 'Files',
        key: 'count',
        width: 8,
        align: 'right',
        color: (v: string) => chalk.white(v),
      },
      {
        header: '%',
        key: 'percentage',
        width: 8,
        align: 'right',
        color: (v: string) => chalk.dim(v),
      },
    ];

    const typeRows = sortedTypes.slice(0, 10).map(([ext, count]) => ({
      type: extensionToLanguage(ext),
      count: formatNumber(count),
      percentage: ((count / totalFiles) * 100).toFixed(1) + '%',
    }));

    renderTable(typeTableColumns, typeRows);

    // Show remaining count
    if (sortedTypes.length > 10) {
      const remaining = sortedTypes.slice(10);
      const remainingCount = remaining.reduce((sum, [, c]) => sum + c, 0);
      console.log(chalk.dim(`\n  ... and ${remaining.length} more types with ${formatNumber(remainingCount)} files`));
    }
  }

  // ---- Directory hotspots ----
  sectionHeader('Directory Hotspots');
  const dirMap = new Map<string, number>();
  for (const [file, changes] of changeFreq.entries()) {
    const dir = path.dirname(file);
    dirMap.set(dir, (dirMap.get(dir) || 0) + changes);
  }

  const topDirs = Array.from(dirMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (topDirs.length > 0) {
    const dirChartData = topDirs.map(([dir, changes]) => ({
      label: (dir.length > 30 ? '...' + dir.slice(-27) : dir).padEnd(30),
      value: changes,
      color: chalk.yellow,
    }));

    renderBarChart(dirChartData, { maxBarWidth: 25, showValues: true });
  }

  console.log();
}
