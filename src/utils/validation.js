export const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validatePortfolioAddress = (address) => {
  if (!address) {
    throw new Error('Portfolio address is required');
  }
  
  if (!isValidEthereumAddress(address)) {
    throw new Error('Invalid portfolio address format. Please provide a valid Ethereum address');
  }
  
  return address;
};