#!/usr/bin/env node

var program = require('commander');
var chalk = require('chalk');
var init = require('./init');
var setTheme = require('./theme').setTheme;
var updateNotifier = require('update-notifier');
var pkg = require('../package.json');

updateNotifier({ pkg }).notify();

program
  .command('init')
  .option(
    '-t, --theme <theme>',
    `Doca theme. Must be the full package name if @scoped. ${chalk.grey(
      'Default'
    )}: ${chalk.green('@cloudflare/doca-default-theme')}`
  )
  .option(
    '-i, --input <input>',
    `Folder with JSON HyperSchemas. ${chalk.grey(
      'Default'
    )}: It goes through the current dir.`
  )
  .option(
    '-o, --output <output>',
    `Doca project name. ${chalk.grey('Default')}: ${chalk.green(
      'documentation'
    )}`
  )
  .option(
    '-d, --dev',
    `Development mode.  Link the theme instead of adding it.`
  )
  .description('initialize a new doca project')
  .action(function(args) {
    init(args.theme, args.input, args.output, args.dev);
  });

program
  .command('theme <newTheme> <project>')
  .description(
    'set project <project> theme to <newTheme>; note that @namespaced theme packages must be given with their full package name'
  )
  .action(setTheme);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
