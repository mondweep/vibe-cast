import { ParsedContent } from '../types/ParsedContent';
export interface IDocumentParser {
    parse(filePath: string): Promise<ParsedContent>;
    validate(filePath: string): Promise<boolean>;
    getSupportedFormats(): string[];
}
//# sourceMappingURL=IDocumentParser.d.ts.map