import puppeteer, { Browser } from 'puppeteer';
import { z } from 'zod';

const urlSchema = z.string().url();

export class WebScraper {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeContent(url: string): Promise<string> {
    try {
      const validatedUrl = urlSchema.parse(url);
      await this.init();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      await page.setDefaultNavigationTimeout(
        parseInt(process.env.SCRAPE_TIMEOUT || '30000')
      );

      await page.goto(validatedUrl, {
        waitUntil: 'networkidle0',
      });

      // Extract main content
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.getElementsByTagName('script');
        const styles = document.getElementsByTagName('style');
        for (let i = scripts.length - 1; i >= 0; i--) {
          scripts[i].remove();
        }
        for (let i = styles.length - 1; i >= 0; i--) {
          styles[i].remove();
        }

        // Get the main content
        const mainContent = document.body.innerText;
        
        return mainContent
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000); 
      });

      await page.close();
      return content;
    } catch (error) {
      throw new Error(`Failed to scrape content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 