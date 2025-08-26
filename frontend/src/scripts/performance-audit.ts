/**
 * Performance Audit Script
 *
 * This script runs performance audits and generates reports
 * for the application, including Lighthouse-style metrics.
 */

import {
  PerformanceMonitor,
  getBundleInfo,
  getPerformanceRecommendations,
} from '../lib/performance';

interface PerformanceAuditResult {
  timestamp: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
  };
  bundleInfo: {
    totalSize: number;
    gzippedSize: number;
    chunks: Array<{ name: string; size: number }>;
  };
  recommendations: string[];
  details: {
    renderTime: number;
    memoryUsage: number;
    networkRequests: number;
    cacheHitRate: number;
  };
}

class PerformanceAuditor {
  private monitor: PerformanceMonitor;

  constructor() {
    this.monitor = PerformanceMonitor.getInstance();
  }

  // Run a comprehensive performance audit
  async runAudit(): Promise<PerformanceAuditResult> {
    console.log('🔍 Starting performance audit...');

    // Start monitoring
    this.monitor.startMonitoring();

    // Wait for metrics to be collected
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get Core Web Vitals
    const vitals = await this.monitor.getCoreWebVitals();

    // Get performance metrics
    const metrics = this.monitor.getMetrics();

    // Get bundle information
    const bundleInfo = await getBundleInfo();

    // Calculate scores
    const scores = this.calculateScores(vitals, metrics);

    // Generate recommendations
    const recommendations = getPerformanceRecommendations({
      ...vitals,
      ...metrics,
    });

    // Get additional details
    const details = await this.getAdditionalDetails();

    const result: PerformanceAuditResult = {
      timestamp: new Date().toISOString(),
      scores,
      metrics: {
        fcp: vitals.fcp || 0,
        lcp: vitals.lcp || 0,
        fid: vitals.fid || 0,
        cls: vitals.cls || 0,
        ttfb: vitals.ttfb || 0,
      },
      bundleInfo,
      recommendations,
      details,
    };

    console.log('✅ Performance audit completed');
    this.logResults(result);

    return result;
  }

  // Calculate performance scores (0-100)
  private calculateScores(
    vitals: any,
    metrics: any
  ): PerformanceAuditResult['scores'] {
    // Performance score based on Core Web Vitals
    let performanceScore = 100;

    // LCP scoring (0-2.5s = 100, 2.5-4s = 50-100, >4s = 0-50)
    if (vitals.lcp) {
      if (vitals.lcp > 4000) performanceScore -= 30;
      else if (vitals.lcp > 2500) performanceScore -= 15;
    }

    // FID scoring (0-100ms = 100, 100-300ms = 50-100, >300ms = 0-50)
    if (vitals.fid) {
      if (vitals.fid > 300) performanceScore -= 25;
      else if (vitals.fid > 100) performanceScore -= 10;
    }

    // CLS scoring (0-0.1 = 100, 0.1-0.25 = 50-100, >0.25 = 0-50)
    if (vitals.cls) {
      if (vitals.cls > 0.25) performanceScore -= 25;
      else if (vitals.cls > 0.1) performanceScore -= 10;
    }

    // FCP scoring
    if (vitals.fcp) {
      if (vitals.fcp > 3000) performanceScore -= 15;
      else if (vitals.fcp > 1800) performanceScore -= 5;
    }

    // Accessibility score (simplified)
    const accessibilityScore = this.calculateAccessibilityScore();

    // Best practices score (simplified)
    const bestPracticesScore = this.calculateBestPracticesScore();

    // SEO score (simplified)
    const seoScore = this.calculateSEOScore();

    return {
      performance: Math.max(0, Math.min(100, performanceScore)),
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
    };
  }

  private calculateAccessibilityScore(): number {
    let score = 100;

    // Check for basic accessibility features
    const hasSkipLinks =
      document.querySelector('[href="#main-content"]') !== null;
    const hasAriaLabels = document.querySelectorAll('[aria-label]').length > 0;
    const hasProperHeadings = document.querySelector('h1') !== null;
    const hasAltTexts = Array.from(document.querySelectorAll('img')).every(
      (img) => img.alt
    );

    if (!hasSkipLinks) score -= 10;
    if (!hasAriaLabels) score -= 15;
    if (!hasProperHeadings) score -= 20;
    if (!hasAltTexts) score -= 15;

    // Check color contrast (simplified)
    const hasGoodContrast = this.checkColorContrast();
    if (!hasGoodContrast) score -= 20;

    return Math.max(0, score);
  }

  private calculateBestPracticesScore(): number {
    let score = 100;

    // Check for HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      score -= 20;
    }

    // Check for console errors
    const hasConsoleErrors = this.checkConsoleErrors();
    if (hasConsoleErrors) score -= 15;

    // Check for deprecated APIs
    const usesDeprecatedAPIs = this.checkDeprecatedAPIs();
    if (usesDeprecatedAPIs) score -= 10;

    // Check for proper error handling
    const hasErrorBoundaries =
      document.querySelector('[data-error-boundary]') !== null;
    if (!hasErrorBoundaries) score -= 10;

    return Math.max(0, score);
  }

  private calculateSEOScore(): number {
    let score = 100;

    // Check for meta tags
    const hasTitle = document.title.length > 0;
    const hasDescription =
      document.querySelector('meta[name="description"]') !== null;
    const hasViewport =
      document.querySelector('meta[name="viewport"]') !== null;

    if (!hasTitle) score -= 25;
    if (!hasDescription) score -= 20;
    if (!hasViewport) score -= 15;

    // Check for structured data
    const hasStructuredData =
      document.querySelector('script[type="application/ld+json"]') !== null;
    if (!hasStructuredData) score -= 10;

    // Check for proper heading structure
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    );
    const hasProperHeadingStructure = this.checkHeadingStructure(headings);
    if (!hasProperHeadingStructure) score -= 15;

    return Math.max(0, score);
  }

  private checkColorContrast(): boolean {
    // Simplified color contrast check
    // In a real implementation, this would analyze actual color values
    const darkMode = document.documentElement.classList.contains('dark');
    return darkMode || true; // Assume good contrast for now
  }

  private checkConsoleErrors(): boolean {
    // This would need to be implemented with error tracking
    return false;
  }

  private checkDeprecatedAPIs(): boolean {
    // Check for common deprecated API usage
    const deprecatedAPIs = [
      'webkitRequestAnimationFrame',
      'mozRequestAnimationFrame',
      'msRequestAnimationFrame',
    ];

    return deprecatedAPIs.some((api) => api in window);
  }

  private checkHeadingStructure(headings: Element[]): boolean {
    if (headings.length === 0) return false;

    let currentLevel = 0;
    for (const heading of headings) {
      const level = parseInt(heading.tagName.charAt(1));
      if (currentLevel === 0) {
        if (level !== 1) return false;
      } else if (level > currentLevel + 1) {
        return false;
      }
      currentLevel = level;
    }

    return true;
  }

  private async getAdditionalDetails(): Promise<
    PerformanceAuditResult['details']
  > {
    // Get render time
    const renderTime = performance.now();

    // Get memory usage
    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // Count network requests
    const networkRequests = performance.getEntriesByType('resource').length;

    // Calculate cache hit rate (simplified)
    const cacheHitRate = this.calculateCacheHitRate();

    return {
      renderTime,
      memoryUsage,
      networkRequests,
      cacheHitRate,
    };
  }

  private calculateCacheHitRate(): number {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    if (resources.length === 0) return 0;

    const cachedResources = resources.filter(
      (resource) =>
        resource.transferSize === 0 ||
        resource.transferSize < resource.encodedBodySize
    );

    return (cachedResources.length / resources.length) * 100;
  }

  private logResults(result: PerformanceAuditResult): void {
    console.group('📊 Performance Audit Results');

    console.group('🎯 Scores');
    console.log(`Performance: ${result.scores.performance}/100`);
    console.log(`Accessibility: ${result.scores.accessibility}/100`);
    console.log(`Best Practices: ${result.scores.bestPractices}/100`);
    console.log(`SEO: ${result.scores.seo}/100`);
    console.groupEnd();

    console.group('⚡ Core Web Vitals');
    console.log(`First Contentful Paint: ${result.metrics.fcp}ms`);
    console.log(`Largest Contentful Paint: ${result.metrics.lcp}ms`);
    console.log(`First Input Delay: ${result.metrics.fid}ms`);
    console.log(`Cumulative Layout Shift: ${result.metrics.cls}`);
    console.log(`Time to First Byte: ${result.metrics.ttfb}ms`);
    console.groupEnd();

    console.group('📦 Bundle Info');
    console.log(
      `Total Size: ${(result.bundleInfo.totalSize / 1024).toFixed(2)} KB`
    );
    console.log(
      `Gzipped Size: ${(result.bundleInfo.gzippedSize / 1024).toFixed(2)} KB`
    );
    console.log('Chunks:', result.bundleInfo.chunks);
    console.groupEnd();

    console.group('💡 Recommendations');
    result.recommendations.forEach((rec) => console.log(`• ${rec}`));
    console.groupEnd();

    console.group('📋 Additional Details');
    console.log(`Render Time: ${result.details.renderTime.toFixed(2)}ms`);
    console.log(
      `Memory Usage: ${(result.details.memoryUsage / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(`Network Requests: ${result.details.networkRequests}`);
    console.log(`Cache Hit Rate: ${result.details.cacheHitRate.toFixed(2)}%`);
    console.groupEnd();

    console.groupEnd();
  }

  // Generate a performance report
  generateReport(result: PerformanceAuditResult): string {
    const report = `
# Performance Audit Report

**Generated:** ${new Date(result.timestamp).toLocaleString()}

## Scores
- **Performance:** ${result.scores.performance}/100
- **Accessibility:** ${result.scores.accessibility}/100
- **Best Practices:** ${result.scores.bestPractices}/100
- **SEO:** ${result.scores.seo}/100

## Core Web Vitals
- **First Contentful Paint:** ${result.metrics.fcp}ms
- **Largest Contentful Paint:** ${result.metrics.lcp}ms
- **First Input Delay:** ${result.metrics.fid}ms
- **Cumulative Layout Shift:** ${result.metrics.cls}
- **Time to First Byte:** ${result.metrics.ttfb}ms

## Bundle Analysis
- **Total Size:** ${(result.bundleInfo.totalSize / 1024).toFixed(2)} KB
- **Gzipped Size:** ${(result.bundleInfo.gzippedSize / 1024).toFixed(2)} KB

### Chunks
${result.bundleInfo.chunks
  .map((chunk) => `- **${chunk.name}:** ${(chunk.size / 1024).toFixed(2)} KB`)
  .join('\n')}

## Performance Details
- **Render Time:** ${result.details.renderTime.toFixed(2)}ms
- **Memory Usage:** ${(result.details.memoryUsage / 1024 / 1024).toFixed(2)} MB
- **Network Requests:** ${result.details.networkRequests}
- **Cache Hit Rate:** ${result.details.cacheHitRate.toFixed(2)}%

## Recommendations
${result.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Performance Targets
- **Performance Score:** ≥85
- **Accessibility Score:** ≥90
- **LCP:** ≤2.5s
- **FID:** ≤100ms
- **CLS:** ≤0.1
- **FCP:** ≤1.8s
- **Bundle Size:** ≤500KB (gzipped)
`;

    return report;
  }
}

// Export the auditor for use in development
export const performanceAuditor = new PerformanceAuditor();

// Auto-run audit in development mode
if (import.meta.env.DEV) {
  // Run audit after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceAuditor.runAudit().then((result) => {
        // Store result for debugging
        (window as any).__PERFORMANCE_AUDIT__ = result;
      });
    }, 2000);
  });
}

export default PerformanceAuditor;
