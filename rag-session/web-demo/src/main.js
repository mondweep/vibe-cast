/**
 * RAG Pipeline Demo - Frontend
 * Knowledge Sharing Session
 * Author: Mondweep Chakravorty
 */

// Company policies document (embedded for demo)
const COMPANY_POLICIES = `COMPANY POLICIES AND PROCEDURES

ANNUAL LEAVE POLICY
All full-time employees are entitled to 25 days of annual leave per calendar year. Part-time employees receive a pro-rata entitlement based on their contracted hours. Annual leave must be requested at least two weeks in advance for periods of five days or more. For shorter periods, a minimum of three working days' notice is required. Leave requests should be submitted through the HR portal and require approval from your line manager. During peak business periods (typically December and the summer months), leave requests may be subject to additional restrictions to ensure adequate staffing levels. Unused annual leave may be carried over to the following year, up to a maximum of five days. Any leave beyond this will be forfeited unless exceptional circumstances apply.

WORKING HOURS
Standard working hours are Monday to Friday, 9:00 AM to 5:30 PM, with a one-hour lunch break. Core hours, during which all employees must be available, are 10:00 AM to 4:00 PM. Flexible working arrangements may be available subject to business needs and manager approval. Requests for flexible working should be submitted in writing to the HR department. Remote working is permitted for up to two days per week, subject to role requirements and manager approval.

SICK LEAVE
Employees who are unwell should notify their manager as soon as possible on the first day of absence, ideally before their normal start time. For absences of three days or fewer, self-certification is acceptable. For absences exceeding three days, a medical certificate from a registered practitioner is required. The company provides full pay for up to 10 days of sick leave per year. Beyond this, statutory sick pay applies in accordance with government regulations.

EXPENSES POLICY
Business expenses must be submitted within 30 days of being incurred. All claims must be accompanied by valid receipts. Travel: Standard class rail travel or economy class flights are reimbursed. Mileage for personal vehicle use is reimbursed at 45p per mile. Accommodation: Up to £150 per night in London, £100 per night elsewhere in the UK. Meals: Up to £25 per day when travelling for business purposes. Pre-approval is required for any single expense exceeding £500 or total trip costs exceeding £1,000.

PROFESSIONAL DEVELOPMENT
The company is committed to supporting employee development. Each employee has access to a training budget of £1,500 per year for relevant professional development activities. Training requests should be discussed with your line manager during regular one-to-one meetings. Approved training must be relevant to your current role or agreed career development path. Study leave of up to five days per year may be granted for employees undertaking approved professional qualifications.`;

// Simple text chunking function
function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start = end - overlap;
        if (start + overlap >= text.length) break;
    }

    return chunks;
}

// Simple cosine similarity
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get embeddings from OpenAI
async function getEmbedding(text, apiKey) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get embedding');
    }

    const data = await response.json();
    return data.data[0].embedding;
}

// Get completion from OpenAI
async function getCompletion(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get completion');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Main RAG function
async function performRAG(question, apiKey) {
    // Step 1: Chunk the document
    const chunks = chunkText(COMPANY_POLICIES);

    // Step 2: Get embedding for the question
    const questionEmbedding = await getEmbedding(question, apiKey);

    // Step 3: Get embeddings for all chunks and find most similar
    const chunkEmbeddings = await Promise.all(
        chunks.map(chunk => getEmbedding(chunk, apiKey))
    );

    // Step 4: Calculate similarities and get top 3 chunks
    const similarities = chunkEmbeddings.map((embedding, index) => ({
        index,
        chunk: chunks[index],
        similarity: cosineSimilarity(questionEmbedding, embedding)
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topChunks = similarities.slice(0, 3);

    // Step 5: Create context from top chunks
    const context = topChunks.map(c => c.chunk).join('\n\n');

    // Step 6: Generate answer using context
    const prompt = `Answer the question based only on the following context:

${context}

Question: ${question}

Answer:`;

    const answer = await getCompletion(prompt, apiKey);

    return {
        answer,
        sources: topChunks.map(c => ({
            text: c.chunk.substring(0, 100) + '...',
            similarity: (c.similarity * 100).toFixed(1) + '%'
        }))
    };
}

// UI Functions
window.setQuestion = function(question) {
    document.getElementById('question').value = question;
};

window.askQuestion = async function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const question = document.getElementById('question').value.trim();
    const responseBox = document.getElementById('responseBox');
    const answerEl = document.getElementById('answer');
    const askBtn = document.getElementById('askBtn');

    if (!apiKey) {
        alert('Please enter your OpenAI API key');
        return;
    }

    if (!question) {
        alert('Please enter a question');
        return;
    }

    // Show loading state
    askBtn.disabled = true;
    askBtn.textContent = 'Processing...';
    responseBox.classList.add('loading');
    answerEl.innerHTML = '<div class="spinner"></div>';

    try {
        const result = await performRAG(question, apiKey);

        let sourcesHtml = '';
        if (result.sources && result.sources.length > 0) {
            sourcesHtml = `
                <div class="sources">
                    <h4>Retrieved Context (${result.sources.length} chunks)</h4>
                    ${result.sources.map((s, i) => `
                        <p><strong>Chunk ${i + 1}</strong> (${s.similarity} match): ${s.text}</p>
                    `).join('')}
                </div>
            `;
        }

        answerEl.innerHTML = `
            <p class="answer">${result.answer}</p>
            ${sourcesHtml}
        `;
    } catch (error) {
        answerEl.innerHTML = `<p class="answer" style="color: #ef4444;">Error: ${error.message}</p>`;
    } finally {
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
        responseBox.classList.remove('loading');
    }
};

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('question').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.askQuestion();
        }
    });
});
