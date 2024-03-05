import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
    MockToken,
    Subscription,
} from "../typechain";
import { BigNumber } from "ethers";
import { parse } from "path";

export const ONE_DAY_IN_SECS = 60 * 60 * 24;
export const TEN_DAY_IN_SECS = 60 * 60 * 24 * 10;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe("subscription", function () {
  let mockToken: MockToken;
  let subscription: Subscription;
  async function createEnvFixture() {
    const { deployments, getNamedAccounts } = hre;
    await deployments.fixture(["mocks", "core"]);
    const { deployer, sender, recipient } = await getNamedAccounts();
    
    mockToken = await (await ethers.getContractFactory("MockToken")).deploy();
    subscription = await (await ethers.getContractFactory("Subscription")).deploy();
  }

  it('create unfix rate subscription', async () => {
    await loadFixture(createEnvFixture);
    const [ deployer, sender, recipient ] = await ethers.getSigners();

    await mockToken.connect(deployer).mint(sender.address, ethers.utils.parseEther("1000"));
    await mockToken.connect(sender).approve(subscription.address, ethers.utils.parseEther("1000"));

    // create subscription
    const deposit = ethers.utils.parseEther("100");
    const startTime = (await time.latest()) + ONE_DAY_IN_SECS;
    const endTime = (await time.latest()) + ONE_DAY_IN_SECS + TEN_DAY_IN_SECS;
    const subscriptionId = Number(await subscription.nextSubscriptionId());

    
    await expect(
        subscription.connect(sender).createSubscription(
            sender.address, 
            deposit, 
            mockToken.address, 
            startTime,
            endTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.be.revertedWith("subscription to the caller");

    await expect(
        subscription.connect(sender).createSubscription(
            ZERO_ADDRESS, 
            deposit, 
            mockToken.address, 
            startTime,
            endTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.be.revertedWith("subscription to the zero address");

    await expect(
        subscription.connect(sender).createSubscription(
            subscription.address, 
            deposit, 
            mockToken.address, 
            startTime,
            endTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.be.revertedWith("subscription to the contract itself");

    await expect(
        subscription.connect(sender).createSubscription(
            recipient.address, 
            0, 
            mockToken.address, 
            startTime,
            endTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.be.revertedWith("deposit is zero");

    await expect(
        subscription.connect(sender).createSubscription(
            recipient.address, 
            deposit, 
            mockToken.address, 
            startTime,
            startTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.be.revertedWith("stop time before the start time");

    await expect(
        subscription.connect(sender).createSubscription(
            recipient.address, 
            deposit, 
            mockToken.address, 
            startTime,
            endTime,
            ONE_DAY_IN_SECS, 
            0
        )
    ).to.emit(subscription, "CreateSubscription")

    await  expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId+1,
            ethers.utils.parseEther("10")
        )
    ).to.be.revertedWith("subscription does not exist");

    await expect(
        subscription.connect(sender).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("10")
        )
    ).to.be.revertedWith("caller is not the recipient of the subscription");

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("0")
        )
    ).to.be.revertedWith("amount is zero");

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("10")
        )
    ).to.be.revertedWith("withdrawal not allowed");

    await time.increase(ONE_DAY_IN_SECS * 2);

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("10")
        )
    ).to.emit(subscription, "WithdrawFromRecipient");

    expect(await mockToken.balanceOf(recipient.address)).to.equal(ethers.utils.parseEther("10"));

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("20")
        )
    ).to.be.revertedWith("withdrawal not allowed");

    expect(await mockToken.balanceOf(recipient.address)).to.equal(ethers.utils.parseEther("10"));
    await time.increase(ONE_DAY_IN_SECS);


    await expect(
        subscription.connect(sender).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("20")
        )
    ).to.be.revertedWith("caller is not the recipient of the subscription");

    await expect(
        subscription.connect(sender).cancelSubscription(subscriptionId)
    ).to.be.revertedWith("subscription not allowed to cancel");

    await expect(
        subscription.connect(sender).withdrawFromSender(subscriptionId, ethers.utils.parseEther("20"))
    ).to.be.revertedWith("withdrawal not allowed");

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("100")
        )
    ).to.be.revertedWith("amount exceeds the available balance");

    await expect(
        subscription.connect(recipient).withdrawFromRecipient(
            subscriptionId,
            ethers.utils.parseEther("20")
        )
    ).to.emit(subscription, "WithdrawFromRecipient");
    expect(await mockToken.balanceOf(recipient.address)).to.equal(ethers.utils.parseEther("30"));
    
  });

  
  it('create rate subscription', async () => {
    await loadFixture(createEnvFixture);
    const [ deployer, sender, recipient ] = await ethers.getSigners();

    await mockToken.connect(deployer).mint(sender.address, ethers.utils.parseEther("1000"));
    await mockToken.connect(sender).approve(subscription.address, ethers.utils.parseEther("1000"));

    // create subscription
    const deposit = ethers.utils.parseEther("100");
    const startTime = (await time.latest()) + ONE_DAY_IN_SECS;
    const endTime = (await time.latest()) + ONE_DAY_IN_SECS + TEN_DAY_IN_SECS;
    await subscription.connect(sender).createSubscription(
        recipient.address, 
        deposit, 
        mockToken.address, 
        startTime,
        endTime,
        ONE_DAY_IN_SECS, 
        ethers.utils.parseEther("10")
    );

    // check subscription
    // const subscriptionId = Number(await subscription.nextSubscriptionId()) - 1;
    // expect(subscriptionId).to.equal(500000);
    // console.log(await subscription.getSubscription(subscriptionId));
    // expect(
    //     await subscription.getSubscription(subscriptionId)
    // ).to.equal([
    //     sender.address,
    //     recipient.address,
    //     deposit,
    //     mockToken.address,
    //     BigNumber.from(startTime),
    //     BigNumber.from(endTime),
    //     BigNumber.from(ONE_DAY_IN_SECS),
    //     deposit,
    //     BigNumber.from((await time.latest()) + ONE_DAY_IN_SECS-1),
    //     BigNumber.from(0),
    //     ethers.utils.parseEther("10"),
    //     sender.address,
    //     recipient.address,
    // ], "subscription data is not correct");
  });

});
