export class DependencySigner {
    constructor(private signOnBehalfOfDependencies: boolean) {
    }

    public async createEntry(packagePath: string): Task<SignatureDependenciesEntry> {

    }
}