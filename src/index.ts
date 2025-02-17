#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { summaryCommand } from './commands/summary';
import { authorsCommand } from './commands/authors';
import { activityCommand } from './commands/activity';
import { filesCommand } from './commands/files';

const program = new Command();

program
  .name('gitstats')
  .description(chalk.bold('Git repository statistics analyzer'))
  .version('1.0.0', '-v, --version', 'Display the current version')
  .option('-d, --directory <path>', 'Path to the git repository', '.')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.directory) {
      process.chdir(opts.directory);
    }
  });

program
  .command('summary')
  .description('Show a high-level summary of the repository')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await summaryCommand(options);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('authors')
  .description('Show commit statistics per author')
  .option('-n, --top <number>', 'Show top N authors', '10')
  .option('--sort <field>', 'Sort by: commits, additions, deletions', 'commits')
  .option('--since <date>', 'Only count commits after this date')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await authorsCommand(options);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('activity')
  .description('Show commit activity over time as a bar chart')
  .option('-p, --period <period>', 'Group by: day, week, month, year', 'month')
  .option('-n, --last <number>', 'Show last N periods', '12')
  .option('--since <date>', 'Start date for activity')
  .option('--until <date>', 'End date for activity')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await activityCommand(options);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('files')
  .description('Analyze file change frequency and type distribution')
  .option('-n, --top <number>', 'Show top N most changed files', '15')
  .option('--types', 'Show file type distribution breakdown')
  .option('--since <date>', 'Only count changes after this date')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await filesCommand(options);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.addHelpText('after', `
${chalk.dim('Examples:')}
  ${chalk.cyan('$ gitstats summary')}                     High-level repo overview
  ${chalk.cyan('$ gitstats authors --top 5')}              Top 5 contributors
  ${chalk.cyan('$ gitstats activity --period week')}       Weekly commit chart
  ${chalk.cyan('$ gitstats files --types')}                File type distribution
  ${chalk.cyan('$ gitstats -d /path/to/repo summary')}    Analyze a different repo
`);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
