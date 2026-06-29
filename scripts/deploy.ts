import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {
  const { ethers } = await hre.network.create();
  const [signer] = await ethers.getSigners();

  // ============ 1. 部署 MetaNodeToken ============
  console.log("\n--- 步骤 1: 部署 MetaNodeToken ---");
  const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
  const metaNodeToken = await MetaNodeToken.deploy();
  await metaNodeToken.waitForDeployment();
  const metaNodeTokenAddress = await metaNodeToken.getAddress();
  console.log("MetaNodeToken 部署成功，地址:", metaNodeTokenAddress);

  // ============ 2. 部署 MetaNodeStake (UUPS 代理) ============
  console.log("\n--- 步骤 2: 部署 MetaNodeStake ---");

  const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");

  // 设置初始化参数
  // initialize(IERC20 _MetaNode, uint256 _startBlock, uint256 _endBlock, uint256 _MetaNodePerBlock)
  const startBlock = 1n; // 替换为实际起始区块（正式部署时使用当前区块高度）
  const endBlock = 999999999999n; // 替换为实际结束区块
  const metaNodePerBlock = ethers.parseUnits("1", 18); // 每区块奖励 1 个 MetaNode

  const stake = await hre.upgrades.deployProxy(
    MetaNodeStake,
    [metaNodeTokenAddress, startBlock, endBlock, metaNodePerBlock],
    { initializer: "initialize", kind: "uups" },
  );
  await stake.waitForDeployment();

  const stakeAddress = await stake.getAddress();
  const implAddress = await hre.upgrades.erc1967.getImplementationAddress(stakeAddress);

  console.log("MetaNodeStake (proxy)    部署到:", stakeAddress);
  console.log("MetaNodeStake (implementation) 部署到:", implAddress);

  // ============ 3. 将 MetaNodeToken 转入质押合约 ============
  console.log("\n--- 步骤 3: 转入 MetaNodeToken 到质押合约 ---");
  const tokenAmount = await metaNodeToken.balanceOf(signer.address);
  if (tokenAmount > 0n) {
    let tx = await metaNodeToken.connect(signer).transfer(stakeAddress, tokenAmount);
    await tx.wait();
    console.log("已转入", ethers.formatUnits(tokenAmount, 18), "个 MetaNode 到质押合约");
  } else {
    console.log("⚠️  Deployer 没有 MetaNodeToken 余额，跳过转账");
  }

  // ============ 4. 验证合约 ============
  console.log("\n--- 步骤 4: 验证合约 ---");

  // 验证实现合约
  console.log("\n验证实现合约...");
  try {
    await verifyContract(
      { address: implAddress, constructorArgs: [] },
      hre,
    );
    console.log("✅ 实现合约验证成功！");
  } catch (e: any) {
    if (e.message?.includes("Already Verified")) {
      console.log("实现合约已验证，跳过。");
    } else {
      console.error("❌ 实现合约验证失败:", e.message);
    }
  }

  // 验证 MetaNodeToken
  console.log("\n验证 MetaNodeToken...");
  try {
    await verifyContract(
      { address: metaNodeTokenAddress, constructorArgs: [] },
      hre,
    );
    console.log("✅ MetaNodeToken 验证成功！");
  } catch (e: any) {
    if (e.message?.includes("Already Verified")) {
      console.log("MetaNodeToken 已验证，跳过。");
    } else {
      console.error("❌ MetaNodeToken 验证失败:", e.message);
    }
  }

  console.log("\n🎉 部署完成！");
  console.log("MetaNodeToken:   ", metaNodeTokenAddress);
  console.log("MetaNodeStake:   ", stakeAddress);
  console.log("MetaNodeStake 实现:", implAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
