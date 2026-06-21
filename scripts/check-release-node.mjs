const [major, minor] = process.version.slice(1).split('.').map(Number);

const ok =
  major > 24 ||
  (major === 24 && minor >= 10) ||
  (major === 22 && minor >= 14);

if (!ok) {
  console.error(
    `semantic-release requires Node ^22.14.0 or >=24.10.0. Found ${process.version}.\n` +
      'Run: nvm use',
  );
  process.exit(1);
}
