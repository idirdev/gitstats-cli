#!/usr/bin/env node
/**
 * @file cli.js
 * @description CLI for gitstats-cli
 * @author idirdev
 */

'use strict';

const {
  getSummary,
  getContributors,
  getCommitsByDay,
  getCommitsByHour,
  getFileStats,
  getLanguageBreakdown,
  formatReport,
} = require('../src/index.js');

const args = process.argv.slice(2);

function flag(name) { return args.includes(name); }

const dirArg = args.find((a) => !a.startsWith('--'));
const dir = dirArg || process.cwd();
const showContributors = flag('--contributors');
const showActivity = flag('--activity');
const showFiles = flag('--files');
const asJson = flag('--json');

const stats = {};
stats.summary = getSummary(dir);

if (showContributors) stats.contributors = getContributors(dir);
if (showActivity) {
  stats.commitsByDay = getCommitsByDay(dir);
  stats.commitsByHour = getCommitsByHour(dir);
}
if (showFiles) stats.fileStats = getFileStats(dir);
stats.languages = getLanguageBreakdown(dir);

if (asJson) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  console.log(formatReport(stats));
}
