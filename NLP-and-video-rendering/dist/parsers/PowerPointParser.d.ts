import { IDocumentParser } from './IDocumentParser';
import { ParsedContent } from '../types/ParsedContent';
export declare class PowerPointParser implements IDocumentParser {
    private readonly supportedFormats;
    parse(filePath: string): Promise<ParsedContent>;
    validate(filePath: string): Promise<boolean>;
    getSupportedFormats(): string[];
    private parseSlides;
    private parseSlideXml;
    private parseSpeakerNotes;
    private extractFormatting;
    private extractMediaFromSlide;
    private extractMetadata;
}
//# sourceMappingURL=PowerPointParser.d.ts.map