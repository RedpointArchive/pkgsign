const generatedNpmKeys = [
  "_from",
  "_id",
  "_inBundle",
  "_integrity",
  "_location",
  "_phantomChildren",
  "_requested",
  "_requiredBy",
  "_resolved",
  "_shasum",
  "_spec",
  "_where",
  "_optional",
  "_development",
  "_args"
];

export function isPackageInstalledWithNpm(packageJson: object | null): boolean {
  if (packageJson) {
    // if some of the npm generated keys are in the package.json of the installed
    // package, we can assume npm was used for installing the package
    return Object.keys(packageJson).some(
      property => generatedNpmKeys.indexOf(property) >= 0
    );
  }
  // can't assume the package was installed with npm - verification would fail if so
  return false;
}

export function isPackagePublishedWithNpm(packageJson: object | null): boolean {
  if (packageJson) {
    // at least gitHead is added to package.json when publishing with npm
    return (
      Object.keys(packageJson)
        .sort()
        .indexOf("gitHead") >= 0
    );
  }
  // can't assume the package was published with npm - verification would fail if so
  return false;
}
