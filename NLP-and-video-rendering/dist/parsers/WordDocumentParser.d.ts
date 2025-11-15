import { IDocumentParser } from './IDocumentParser';
import { ParsedContent } from '../types/ParsedContent';
export declare class WordDocumentParser implements IDocumentParser {
    private readonly supportedFormats;
    parse(filePath: string): Promise<ParsedContent>;
    validate(filePath: string): Promise<boolean>;
    getSupportedFormats(): string[];
    private parseSections;
    private enrichSections;
    private extractComments;
    private extractMedia;
    private extractTables;
    private findTables;
    private parseTable;
    private extractMetadata;
    private createDefaultSection;
}
//# sourceMappingURL=WordDocumentParser.d.ts.map