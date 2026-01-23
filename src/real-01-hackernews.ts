/**
 * Real-World Example 1: Hacker News Top Stories
 *
 * Demonstrates:
 * - Scraping real data from news.ycombinator.com
 * - Extracting structured story information
 * - Handling pagination
 * - Real-world data processing
 *
 * This is a REAL, WORKING example - Hacker News has a simple HTML structure
 * and is openly scrapable (they also provide an API, but this demo shows
 * browser automation capabilities).
 */

import { createBrowserService } from '@claude-flow/browser';

interface HackerNewsStory {
  rank: number;
  title: string;
  url: string;
  domain?: string;
  points: number;
  author: string;
  comments: number;
  timeAgo: string;
}

interface HackerNewsResult {
  stories: HackerNewsStory[];
  scrapedAt: string;
  page: number;
  totalStories: number;
}

async function scrapeHackerNews(pages: number = 1): Promise<HackerNewsResult> {
  console.log('🔶 Hacker News Top Stories Scraper');
  console.log('═'.repeat(60));
  console.log(`\n📰 Fetching top stories from news.ycombinator.com...\n`);

  const browser = createBrowserService({
    sessionId: 'hackernews-scraper',
    enableSecurity: true,
    enableMemory: true,
  });

  const allStories: HackerNewsStory[] = [];

  try {
    browser.startTrajectory('Scrape Hacker News top stories');

    for (let page = 1; page <= pages; page++) {
      const url = page === 1
        ? 'https://news.ycombinator.com/'
        : `https://news.ycombinator.com/news?p=${page}`;

      console.log(`📍 Opening page ${page}: ${url}`);
      await browser.open(url);

      // Take snapshot for AI context
      const snapshot = await browser.snapshot({ interactive: true });
      console.log(`   Page title: ${snapshot.title || 'Hacker News'}`);

      // Extract stories using JavaScript evaluation
      console.log('🔍 Extracting stories...');
      const pageStories = (await browser.eval(`
        (() => {
          const stories = [];
          const rows = document.querySelectorAll('tr.athing');

          rows.forEach((row) => {
            const rank = row.querySelector('.rank')?.textContent?.replace('.', '') || '0';
            const titleCell = row.querySelector('.titleline');
            const titleLink = titleCell?.querySelector('a');
            const siteStr = titleCell?.querySelector('.sitestr')?.textContent;

            // Get the subtext row (next sibling)
            const subtext = row.nextElementSibling?.querySelector('.subtext');
            const score = subtext?.querySelector('.score')?.textContent || '0 points';
            const author = subtext?.querySelector('.hnuser')?.textContent || 'unknown';
            const ageElement = subtext?.querySelector('.age');
            const timeAgo = ageElement?.textContent || 'unknown';

            // Get comment count
            const links = subtext?.querySelectorAll('a') || [];
            let comments = 0;
            links.forEach(link => {
              const text = link.textContent || '';
              if (text.includes('comment')) {
                comments = parseInt(text) || 0;
              }
            });

            if (titleLink) {
              stories.push({
                rank: parseInt(rank),
                title: titleLink.textContent || '',
                url: titleLink.href || '',
                domain: siteStr || null,
                points: parseInt(score) || 0,
                author: author,
                comments: comments,
                timeAgo: timeAgo
              });
            }
          });

          return stories;
        })()
      `)).data.result as HackerNewsStory[];

      if (pageStories && Array.isArray(pageStories)) {
        allStories.push(...pageStories);
        console.log(`   ✅ Found ${pageStories.length} stories on page ${page}`);
      }

      // Small delay between pages to be respectful
      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await browser.endTrajectory(true, `Scraped ${allStories.length} stories from ${pages} page(s)`);

    // Display results
    console.log('\n' + '─'.repeat(60));
    console.log('📊 RESULTS');
    console.log('─'.repeat(60));
    console.log(`\n🔢 Total stories scraped: ${allStories.length}\n`);

    // Show top 10 stories
    console.log('🏆 Top 10 Stories:\n');
    allStories.slice(0, 10).forEach((story, i) => {
      console.log(`${story.rank || i + 1}. ${story.title}`);
      console.log(`   🔗 ${story.url.substring(0, 60)}${story.url.length > 60 ? '...' : ''}`);
      console.log(`   ⬆️  ${story.points} points | 💬 ${story.comments} comments | 👤 ${story.author}`);
      console.log('');
    });

    // Summary statistics
    const totalPoints = allStories.reduce((sum, s) => sum + s.points, 0);
    const totalComments = allStories.reduce((sum, s) => sum + s.comments, 0);
    const avgPoints = Math.round(totalPoints / allStories.length);

    console.log('─'.repeat(60));
    console.log('📈 Statistics:');
    console.log(`   Total points: ${totalPoints.toLocaleString()}`);
    console.log(`   Total comments: ${totalComments.toLocaleString()}`);
    console.log(`   Average points/story: ${avgPoints}`);
    console.log('─'.repeat(60));

    return {
      stories: allStories,
      scrapedAt: new Date().toISOString(),
      page: pages,
      totalStories: allStories.length,
    };

  } catch (error) {
    console.error('❌ Scraping failed:', error);
    await browser.endTrajectory(false, `Failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

// Alternative: Get specific category
async function scrapeHackerNewsCategory(category: 'newest' | 'ask' | 'show' | 'jobs' = 'newest'): Promise<HackerNewsResult> {
  console.log(`\n📂 Scraping Hacker News: ${category.toUpperCase()}\n`);

  const browser = createBrowserService({
    sessionId: `hackernews-${category}`,
    enableSecurity: true,
  });

  const urlMap = {
    newest: 'https://news.ycombinator.com/newest',
    ask: 'https://news.ycombinator.com/ask',
    show: 'https://news.ycombinator.com/show',
    jobs: 'https://news.ycombinator.com/jobs',
  };

  try {
    browser.startTrajectory(`Scrape Hacker News ${category}`);

    await browser.open(urlMap[category]);
    const snapshot = await browser.snapshot({ interactive: true });

    const stories = (await browser.eval(`
      (() => {
        const stories = [];
        const rows = document.querySelectorAll('tr.athing');

        rows.forEach((row, index) => {
          const titleCell = row.querySelector('.titleline');
          const titleLink = titleCell?.querySelector('a');
          const subtext = row.nextElementSibling?.querySelector('.subtext');
          const score = subtext?.querySelector('.score')?.textContent || '0 points';

          if (titleLink) {
            stories.push({
              rank: index + 1,
              title: titleLink.textContent || '',
              url: titleLink.href || '',
              points: parseInt(score) || 0,
              author: subtext?.querySelector('.hnuser')?.textContent || 'unknown',
              comments: 0,
              timeAgo: subtext?.querySelector('.age')?.textContent || ''
            });
          }
        });

        return stories;
      })()
    `)).data.result;

    await browser.endTrajectory(true, `Scraped ${category} section`);
    await browser.close();

    console.log(`✅ Found ${stories.length} items in ${category}\n`);
    stories.slice(0, 5).forEach((s: HackerNewsStory) => {
      console.log(`   ${s.rank}. ${s.title.substring(0, 50)}...`);
    });

    return {
      stories: stories as HackerNewsStory[],
      scrapedAt: new Date().toISOString(),
      page: 1,
      totalStories: stories.length,
    };

  } catch (error) {
    await browser.endTrajectory(false, String(error));
    await browser.close();
    throw error;
  }
}

// Run the demo
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        HACKER NEWS REAL-WORLD SCRAPER DEMO                 ║');
  console.log('║                                                            ║');
  console.log('║  This demo scrapes REAL data from news.ycombinator.com    ║');
  console.log('║  No fake URLs - actual working browser automation!         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Scrape main page (1 page = ~30 stories)
    const result = await scrapeHackerNews(1);

    // Also show how to scrape different sections
    console.log('\n\n');
    console.log('═'.repeat(60));
    console.log('📂 BONUS: Scraping different HN sections...');
    console.log('═'.repeat(60));

    await scrapeHackerNewsCategory('newest');

    console.log('\n✨ Demo complete! All data was scraped from real Hacker News.');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
