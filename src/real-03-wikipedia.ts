/**
 * Real-World Example 3: Wikipedia Knowledge Extractor
 *
 * Demonstrates:
 * - Extracting structured data from Wikipedia articles
 * - Parsing infoboxes, summaries, and sections
 * - Following internal links to gather related information
 * - Building knowledge graphs from web data
 *
 * This is a REAL, WORKING example using the actual Wikipedia website.
 * Wikipedia is openly accessible and has well-structured semantic HTML.
 */

import { createBrowserService, createBrowserSwarm } from '@claude-flow/browser';

interface WikipediaArticle {
  title: string;
  url: string;
  summary: string;
  infobox: Record<string, string>;
  sections: WikipediaSection[];
  categories: string[];
  relatedArticles: string[];
  lastModified: string;
  references: number;
}

interface WikipediaSection {
  title: string;
  level: number;
  content: string;
}

interface WikipediaSearchResult {
  title: string;
  snippet: string;
  url: string;
}

async function extractWikipediaArticle(articleTitle: string): Promise<WikipediaArticle> {
  console.log('📚 Wikipedia Knowledge Extractor');
  console.log('═'.repeat(60));

  const browser = createBrowserService({
    sessionId: 'wikipedia-extractor',
    enableSecurity: true,
    enableMemory: true,
  });

  // URL encode the title
  const encodedTitle = encodeURIComponent(articleTitle.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/wiki/${encodedTitle}`;

  console.log(`\n📍 Extracting: "${articleTitle}"`);
  console.log(`   URL: ${url}\n`);

  try {
    browser.startTrajectory(`Extract Wikipedia article: ${articleTitle}`);

    await browser.open(url);

    // Take snapshot for AI context
    const snapshot = await browser.snapshot({ interactive: true });
    console.log(`   Page loaded: ${snapshot.title}`);

    // Extract article data
    console.log('🔍 Extracting article content...\n');

    const articleData = await browser.evaluate(`
      (() => {
        // Get title
        const title = document.querySelector('#firstHeading')?.textContent?.trim() || '';

        // Get first paragraph (summary)
        const contentDiv = document.querySelector('#mw-content-text .mw-parser-output');
        const paragraphs = contentDiv?.querySelectorAll('p:not(.mw-empty-elt)') || [];
        let summary = '';
        for (const p of paragraphs) {
          const text = p.textContent?.trim() || '';
          if (text.length > 50) {  // Skip very short paragraphs
            summary = text;
            break;
          }
        }

        // Extract infobox data
        const infobox = {};
        const infoboxEl = document.querySelector('.infobox');
        if (infoboxEl) {
          const rows = infoboxEl.querySelectorAll('tr');
          rows.forEach(row => {
            const header = row.querySelector('th');
            const data = row.querySelector('td');
            if (header && data) {
              const key = header.textContent?.trim().replace(/\\s+/g, ' ') || '';
              const value = data.textContent?.trim().replace(/\\s+/g, ' ') || '';
              if (key && value && key.length < 50) {
                infobox[key] = value.substring(0, 200);
              }
            }
          });
        }

        // Get section headings
        const sections = [];
        const headings = contentDiv?.querySelectorAll('h2, h3, h4') || [];
        headings.forEach(h => {
          const headline = h.querySelector('.mw-headline');
          if (headline) {
            sections.push({
              title: headline.textContent?.trim() || '',
              level: parseInt(h.tagName.charAt(1)),
              content: ''  // Could extract following paragraphs
            });
          }
        });

        // Get categories
        const categories = [];
        const catLinks = document.querySelectorAll('#mw-normal-catlinks ul li a');
        catLinks.forEach(a => {
          const cat = a.textContent?.trim();
          if (cat) categories.push(cat);
        });

        // Get related articles (See also section or internal links)
        const relatedArticles = [];
        const seeAlsoSection = Array.from(document.querySelectorAll('h2'))
          .find(h => h.textContent?.includes('See also'));
        if (seeAlsoSection) {
          const ul = seeAlsoSection.nextElementSibling;
          if (ul?.tagName === 'UL') {
            ul.querySelectorAll('a').forEach(a => {
              const title = a.textContent?.trim();
              if (title && !title.startsWith('[')) {
                relatedArticles.push(title);
              }
            });
          }
        }

        // Get last modified date
        const lastMod = document.querySelector('#footer-info-lastmod')?.textContent || '';

        // Count references
        const refCount = document.querySelectorAll('.reference').length;

        return {
          title,
          url: window.location.href,
          summary: summary.substring(0, 500),
          infobox,
          sections: sections.slice(0, 15),
          categories: categories.slice(0, 10),
          relatedArticles: relatedArticles.slice(0, 10),
          lastModified: lastMod,
          references: refCount
        };
      })()
    `);

    await browser.endTrajectory(true, `Extracted article: ${articleData.title}`);

    // Display results
    console.log('─'.repeat(60));
    console.log('📖 ARTICLE EXTRACTED');
    console.log('─'.repeat(60));

    console.log(`\n📰 Title: ${articleData.title}`);
    console.log(`🔗 URL: ${articleData.url}`);
    console.log(`\n📝 Summary:\n   ${articleData.summary}...\n`);

    if (Object.keys(articleData.infobox).length > 0) {
      console.log('📊 Infobox Data:');
      Object.entries(articleData.infobox).slice(0, 8).forEach(([key, value]) => {
        console.log(`   ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      });
      console.log('');
    }

    if (articleData.sections.length > 0) {
      console.log('📑 Sections:');
      articleData.sections.slice(0, 10).forEach(s => {
        const indent = '  '.repeat(s.level - 2);
        console.log(`   ${indent}${s.level === 2 ? '▶' : '▷'} ${s.title}`);
      });
      console.log('');
    }

    if (articleData.categories.length > 0) {
      console.log('🏷️  Categories:', articleData.categories.slice(0, 5).join(', '));
    }

    if (articleData.relatedArticles.length > 0) {
      console.log('🔗 Related:', articleData.relatedArticles.slice(0, 5).join(', '));
    }

    console.log(`\n📚 References: ${articleData.references}`);
    console.log(`📅 ${articleData.lastModified}`);
    console.log('─'.repeat(60));

    return articleData as WikipediaArticle;

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    await browser.endTrajectory(false, `Failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

// Search Wikipedia and extract top results
async function searchWikipedia(query: string, limit: number = 5): Promise<WikipediaSearchResult[]> {
  console.log(`\n🔍 Searching Wikipedia for: "${query}"`);

  const browser = createBrowserService({
    sessionId: 'wikipedia-search',
    enableSecurity: true,
  });

  const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:Search&ns0=1`;

  try {
    browser.startTrajectory(`Search Wikipedia: ${query}`);

    await browser.open(searchUrl);

    const results = await browser.evaluate(`
      (() => {
        const results = [];
        const items = document.querySelectorAll('.mw-search-result');

        items.forEach(item => {
          const titleLink = item.querySelector('.mw-search-result-heading a');
          const snippet = item.querySelector('.searchresult');

          if (titleLink) {
            results.push({
              title: titleLink.textContent?.trim() || '',
              snippet: snippet?.textContent?.trim() || '',
              url: titleLink.href || ''
            });
          }
        });

        return results;
      })()
    `);

    await browser.endTrajectory(true, `Found ${results.length} results`);
    await browser.close();

    console.log(`   Found ${results.length} results\n`);
    (results as WikipediaSearchResult[]).slice(0, limit).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title}`);
      console.log(`      ${r.snippet.substring(0, 80)}...`);
    });

    return (results as WikipediaSearchResult[]).slice(0, limit);

  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Compare multiple Wikipedia articles in parallel
async function compareArticles(titles: string[]): Promise<Map<string, WikipediaArticle>> {
  console.log('\n🐝 Parallel Wikipedia Extraction');
  console.log('═'.repeat(60));
  console.log(`   Comparing ${titles.length} articles...`);

  const swarm = createBrowserSwarm({
    maxSessions: 3,
    enableSecurity: true,
  });

  const results = new Map<string, WikipediaArticle>();
  const startTime = Date.now();

  const promises = titles.map(async (title) => {
    try {
      const browser = await swarm.spawn();
      const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/wiki/${encodedTitle}`;

      await browser.open(url);

      const data = await browser.evaluate(`
        (() => {
          const infobox = {};
          document.querySelectorAll('.infobox tr').forEach(row => {
            const th = row.querySelector('th');
            const td = row.querySelector('td');
            if (th && td) {
              infobox[th.textContent?.trim() || ''] = td.textContent?.trim().substring(0, 100) || '';
            }
          });

          const paragraphs = document.querySelectorAll('#mw-content-text .mw-parser-output > p:not(.mw-empty-elt)');
          let summary = '';
          for (const p of paragraphs) {
            if (p.textContent?.trim().length > 50) {
              summary = p.textContent.trim();
              break;
            }
          }

          return {
            title: document.querySelector('#firstHeading')?.textContent?.trim() || '',
            url: window.location.href,
            summary: summary.substring(0, 300),
            infobox,
            sections: [],
            categories: [],
            relatedArticles: [],
            lastModified: '',
            references: document.querySelectorAll('.reference').length
          };
        })()
      `);

      await browser.close();
      console.log(`   ✅ ${title}`);
      return { title, data };

    } catch (error) {
      console.log(`   ❌ ${title}: ${error}`);
      return { title, data: null };
    }
  });

  const settled = await Promise.all(promises);
  settled.forEach(({ title, data }) => {
    if (data) {
      results.set(title, data as WikipediaArticle);
    }
  });

  const duration = Date.now() - startTime;
  console.log(`\n⏱️  Extracted ${results.size} articles in ${duration}ms`);

  // Show comparison
  console.log('\n📊 Comparison:');
  results.forEach((article, title) => {
    console.log(`\n   ${title}:`);
    console.log(`      References: ${article.references}`);
    console.log(`      Summary: ${article.summary.substring(0, 100)}...`);
  });

  return results;
}

// Run the demo
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       WIKIPEDIA KNOWLEDGE EXTRACTOR DEMO                   ║');
  console.log('║                                                            ║');
  console.log('║  This demo extracts REAL data from en.wikipedia.org       ║');
  console.log('║  Perfect for building knowledge bases and research!        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 1. Extract a single article
    await extractWikipediaArticle('Artificial intelligence');

    // 2. Search Wikipedia
    console.log('\n\n');
    console.log('═'.repeat(60));
    console.log('🔍 BONUS: Wikipedia Search Demo');
    console.log('═'.repeat(60));

    await searchWikipedia('machine learning', 5);

    // 3. Compare multiple articles
    console.log('\n\n');
    console.log('═'.repeat(60));
    console.log('📊 BONUS: Compare Related Topics');
    console.log('═'.repeat(60));

    await compareArticles([
      'Python (programming language)',
      'JavaScript',
      'Rust (programming language)',
    ]);

    console.log('\n\n✨ Demo complete! All data was extracted from real Wikipedia.');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
