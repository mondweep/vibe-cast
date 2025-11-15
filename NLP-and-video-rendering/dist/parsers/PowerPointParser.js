"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerPointParser = void 0;
const jszip_1 = __importDefault(require("jszip"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const xml2js_1 = require("xml2js");
class PowerPointParser {
    supportedFormats = ['.pptx'];
    async parse(filePath) {
        const isValid = await this.validate(filePath);
        if (!isValid) {
            throw new Error(`Invalid PowerPoint file: ${filePath}`);
        }
        try {
            const slides = await this.parseSlides(filePath);
            const metadata = await this.extractMetadata(filePath);
            const parsedContent = {
                type: 'powerpoint',
                slides,
                metadata,
            };
            return parsedContent;
        }
        catch (error) {
            throw new Error(`Failed to parse PowerPoint file: ${error}`);
        }
    }
    async validate(filePath) {
        try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) {
                return false;
            }
            const ext = path.extname(filePath).toLowerCase();
            return this.supportedFormats.includes(ext);
        }
        catch (error) {
            return false;
        }
    }
    getSupportedFormats() {
        return this.supportedFormats;
    }
    async parseSlides(filePath) {
        const fileContent = await fs.readFile(filePath);
        const zip = await jszip_1.default.loadAsync(fileContent);
        const slides = [];
        const slideFiles = Object.keys(zip.files)
            .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
            .sort();
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            const slideNumber = i + 1;
            const slideXml = await zip.files[slideFile].async('string');
            const slideData = await this.parseSlideXml(slideXml, slideNumber);
            const notesFile = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
            if (zip.files[notesFile]) {
                const notesXml = await zip.files[notesFile].async('string');
                slideData.speakerNotes = await this.parseSpeakerNotes(notesXml);
            }
            slideData.media = await this.extractMediaFromSlide(zip, slideNumber);
            slides.push(slideData);
        }
        return slides;
    }
    async parseSlideXml(xml, slideNumber) {
        const parser = new xml2js_1.Parser();
        const result = await parser.parseStringPromise(xml);
        const slide = {
            slideNumber,
            title: '',
            content: [],
            speakerNotes: '',
            media: [],
            layout: 'default',
        };
        try {
            const shapes = result?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'] || [];
            for (const shape of shapes) {
                const textBody = shape?.['p:txBody']?.[0];
                if (textBody) {
                    const paragraphs = textBody['a:p'] || [];
                    for (const para of paragraphs) {
                        const runs = para['a:r'] || [];
                        let textContent = '';
                        for (const run of runs) {
                            const text = run['a:t']?.[0] || '';
                            textContent += text;
                        }
                        if (textContent.trim()) {
                            const isTitle = !slide.title && slide.content.length === 0;
                            if (isTitle) {
                                slide.title = textContent.trim();
                            }
                            const content = {
                                type: isTitle ? 'heading' : 'text',
                                content: textContent.trim(),
                                formatting: this.extractFormatting(para),
                            };
                            slide.content.push(content);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn(`Warning: Could not parse slide ${slideNumber} text:`, error);
        }
        return slide;
    }
    async parseSpeakerNotes(xml) {
        try {
            const parser = new xml2js_1.Parser();
            const result = await parser.parseStringPromise(xml);
            const shapes = result?.['p:notes']?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'] || [];
            let notesText = '';
            for (const shape of shapes) {
                const textBody = shape?.['p:txBody']?.[0];
                if (textBody) {
                    const paragraphs = textBody['a:p'] || [];
                    for (const para of paragraphs) {
                        const runs = para['a:r'] || [];
                        for (const run of runs) {
                            const text = run['a:t']?.[0] || '';
                            notesText += text + ' ';
                        }
                    }
                }
            }
            return notesText.trim();
        }
        catch (error) {
            console.warn('Warning: Could not parse speaker notes:', error);
            return '';
        }
    }
    extractFormatting(paragraph) {
        const formatting = {};
        try {
            const runs = paragraph['a:r'] || [];
            if (runs.length > 0) {
                const rPr = runs[0]['a:rPr']?.[0];
                if (rPr) {
                    formatting.bold = rPr['$']?.b === '1';
                    formatting.italic = rPr['$']?.i === '1';
                    formatting.underline = rPr['$']?.u === 'sng';
                    formatting.fontSize = rPr['$']?.sz ? parseInt(rPr['$'].sz) / 100 : undefined;
                }
            }
        }
        catch (error) {
        }
        return formatting;
    }
    async extractMediaFromSlide(zip, slideNumber) {
        const media = [];
        try {
            const mediaFiles = Object.keys(zip.files)
                .filter(name => name.startsWith('ppt/media/'));
            for (const mediaFile of mediaFiles) {
                const file = zip.files[mediaFile];
                const data = await file.async('nodebuffer');
                const filename = path.basename(mediaFile);
                const ext = path.extname(filename).toLowerCase();
                let type = 'image';
                let mimeType = 'application/octet-stream';
                if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) {
                    type = 'image';
                    mimeType = `image/${ext.substring(1)}`;
                }
                else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
                    type = 'video';
                    mimeType = `video/${ext.substring(1)}`;
                }
                else if (['.mp3', '.wav', '.m4a'].includes(ext)) {
                    type = 'audio';
                    mimeType = `audio/${ext.substring(1)}`;
                }
                media.push({
                    type,
                    data,
                    filename,
                    mimeType,
                });
            }
        }
        catch (error) {
            console.warn(`Warning: Could not extract media from slide ${slideNumber}:`, error);
        }
        return media;
    }
    async extractMetadata(filePath) {
        const metadata = {};
        try {
            const fileContent = await fs.readFile(filePath);
            const zip = await jszip_1.default.loadAsync(fileContent);
            const coreFile = zip.files['docProps/core.xml'];
            if (coreFile) {
                const coreXml = await coreFile.async('string');
                const parser = new xml2js_1.Parser();
                const result = await parser.parseStringPromise(coreXml);
                const coreProps = result?.['cp:coreProperties'];
                if (coreProps) {
                    metadata.title = coreProps['dc:title']?.[0] || undefined;
                    metadata.author = coreProps['dc:creator']?.[0] || undefined;
                    metadata.subject = coreProps['dc:subject']?.[0] || undefined;
                    metadata.description = coreProps['dc:description']?.[0] || undefined;
                    metadata.keywords = coreProps['cp:keywords']?.[0]?.split(',').map((k) => k.trim()) || undefined;
                    if (coreProps['dcterms:created']?.[0]) {
                        metadata.created = new Date(coreProps['dcterms:created'][0]);
                    }
                    if (coreProps['dcterms:modified']?.[0]) {
                        metadata.modified = new Date(coreProps['dcterms:modified'][0]);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Warning: Could not extract metadata:', error);
        }
        if (!metadata.title) {
            metadata.title = path.basename(filePath, path.extname(filePath));
        }
        return metadata;
    }
}
exports.PowerPointParser = PowerPointParser;
//# sourceMappingURL=PowerPointParser.js.map