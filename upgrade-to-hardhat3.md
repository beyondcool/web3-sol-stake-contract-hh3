# 升级到 Hardhat3

## 操作步骤
1. 创建空项目文件夹，并使用`npx hardhat --init`初始化，过程中选择使用hardhat3；得到初始化好的hardhat3项目
2. 删除测试合约Counter及相关的测试、部署代码
3. 拷贝`stake-contracts`项目中的智能合约到本项目中（共三个合约）
4. 下载合约中使用的第三方库
    ```shell
    npm install @openzeppelin/contracts
    npm install @openzeppelin/contracts-upgradeable
    ```
5. 执行`npx hardhat compile`尝试编译，显示编译通过。
6. 