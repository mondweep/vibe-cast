/**
 * Real-World Example 2: GitHub Trending Repositories
 *
 * Demonstrates:
 * - Scraping real data from github.com/trending
 * - Extracting structured repository information
 * - Language filtering
 * - Time range selection (daily, weekly, monthly)
 *
 * This is a REAL, WORKING example using the actual GitHub website.
 * Perfect for discovering popular open-source projects!
 */

import { createBrowserService } from '@claude-flow/browser';

interface TrendingRepo {
  rank: number;
  name: string;           // owner/repo
  owner: string;
  repo: string;
  url: string;
  description: string;
  language: string | null;
  languageColor: string | null;
  stars: number;
  starsToday: number;
  forks: number;
  contributors: string[];
}

interface GitHubTrendingResult {
  repos: TrendingRepo[];
  language: string;
  timeRange: string;
  scrapedAt: string;
}

type TimeRange = 'daily' | 'weekly' | 'monthly';
type Language = 'all' | 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'java' | 'cpp';

async function scrapeGitHubTrending(
  language: Language = 'all',
  timeRange: TimeRange = 'daily'
): Promise<GitHubTrendingResult> {
  console.log('🐙 GitHub Trending Repositories Scraper');
  console.log('═'.repeat(60));

  const browser = createBrowserService({
    sessionId: 'github-trending',
    enableSecurity: true,
    enableMemory: true,
  });

  // Build URL based on options
  let url = 'https://github.com/trending';
  if (language !== 'all') {
    url += `/${language}`;
  }
  url += `?since=${timeRange}`;

  console.log(`\n📍 Scraping: ${url}`);
  console.log(`   Language: ${language === 'all' ? 'All Languages' : language}`);
  console.log(`   Time Range: ${timeRange}\n`);

  try {
    browser.startTrajectory(`Scrape GitHub trending - ${language} - ${timeRange}`);

    await browser.open(url);

    // Take snapshot for AI context
    const snapshot = await browser.snapshot({ interactive: true });
    console.log(`   Page title: ${snapshot.title}`);

    // Extract trending repositories
    console.log('🔍 Extracting repository data...\n');

    const repos = (await browser.eval(`
      (() => {
        const repos = [];
        const articles = document.querySelectorAll('article.Box-row');

        articles.forEach((article, index) => {
          // Get repo name (h2 > a)
          const repoLink = article.querySelector('h2 a');
          const fullName = repoLink?.textContent?.trim().replace(/\\s+/g, '') || '';
          const [owner, repo] = fullName.split('/');
          const url = repoLink?.href || '';

          // Get description
          const descEl = article.querySelector('p.col-9');
          const description = descEl?.textContent?.trim() || 'No description';

          // Get language
          const langEl = article.querySelector('[itemprop="programmingLanguage"]');
          const language = langEl?.textContent?.trim() || null;

          // Get language color
          const langColorEl = article.querySelector('.repo-language-color');
          const langColor = langColorEl?.style?.backgroundColor || null;

          // Get star count
          const starLinks = article.querySelectorAll('a.Link--muted');
          let stars = 0;
          let forks = 0;
          starLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent?.trim().replace(/,/g, '') || '0';
            if (href.includes('/stargazers')) {
              stars = parseInt(text) || 0;
            } else if (href.includes('/forks')) {
              forks = parseInt(text) || 0;
            }
          });

          // Get stars today
          const todayEl = article.querySelector('span.d-inline-block.float-sm-right');
          const todayText = todayEl?.textContent?.trim() || '0 stars today';
          const starsToday = parseInt(todayText.replace(/[^0-9]/g, '')) || 0;

          // Get contributors (avatar images)
          const contributors = [];
          const avatars = article.querySelectorAll('img.avatar');
          avatars.forEach(img => {
            const alt = img.getAttribute('alt')?.replace('@', '') || '';
            if (alt) contributors.push(alt);
          });

          repos.push({
            rank: index + 1,
            name: fullName,
            owner: owner || '',
            repo: repo || '',
            url: url,
            description: description.substring(0, 200),
            language: language,
            languageColor: langColor,
            stars: stars,
            starsToday: starsToday,
            forks: forks,
            contributors: contributors.slice(0, 5)
          });
        });

        return repos;
      })()
    `)).data.result;

    await browser.endTrajectory(true, `Found ${repos.length} trending repos`);

    // Display results
    console.log('─'.repeat(60));
    console.log('📊 TRENDING REPOSITORIES');
    console.log('─'.repeat(60));
    console.log(`\n🔢 Found ${repos.length} trending repositories\n`);

    // Display repos with nice formatting
    (repos as TrendingRepo[]).forEach((repo) => {
      const langBadge = repo.language ? `[${repo.language}]` : '[Unknown]';
      console.log(`${repo.rank}. ${repo.name} ${langBadge}`);
      console.log(`   📝 ${repo.description.substring(0, 70)}${repo.description.length > 70 ? '...' : ''}`);
      console.log(`   ⭐ ${repo.stars.toLocaleString()} stars (+${repo.starsToday} today) | 🍴 ${repo.forks.toLocaleString()} forks`);
      console.log(`   🔗 ${repo.url}`);
      console.log('');
    });

    // Summary statistics
    const byLanguage = (repos as TrendingRepo[]).reduce((acc: Record<string, number>, r) => {
      const lang = r.language || 'Unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});

    const totalStars = (repos as TrendingRepo[]).reduce((sum, r) => sum + r.stars, 0);
    const totalStarsToday = (repos as TrendingRepo[]).reduce((sum, r) => sum + r.starsToday, 0);

    console.log('─'.repeat(60));
    console.log('📈 Statistics:');
    console.log(`   Total stars: ${totalStars.toLocaleString()}`);
    console.log(`   Stars gained today: ${totalStarsToday.toLocaleString()}`);
    console.log('\n   Languages breakdown:');
    Object.entries(byLanguage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([lang, count]) => {
        console.log(`      ${lang}: ${count} repos`);
      });
    console.log('─'.repeat(60));

    return {
      repos: repos as TrendingRepo[],
      language,
      timeRange,
      scrapedAt: new Date().toISOString(),
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

// Scrape multiple languages in parallel using swarm
import { createBrowserSwarm } from '@claude-flow/browser';

async function scrapeMultipleLanguages(
  languages: Language[]
): Promise<Map<Language, TrendingRepo[]>> {
  console.log('\n🐝 Parallel Scraping: Multiple Languages');
  console.log('═'.repeat(60));

  const swarm = createBrowserSwarm({
    maxSessions: 3,
    enableSecurity: true,
  });

  const results = new Map<Language, TrendingRepo[]>();
  const startTime = Date.now();

  const promises = languages.map(async (lang) => {
    console.log(`   🚀 Starting scraper for: ${lang}`);

    try {
      const browser = await swarm.spawnAgent('scraper');
      const url = lang === 'all'
        ? 'https://github.com/trending'
        : `https://github.com/trending/${lang}`;

      await browser.open(url);

      const repos = (await browser.eval(`
        (() => {
          const repos = [];
          document.querySelectorAll('article.Box-row').forEach((article, i) => {
            const repoLink = article.querySelector('h2 a');
            const name = repoLink?.textContent?.trim().replace(/\\s+/g, '') || '';
            const stars = article.querySelector('a[href*="/stargazers"]')?.textContent?.trim() || '0';

            if (name) {
              repos.push({
                rank: i + 1,
                name,
                stars: parseInt(stars.replace(/,/g, '')) || 0
              });
            }
          });
          return repos;
        })()
      `)).data.result;

      await browser.close();

      console.log(`   ✅ ${lang}: Found ${repos.length} repos`);
      return { lang, repos };

    } catch (error) {
      console.log(`   ❌ ${lang}: Failed - ${error}`);
      return { lang, repos: [] };
    }
  });

  const settled = await Promise.all(promises);
  settled.forEach(({ lang, repos }) => {
    results.set(lang, repos as TrendingRepo[]);
  });

  const duration = Date.now() - startTime;
  console.log(`\n⏱️  Parallel scraping completed in ${duration}ms`);

  return results;
}

// Run the demo
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       GITHUB TRENDING REAL-WORLD SCRAPER DEMO              ║');
  console.log('║                                                            ║');
  console.log('║  This demo scrapes REAL data from github.com/trending      ║');
  console.log('║  Discover the hottest open-source projects!                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 1. Scrape all languages (default)
    await scrapeGitHubTrending('all', 'daily');

    // 2. Scrape specific language
    console.log('\n\n');
    console.log('═'.repeat(60));
    console.log('🦀 BONUS: Scraping TypeScript trending repos...');
    console.log('═'.repeat(60));
    console.log('');

    await scrapeGitHubTrending('typescript', 'weekly');

    // 3. Parallel scraping demo
    console.log('\n\n');
    await scrapeMultipleLanguages(['python', 'rust', 'go']);

    console.log('\n✨ Demo complete! All data was scraped from real GitHub.');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
