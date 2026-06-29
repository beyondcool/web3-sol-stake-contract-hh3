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
6. 让claude把【部署脚本】搬过来，提示词：
   ```plaintext
    咱们这个项目是另一个项目（/home/zh/work_sol/Advanced2-contract-stake/stake-contract）的升级版，只是把hardhat2升级成hardhar3，我已经把合约copy过来啦，请你把部署脚本（在scripts目录里）的逻辑在咱们这个hardhat3项目中再实现一次！
   ```
7. 让claude把【测试脚本】搬过来，提示词：
   ```plaintext
   咱们这个项目是另一个项目（/home/zh/work_sol/Advanced2-contract-stake/stake-contract）的升级版，只是把hardhat2升级成hardhar3，我已经把合约copy过来啦，请你把测试脚本（在test目录里）的逻辑在咱们这个hardhat3项目中再实现一次！尽量照搬，不兼容就修改一下。 

   ```