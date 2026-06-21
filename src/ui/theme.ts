import chalk from 'chalk';

export const theme = {
  primary: chalk.cyan,
  secondary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.yellow,
  dim: chalk.dim,
  bold: chalk.bold,
  white: chalk.white,
};

export const symbols = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  arrow: chalk.cyan('->'),
  bullet: chalk.dim('•'),
};
