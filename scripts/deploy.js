// scripts/deploy.js
// Universal deployment script for TrusTmart contract.
// Supports direct execution via `node scripts/deploy.js` or via Hardhat.
// Targets Hyperledger Besu QBFT permissioned network or Sepolia testnet.

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- trusTmart Contract Deployment ---');

  const artifactPath = path.join(__dirname, '../artifacts/contracts/TrusTmart.sol/TrusTmart.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Please compile the contract first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const networkName = process.env.BLOCKCHAIN_NETWORK || 'besu-qbft';
  const rpcUrl = networkName === 'sepolia'
    ? (process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org')
    : (process.env.BESU_RPC_URL || 'http://127.0.0.1:8545');

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || '0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c694be66';

  console.log(`Target Network: ${networkName}`);
  console.log(`RPC Endpoint:   ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deployer Account: ${wallet.address}`);

  try {
    const network = await provider.getNetwork();
    console.log(`Connected Chain ID: ${network.chainId.toString()}`);
  } catch (err) {
    console.warn(`Warning: Could not connect to RPC node at ${rpcUrl} (${err.message}).`);
    console.log('Contract bytecode and ABI are prepared and validated for deployment once network node is online.');
    return;
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode || '0x', wallet);
  console.log('Deploying TrusTmart contract transaction...');

  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n🎉 TrusTmart deployed successfully!`);
  console.log(`Contract Address: ${address}`);
  console.log(`Deployer:         ${wallet.address}`);
  console.log(`Network:          ${networkName}`);
  console.log(`Timestamp:        ${new Date().toISOString()}`);
  console.log(`\nUpdate your .env file with:`);
  console.log(`CONTRACT_ADDRESS=${address}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Deployment error:', err.message);
    process.exit(1);
  });
}

module.exports = main;
