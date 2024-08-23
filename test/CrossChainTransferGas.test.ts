import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";


import { CCIPLocalSimulator, CrossChainReceiver, MockCCIPRouter, SwapTestnetUSDC, TransferUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("CrossChainTransferGas", function (){
      let alice: SignerWithAddress;


async function deployFixture(){

    const ccipLocalSimulatorFactory = await hre.ethers.getContractFactory("CCIPLocalSimulator");
    const ccipLocalSimulator : CCIPLocalSimulator = await ccipLocalSimulatorFactory.deploy();


 // 1.  Get signer accounts
  const [deployer, aliceSigner] = await hre.ethers.getSigners();
  alice = aliceSigner;


//LOAD AND DEPLOY MOCKCCIPROUTER
const Router = await ethers.getContractFactory("MockCCIPRouter");
const router = await Router.deploy();
// const mockCCIPRouterContractFactory = await hre.ethers.getContractFactory("MockCCIPRouter");
// const mockCCIPRouterContract: MockCCIPRouter = mockCCIPRouterContractFactory.deploy();



 //2.    Call the configuration() function to get Router contract address.

    const config: {
        chainSelector_: bigint;
        sourceRouter_: string;
        destinationRouter_: string;
        wrappedNative_: string;
        linkToken_: string;
        ccipBnM_: string;
        ccipLnM_: string;
      } = await ccipLocalSimulator.configuration();


      //SEND CRED
      const ccipSenderRouter = "0xF694E193200268f9a4868e4Aa017A0118C9a8177";
    const linkToken = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
    const usdcToken = "0x5425890298aed601595a70AB815c96711a31Bc65";
    const myWalletAdress = "0x9ff56c7382414a5f5bE9f6B3042Acca49758AE1d";



    //SWAPTESTNETUSDC CRED
    const usdcTokenSwaptestNet = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const compoundUsdcToken = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const fauceteer = "0x68793eA49297eB75DFB4610B68e076D2A5c7646C";



    //RECEIVER CRED

    const ccipReceiverRouter = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const cometAddress = "0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e";




//LOAD AND DEPLOY SENDER CONTRACT
const transferSenderFactory = 
await ethers.getContractFactory("TransferUSDC");

const senderContracter : TransferUSDC = 
await transferSenderFactory.deploy(
    router,
    linkToken,
    usdcToken
);



//LOAD AND DEPLOY RECIECER CONTRACT
const receiverContractFactory = await hre.ethers.getContractFactory("CrossChainReceiver")
const receieverContract : CrossChainReceiver = await 
receiverContractFactory.deploy(router, cometAddress,usdcTokenSwaptestNet);



 //AllOW DISTINATION CHAIN
 await senderContracter.allowlistDestinationChain(16015286601757825753n,true);

await receieverContract.allowlistSourceChain(14767482510784806043n, true);

await receieverContract.allowlistSender(senderContracter.target, true)

console.log("CONTRACT DEPLOYED TO:", senderContracter.target)


 //FUND THE DEPLOYED TRANSFERUSDC CONTRACT

 await ccipLocalSimulator.requestLinkFromFaucet(senderContracter.target, 5_000_000_000_000_000_000_000n);


return { ccipLocalSimulator, config, router, senderContracter, receieverContract};

};



it("GAS ESTIMATION",async function (){
  
const { ccipLocalSimulator, config, router, senderContracter, receieverContract} = await loadFixture(
        deployFixture
      );

    const testParams = [0, 50, 99]; // Different iteration values for testing.
    const gasUsageReport = []; // To store reports of gas used for each test.



     // Loop through each test parameter to send messages and record gas usage.
     for (const iterations of testParams) {
        await senderContracter.transferUsdc(
            16015286601757825753n,
          receieverContract,
          iterations,
          500000 
        );
  
        const mockRouterEvents = await router.queryFilter(
          router.filters.MsgExecuted
        );
        const mockRouterEvent = mockRouterEvents[mockRouterEvents.length - 1]; // check last event
        const gasUsed = mockRouterEvent.args.gasUsed;
  
        gasUsageReport.push({
          iterations,
          gasUsed: gasUsed.toString(),
        });




        console.log(`Estimated gas: ${gasUsed.toString()}`);
       
      
        const gasLimit = (gasUsed * BigInt(110)) / BigInt(100);
      
     
        await senderContracter.transferUsdc(
            16015286601757825753n,
            receieverContract,
            iterations,
          gasLimit
        );

    }

     // Log the final report of gas usage for each iteration.
     console.log("Final Gas Usage Report:");
     gasUsageReport.forEach((report) => {
       console.log(
         "Number of iterations %d - Gas used: %d",
         report.iterations,
         report.gasUsed
       );
     });
   });
    
});