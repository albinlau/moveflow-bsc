import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  //0xF6F48D9F9220C2a30d070e5011817Cc87Ca33f87
  // const subscription = await ethers.deployContract('Subscription');
  // console.log('subscription Contract Deployed at ' + subscription.target);

  //0xA841ac49D7387Fc56F6582B66E8A59FdadBf910a
  // const mockUSDC = await ethers.deployContract('MockUSDC');
  // console.log('mockUSDC Contract Deployed at ' + mockUSDC.target);

  //0xc12dfFd613a89b84Bb9DFF5a42FaDA1A6f94e1Be
  // const USDC = await ethers.deployContract('USDC');
  // console.log('USDC Contract Deployed at ' + USDC.target);

  const mockUSDC = await ethers.getContractAt('MockUSDC', '0xA841ac49D7387Fc56F6582B66E8A59FdadBf910a');

  await mockUSDC.mint('0xB0f00593b9f49757e1A88deB13415a23C8a3d14b', ethers.utils.parseEther('1000000'));
  console.log('mockUSDC ' + deployer.address + ' with ' + await mockUSDC.balanceOf('0xB0f00593b9f49757e1A88deB13415a23C8a3d14b'));
  // await mockUSDC.approve('0xF6F48D9F9220C2a30d070e5011817Cc87Ca33f87', ethers.utils.parseEther('1000000'));

  // console.log('mockUSDC ' + deployer.address + ' aprove ' + await mockUSDC.allowance(deployer.address, '0xF6F48D9F9220C2a30d070e5011817Cc87Ca33f87'));


  // const sub = await ethers.getContractAt('Subscription', '0xF6F48D9F9220C2a30d070e5011817Cc87Ca33f87');

  // await sub.createSubscription(
  //   '0x3F4CE45464915a5dFd1ED7E1175877D498Dd2606',
  //   ethers.utils.parseEther('100'),
  //   '0xA841ac49D7387Fc56F6582B66E8A59FdadBf910a',
  //   '1703158824',
  //   '1703258824',
  //   '1000',
  //   ethers.utils.parseEther('1')
  // );


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
