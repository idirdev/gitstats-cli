/**
 * @file index.js
 * @description Git repository statistics and analytics
 * @author idirdev
 * @module gitstats-cli
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Runs a git command and returns trimmed output, or empty string on failure.
 *
 * @param {string} cmd
 * @param {string} cwd
 * @returns {string}
 */
function git(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

/** @constant {string[]} */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns high-level repository summary statistics.
 *
 * @param {string} [dir='.']
 * @returns {{
 *   totalCommits: number,
 *   authors: number,
 *   firstCommit: string,
 *   lastCommit: string,
 *   activeDays: number
 * }}
 */
function getSummary(dir = '.') {
  const logAll = git('git log --format="%ad|%an" --date=short', dir);
  if (!logAll) {
    return { totalCommits: 0, authors: 0, firstCommit: '', lastCommit: '', activeDays: 0 };
  }

  const lines = logAll.split('\n').filter(Boolean);
  const dates = lines.map((l) => l.split('|')[0]);
  const authors = new Set(lines.map((l) => l.split('|')[1]));
  const sorted = [...dates].sort();

  return {
    totalCommits: lines.length,
    authors: authors.size,
    firstCommit: sorted[0] || '',
    lastCommit: sorted[sorted.length - 1] || '',
    activeDays: new Set(dates).size,
  };
}

/**
 * Returns contributor statistics for the repository.
 *
 * @param {string} [dir='.']
 * @returns {{
 *   name: string,
 *   email: string,
 *   commits: number,
 *   additions: number,
 *   deletions: number,
 *   firstCommit: string,
 *   lastCommit: string
 * }[]}
 */
function getContributors(dir = '.') {
  const logRaw = git('git log --format="%an|%ae|%ad" --date=short', dir);
  if (!logRaw) return [];

  const map = new Map();
  for (const line of logRaw.split('\n').filter(Boolean)) {
    const [name, email, date] = line.split('|');
    const key = email || name;
    if (!map.has(key)) {
      map.set(key, { name, email, commits: 0, additions: 0, deletions: 0, firstCommit: date, lastCommit: date });
    }
    const entry = map.get(key);
    entry.commits++;
    if (date < entry.firstCommit) entry.firstCommit = date;
    if (date > entry.lastCommit) entry.lastCommit = date;
  }

  // Get numstat per author
  const numstatRaw = git('git log --numstat --format="COMMIT|%ae" --date=short', dir);
  if (numstatRaw) {
    let currentEmail = '';
    for (const line of numstatRaw.split('\n')) {
      if (line.startsWith('COMMIT|')) {
        currentEmail = line.slice(7).trim();
      } else {
        const parts = line.split('\t');
        if (parts.length === 3 && map.has(currentEmail)) {
          const add = parseInt(parts[0], 10);
          const del = parseInt(parts[1], 10);
          if (!isNaN(add)) map.get(currentEmail).additions += add;
          if (!isNaN(del)) map.get(currentEmail).deletions += del;
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => b.commits - a.commits);
}

/**
 * Returns the commit count grouped by day of week.
 *
 * @param {string} [dir='.']
 * @returns {Record<string, number>} e.g. { Mon: 12, Tue: 5, ... }
 */
function getCommitsByDay(dir = '.') {
  const counts = {};
  for (const d of DAY_NAMES) counts[d] = 0;

  const raw = git('git log --format="%ad" --date=format:"%a"', dir);
  if (!raw) return counts;

  for (const line of raw.split('\n').filter(Boolean)) {
    const day = line.trim();
    if (day in counts) counts[day]++;
  }
  return counts;
}

/**
 * Returns the commit count grouped by hour of day (0–23).
 *
 * @param {string} [dir='.']
 * @returns {Record<number, number>}
 */
function getCommitsByHour(dir = '.') {
  const counts = {};
  for (let i = 0; i < 24; i++) counts[i] = 0;

  const raw = git('git log --format="%ad" --date=format:"%H"', dir);
  if (!raw) return counts;

  for (const line of raw.split('\n').filter(Boolean)) {
    const h = parseInt(line.trim(), 10);
    if (!isNaN(h) && h >= 0 && h < 24) counts[h]++;
  }
  return counts;
}

/**
 * Returns file-level commit statistics.
 *
 * @param {string} [dir='.']
 * @returns {{ file: string, commits: number, lastModified: string }[]}
 */
function getFileStats(dir = '.') {
  const raw = git('git log --name-only --format="%ad" --date=short', dir);
  if (!raw) return [];

  const fileMap = new Map();
  let currentDate = '';

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Date lines look like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      currentDate = trimmed;
    } else if (trimmed) {
      if (!fileMap.has(trimmed)) {
        fileMap.set(trimmed, { file: trimmed, commits: 0, lastModified: currentDate });
      }
      const entry = fileMap.get(trimmed);
      entry.commits++;
      if (currentDate > entry.lastModified) entry.lastModified = currentDate;
    }
  }

  return [...fileMap.values()].sort((a, b) => b.commits - a.commits);
}

/**
 * Returns a breakdown of tracked files by extension.
 *
 * @param {string} [dir='.']
 * @returns {Record<string, number>} e.g. { '.js': 12, '.md': 3 }
 */
function getLanguageBreakdown(dir = '.') {
  const raw = git('git ls-files', dir);
  if (!raw) return {};

  const counts = {};
  for (const file of raw.split('\n').filter(Boolean)) {
    const ext = path.extname(file) || '(no ext)';
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return counts;
}

/**
 * Formats a stats report as a human-readable string.
 *
 * @param {{
 *   summary?: ReturnType<getSummary>,
 *   contributors?: ReturnType<getContributors>,
 *   commitsByDay?: ReturnType<getCommitsByDay>,
 *   commitsByHour?: ReturnType<getCommitsByHour>,
 *   fileStats?: ReturnType<getFileStats>,
 *   languages?: ReturnType<getLanguageBreakdown>
 * }} stats
 * @returns {string}
 */
function formatReport(stats) {
  const lines = ['=== Git Repository Stats ===', ''];

  if (stats.summary) {
    const s = stats.summary;
    lines.push('── Summary ──');
    lines.push(`  Total commits : ${s.totalCommits}`);
    lines.push(`  Authors       : ${s.authors}`);
    lines.push(`  First commit  : ${s.firstCommit}`);
    lines.push(`  Last commit   : ${s.lastCommit}`);
    lines.push(`  Active days   : ${s.activeDays}`);
    lines.push('');
  }

  if (stats.contributors && stats.contributors.length > 0) {
    lines.push('── Contributors ──');
    for (const c of stats.contributors.slice(0, 10)) {
      lines.push(`  ${c.name.padEnd(24)} ${String(c.commits).padStart(5)} commits`);
    }
    lines.push('');
  }

  if (stats.commitsByDay) {
    lines.push('── Commits by Day ──');
    const cbd = stats.commitsByDay;
    const total = Object.values(cbd).reduce((a, b) => a + b, 0) || 1;
    for (const [day, count] of Object.entries(cbd)) {
      const bar = '█'.repeat(Math.round((count / total) * 20));
      lines.push(`  ${day.padEnd(4)} ${String(count).padStart(4)}  ${bar}`);
    }
    lines.push('');
  }

  if (stats.languages) {
    lines.push('── Languages ──');
    const sorted = Object.entries(stats.languages).sort((a, b) => b[1] - a[1]);
    for (const [ext, count] of sorted.slice(0, 10)) {
      lines.push(`  ${ext.padEnd(16)} ${count} files`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  getSummary,
  getContributors,
  getCommitsByDay,
  getCommitsByHour,
  getFileStats,
  getLanguageBreakdown,
  formatReport,
};
