// This file is used to increase the version number of the package using calver matching shopify's versioning scheme
// For example, 2023-1, 2023-4, 2023-7, 2023-10 are all valid versions
const incrementVersion = (oldVersion, type, defaultIncreaseVersion) => {
  const versions = oldVersion.split('.');

  // we manually update major to match years, and minor to match month
  if (type === 'major') {
    const minor = parseInt(versions[1]);
    const newMinor = (minor + 3) % 12;

    const major = parseInt(versions[0]);
    const newMajor = newMinor === 1 ? major + 1 : major;
    return `${newMajor}.${newMinor}.0`;
  }

  return defaultIncreaseVersion();
};

module.exports = {
  incrementVersion,
};
