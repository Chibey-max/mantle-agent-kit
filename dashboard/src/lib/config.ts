export interface ContractAddresses {
  walletAddress: string;
  identityAddress: string;
  vaultAddress: string;
}

const ENV_ADDRESSES: ContractAddresses = {
  walletAddress: process.env.NEXT_PUBLIC_AGENT_CONTRACT_ADDRESS || "",
  identityAddress: process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "",
  vaultAddress: process.env.NEXT_PUBLIC_TRADING_VAULT_ADDRESS || "",
};

export function getContractAddresses(): ContractAddresses {
  if (typeof window === "undefined") return ENV_ADDRESSES;
  return {
    walletAddress:
      localStorage.getItem("AGENT_CONTRACT_ADDRESS") || ENV_ADDRESSES.walletAddress,
    identityAddress:
      localStorage.getItem("IDENTITY_CONTRACT_ADDRESS") || ENV_ADDRESSES.identityAddress,
    vaultAddress:
      localStorage.getItem("TRADING_VAULT_ADDRESS") || ENV_ADDRESSES.vaultAddress,
  };
}

export function saveContractAddresses(addresses: ContractAddresses): void {
  localStorage.setItem("AGENT_CONTRACT_ADDRESS", addresses.walletAddress);
  localStorage.setItem("IDENTITY_CONTRACT_ADDRESS", addresses.identityAddress);
  localStorage.setItem("TRADING_VAULT_ADDRESS", addresses.vaultAddress);
}
