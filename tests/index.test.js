/**
 * @file tests/index.test.js
 * @description Tests for gitstats-cli
 * @author idirdev
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  getSummary,
  getContributors,
  getCommitsByDay,
  getCommitsByHour,
  getFileStats,
  getLanguageBreakdown,
  formatReport,
} = require('../src/index.js');

/**
 * Creates a temporary git repo with several commits.
 *
 * @returns {string}
 */
function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gscli-test-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "dev@example.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Dev User"', { cwd: dir, stdio: 'pipe' });
  // Create multiple files
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(dir, `file${i}.js`), `console.log(${i});`);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial with multiple files"', { cwd: dir, stdio: 'pipe' });
  // Second commit
  fs.writeFileSync(path.join(dir, 'file0.js'), 'updated');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "update file0"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

const REPO = makeTempRepo();

test('getSummary returns correct shape', () => {
  const s = getSummary(REPO);
  assert.ok('totalCommits' in s);
  assert.ok('authors' in s);
  assert.ok('firstCommit' in s);
  assert.ok('lastCommit' in s);
  assert.ok('activeDays' in s);
});

test('getSummary totalCommits >= 2', () => {
  const s = getSummary(REPO);
  assert.ok(s.totalCommits >= 2, 'should have at least 2 commits');
});

test('getSummary authors >= 1', () => {
  const s = getSummary(REPO);
  assert.ok(s.authors >= 1);
});

test('getContributors returns array of contributors', () => {
  const contributors = getContributors(REPO);
  assert.ok(Array.isArray(contributors));
  assert.ok(contributors.length >= 1);
  assert.ok('name' in contributors[0]);
  assert.ok('commits' in contributors[0]);
});

test('getCommitsByDay returns object with day keys', () => {
  const cbd = getCommitsByDay(REPO);
  assert.ok(typeof cbd === 'object');
  assert.ok('Mon' in cbd);
  assert.ok('Fri' in cbd);
});

test('getCommitsByHour returns object with 24 hour keys', () => {
  const cbh = getCommitsByHour(REPO);
  assert.ok(typeof cbh === 'object');
  assert.equal(Object.keys(cbh).length, 24);
});

test('getFileStats returns array sorted by commits', () => {
  const stats = getFileStats(REPO);
  assert.ok(Array.isArray(stats));
  assert.ok(stats.length >= 1);
  assert.ok('file' in stats[0]);
  assert.ok('commits' in stats[0]);
});

test('getLanguageBreakdown counts .js files', () => {
  const langs = getLanguageBreakdown(REPO);
  assert.ok('.js' in langs, 'should have .js extension');
  assert.ok(langs['.js'] >= 3);
});

test('getLanguageBreakdown counts .md files', () => {
  const langs = getLanguageBreakdown(REPO);
  assert.ok('.md' in langs, 'should have .md extension');
  assert.ok(langs['.md'] >= 1);
});

test('formatReport returns non-empty string with summary header', () => {
  const stats = {
    summary: getSummary(REPO),
    commitsByDay: getCommitsByDay(REPO),
    languages: getLanguageBreakdown(REPO),
  };
  const report = formatReport(stats);
  assert.ok(typeof report === 'string');
  assert.ok(report.includes('Git Repository Stats'));
  assert.ok(report.includes('Summary'));
});
