# User Guide - eLearning Automation Tool

## Table of Contents

1. [Getting Started](#getting-started)
2. [Preparing Your Content](#preparing-your-content)
3. [Running the Tool](#running-the-tool)
4. [Understanding the Output](#understanding-the-output)
5. [Uploading to LMS](#uploading-to-lms)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before using the eLearning Automation Tool, ensure you have:

1. **Node.js 18 or higher** installed
2. **Anthropic API key** (sign up at anthropic.com)
3. **PowerPoint (.pptx) or Word (.docx)** files with speaker notes

### Installation

1. Navigate to the project directory:
```bash
cd NLP-and-video-rendering
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Create your environment file:
```bash
cp .env.example .env
```

4. Add your API key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

5. Build the project:
```bash
npm run build
```

## Preparing Your Content

### PowerPoint Presentations

**Best Practices:**

1. **Title Slides**: Each slide should have a clear title
2. **Speaker Notes**: Add detailed speaker notes to each slide
   - Explain concepts in detail
   - Include examples and case studies
   - Add teaching points
3. **Content Structure**:
   - Use bullet points for key information
   - Include relevant images and charts
   - Keep slides focused on one main topic
4. **Medical Content**:
   - Use standard medical terminology
   - Include definitions where appropriate
   - Reference clinical guidelines

**Example Slide Structure:**

```
Slide Title: Understanding Hypertension

Content:
• Definition: Blood pressure consistently above 140/90 mmHg
• Risk factors
• Complications
• Treatment approaches

Speaker Notes:
Hypertension affects approximately 1 in 3 adults. It's crucial to
understand the pathophysiology to provide effective patient care.
Risk factors include obesity, sedentary lifestyle, and family history.
Complications can include stroke, heart disease, and kidney failure.
```

### Word Documents

**Best Practices:**

1. **Use Headings**: Structure content with Heading 1, 2, 3
   - Heading 1: Main sections
   - Heading 2: Subsections
   - Heading 3: Key topics

2. **Add Comments**: Use Word comments as "speaker notes"
   - Right-click text → New Comment
   - Add explanations and teaching points

3. **Include Media**: Embed relevant images and tables

4. **Formatting**: Use consistent formatting for better parsing

**Example Document Structure:**

```
# Module 1: Introduction to Diabetes Management (Heading 1)

## Types of Diabetes (Heading 2)

Type 1 diabetes is an autoimmune condition... [Comment: Emphasize
the importance of early detection and insulin therapy]

### Pathophysiology (Heading 3)

The pancreatic beta cells are destroyed... [Comment: Use the
pancreas diagram to illustrate this process]
```

## Running the Tool

### Basic Command

```bash
npm start path/to/your/file.pptx
```

### With API Key in Command

```bash
npm start path/to/your/file.docx sk-ant-your-api-key
```

### Development Mode

```bash
npm run dev examples/sample.pptx
```

### What Happens During Processing

The tool will:

1. **Parse** your document (10-30 seconds)
   - Extract all content and speaker notes
   - Identify structure and media

2. **Process with AI** (1-3 minutes)
   - Analyze content for key concepts
   - Generate learning objectives
   - Create assessment questions
   - Extract medical terminology

3. **Generate Interactive Content** (30-60 seconds)
   - Create knowledge checks
   - Build interactive activities
   - Generate flashcards

4. **Package as SCORM** (30 seconds)
   - Create SCORM manifest
   - Build HTML player
   - Zip all files

**Total Time**: Typically 2-5 minutes for a 20-30 slide presentation

## Understanding the Output

### Output Location

By default, the SCORM package is created at:
```
output/scorm-package.zip
```

### Package Contents

When you unzip the package, you'll find:

```
scorm-package/
├── imsmanifest.xml      # SCORM manifest (required by LMS)
├── content/             # Course modules
│   ├── module-1.html
│   ├── module-2.html
│   └── ...
├── js/
│   ├── scorm-api.js    # Communicates with LMS
│   └── player.js       # Course player logic
└── css/
    └── styles.css      # Course styling
```

### What's Included

Each module contains:

1. **Content Presentation**
   - Original slide/section content
   - Formatted text and media
   - Speaker notes (optional display)

2. **Summary**
   - AI-generated summary of key points
   - Learning objectives

3. **Key Points**
   - Bullet list of main takeaways

4. **Interactive Activities**
   - Knowledge check questions
   - Flashcards
   - Drag-and-drop exercises (if applicable)

5. **Assessments**
   - Multiple choice questions
   - Scenario-based questions
   - Immediate feedback

## Uploading to LMS

### Testing First

Before uploading to your production LMS, test with:

**SCORM Cloud (Free Testing)**
1. Go to https://cloud.scorm.com
2. Create free account
3. Upload your scorm-package.zip
4. Test all functionality

### Uploading to Your LMS

#### Moodle
1. Turn editing on
2. Add an activity → SCORM package
3. Upload scorm-package.zip
4. Configure settings (optional)
5. Save and display

#### Canvas
1. Navigate to your course
2. Settings → Import Course Content
3. Select "SCORM Package"
4. Upload scorm-package.zip
5. Import

#### Blackboard
1. Course Tools → Content Package
2. Upload Package → Browse
3. Select scorm-package.zip
4. Submit

#### Generic SCORM LMS
1. Look for "Upload SCORM" or "Import Content"
2. Upload the ZIP file (don't unzip it!)
3. Configure tracking settings if needed
4. Publish to students

### Verifying Upload

After upload, verify:

- [ ] All modules are visible
- [ ] Content displays correctly
- [ ] Images and media load
- [ ] Navigation works (Previous/Next)
- [ ] Assessments function properly
- [ ] Scores are tracked
- [ ] Completion status updates

## Best Practices

### Content Creation

1. **Chunk Information**: Break complex topics into digestible modules
2. **Use Clear Language**: Avoid jargon unless necessary
3. **Provide Context**: Use speaker notes to add depth
4. **Include Examples**: Real-world scenarios improve learning
5. **Review Accuracy**: Verify all medical information

### Speaker Notes Quality

Good speaker notes lead to better AI-generated content:

**Poor Example:**
```
"This is important."
```

**Good Example:**
```
"This concept is crucial for clinical practice because it directly
impacts patient outcomes. For example, proper blood pressure monitoring
can prevent 30% of stroke cases according to AHA guidelines."
```

### File Organization

```
your-courses/
├── module-1-hypertension/
│   ├── presentation.pptx
│   └── output/
├── module-2-diabetes/
│   ├── document.docx
│   └── output/
└── ...
```

### Quality Assurance

Before deploying to learners:

1. **Review AI-Generated Content**
   - Check learning objectives
   - Verify questions accuracy
   - Ensure terminology is correct

2. **Test Interactivity**
   - Complete all assessments
   - Try all interactive elements
   - Test on different devices

3. **Accessibility Check**
   - Ensure text is readable
   - Verify keyboard navigation
   - Check screen reader compatibility

## Troubleshooting

### Common Issues

**Issue: "Unsupported file format"**
- Solution: Ensure file is .pptx or .docx (not .ppt or .doc)
- Convert older formats using PowerPoint/Word "Save As"

**Issue: "API key not found"**
- Solution: Check .env file exists and contains ANTHROPIC_API_KEY
- Verify API key is valid (starts with sk-ant-)

**Issue: "Failed to parse document"**
- Solution: Open file in PowerPoint/Word and re-save
- Check for file corruption
- Ensure file isn't password-protected

**Issue: "No speaker notes found"**
- Solution: Add speaker notes/comments to your slides/document
- The tool works best with detailed notes

**Issue: "Build failed"**
- Solution: Run `npm run clean` then `npm run build`
- Check Node.js version (requires 18+)

**Issue: "SCORM package won't upload"**
- Solution: Ensure you're uploading the ZIP file, not extracted folder
- Check file size limits in your LMS
- Verify SCORM version compatibility (try switching between 1.2 and 2004)

### Getting Help

If you encounter issues:

1. Check error messages carefully
2. Review this user guide
3. Check the documentation in `docs/`
4. Look at example files in `examples/`
5. Create an issue on GitHub with:
   - Error message
   - File type and size
   - Steps to reproduce

## Advanced Usage

### Custom Configuration

Create a config file `config.json`:

```json
{
  "scorm": {
    "version": "2004",
    "masteryScore": 85,
    "enableBookmarking": true
  },
  "nlp": {
    "temperature": 0.8,
    "maxTokens": 5000
  }
}
```

### Programmatic Usage

For batch processing multiple files:

```typescript
import { WorkflowOrchestrator } from 'nlp-and-video-rendering';

const files = ['file1.pptx', 'file2.docx'];

for (const file of files) {
  const orchestrator = new WorkflowOrchestrator({
    input: { filePath: file },
    nlp: { apiKey: process.env.ANTHROPIC_API_KEY },
    scorm: { version: '1.2', masteryScore: 80 }
  });

  await orchestrator.execute();
}
```

## Tips for Success

1. **Start Small**: Test with a simple 5-10 slide presentation first
2. **Iterate**: Review output and refine your source content
3. **Engage SMEs**: Have subject matter experts review generated questions
4. **Monitor Analytics**: Use LMS analytics to improve content
5. **Gather Feedback**: Ask learners about the experience

## Conclusion

This tool streamlines eLearning development while maintaining quality and engagement. By following these guidelines, you can create effective, interactive courses efficiently.

For additional support, consult the technical documentation in the `docs/` folder.
