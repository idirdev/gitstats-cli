import chalk from 'chalk';

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  color?: (value: string) => string;
}

/**
 * Render a formatted table to the console.
 * Automatically calculates column widths if not specified.
 */
export function renderTable(columns: TableColumn[], rows: Record<string, any>[]): void {
  if (rows.length === 0) {
    console.log(chalk.yellow('  No data to display.'));
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerLen = col.header.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = String(row[col.key] ?? '');
      return Math.max(max, val.length);
    }, 0);
    return col.width || Math.max(headerLen, maxDataLen) + 2;
  });

  // Render header
  const headerLine = columns
    .map((col, i) => padCell(chalk.bold(col.header), widths[i], col.align || 'left'))
    .join(chalk.dim(' | '));
  console.log(`  ${headerLine}`);

  // Separator
  const separator = widths.map((w) => chalk.dim('-'.repeat(w))).join(chalk.dim('-+-'));
  console.log(`  ${separator}`);

  // Render rows
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        let val = String(row[col.key] ?? '');
        if (col.color) val = col.color(val);
        return padCell(val, widths[i], col.align || 'left');
      })
      .join(chalk.dim(' | '));
    console.log(`  ${line}`);
  }
}

/** Pad a cell value to a given width with alignment */
function padCell(value: string, width: number, align: 'left' | 'right' | 'center'): string {
  // Strip ANSI for length calculation
  const stripped = value.replace(/\u001b\[[0-9;]*m/g, '');
  const diff = width - stripped.length;
  if (diff <= 0) return value;

  switch (align) {
    case 'right':
      return ' '.repeat(diff) + value;
    case 'center': {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + value + ' '.repeat(right);
    }
    default:
      return value + ' '.repeat(diff);
  }
}

/**
 * Render a horizontal bar chart in the terminal.
 * Each entry has a label, a value, and an optional color.
 */
export function renderBarChart(
  data: { label: string; value: number; color?: (str: string) => string }[],
  options: { maxBarWidth?: number; showValues?: boolean; title?: string } = {}
): void {
  const { maxBarWidth = 40, showValues = true, title } = options;

  if (data.length === 0) {
    console.log(chalk.yellow('  No data to display.'));
    return;
  }

  if (title) {
    console.log(`\n  ${chalk.bold(title)}`);
    console.log(`  ${chalk.dim('='.repeat(title.length))}\n`);
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  const maxValueLen = String(maxValue).length;

  for (const item of data) {
    const label = item.label.padEnd(maxLabelLen);
    const barLen = Math.round((item.value / maxValue) * maxBarWidth);
    const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(maxBarWidth - barLen);
    const colorFn = item.color || chalk.cyan;
    const valueStr = showValues ? chalk.dim(` ${String(item.value).padStart(maxValueLen)}`) : '';

    console.log(`  ${chalk.white(label)}  ${colorFn(bar)}${valueStr}`);
  }
}

/** Format a large number with commas: 1234567 -> "1,234,567" */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Render a key-value stats block */
export function renderStats(entries: { label: string; value: string | number }[]): void {
  const maxLabelLen = Math.max(...entries.map((e) => e.label.length));
  for (const entry of entries) {
    const label = chalk.dim(entry.label.padEnd(maxLabelLen + 2));
    const value = chalk.white(String(entry.value));
    console.log(`  ${label}${value}`);
  }
}

/** Print a section header */
export function sectionHeader(title: string): void {
  console.log();
  console.log(chalk.bold.underline(`  ${title}`));
  console.log();
}

/** Print a styled banner for the tool */
export function printBanner(repoName: string): void {
  console.log();
  console.log(chalk.bold.cyan('  GitStats') + chalk.dim(` - ${repoName}`));
  console.log(chalk.dim('  ' + '-'.repeat(40)));
}
