import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { fromWei, formatCurrency } from '../utils/numberFormatter.js';

export const fetchTVLData = async (portfolioAddress, chainId = 'bsc') => {
  try {
    const url = `${config.apiBaseUrl}/portfolio/details`;
    
    const response = await axios.get(url, {
      params: {
        portfolios: `${chainId}:${portfolioAddress}`,
        kind: 'tvl'
      },
      timeout: 30000
    });

    logger.debug(`API Response: ${JSON.stringify(response.data)}`);

    if (!response.data?.data?.[0]?.totalValueLiquidity) {
      return {
        success: false,
        error: 'No TVL data found for this portfolio'
      };
    }

    const tvlRaw = response.data.data[0].totalValueLiquidity;

    // Convert from wei to dollars and format
    const tvlInDollars = fromWei(tvlRaw);
    const tvlFormatted = formatCurrency(tvlInDollars);

    return {
      success: true,
      tvl: tvlFormatted,
      raw: {
        totalValueLiquidity: tvlRaw
      }
    };

  } catch (error) {
    logger.error(`TVL fetch error: ${error.message}`);
    
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
      error: 'Failed to fetch TVL data'
    };
  }
};