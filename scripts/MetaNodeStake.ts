import hre from "hardhat";

/**
 * 简化的部署脚本：仅部署 MetaNodeStake（UUPS 代理）。
 * 适用于已部署好 MetaNodeToken 的场景。
 */
async function main() {
  const { ethers } = await hre.network.create();

  // 已部署的 MetaNodeToken 地址 — 请根据实际部署修改
  const MetaNodeToken = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  // 质押起始区块高度（正式部署时读取当前区块高度）
  const startBlock = 6529999;
  // 质押结束区块高度（sepolia 约 12s 一个区块）
  const endBlock = 9529999;
  // 每个区块奖励的 MetaNode token 数量（0.02 个，18 位精度）
  const MetaNodePerBlock = "20000000000000000";

  const Stake = await ethers.getContractFactory("MetaNodeStake");
  console.log("Deploying MetaNodeStake...");
  const s = await hre.upgrades.deployProxy(
    Stake,
    [MetaNodeToken, startBlock, endBlock, MetaNodePerBlock],
    { initializer: "initialize", kind: "uups" },
  );
  await s.waitForDeployment();

  const proxyAddress = await s.getAddress();
  const implAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("MetaNodeStake (proxy) deployed to:", proxyAddress);
  console.log("MetaNodeStake (implementation) deployed to:", implAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
