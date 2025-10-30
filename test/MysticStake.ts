import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { MysticStake, MysticStake__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployMysticStake() {
  const factory = (await ethers.getContractFactory("MysticStake")) as MysticStake__factory;
  const contract = (await factory.deploy()) as MysticStake;
  const address = await contract.getAddress();

  return { contract, contractAddress: address };
}

describe("MysticStake", function () {
  let signers: Signers;
  let contract: MysticStake;
  let contractAddress: string;

  before(async function () {
    const allSigners = await ethers.getSigners();
    signers = {
      deployer: allSigners[0],
      alice: allSigners[1],
      bob: allSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("MysticStake unit tests are intended for the local FHEVM mock environment only.");
      this.skip();
    }

    ({ contract, contractAddress } = await deployMysticStake());
  });

  async function decryptBalance(account: HardhatEthersSigner) {
    const encrypted = await contract.getEncryptedBalance(account.address);
    if (encrypted === ethers.ZeroHash) {
      return BigInt(0);
    }

    return fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, account);
  }

  async function decryptStaked(account: HardhatEthersSigner) {
    const encrypted = await contract.getEncryptedStakedBalance(account.address);
    if (encrypted === ethers.ZeroHash) {
      return BigInt(0);
    }

    return fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, account);
  }

  async function decryptTotalStaked() {
    const encrypted = await contract.getEncryptedTotalStaked();
    if (encrypted === ethers.ZeroHash) {
      return BigInt(0);
    }

    try {
      return await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, signers.alice);
    } catch (_error) {
      return BigInt(0);
    }
  }

  async function decryptTotalClaimed(account: HardhatEthersSigner) {
    const encrypted = await contract.getEncryptedTotalClaimed();
    if (encrypted === ethers.ZeroHash) {
      return BigInt(0);
    }

    try {
      return await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, account);
    } catch (_error) {
      return BigInt(0);
    }
  }

  it("starts with zero balances", async function () {
    const balance = await decryptBalance(signers.alice);
    const staked = await decryptStaked(signers.alice);
    const totalStaked = await decryptTotalStaked();

    expect(balance).to.equal(BigInt(0));
    expect(staked).to.equal(BigInt(0));
    expect(totalStaked).to.equal(BigInt(0));
  });

  it("allows a user to claim the initial allocation once", async function () {
    await contract.connect(signers.alice).claimPoints();

    const balance = await decryptBalance(signers.alice);
    const totalClaimed = await decryptTotalClaimed(signers.alice);
    expect(balance).to.equal(BigInt(1_000));
    expect(totalClaimed).to.equal(BigInt(1_000));

    await expect(contract.connect(signers.alice).claimPoints()).to.be.revertedWith("Claim already completed");
  });

  it("stakes encrypted amounts within the available balance", async function () {
    await contract.connect(signers.alice).claimPoints();

    const encryptedStake = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(400)
      .encrypt();

    await contract
      .connect(signers.alice)
      .stakePoints(encryptedStake.handles[0], encryptedStake.inputProof);

    const balance = await decryptBalance(signers.alice);
    const staked = await decryptStaked(signers.alice);
    const totalStaked = await decryptTotalStaked();

    expect(balance).to.equal(BigInt(600));
    expect(staked).to.equal(BigInt(400));
    expect(totalStaked).to.equal(BigInt(400));
  });

  it("withdraws encrypted amounts up to the staked balance", async function () {
    await contract.connect(signers.alice).claimPoints();

    const stakeInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(700)
      .encrypt();

    await contract
      .connect(signers.alice)
      .stakePoints(stakeInput.handles[0], stakeInput.inputProof);

    const withdrawInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(350)
      .encrypt();

    await contract
      .connect(signers.alice)
      .withdrawStake(withdrawInput.handles[0], withdrawInput.inputProof);

    const balance = await decryptBalance(signers.alice);
    const staked = await decryptStaked(signers.alice);
    const totalStaked = await decryptTotalStaked();

    expect(balance).to.equal(BigInt(650));
    expect(staked).to.equal(BigInt(350));
    expect(totalStaked).to.equal(BigInt(350));
  });
});
