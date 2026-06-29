import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();

  // 已部署的 MetaNodeStake 合约地址 — 请根据实际部署修改
  const STAKE_CONTRACT_ADDRESS = "0x62b7C03E5A42fedE09D1b862Cb7936B26fDc5c1e";

  const stakeContract = await ethers.getContractAt(
    "MetaNodeStake",
    STAKE_CONTRACT_ADDRESS,
  );
  const data = await stakeContract.MetaNode();
  console.log("MetaNode 代币地址:", data);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
