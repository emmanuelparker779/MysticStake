import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const mysticStake = await deploy("MysticStake", {
    from: deployer,
    log: true,
  });

  console.log(`MysticStake contract: `, mysticStake.address);
};
export default func;
func.id = "deploy_mysticStake"; // id required to prevent reexecution
func.tags = ["MysticStake"];
