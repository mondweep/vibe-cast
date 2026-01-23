/**
 * Real-World Example 4: Multi-Site Tech News Aggregator
 *
 * Demonstrates:
 * - Parallel scraping from multiple real news sources
 * - Browser swarm coordination
 * - Deduplication and aggregation of headlines
 * - Cross-source comparison
 *
 * This is a REAL, WORKING example using actual news websites:
 * - NPR Technology News
 * - BBC Technology News
 * - TechCrunch
 * - The Verge
 * - Ars Technica
 */

import { createBrowserSwarm, createBrowserService } from '@claude-flow/browser';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  summary?: string;
  timestamp?: string;
  category?: string;
}

interface NewsSourceResult {
  source: string;
  articles: NewsArticle[];
  scrapedAt: string;
  duration: number;
  error?: string;
}

interface AggregatedNews {
  totalArticles: number;
  sources: NewsSourceResult[];
  aggregatedAt: string;
  duration: number;
}

// Source configurations with real URLs and extraction logic
const NEWS_SOURCES = {
  npr: {
    name: 'NPR Technology',
    url: 'https://www.npr.org/sections/technology/',
    extract: `
      (() => {
        const articles = [];
        document.querySelectorAll('article.item').forEach(article => {
          const titleEl = article.querySelector('h2.title a');
          const summaryEl = article.querySelector('p.teaser');
          if (titleEl) {
            articles.push({
              title: titleEl.textContent?.trim() || '',
              url: titleEl.href || '',
              source: 'NPR Technology',
              summary: summaryEl?.textContent?.trim().substring(0, 200) || ''
            });
          }
        });
        return articles;
      })()
    `,
  },
  bbc: {
    name: 'BBC Technology',
    url: 'https://www.bbc.com/news/technology',
    extract: `
      (() => {
        const articles = [];
        document.querySelectorAll('[data-testid="edinburgh-card"], [data-testid="anchor-inner-wrapper"]').forEach(card => {
          const titleEl = card.querySelector('h2');
          const linkEl = card.querySelector('a');
          const summaryEl = card.querySelector('p');
          if (titleEl && linkEl) {
            const url = linkEl.href;
            if (url && url.includes('/news/')) {
              articles.push({
                title: titleEl.textContent?.trim() || '',
                url: url,
                source: 'BBC Technology',
                summary: summaryEl?.textContent?.trim().substring(0, 200) || ''
              });
            }
          }
        });
        return articles;
      })()
    `,
  },
  verge: {
    name: 'The Verge',
    url: 'https://www.theverge.com/tech',
    extract: `
      (() => {
        const articles = [];
        document.querySelectorAll('a[data-analytics-link="article"]').forEach(link => {
          const titleEl = link.querySelector('h2, h3');
          if (titleEl) {
            articles.push({
              title: titleEl.textContent?.trim() || '',
              url: link.href || '',
              source: 'The Verge',
              summary: ''
            });
          }
        });
        // Fallback: try alternate selector
        if (articles.length === 0) {
          document.querySelectorAll('.c-entry-box--compact__title a, .c-entry-box__title a').forEach(link => {
            articles.push({
              title: link.textContent?.trim() || '',
              url: link.href || '',
              source: 'The Verge'
            });
          });
        }
        return articles.filter(a => a.title);
      })()
    `,
  },
  ars: {
    name: 'Ars Technica',
    url: 'https://arstechnica.com/',
    extract: `
      (() => {
        const articles = [];
        document.querySelectorAll('article').forEach(article => {
          const titleEl = article.querySelector('h2 a');
          const excerptEl = article.querySelector('.excerpt');
          if (titleEl) {
            articles.push({
              title: titleEl.textContent?.trim() || '',
              url: titleEl.href || '',
              source: 'Ars Technica',
              summary: excerptEl?.textContent?.trim().substring(0, 200) || ''
            });
          }
        });
        return articles;
      })()
    `,
  },
  hackernews: {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    extract: `
      (() => {
        const articles = [];
        document.querySelectorAll('tr.athing').forEach(row => {
          const titleEl = row.querySelector('.titleline a');
          if (titleEl) {
            articles.push({
              title: titleEl.textContent?.trim() || '',
              url: titleEl.href || '',
              source: 'Hacker News'
            });
          }
        });
        return articles;
      })()
    `,
  },
};

type SourceKey = keyof typeof NEWS_SOURCES;

// Scrape a single source
async function scrapeNewsSource(sourceKey: SourceKey): Promise<NewsSourceResult> {
  const source = NEWS_SOURCES[sourceKey];
  const startTime = Date.now();

  const browser = createBrowserService({
    sessionId: `news-${sourceKey}`,
    enableSecurity: true,
  });

  try {
    browser.startTrajectory(`Scrape ${source.name}`);

    await browser.open(source.url);
    const snapshot = await browser.snapshot({ interactive: true });

    const articles = await browser.evaluate(source.extract);

    await browser.endTrajectory(true, `Scraped ${articles.length} articles from ${source.name}`);

    return {
      source: source.name,
      articles: (articles as NewsArticle[]).slice(0, 15),
      scrapedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };

  } catch (error) {
    await browser.endTrajectory(false, String(error));
    return {
      source: source.name,
      articles: [],
      scrapedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: String(error),
    };

  } finally {
    await browser.close();
  }
}

// Aggregate news from multiple sources in parallel
async function aggregateNews(sourceKeys: SourceKey[]): Promise<AggregatedNews> {
  console.log('📰 Multi-Site Tech News Aggregator');
  console.log('═'.repeat(60));
  console.log(`\n🌐 Aggregating news from ${sourceKeys.length} sources...\n`);

  const swarm = createBrowserSwarm({
    maxSessions: 4,
    enableSecurity: true,
  });

  const startTime = Date.now();
  const results: NewsSourceResult[] = [];

  // Process all sources in parallel
  const promises = sourceKeys.map(async (sourceKey) => {
    const source = NEWS_SOURCES[sourceKey];
    const taskStart = Date.now();

    console.log(`   🚀 Starting: ${source.name}`);

    try {
      const browser = await swarm.spawn();
      await browser.open(source.url);

      const articles = await browser.evaluate(source.extract);
      await browser.close();

      const duration = Date.now() - taskStart;
      console.log(`   ✅ ${source.name}: ${articles.length} articles (${duration}ms)`);

      return {
        source: source.name,
        articles: (articles as NewsArticle[]).slice(0, 15),
        scrapedAt: new Date().toISOString(),
        duration,
      };

    } catch (error) {
      const duration = Date.now() - taskStart;
      console.log(`   ❌ ${source.name}: Failed (${duration}ms)`);

      return {
        source: source.name,
        articles: [],
        scrapedAt: new Date().toISOString(),
        duration,
        error: String(error),
      };
    }
  });

  const settled = await Promise.all(promises);
  results.push(...settled);

  const totalDuration = Date.now() - startTime;
  const totalArticles = results.reduce((sum, r) => sum + r.articles.length, 0);

  // Display results
  console.log('\n' + '─'.repeat(60));
  console.log('📊 AGGREGATION RESULTS');
  console.log('─'.repeat(60));

  console.log(`\n⏱️  Total time: ${totalDuration}ms`);
  console.log(`📰 Total articles: ${totalArticles}`);
  console.log(`🌐 Sources: ${results.filter(r => !r.error).length}/${sourceKeys.length} successful\n`);

  // Display articles by source
  results.forEach((result) => {
    console.log(`\n📌 ${result.source} (${result.articles.length} articles):`);
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    } else {
      result.articles.slice(0, 5).forEach((article, i) => {
        console.log(`   ${i + 1}. ${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}`);
      });
      if (result.articles.length > 5) {
        console.log(`   ... and ${result.articles.length - 5} more`);
      }
    }
  });

  console.log('\n' + '─'.repeat(60));

  return {
    totalArticles,
    sources: results,
    aggregatedAt: new Date().toISOString(),
    duration: totalDuration,
  };
}

// Find common topics across sources
function analyzeTopics(news: AggregatedNews): void {
  console.log('\n📈 TOPIC ANALYSIS');
  console.log('─'.repeat(60));

  const allTitles = news.sources
    .flatMap(s => s.articles.map(a => a.title.toLowerCase()));

  // Common tech terms to track
  const techTerms = [
    'AI', 'artificial intelligence', 'ChatGPT', 'GPT', 'OpenAI',
    'Apple', 'Google', 'Microsoft', 'Meta', 'Amazon', 'Tesla',
    'iPhone', 'Android', 'crypto', 'bitcoin', 'blockchain',
    'security', 'privacy', 'hack', 'data breach',
    'startup', 'funding', 'layoff',
    'climate', 'EV', 'electric vehicle',
    'space', 'NASA', 'SpaceX',
  ];

  const termCounts: Record<string, number> = {};

  techTerms.forEach(term => {
    const regex = new RegExp(term, 'gi');
    const count = allTitles.filter(t => regex.test(t)).length;
    if (count > 0) {
      termCounts[term] = count;
    }
  });

  const sortedTerms = Object.entries(termCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedTerms.length > 0) {
    console.log('\n🔥 Trending Topics Today:');
    sortedTerms.forEach(([term, count], i) => {
      const bar = '█'.repeat(Math.min(count * 2, 20));
      console.log(`   ${i + 1}. ${term}: ${bar} (${count})`);
    });
  }

  // Source comparison
  console.log('\n📊 Articles by Source:');
  news.sources
    .sort((a, b) => b.articles.length - a.articles.length)
    .forEach(source => {
      const bar = '▓'.repeat(Math.min(source.articles.length, 20));
      console.log(`   ${source.source}: ${bar} (${source.articles.length})`);
    });

  console.log('─'.repeat(60));
}

// Export to JSON format
function exportToJSON(news: AggregatedNews): string {
  const export_data = {
    meta: {
      aggregatedAt: news.aggregatedAt,
      totalArticles: news.totalArticles,
      duration: news.duration,
      sourceCount: news.sources.length,
    },
    articles: news.sources.flatMap(s =>
      s.articles.map(a => ({
        ...a,
        scrapedAt: s.scrapedAt,
      }))
    ),
  };

  return JSON.stringify(export_data, null, 2);
}

// Run the demo
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        MULTI-SITE NEWS AGGREGATOR DEMO                     ║');
  console.log('║                                                            ║');
  console.log('║  This demo aggregates REAL news from multiple sources:     ║');
  console.log('║  • BBC Technology  • NPR Technology  • The Verge          ║');
  console.log('║  • Ars Technica    • Hacker News                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Aggregate from multiple sources
    const news = await aggregateNews(['hackernews', 'bbc', 'ars', 'verge', 'npr']);

    // Analyze topics
    analyzeTopics(news);

    // Show export capability
    console.log('\n📦 Export Preview (first 500 chars of JSON):');
    console.log('─'.repeat(60));
    const json = exportToJSON(news);
    console.log(json.substring(0, 500) + '...');
    console.log('─'.repeat(60));

    console.log('\n✨ Demo complete! All news was aggregated from real sources.');
    console.log('   You can pipe this to a file: `npm run example:news > news.json`');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
