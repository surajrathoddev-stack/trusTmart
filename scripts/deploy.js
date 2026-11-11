// scripts/deploy.js
// Hardhat deployment script for the TrusTmart contract.

const hre = require("hardhat");

async function main() {
  console.log("Deploying TrusTmart contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const TrusTmart = await hre.ethers.getContractFactory("TrusTmart");
  const contract = await TrusTmart.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("TrusTmart deployed to:", address);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());

  // Log deployment info for documentation
  console.log("\n--- Deployment Summary ---");
  console.log("Contract Address:", address);
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Timestamp:", new Date().toISOString());
  console.log("--------------------------\n");

  // The ABI is available in artifacts/contracts/TrusTmart.sol/TrusTmart.json
  console.log("ABI location: artifacts/contracts/TrusTmart.sol/TrusTmart.json");
  console.log("\nUpdate your .env file with:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

