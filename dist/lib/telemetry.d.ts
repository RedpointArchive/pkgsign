export interface TelemetryData {
    action: string;
    packageName: string;
    packageVersion: string;
    packageIsSigned: boolean;
    signingIdentity: string;
    identityIsTrusted: boolean;
}
export declare function queueTelemetry(data: TelemetryData): Promise<void>;
export declare function startTelemetrySend(): Promise<void>;
export declare function sendTelemetry(telemetry: TelemetryData[]): Promise<void>;
