const incrementVersion = (oldVersion, type, defaultIncreaseVersion) => {
  const versions = oldVersion.split('.');
  if (type === 'major') {
    const minor = parseInt(versions[1]);
    const newMinor = (minor + 3) % 12;

    const major = parseInt(versions[0]);
    const newMajor = newMinor === 1 ? major + 1 : major;
    return `${newMajor}.${newMinor}.0`;
  }

  if (type === 'minor') {
    return defaultIncreaseVersion();
  }

  return defaultIncreaseVersion();
};

module.exports = {
  incrementVersion,
};
