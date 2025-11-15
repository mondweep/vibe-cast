#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const WorkflowOrchestrator_1 = require("./workflows/WorkflowOrchestrator");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config();
async function main() {
    console.log('\n📚 eLearning Automation Tool v1.0.0');
    console.log('Transform PowerPoint/Word into SCORM eLearning Modules\n');
    const args = process.argv.slice(2);
    if (args.length === 0) {
        showUsage();
        process.exit(1);
    }
    const inputFile = args[0];
    const apiKey = process.env.ANTHROPIC_API_KEY || args[1];
    if (!apiKey) {
        console.error('❌ Error: ANTHROPIC_API_KEY not found');
        console.error('Please set ANTHROPIC_API_KEY environment variable or pass as second argument\n');
        process.exit(1);
    }
    const config = {
        input: {
            filePath: path.resolve(inputFile),
        },
        nlp: {
            apiKey,
            model: 'claude-sonnet-4-20250514',
        },
        scorm: {
            version: '1.2',
            masteryScore: 80,
            enableBookmarking: true,
            enableTracking: true,
        },
        output: {
            path: path.join(process.cwd(), 'output', 'scorm-package.zip'),
            packageName: path.basename(inputFile, path.extname(inputFile)),
        },
        video: {
            enabled: false,
        },
    };
    try {
        const orchestrator = new WorkflowOrchestrator_1.WorkflowOrchestrator(config);
        const outputPath = await orchestrator.execute();
        console.log('\n✅ Success!');
        console.log(`📦 SCORM package: ${outputPath}`);
        console.log('\nYou can now upload this package to your LMS.\n');
    }
    catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}
function showUsage() {
    console.log('Usage:');
    console.log('  npm start <input-file> [api-key]');
    console.log('');
    console.log('  or');
    console.log('');
    console.log('  node dist/cli.js <input-file> [api-key]');
    console.log('');
    console.log('Arguments:');
    console.log('  input-file    Path to PowerPoint (.pptx) or Word (.docx) file');
    console.log('  api-key       Anthropic API key (optional if ANTHROPIC_API_KEY env var is set)');
    console.log('');
    console.log('Examples:');
    console.log('  npm start examples/sample.pptx');
    console.log('  node dist/cli.js examples/sample.docx sk-ant-...');
    console.log('');
    console.log('Environment Variables:');
    console.log('  ANTHROPIC_API_KEY    Your Anthropic API key for Claude AI');
    console.log('');
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map