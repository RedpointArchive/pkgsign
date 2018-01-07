export interface SignatureFileEntry {
    path: string;
    sha512: string;
}

export function createSignatureFromEntries(entries: SignatureFileEntry[]): string {
    let deterministicSignatureString = '';
    for (let entry of entries) {
        deterministicSignatureString += entry.path + '\n' + entry.sha512 + '\n';
    }
    return deterministicSignatureString;
}

export function createEntriesFromDirectoryScan(dir: string): Promise<SignatureFileEntry[]> {
    throw new Error('not supported');
}