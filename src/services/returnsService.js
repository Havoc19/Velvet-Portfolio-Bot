import axios from 'axios';
import Big from 'big.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { fromWei, formatNAV } from '../utils/numberFormatter.js';

const calculateReturns = (firstEntry, lastEntry) => {
  if (!firstEntry?.metadata?.indexRate || !lastEntry?.metadata?.indexRate) {
    return null;
  }

  const firstIndexRate = new Big(firstEntry.metadata.indexRate);
  const lastIndexRate = new Big(lastEntry.metadata.indexRate);

  return lastIndexRate
    .minus(firstIndexRate)
    .div(firstIndexRate)
    .times(100)
    .toFixed(2);
};

export const fetchReturnsDataWithScale = async (portfolioAddress, scale = 'all') => {
  try {
    // First get portfolio details to get chain
    const detailsUrl = `${config.apiBaseUrl}/portfolio/${portfolioAddress}`;
    const detailsResponse = await axios.get(detailsUrl);

    if (!detailsResponse.data?.data?.chainName) {
      return {
        success: false,
        error: 'Portfolio not found'
      };
    }

    const chainName = detailsResponse.data.data.chainName;

    // Then fetch returns data with scale
    const url = `${config.apiBaseUrl}/portfolio/graph`;
    const response = await axios.get(url, {
      params: {
        portfolio: portfolioAddress,
        scale: scale,
        chain: chainName
      },
      timeout: 30000
    });

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      return {
        success: false,
        error: 'Invalid returns data format'
      };
    }

    const graphData = response.data.data;
    
    if (graphData.length < 2) {
      return {
        success: false,
        error: 'Insufficient data for the selected time scale'
      };
    }

    // Find first non-zero index rate
    const firstNonZeroEntry = graphData.find(entry => 
      entry.metadata?.indexRate && entry.metadata.indexRate !== '0'
    );

    const latestEntry = graphData[graphData.length - 1];

    if (!firstNonZeroEntry || !latestEntry) {
      return {
        success: false,
        error: 'Insufficient data to calculate returns'
      };
    }

    const returns = calculateReturns(firstNonZeroEntry, latestEntry);
    const navValue = fromWei(latestEntry.metadata.indexRate);
    const formattedNAV = formatNAV(navValue);

    return {
      success: true,
      data: {
        returns,
        nav: formattedNAV,
        firstTimestamp: firstNonZeroEntry.timestamp,
        latestTimestamp: latestEntry.timestamp
      }
    };

  } catch (error) {
    logger.error(`Returns calculation error: ${error.message}`);
    return {
      success: false,
      error: 'Failed to calculate returns'
    };
  }
};

export const fetchAllReturnsData = async (portfolioAddress) => {
  try {
    const timeScales = ['hour', 'day', 'week', 'one_month', 'three_month', 'all'];
    const results = await Promise.all(
      timeScales.map(scale => fetchReturnsDataWithScale(portfolioAddress, scale))
    );

    // Get NAV from the latest result (any scale will do as they all have the same latest NAV)
    const latestResult = results.find(r => r.success);
    if (!latestResult) {
      return {
        success: false,
        error: 'Failed to fetch returns data'
      };
    }

    const returns = {};
    timeScales.forEach((scale, index) => {
      returns[scale] = results[index].success ? results[index].data.returns : null;
    });

    return {
      success: true,
      data: {
        returns,
        nav: latestResult.data.nav
      }
    };
  } catch (error) {
    logger.error(`All returns calculation error: ${error.message}`);
    return {
      success: false,
      error: 'Failed to calculate returns'
    };
  }
};

export const fetchReturnsData = (portfolioAddress, chainName) => {
  return fetchReturnsDataWithScale(portfolioAddress, 'all');
};