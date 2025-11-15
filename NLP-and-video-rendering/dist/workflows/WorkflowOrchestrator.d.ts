import { SCORMConfig } from '../types/SCORMPackage';
export interface WorkflowConfig {
    input: {
        filePath: string;
    };
    nlp: {
        apiKey: string;
        model?: string;
    };
    scorm: SCORMConfig;
    output: {
        path?: string;
        packageName?: string;
    };
    video?: {
        enabled: boolean;
    };
}
export declare class WorkflowOrchestrator {
    private config;
    constructor(config: WorkflowConfig);
    execute(): Promise<string>;
    private parseDocument;
    private processWithNLP;
    private generateInteractive;
    private renderVideos;
    private packageSCORM;
}
//# sourceMappingURL=WorkflowOrchestrator.d.ts.map