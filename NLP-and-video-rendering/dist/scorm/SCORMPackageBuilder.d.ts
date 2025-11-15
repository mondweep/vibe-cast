import { EnrichedContent } from '../types/EnrichedContent';
import { InteractiveContent } from '../types/InteractiveContent';
import { VideoContent } from '../types/VideoContent';
import { SCORMConfig } from '../types/SCORMPackage';
export declare class SCORMPackageBuilder {
    private config;
    constructor(config: SCORMConfig);
    build(enrichedContent: EnrichedContent, interactiveContent: InteractiveContent, videoContent?: VideoContent, outputPath?: string): Promise<string>;
    private createManifest;
    private createManifestXML;
    private createPlayerHTML;
    private createSCORMAPI;
    private createSCORM12API;
    private createSCORM2004API;
    private packageFiles;
    private createPlayerJS;
    private createStylesCSS;
    private createModuleHTML;
    private escapeXML;
}
//# sourceMappingURL=SCORMPackageBuilder.d.ts.map