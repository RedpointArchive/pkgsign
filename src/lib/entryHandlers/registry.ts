import { FilesEntryHandler } from "./filesEntryHandler";
import { IdentityEntryHandler } from "./identityEntryHandler";
import { NpmCompatiblePackageJsonEntryHandler } from "./npmCompatiblePackageJsonEntryHandler";
import { PackageJsonEntryHandler } from "./packageJsonEntryHandler";
import { IEntryHandler } from ".";

export const availableEntryHandlers: IEntryHandler<any>[] = [
  FilesEntryHandler,
  IdentityEntryHandler,
  NpmCompatiblePackageJsonEntryHandler,
  PackageJsonEntryHandler
];

export const availableEntryHandlersByName = new Map<
  string,
  IEntryHandler<any>
>();
for (const entryHandler of availableEntryHandlers) {
  availableEntryHandlersByName.set(entryHandler.getEntryType(), entryHandler);
}
