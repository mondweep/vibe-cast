#!/usr/bin/env node

/**
 * CLI Interface for eLearning Automation Tool
 */

import { WorkflowOrchestrator, WorkflowConfig } from './workflows/WorkflowOrchestrator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('\n📚 eLearning Automation Tool v1.0.0');
  console.log('Transform PowerPoint/Word into SCORM eLearning Modules\n');

  // Get command line arguments
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

  // Build configuration
  const config: WorkflowConfig = {
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
      enabled: false, // Disable video by default (requires FFmpeg setup)
    },
  };

  try {
    // Execute workflow
    const orchestrator = new WorkflowOrchestrator(config);
    const outputPath = await orchestrator.execute();

    console.log('\n✅ Success!');
    console.log(`📦 SCORM package: ${outputPath}`);
    console.log('\nYou can now upload this package to your LMS.\n');
  } catch (error) {
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

// Run CLI
main().catch(console.error);
