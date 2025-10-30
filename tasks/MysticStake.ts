import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the MysticStake contract address").setAction(async function (_taskArguments, hre) {
  const { deployments } = hre;

  const deployment = await deployments.get("MysticStake");
  console.log("MysticStake address is " + deployment.address);
});

task("task:claim", "Calls claimPoints on MysticStake")
  .addOptionalParam("address", "Optionally specify the MysticStake contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("MysticStake");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("MysticStake", deployment.address);

    const tx = await contract.connect(signer).claimPoints();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:stake", "Stake encrypted STK")
  .addParam("value", "The amount of STK to stake as an integer")
  .addOptionalParam("address", "Optionally specify the MysticStake contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value, 10);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("--value must be a non-negative integer");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("MysticStake");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("MysticStake", deployment.address);

    const encryptedValue = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add64(value)
      .encrypt();

    const tx = await contract
      .connect(signer)
      .stakePoints(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:withdraw", "Withdraw encrypted STK")
  .addParam("value", "The amount of STK to withdraw as an integer")
  .addOptionalParam("address", "Optionally specify the MysticStake contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value, 10);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("--value must be a non-negative integer");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("MysticStake");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("MysticStake", deployment.address);

    const encryptedValue = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add64(value)
      .encrypt();

    const tx = await contract
      .connect(signer)
      .withdrawStake(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:decrypt-balances", "Decrypt available and staked balances for the first signer")
  .addOptionalParam("address", "Optionally specify the MysticStake contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("MysticStake");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("MysticStake", deployment.address);

    const encryptedBalance = await contract.getEncryptedBalance(signer.address);
    const encryptedStaked = await contract.getEncryptedStakedBalance(signer.address);

    const balance = encryptedBalance === ethers.ZeroHash
      ? BigInt(0)
      : await fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, deployment.address, signer);
    const staked = encryptedStaked === ethers.ZeroHash
      ? BigInt(0)
      : await fhevm.userDecryptEuint(FhevmType.euint64, encryptedStaked, deployment.address, signer);

    console.log(`MysticStake: ${deployment.address}`);
    console.log(`Account    : ${signer.address}`);
    console.log(`Balance    : ${balance}`);
    console.log(`Staked     : ${staked}`);
  });
