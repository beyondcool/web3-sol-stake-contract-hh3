import { expect } from "chai";
import hre, { network } from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades";
import type { MetaNodeStake } from "../types/ethers-contracts/MetaNodeStake.js";
import type { MetaNodeToken } from "../types/ethers-contracts/MetaNode.sol/MetaNodeToken.js";

const connection = await network.create();
const { ethers, networkHelpers } = connection;
const upgradesApi = await upgrades(hre as any, connection);

describe("stake test", function () {
  let admin: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let user1: typeof admin;
  let user2: typeof admin;
  let user3: typeof admin;
  let erc20Contract: MetaNodeToken;
  let stakeProxyContract: MetaNodeStake;

  const metaNodePerBlock = 100n;
  const blockHight = 10000;
  const unstakeLockedBlocks = 10;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  it("deploy", async function () {
    const [, _admin, _user1, _user2, _user3] = await ethers.getSigners();
    admin = _admin;
    user1 = _user1;
    user2 = _user2;
    user3 = _user3;

    // 部署 MetaNodeToken
    const MetaNodeTokenFactory = await ethers.getContractFactory("MetaNodeToken");
    erc20Contract = await MetaNodeTokenFactory.connect(admin).deploy();
    await erc20Contract.waitForDeployment();
    const erc20Address = await erc20Contract.getAddress();
    console.log("erc20ddress::", erc20Address);
    expect(erc20Address.length).to.be.gt(0);

    // 当前区块高度
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("当前区块高度::", blockNumber);

    // 部署 MetaNodeStake (UUPS 代理)
    const MetaNodeStakeFactory = await ethers.getContractFactory("MetaNodeStake");
    stakeProxyContract = (await upgradesApi.deployProxy(
      MetaNodeStakeFactory.connect(admin),
      [erc20Address, blockNumber, blockNumber + blockHight, metaNodePerBlock],
      { kind: "uups" },
    )) as unknown as MetaNodeStake;
    await stakeProxyContract.waitForDeployment();
    const metaNodeStakeAddress = await stakeProxyContract.getAddress();
    console.log("metaNodeStakeContract::", metaNodeStakeAddress);
    expect(metaNodeStakeAddress.length).to.be.gt(0);

    // 部署后新增 ETH 质押池
    await stakeProxyContract
      .connect(admin)
      .addPool(zeroAddress, 5, ethers.parseEther("0.001"), unstakeLockedBlocks, false);
    const poolLength = await stakeProxyContract.poolLength();
    expect(poolLength).to.be.gt(0n);
  });

  it("setMetaNode", async () => {
    const MetaNodeTokenFactory = await ethers.getContractFactory("MetaNodeToken");
    erc20Contract = await MetaNodeTokenFactory.connect(admin).deploy();
    await erc20Contract.waitForDeployment();
    const erc20Address = await erc20Contract.getAddress();

    await stakeProxyContract.connect(admin).setMetaNode(erc20Address);
    const newERC20 = await stakeProxyContract.MetaNode();
    expect(newERC20).to.eq(erc20Address);
  });

  it("pauseWithdraw", async () => {
    await stakeProxyContract.connect(admin).pauseWithdraw();
    const res = await stakeProxyContract.withdrawPaused();
    expect(res).to.be.true;
  });

  it("unpauseWithdraw", async () => {
    await stakeProxyContract.connect(admin).unpauseWithdraw();
    const res = await stakeProxyContract.withdrawPaused();
    expect(res).to.be.false;
  });

  it("pauseClaim", async () => {
    await stakeProxyContract.connect(admin).pauseClaim();
    const res = await stakeProxyContract.claimPaused();
    expect(res).to.be.true;
  });

  it("unpauseClaim", async () => {
    await stakeProxyContract.connect(admin).unpauseClaim();
    const res = await stakeProxyContract.claimPaused();
    expect(res).to.be.false;
  });

  it("setStartBlock", async () => {
    const blockNumber = await ethers.provider.getBlockNumber();
    await stakeProxyContract.connect(admin).setStartBlock(blockNumber);
    const res = await stakeProxyContract.startBlock();
    expect(res).to.eq(blockNumber);
  });

  it("setEndBlock", async () => {
    const startBlock = await stakeProxyContract.startBlock();
    const endBlock = startBlock + 100n;
    await stakeProxyContract.connect(admin).setEndBlock(endBlock);
    const res = await stakeProxyContract.endBlock();
    expect(res).to.eq(endBlock);
  });

  it("addPool", async () => {
    const tokenAddress = await erc20Contract.getAddress();
    const poolWeight = 10;
    const minDepositAmount = ethers.parseEther("1");
    const withUpdate = false;
    await stakeProxyContract
      .connect(admin)
      .addPool(tokenAddress, poolWeight, minDepositAmount, unstakeLockedBlocks, withUpdate);
    const poolLength = await stakeProxyContract.poolLength();
    expect(poolLength).to.be.gt(1n);
  });

  it("updatePool", async () => {
    await stakeProxyContract.connect(admin)["updatePool(uint256,uint256,uint256)"](0, ethers.parseEther("0.001"), 10);
    await stakeProxyContract.connect(admin).setPoolWeight(0, 20, true);
  });

  it("getMultiplier", async () => {
    const fromBlock = await stakeProxyContract.startBlock();
    const toBlock = fromBlock + 10n;
    const mul = await stakeProxyContract.getMultiplier(fromBlock, toBlock);
    expect(mul).to.eq(metaNodePerBlock * (toBlock - fromBlock));
  });

  it("deposit", async () => {
    // user1 deposit 10 ETH, user2 deposit 20 ETH
    await stakeProxyContract.connect(user1).depositETH({ value: ethers.parseEther("10") });
    await stakeProxyContract.connect(user2).depositETH({ value: ethers.parseEther("20") });

    // user3 deposit 200 USD token
    await erc20Contract.connect(admin).transfer(user3.address, ethers.parseEther("1000"));
    const proxyAddress = await stakeProxyContract.getAddress();
    await erc20Contract.connect(user3).approve(proxyAddress, ethers.parseEther("200"));
    await stakeProxyContract.connect(user3).deposit(1, ethers.parseEther("200"));

    const user1Stake = await stakeProxyContract.stakingBalance(0, user1.address);
    const user2Stake = await stakeProxyContract.stakingBalance(0, user2.address);
    const user3Stake = await stakeProxyContract.stakingBalance(1, user3.address);
    expect(user1Stake).to.eq(ethers.parseEther("10"));
    expect(user2Stake).to.eq(ethers.parseEther("20"));
    expect(user3Stake).to.eq(ethers.parseEther("200"));
  });

  it("unstake", async () => {
    await stakeProxyContract.connect(user1).unstake(0, ethers.parseEther("2"));
    await stakeProxyContract.connect(user2).unstake(0, ethers.parseEther("2"));
    await stakeProxyContract.connect(user3).unstake(1, ethers.parseEther("10"));

    const user1Stake = await stakeProxyContract.stakingBalance(0, user1.address);
    const user2Stake = await stakeProxyContract.stakingBalance(0, user2.address);
    const user3Stake = await stakeProxyContract.stakingBalance(1, user3.address);
    expect(user1Stake).to.eq(ethers.parseEther("8"));
    expect(user2Stake).to.eq(ethers.parseEther("18"));
    expect(user3Stake).to.eq(ethers.parseEther("190"));

    await stakeProxyContract.massUpdatePools();
  });

  it("withdraw", async () => {
    console.log(user1.address);

    const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
    const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
    const user3BalanceBefore = await erc20Contract.balanceOf(user3.address);
    console.log("user1BalanceBefore::", user1BalanceBefore);
    console.log("user2BalanceBefore::", user2BalanceBefore);
    console.log("user3BalanceBefore::", user3BalanceBefore);

    // 跳过锁定区块提现
    await networkHelpers.mine(unstakeLockedBlocks);

    await stakeProxyContract.connect(user1).withdraw(0);
    await stakeProxyContract.connect(user2).withdraw(0);
    await stakeProxyContract.connect(user3).withdraw(1);

    const user1Balance = await ethers.provider.getBalance(user1.address);
    const user2Balance = await ethers.provider.getBalance(user2.address);
    const user3Balance = await erc20Contract.balanceOf(user3.address);
    console.log("user1Balance::", user1Balance);
    console.log("user2Balance::", user2Balance);
    console.log("user3Balance::", user3Balance);

    const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
    const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
    const user3BalanceAfter = await erc20Contract.balanceOf(user3.address);
    console.log("user1BalanceAfter::", user1BalanceAfter);
    console.log("user2BalanceAfter::", user2BalanceAfter);
    console.log("user3BalanceAfter::", user3BalanceAfter);

    // ETH 余额比较, 有 gas 费, 不完全等于
    const twoEth = ethers.parseEther("2");
    const onePointNineEth = ethers.parseEther("1.9");
    expect(user1BalanceAfter - user1BalanceBefore).to.be.lt(twoEth).and.gt(onePointNineEth);
    expect(user2BalanceAfter - user2BalanceBefore).to.be.lt(twoEth).and.gt(onePointNineEth);
    expect(user3BalanceAfter - user3BalanceBefore).to.eq(ethers.parseEther("10"));
  });
});
