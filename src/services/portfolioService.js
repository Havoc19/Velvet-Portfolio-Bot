import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { fromWei, formatCurrency } from '../utils/numberFormatter.js';
import { fetchReturnsData } from './returnsService.js';

// Create axios instance with default config
const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  }
});

// Implement request caching
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

const getCacheKey = (url, params) => {
  return `${url}:${JSON.stringify(params)}`;
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

export const fetchPortfolioDetails = async (portfolioAddress) => {
  try {
    // Fetch data in parallel
    const [detailsResponse, tvlResponse, returnsResult] = await Promise.all([
      // Portfolio details
      (async () => {
        const cacheKey = getCacheKey(`/portfolio/${portfolioAddress}`, {});
        const cached = getCachedData(cacheKey);
        if (cached) return cached;

        const response = await api.get(`/portfolio/${portfolioAddress}`);
        setCachedData(cacheKey, response);
        return response;
      })(),

      // TVL data
      (async () => {
        const params = {
          portfolios: `bsc:${portfolioAddress}`,
          kind: 'tvl'
        };
        const cacheKey = getCacheKey('/portfolio/details', params);
        const cached = getCachedData(cacheKey);
        if (cached) return cached;

        const response = await api.get('/portfolio/details', { params });
        setCachedData(cacheKey, response);
        return response;
      })(),

      // Returns data
      fetchReturnsData(portfolioAddress)
    ]);

    if (!detailsResponse.data?.data) {
      return {
        success: false,
        error: 'Portfolio not found'
      };
    }

    const portfolioData = detailsResponse.data.data;

    if (!tvlResponse.data?.data?.[0]?.totalValueLiquidity) {
      return {
        success: false,
        error: 'No TVL data found for this portfolio'
      };
    }

    const tvlRaw = tvlResponse.data.data[0].totalValueLiquidity;
    const tvlInDollars = fromWei(tvlRaw);
    const tvlFormatted = formatCurrency(tvlInDollars);

    return {
      success: true,
      data: {
        name: portfolioData.name,
        symbol: portfolioData.symbol,
        creatorName: portfolioData.creatorName,
        chainName: portfolioData.chainName,
        tvl: tvlFormatted,
        nav: returnsResult.success ? returnsResult.data.nav : null,
        returns: returnsResult.success ? returnsResult.data.returns : null
      }
    };

  } catch (error) {
    logger.error(`Portfolio fetch error: ${error.message}`);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Portfolio not found'
        };
      }
      if (!error.response) {
        return {
          success: false,
          error: 'Network error. Please check your connection.'
        };
      }
    }
    
    return {
      success: false,
      error: 'Failed to fetch portfolio data'
    };
  }
};