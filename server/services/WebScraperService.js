/**
 * Web Scraper Service - Real website scraping and monitoring
 * Uses Cheerio for parsing, Puppeteer for browser automation
 * 
 * REAL scraping - actual data extraction
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

class WebScraperService {
  constructor() {
    this.browser = null;
    this.monitored = new Map(); // Track monitored pages
    this.cache = new Map(); // Cache scraped content
  }

  /**
   * Initialize Puppeteer browser
   */
  async initBrowser() {
    if (this.browser) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('✅ Puppeteer browser initialized');
    } catch (error) {
      console.warn('⚠️  Puppeteer init failed, will use Axios fallback:', error.message);
    }
  }

  /**
   * Scrape HTML content (simple)
   * REAL - Uses Cheerio for parsing
   */
  async scrapeHTML(url, selector, extract = 'text') {
    try {
      const timeout = parseInt(process.env.SCRAPER_TIMEOUT) || 30000;
      const userAgent = process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (OMNIUS)';

      const response = await axios.get(url, {
        timeout,
        headers: { 'User-Agent': userAgent },
        validateStatus: () => true
      });

      const $ = cheerio.load(response.data);
      const elements = $(selector);
      const results = [];

      elements.each((i, elem) => {
        if (extract === 'text') {
          results.push($(elem).text().trim());
        } else if (extract === 'html') {
          results.push($(elem).html());
        } else if (extract === 'attr') {
          results.push($(elem).attr(extract));
        } else {
          results.push({
            text: $(elem).text().trim(),
            html: $(elem).html(),
            attrs: $(elem).attr()
          });
        }
      });

      return {
        url,
        selector,
        itemsFound: results.length,
        data: results.slice(0, 100),
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`HTML scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape with Puppeteer (for JavaScript-heavy sites)
   * REAL - Uses actual browser automation
   */
  async scrapeDynamic(url, selector, options = {}) {
    const {
      waitFor = 3000,
      extract = 'text',
      headless = true,
      screenshot = false
    } = options;

    let browser;

    try {
      browser = await puppeteer.launch({ headless });
      const page = await browser.newPage();

      // Set timeout and user agent
      const timeout = parseInt(process.env.SCRAPER_TIMEOUT) || 30000;
      page.setDefaultTimeout(timeout);
      page.setUserAgent(process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (OMNIUS)');

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for selector
      try {
        await page.waitForSelector(selector, { timeout: waitFor });
      } catch (e) {
        console.warn(`Selector not found: ${selector}`);
      }

      // Take screenshot if requested
      let screenshotPath = null;
      if (screenshot) {
        screenshotPath = `screenshots/${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
      }

      // Extract content
      const results = await page.evaluate(
        (selector, extract) => {
          const elements = document.querySelectorAll(selector);
          const data = [];

          elements.forEach(elem => {
            if (extract === 'text') {
              data.push(elem.textContent.trim());
            } else if (extract === 'html') {
              data.push(elem.innerHTML);
            } else if (extract === 'attr') {
              data.push(elem.getAttribute(extract));
            } else {
              data.push({
                text: elem.textContent.trim(),
                html: elem.innerHTML,
                classes: elem.className
              });
            }
          });

          return data;
        },
        selector,
        extract
      );

      await browser.close();

      return {
        url,
        selector,
        itemsFound: results.length,
        data: results.slice(0, 100),
        screenshot: screenshotPath,
        timestamp: new Date(),
        method: 'puppeteer'
      };
    } catch (error) {
      if (browser) await browser.close();
      throw new Error(`Dynamic scraping failed: ${error.message}`);
    }
  }

  /**
   * Monitor website for changes
   * REAL - Tracks content changes
   */
  async monitorPage(url, selector, checkInterval = 3600000) {
    try {
      const monitorId = crypto.randomBytes(8).toString('hex');

      // Get initial content
      const initial = await this.scrapeHTML(url, selector);
      const hash = this.hashContent(initial.data);

      // Store monitor info
      this.monitored.set(monitorId, {
        url,
        selector,
        lastHash: hash,
        lastChecked: new Date(),
        changeDetected: false,
        changeCount: 0,
        interval: checkInterval
      });

      // Start monitoring interval
      const interval = setInterval(async () => {
        try {
          const current = await this.scrapeHTML(url, selector);
          const currentHash = this.hashContent(current.data);

          const monitor = this.monitored.get(monitorId);
          if (monitor.lastHash !== currentHash) {
            monitor.changeDetected = true;
            monitor.changeCount++;
            monitor.lastHash = currentHash;

            console.log(`🔔 Change detected on ${url}`);

            // Could trigger notification/webhook here
          }

          monitor.lastChecked = new Date();
        } catch (error) {
          console.error(`Monitoring failed: ${error.message}`);
        }
      }, checkInterval);

      return {
        monitorId,
        url,
        selector,
        checkInterval,
        status: 'monitoring'
      };
    } catch (error) {
      throw new Error(`Failed to setup monitoring: ${error.message}`);
    }
  }

  /**
   * Stop monitoring page
   */
  stopMonitoring(monitorId) {
    const monitor = this.monitored.get(monitorId);
    if (!monitor) {
      throw new Error(`Monitor not found: ${monitorId}`);
    }

    this.monitored.delete(monitorId);
    return { success: true, monitorId };
  }

  /**
   * Get all monitored pages
   */
  getMonitoredPages() {
    const pages = [];

    for (const [monitorId, monitor] of this.monitored) {
      pages.push({
        monitorId,
        url: monitor.url,
        selector: monitor.selector,
        lastChecked: monitor.lastChecked,
        changeDetected: monitor.changeDetected,
        changes: monitor.changeCount
      });
    }

    return pages;
  }

  /**
   * Extract structured data from page
   * Maps multiple selectors to data fields
   */
  async extractStructuredData(url, mappings) {
    try {
      const response = await axios.get(url, {
        timeout: parseInt(process.env.SCRAPER_TIMEOUT) || 30000
      });

      const $ = cheerio.load(response.data);
      const result = {};

      // Apply mappings
      for (const [field, selector] of Object.entries(mappings)) {
        const elements = $(selector);
        const data = [];

        elements.each((i, elem) => {
          data.push($(elem).text().trim());
        });

        result[field] = data.length === 1 ? data[0] : data;
      }

      return {
        url,
        data: result,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Structured extraction failed: ${error.message}`);
    }
  }

  /**
   * Scrape multiple pages
   */
  async batchScrape(urls, selector) {
    const results = [];

    for (const url of urls) {
      try {
        const result = await this.scrapeHTML(url, selector);
        results.push({ url, success: true, data: result.data });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }

    return {
      total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Hash content for change detection
   */
  hashContent(data) {
    const json = JSON.stringify(data);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Cache scraped content
   */
  async scrapeWithCache(url, selector, cacheDuration = 3600000) {
    const cacheKey = `${url}:${selector}`;
    const cached = this.cache.get(cacheKey);

    // Check if cache is still valid
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return { ...cached.data, fromCache: true };
    }

    // Fetch fresh content
    const result = await this.scrapeHTML(url, selector);

    // Cache it
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return { ...result, fromCache: false };
  }

  /**
   * Follow pagination
   */
  async scrapeWithPagination(baseUrl, selector, pageParam = 'page', maxPages = 5) {
    const allResults = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `${baseUrl}?${pageParam}=${page}`;
        const result = await this.scrapeHTML(url, selector);

        if (result.data.length === 0) break; // No more pages

        allResults.push(...result.data);
      } catch (error) {
        console.warn(`Failed to scrape page ${page}: ${error.message}`);
        break;
      }
    }

    return {
      baseUrl,
      selector,
      pagesCrawled: allResults.length > 0 ? Math.ceil(allResults.length / 20) : 0,
      totalItems: allResults.length,
      data: allResults
    };
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      monitoredPages: this.monitored.size,
      cachedPages: this.cache.size,
      cacheSize: `${(this.cache.size * 50)} KB (estimated)`
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    return { success: true, clearedItems: size };
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }
}

export default new WebScraperService();
