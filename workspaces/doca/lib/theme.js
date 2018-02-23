var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var replace = require('replace');
var exec = require('child_process').exec;

function replaceTheme(theme, project) {
  console.log(`Setting ${chalk.green(project)} theme to ${chalk.green(theme)}. Files changed:`);
  try {
    replace({
      regex: /(?:@[^ \/]+\/)?doca-([-_a-z0-9]+)-theme/ig,
      replacement: theme,
      recursive: true,
      paths: [
        path.join(project, 'src'),
        path.join(project, 'webpack'),
      ],
    });
  } catch (err) {
    console.error(chalk.red(
      `Error: Can't find dirs ${path.join(project, 'src')} and ${path.join(project, 'webpack')}`
    ));
  }
}

function installTheme(theme, project) {
  console.log(`Trying to npm install ${chalk.green(theme)} for project ${chalk.green(project)}...`);
  exec(`npm install ${theme} --save`, { cwd: project }, function (err, stdout) {
    if (err) {
      console.error(
        chalk.red(`Error when npm installing theme ${theme}.\n${err.message}\n${stdout}`)
      );
    } else {
      console.log(chalk.green(`Theme ${theme} at ${project} has been successfully installed!`));
      replaceTheme(theme, project);
    }
  });
}

function normalizeName(theme) {
  var themeName = `doca-${theme}-theme`;
  if (theme.indexOf('doca-') > -1 || theme.indexOf('@') === 0) {
    themeName = theme;
  }
  return themeName;
}

function setTheme(theme, project) {
  var projectFolder = path.normalize(project);
  var themeName = normalizeName(theme);

  fs.access(projectFolder, fs.F_OK, function (err) {
    if (err) {
      console.error(`Folder (project) ${chalk.red(projectFolder)} does not exist!`);
    } else {
      installTheme(themeName, projectFolder);
    }
  });
}

module.exports = {
  setTheme,
  normalizeName,
};
