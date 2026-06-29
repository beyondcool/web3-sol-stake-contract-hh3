import hre from "hardhat";
import { ethers } from "ethers";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const { ethers: hhEthers } = await hre.network.create();
  const [signer] = await hhEthers.getSigners();

  // 已部署的 MetaNodeStake 合约地址 — 请根据实际部署修改
  const STAKE_CONTRACT_ADDRESS = "0x56682aa855226f3228b374a69aF5017D174372Fe";
  // 本地测试地址:
  // const STAKE_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  console.log("signer:", signer.address);
  console.log("Stake 合约地址:", STAKE_CONTRACT_ADDRESS);

  const MetaNodeStake = await hhEthers.getContractAt(
    "MetaNodeStake",
    STAKE_CONTRACT_ADDRESS,
  );

  // 获取当前 nonce 和待处理交易数
  const nonce = await hhEthers.provider.getTransactionCount(signer.address, "latest");
  const pendingNonce = await hhEthers.provider.getTransactionCount(signer.address, "pending");

  console.log("当前 nonce:", nonce);
  console.log("待处理 nonce:", pendingNonce);

  if (pendingNonce > nonce) {
    console.log(
      "⚠️  有",
      pendingNonce - nonce,
      "个交易待处理，请等待它们完成后再试",
    );
    return;
  }

  try {
    console.log("正在发送 addPool 交易（原生 ETH 池子）...");

    const tx = await MetaNodeStake.connect(signer).addPool(
      ethers.ZeroAddress, // 原生 ETH: 使用 ZeroAddress
      500,                // poolWeight: 资金池权重
      100n,               // minDepositAmount: 最小质押金额（100 wei）
      20,                 // unstakeLockedBlocks: 解锁等待区块数
      true,               // withUpdate: 是否更新所有池子
      {
        nonce,
        gasLimit: 500000,
      },
    );

    console.log("交易已发送，hash:", tx.hash);
    console.log("等待交易确认...");

    const receipt = await tx.wait(1);
    console.log("✅ 交易成功! Gas 使用:", receipt!.gasUsed.toString());
    console.log("区块号:", receipt!.blockNumber);

    await delay(2000);

    const poolLength = await MetaNodeStake.poolLength();
    console.log("当前 pool 数量:", poolLength.toString());
  } catch (error: any) {
    console.error("❌ 错误详情:", error.message);

    if (error.message?.includes("in-flight transaction limit")) {
      console.log("\n解决方案:");
      console.log("1. 等待 1-2 分钟让待处理的交易完成");
      console.log(
        "2. 在 Etherscan 上检查待处理交易: https://sepolia.etherscan.io/address/" +
          signer.address,
      );
      console.log("3. 考虑升级到付费的 Alchemy 计划以获得更高的速率限制");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
