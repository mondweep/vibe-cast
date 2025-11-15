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
exports.WordDocumentParser = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const jszip_1 = __importDefault(require("jszip"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const xml2js_1 = require("xml2js");
class WordDocumentParser {
    supportedFormats = ['.docx'];
    async parse(filePath) {
        const isValid = await this.validate(filePath);
        if (!isValid) {
            throw new Error(`Invalid Word document file: ${filePath}`);
        }
        try {
            const sections = await this.parseSections(filePath);
            const metadata = await this.extractMetadata(filePath);
            const parsedContent = {
                type: 'word',
                sections,
                metadata,
            };
            return parsedContent;
        }
        catch (error) {
            throw new Error(`Failed to parse Word document: ${error}`);
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
    async parseSections(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        const result = await mammoth_1.default.convertToHtml({ buffer: fileBuffer }, {
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
            ],
        });
        const html = result.value;
        const sections = [];
        let currentSection = null;
        const lines = html.split('\n');
        let inParagraph = false;
        let paragraphText = '';
        for (const line of lines) {
            const trimmed = line.trim();
            const h1Match = trimmed.match(/<h1>(.*?)<\/h1>/);
            const h2Match = trimmed.match(/<h2>(.*?)<\/h2>/);
            const h3Match = trimmed.match(/<h3>(.*?)<\/h3>/);
            if (h1Match || h2Match || h3Match) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                const level = h1Match ? 1 : h2Match ? 2 : 3;
                const title = (h1Match || h2Match || h3Match)[1]
                    .replace(/<[^>]*>/g, '')
                    .trim();
                currentSection = {
                    title,
                    level,
                    content: [],
                    speakerNotes: [],
                    media: [],
                };
            }
            else if (trimmed.startsWith('<p>')) {
                const text = trimmed
                    .replace(/<p>/, '')
                    .replace(/<\/p>/, '')
                    .replace(/<[^>]*>/g, '')
                    .trim();
                if (text && currentSection) {
                    currentSection.content.push({
                        type: 'paragraph',
                        content: text,
                    });
                }
                else if (text && !currentSection) {
                    currentSection = {
                        title: 'Introduction',
                        level: 1,
                        content: [],
                        speakerNotes: [],
                        media: [],
                    };
                    currentSection.content.push({
                        type: 'paragraph',
                        content: text,
                    });
                }
            }
        }
        if (currentSection) {
            sections.push(currentSection);
        }
        await this.enrichSections(fileBuffer, sections);
        return sections.length > 0 ? sections : this.createDefaultSection();
    }
    async enrichSections(fileBuffer, sections) {
        const zip = await jszip_1.default.loadAsync(fileBuffer);
        const comments = await this.extractComments(zip);
        if (comments.length > 0 && sections.length > 0) {
            sections[0].speakerNotes = comments;
        }
        const media = await this.extractMedia(zip);
        if (media.length > 0 && sections.length > 0) {
            const mediaPerSection = Math.ceil(media.length / sections.length);
            let mediaIndex = 0;
            for (const section of sections) {
                const sectionMedia = media.slice(mediaIndex, mediaIndex + mediaPerSection);
                section.media = sectionMedia;
                mediaIndex += mediaPerSection;
            }
        }
        const tables = await this.extractTables(zip);
        if (tables.length > 0 && sections.length > 0) {
            const tablesPerSection = Math.ceil(tables.length / sections.length);
            let tableIndex = 0;
            for (const section of sections) {
                const sectionTables = tables.slice(tableIndex, tableIndex + tablesPerSection);
                section.tables = sectionTables;
                tableIndex += tablesPerSection;
            }
        }
    }
    async extractComments(zip) {
        const comments = [];
        try {
            const commentsFile = zip.files['word/comments.xml'];
            if (commentsFile) {
                const commentsXml = await commentsFile.async('string');
                const parser = new xml2js_1.Parser();
                const result = await parser.parseStringPromise(commentsXml);
                const commentsList = result?.['w:comments']?.['w:comment'] || [];
                for (const comment of commentsList) {
                    const paragraphs = comment['w:p'] || [];
                    let commentText = '';
                    for (const para of paragraphs) {
                        const runs = para['w:r'] || [];
                        for (const run of runs) {
                            const texts = run['w:t'] || [];
                            for (const text of texts) {
                                commentText += (typeof text === 'string' ? text : text._) + ' ';
                            }
                        }
                    }
                    if (commentText.trim()) {
                        comments.push(commentText.trim());
                    }
                }
            }
        }
        catch (error) {
            console.warn('Warning: Could not extract comments:', error);
        }
        return comments;
    }
    async extractMedia(zip) {
        const media = [];
        try {
            const mediaFiles = Object.keys(zip.files)
                .filter(name => name.startsWith('word/media/'));
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
            console.warn('Warning: Could not extract media:', error);
        }
        return media;
    }
    async extractTables(zip) {
        const tables = [];
        try {
            const documentFile = zip.files['word/document.xml'];
            if (documentFile) {
                const documentXml = await documentFile.async('string');
                const parser = new xml2js_1.Parser();
                const result = await parser.parseStringPromise(documentXml);
                const tablesList = this.findTables(result);
                for (const table of tablesList) {
                    const tableData = this.parseTable(table);
                    if (tableData) {
                        tables.push(tableData);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Warning: Could not extract tables:', error);
        }
        return tables;
    }
    findTables(obj) {
        const tables = [];
        const traverse = (node) => {
            if (!node || typeof node !== 'object')
                return;
            if (node['w:tbl']) {
                tables.push(...(Array.isArray(node['w:tbl']) ? node['w:tbl'] : [node['w:tbl']]));
            }
            for (const key in node) {
                if (Array.isArray(node[key])) {
                    node[key].forEach((item) => traverse(item));
                }
                else if (typeof node[key] === 'object') {
                    traverse(node[key]);
                }
            }
        };
        traverse(obj);
        return tables;
    }
    parseTable(table) {
        try {
            const rows = table['w:tr'] || [];
            if (rows.length === 0)
                return null;
            const headers = [];
            const dataRows = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row['w:tc'] || [];
                const cellTexts = [];
                for (const cell of cells) {
                    const paragraphs = cell['w:p'] || [];
                    let cellText = '';
                    for (const para of paragraphs) {
                        const runs = para['w:r'] || [];
                        for (const run of runs) {
                            const texts = run['w:t'] || [];
                            for (const text of texts) {
                                cellText += (typeof text === 'string' ? text : text._) + ' ';
                            }
                        }
                    }
                    cellTexts.push(cellText.trim());
                }
                if (i === 0) {
                    headers.push(...cellTexts);
                }
                else {
                    dataRows.push(cellTexts);
                }
            }
            return {
                headers,
                rows: dataRows,
            };
        }
        catch (error) {
            console.warn('Warning: Could not parse table:', error);
            return null;
        }
    }
    async extractMetadata(filePath) {
        const metadata = {};
        try {
            const fileBuffer = await fs.readFile(filePath);
            const zip = await jszip_1.default.loadAsync(fileBuffer);
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
    createDefaultSection() {
        return [
            {
                title: 'Content',
                level: 1,
                content: [],
                speakerNotes: [],
                media: [],
            },
        ];
    }
}
exports.WordDocumentParser = WordDocumentParser;
//# sourceMappingURL=WordDocumentParser.js.map