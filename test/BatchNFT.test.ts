import chai from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { solidity } from "ethereum-waffle";

import { createAddresses, toGasCost } from "./utils";

chai.use(solidity);
const { expect } = chai;

const totalSupply = 20;

const deployBatchNFT = async () => {
  const BatchNFT = await ethers.getContractFactory("BatchNFT");
  const batchNFT = await BatchNFT.deploy(
    "BatchNFT_Tester",
    "BFTT",
    totalSupply,
    "ipfs://QmeEpVThsuHRUDAQccP52WV9xLa2y8LEpTnyEsPX9fp3JD/"
  );
  return await batchNFT.deployed();
};

let batchNFT: Contract;

describe("BatchNFT", () => {
  beforeEach(async () => {
    const BatchNFTFactory = await ethers.getContractFactory("BatchNFT");
    const BatchNFT = await BatchNFTFactory.deploy(
      "BatchNFT_Tester",
      "BFTT",
      totalSupply,
      "ipfs://QmeEpVThsuHRUDAQccP52WV9xLa2y8LEpTnyEsPX9fp3JD/"
    );
    batchNFT = await BatchNFT.deployed();
  });

  it("Can read or write base URI", async () => {
    // get contract URI
    const contractURI = await batchNFT.contractURI();
    expect(contractURI).to.be.a("string");

    // set new sharedBaseURI
    const uri = "ipfs://QmeEpVThsuHRUDAQccP52WV9xLa2y8LEpTnyEsPX9fp123/";
    await batchNFT.setSharedBaseURI(uri);

    // get new contract URI
    const newContractURI = await batchNFT.contractURI();
    expect(newContractURI).to.equal(uri + "contract-metadata.json");
  });

  it("Can batch mint to a list of accounts", async () => {
    // account test list, repeating with the same account
    const amount = totalSupply - 1;
    const addressList = createAddresses(amount);

    const tx = await batchNFT.batchMint(addressList);

    // test first one and last one
    expect(await batchNFT.ownerOf(1)).to.equal(addressList[0]);
    expect(await batchNFT.ownerOf(amount)).to.equal(
      addressList[addressList.length - 1]
    );

    // assuming base fee + tip ~ 100 gwei
    const { gasUsed } = await tx.wait();
    console.log(
      `        Gas used for minting ${amount} NFTs in batch: ${gasUsed}. Estimated ETH: ${toGasCost(
        gasUsed
      )}`
    );
  });

  it("Can mint token then update token uri", async () => {
    // account test list, repeating with the same account
    const amount = 1;

    const addressList = createAddresses(amount);

    const tx = await batchNFT.batchMint(addressList);

    // set new sharedBaseURI
    const uri = "ipfs://QmeEpVThsuHRUDAQccP52WV9xLa2y8LEpTnyEsPX9fp123/";
    await batchNFT.setSharedBaseURI(uri);

    // test first one
    // get new token uri
    const tokenId = 1;
    const newTokenURI = await batchNFT.tokenURI(tokenId);
    expect(newTokenURI).to.equal(`${uri}${tokenId}`);
  });

  it("Require enough token supply left", async () => {
    // account test list, repeating with the same account
    const amount = totalSupply + 1;

    const addressList = createAddresses(amount);

    // const batchNFT = await deployBatchNFT();
    await expect(batchNFT.batchMint(addressList)).to.be.revertedWith(
      "not enough supply"
    );
  });

  it("Can withdraw all ether to a addresss", async () => {
    const [_, vault] = await ethers.getSigners();

    const etherAmount = ethers.utils.parseEther("1.23");

    // only owner can call withdraw
    await expect(
      batchNFT.connect(vault).withdrawAll(vault.address, { value: etherAmount })
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // withdraw all ether to vault address
    const vaultBalance = await ethers.provider.getBalance(vault.address);
    await batchNFT.withdrawAll(vault.address, { value: etherAmount });
    expect(await ethers.provider.getBalance(vault.address)).to.equal(
      etherAmount.add(vaultBalance)
    );
    expect(await ethers.provider.getBalance(batchNFT.address)).to.equal(0);
  });
});
